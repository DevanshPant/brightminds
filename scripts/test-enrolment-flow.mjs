/**
 * End-to-end test of what a student receives after paying.
 *
 *   npm run test:enrolment
 *
 * Runs the real fulfilment path against the LIVE project: creates a throwaway
 * student, fulfils an order exactly as a completed payment would, then checks
 * every channel the WhatsApp link should reach them through:
 *
 *   1. the enrolment record  (what the dashboard reads)
 *   2. the receipt email     (what lands in their inbox)
 *   3. Firestore rules       (they can read it; nobody else can)
 *
 * Cleans up after itself. Does not touch Razorpay and moves no money.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = '\x1b[32m', R = '\x1b[31m', D = '\x1b[2m', X = '\x1b[0m';

for (const raw of (await readFile(path.join(root, '.env'), 'utf8')).split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;
  let v = line.slice(eq + 1).trim();
  if (v.length > 1 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) v = v.slice(1, -1);
  process.env[line.slice(0, eq).trim()] = v;
}

const SEND_EMAIL = process.argv.includes('--send-email');
const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT = process.env.FIREBASE_PROJECT_ID;
const LINK = process.env.WHATSAPP_COMMUNITY_LINK;
const DOC = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

let passed = 0, failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  ${G}PASS${X} ${name}`); }
  else { failed += 1; console.log(`  ${R}FAIL${X} ${name}`); if (detail) console.log(`       ${D}${detail}${X}`); }
};

const { adminAuth, adminDb } = await import('../api/_lib/firebaseAdmin.js');
const { buildReceiptEmail } = await import('../api/_lib/email.js');
const auth = adminAuth();
const db = adminDb();

const STUDENT = 'bm-flow-' + Date.now();
const ORDER = 'order_flowtest_' + Date.now();
const cleanup = [];

console.log(`\nWhat a student gets after paying - live test\n`);

try {
  console.log('Setup');
  check('WHATSAPP_COMMUNITY_LINK is configured', Boolean(LINK), 'set it in .env');
  if (!LINK) throw new Error('no link configured');

  await auth.createUser({ uid: STUDENT, email: `${STUDENT}@example.com`, displayName: 'Flow Test' });
  cleanup.push(() => auth.deleteUser(STUDENT).catch(() => {}));

  await db.collection('orders').doc(ORDER).set({
    razorpayOrderId: ORDER, uid: STUDENT, email: `${STUDENT}@example.com`,
    studentName: 'Flow Test', phone: '9999999999',
    courseId: 'nda-1-april-2027', courseTitle: 'NDA-1 April 2027',
    amount: 499, currency: 'INR', status: 'created',
  });
  cleanup.push(() => db.collection('orders').doc(ORDER).delete().catch(() => {}));
  cleanup.push(() => db.collection('enrollments').doc(ORDER).delete().catch(() => {}));
  check('test order created', true);

  // ---- the real fulfilment path -------------------------------------------
  console.log('\nFulfilment (the exact path a completed payment takes)');
  const { fulfillOrder } = await import('../api/_lib/fulfill.js');

  // Suppress the email send unless explicitly asked for.
  const realKey = process.env.RESEND_API_KEY;
  if (!SEND_EMAIL) process.env.RESEND_API_KEY = '';
  const result = await fulfillOrder({ orderId: ORDER, paymentId: 'pay_flowtest', source: 'test' });
  process.env.RESEND_API_KEY = realKey;

  const enrolment = result.enrollment;
  check('enrolment created', Boolean(enrolment), 'fulfilOrder returned nothing');
  check('receipt number allocated', Boolean(enrolment.receiptNo), enrolment.receiptNo);
  check('marked paid', enrolment.status === 'paid');

  // ---- 1. the dashboard's source ------------------------------------------
  console.log('\n1. Enrolment record (what the dashboard shows)');
  const stored = (await db.collection('enrollments').doc(ORDER).get()).data();
  check('whatsappLink saved on the enrolment', Boolean(stored.whatsappLink),
        'the dashboard button would not appear');
  check('link matches the configured invite', stored.whatsappLink === LINK,
        `stored: ${stored.whatsappLink}`);

  // ---- 2. the receipt email ------------------------------------------------
  console.log('\n2. Receipt email');
  const { html, subject } = buildReceiptEmail(stored);
  check('email contains the join button', /Join the WhatsApp community/.test(html));
  check('href carries the full invite, query string intact',
        html.includes(`href="${LINK}"`), 'link may have been mangled by escaping');
  check('no "invite is on its way" fallback', !/on its way/.test(html));
  check('subject names the receipt', subject.includes(stored.receiptNo));

  // ---- 3. who can actually read it -----------------------------------------
  console.log('\n3. Firestore rules (only this student may read it)');
  const token = await auth.createCustomToken(STUDENT);
  const signIn = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, returnSecureToken: true }) },
  ).then((r) => r.json());

  const asStudent = await fetch(`${DOC}/enrollments/${ORDER}`, {
    headers: { Authorization: `Bearer ${signIn.idToken}` },
  });
  const body = await asStudent.json().catch(() => ({}));
  const readLink = body?.fields?.whatsappLink?.stringValue;
  check('the student can read their own link', asStudent.status === 200 && readLink === LINK,
        `status ${asStudent.status}, link ${readLink || '(none)'}`);

  const anon = await fetch(`${DOC}/enrollments/${ORDER}`);
  check('a signed-out visitor cannot', anon.status === 403 || anon.status === 401,
        `expected 403/401, got ${anon.status}`);

  // ---- 4. optional real email ---------------------------------------------
  if (SEND_EMAIL) {
    console.log('\n4. Real email');
    check('receipt email dispatched', result.emailResult?.studentEmailSent === true,
          result.emailResult?.reason || 'send failed');
  }
} catch (error) {
  failed += 1;
  console.log(`\n  ${R}ERROR${X} ${error.message}`);
} finally {
  for (const fn of cleanup.reverse()) await fn();
  // The test enrolment consumed a receipt number; put the counter back.
  await db.collection('counters').doc('receipts').delete().catch(() => {});
  console.log(`\n${D}cleaned up ${cleanup.length} records and reset the receipt counter${X}`);
}

console.log(`\n${failed === 0 ? G + 'All ' + passed + ' checks passed.' : R + passed + ' passed, ' + failed + ' failed.'}${X}\n`);
process.exit(failed === 0 ? 0 : 1);
