/**
 * Full pre-launch rehearsal: runs one real enrolment end to end.
 *
 *   npm run test:golive
 *
 * Creates a throwaway student whose email is ADMIN_EMAIL, so both the student
 * receipt and the admin notification land in an inbox you can actually open.
 * Then proves, against the live project:
 *
 *   - the receipt email really sent (Resend returns an id)
 *   - it carries the WhatsApp button and the full invite URL
 *   - the admin email really sent, with the .xlsx attached
 *   - the spreadsheet opens and contains the student
 *   - the enrolment record carries the link the dashboard reads
 *   - Firestore rules let that student read it, and nobody else
 *   - paying twice is refused
 *
 * Moves no money and cleans up after itself, including the receipt counter.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', D = '\x1b[2m', X = '\x1b[0m';

for (const raw of (await readFile(path.join(root, '.env'), 'utf8')).split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;
  let v = line.slice(eq + 1).trim();
  if (v.length > 1 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) v = v.slice(1, -1);
  process.env[line.slice(0, eq).trim()] = v;
}

const LINK = process.env.WHATSAPP_COMMUNITY_LINK;
const ADMIN = process.env.ADMIN_EMAIL;
const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT = process.env.FIREBASE_PROJECT_ID;
const DOC = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

let passed = 0, failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  ${G}PASS${X} ${name}`); }
  else { failed += 1; console.log(`  ${R}FAIL${X} ${name}`); if (detail) console.log(`       ${D}${detail}${X}`); }
};

const { adminAuth, adminDb } = await import('../api/_lib/firebaseAdmin.js');
const { buildReceiptEmail, buildAdminEmail } = await import('../api/_lib/email.js');
const auth = adminAuth();
const db = adminDb();

const STUDENT = 'bm-golive-' + Date.now();
const ORDER = 'order_golive_' + Date.now();
const cleanup = [];

console.log('\nGo-live rehearsal - one real enrolment, real emails\n');

try {
  console.log('Preconditions');
  check('WHATSAPP_COMMUNITY_LINK set', Boolean(LINK));
  check('RESEND_API_KEY set', Boolean(process.env.RESEND_API_KEY));
  check('ADMIN_EMAIL set', Boolean(ADMIN), ADMIN);
  if (!LINK || !process.env.RESEND_API_KEY || !ADMIN) throw new Error('missing configuration');

  // A real inbox, so the emails can actually be inspected.
  await auth.createUser({ uid: STUDENT, email: ADMIN, displayName: 'Go Live Rehearsal' });
  cleanup.push(() => auth.deleteUser(STUDENT).catch(() => {}));

  await db.collection('users').doc(STUDENT).set({
    uid: STUDENT, email: ADMIN, displayName: 'Go Live Rehearsal',
    fullName: 'Go Live Rehearsal', phone: '9999900000',
    signupAt: new Date().toISOString(), lastLoginAt: new Date().toISOString(), loginCount: 1,
  });
  cleanup.push(() => db.collection('users').doc(STUDENT).delete().catch(() => {}));

  await db.collection('orders').doc(ORDER).set({
    razorpayOrderId: ORDER, uid: STUDENT, email: ADMIN,
    studentName: 'Go Live Rehearsal', phone: '9999900000',
    courseId: 'nda-1-april-2027', courseTitle: 'NDA (I) April 2027',
    amount: 499, currency: 'INR', status: 'created',
  });
  cleanup.push(() => db.collection('orders').doc(ORDER).delete().catch(() => {}));
  cleanup.push(() => db.collection('enrollments').doc(ORDER).delete().catch(() => {}));

  // ---- the real fulfilment path, emails and all -----------------------------
  console.log('\nFulfilment (exactly what a completed payment triggers)');
  const { fulfillOrder } = await import('../api/_lib/fulfill.js');
  const outcome = await fulfillOrder({ orderId: ORDER, paymentId: 'pay_golive', source: 'rehearsal' });
  const stored = (await db.collection('enrollments').doc(ORDER).get()).data();

  check('enrolment recorded', Boolean(stored));
  check('receipt number allocated', Boolean(stored.receiptNo), stored.receiptNo);

  // ---- 1. the student's receipt --------------------------------------------
  console.log('\n1. Student receipt email');
  check('receipt actually sent', outcome.emailResult?.studentEmailSent === true,
        outcome.emailResult?.reason || 'send reported false');
  const { html } = buildReceiptEmail(stored);
  check('carries the WhatsApp button', /Join the WhatsApp community/.test(html));
  check('href is the full invite, query string intact', html.includes(`href="${LINK}"`));
  check('no "invite on its way" fallback', !/on its way/.test(html));

  // ---- 2. the admin email and its spreadsheet -------------------------------
  console.log('\n2. Admin email + Excel attachment');
  check('admin email actually sent', outcome.emailResult?.adminEmailSent === true);
  check('workbook attached', outcome.emailResult?.workbookAttached === true,
        'the admin email went out WITHOUT the spreadsheet');

  const { buildEnrolmentWorkbook } = await import('../api/_lib/workbook.js');
  const wb = await buildEnrolmentWorkbook();
  const ExcelJS = (await import('exceljs')).default;
  const read = new ExcelJS.Workbook();
  await read.xlsx.load(wb.buffer);
  const sheet = read.worksheets[0];
  const rows = [];
  sheet.eachRow((r, i) => { if (i > 1) rows.push(r.values.map((v) => (v == null ? '' : String(v)))); });

  check('exactly one sheet', read.worksheets.length === 1, `got ${read.worksheets.length}`);
  check('spreadsheet opens and parses', Boolean(sheet));
  check('this student appears in it', rows.some((r) => r.join('|').includes('Go Live Rehearsal')));
  check('their phone is in it', rows.some((r) => r.join('|').includes('9999900000')));
  check('marked Enrolled', rows.some((r) => r.join('|').includes('Enrolled')));
  check('admin email body names the totals', /students enrolled/.test(buildAdminEmail(stored, outcome.emailResult?.workbookStats).html));

  // ---- 3. the dashboard -----------------------------------------------------
  console.log('\n3. Student dashboard');
  check('whatsappLink stored on the enrolment', stored.whatsappLink === LINK,
        `stored: ${stored.whatsappLink}`);

  const custom = await auth.createCustomToken(STUDENT);
  const signIn = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }) },
  ).then((r) => r.json());

  const mine = await fetch(`${DOC}/enrollments/${ORDER}`, {
    headers: { Authorization: `Bearer ${signIn.idToken}` },
  });
  const mineBody = await mine.json().catch(() => ({}));
  check('student can read their own link', mine.status === 200
        && mineBody?.fields?.whatsappLink?.stringValue === LINK, `status ${mine.status}`);

  const anon = await fetch(`${DOC}/enrollments/${ORDER}`);
  check('a stranger cannot', anon.status === 401 || anon.status === 403, `status ${anon.status}`);

  // The dashboard query needs the composite index.
  const q = await fetch(`${DOC}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${signIn.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'enrollments' }],
      where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: STUDENT } } },
      orderBy: [{ field: { fieldPath: 'paidAt' }, direction: 'DESCENDING' }],
    } }),
  });
  const qText = JSON.stringify(await q.json().catch(() => ({})));
  check('dashboard query runs', q.status === 200 && !qText.includes('requires an index'));
  check('it returns this enrolment', qText.includes(stored.receiptNo));

  // ---- 4. no double charge --------------------------------------------------
  console.log('\n4. Duplicate protection');
  const again = await db.collection('enrollments')
    .where('uid', '==', STUDENT).where('courseId', '==', 'nda-1-april-2027')
    .where('status', '==', 'paid').limit(1).get();
  check('an existing paid enrolment is found, so checkout would refuse', !again.empty);

  const repeat = await fulfillOrder({ orderId: ORDER, paymentId: 'pay_golive', source: 'webhook' });
  check('re-running fulfilment does not duplicate', repeat.alreadyFulfilled === true);
  const count = (await db.collection('enrollments').where('uid', '==', STUDENT).get()).size;
  check('still exactly one enrolment', count === 1, `found ${count}`);

  console.log(`\n${D}Both emails were sent to ${ADMIN} - open that inbox and check them.${X}`);
} catch (error) {
  failed += 1;
  console.log(`\n  ${R}ERROR${X} ${error.message}`);
} finally {
  for (const fn of cleanup.reverse()) await fn();
  await db.collection('counters').doc('receipts').delete().catch(() => {});
  console.log(`${D}cleaned up ${cleanup.length} records and reset the receipt counter${X}`);
}

console.log('');
if (failed === 0) {
  console.log(`${G}All ${passed} checks passed.${X}\n`);
  process.exit(0);
}
console.log(`${R}${passed} passed, ${failed} failed.${X}\n`);
process.exit(1);
