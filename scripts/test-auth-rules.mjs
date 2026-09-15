/**
 * End-to-end test of the student login layer against the LIVE Firebase project.
 *
 *   npm run test:auth
 *
 * Creates a throwaway user, signs in as them for real, and exercises the
 * deployed security rules from the client side — proving a student can read
 * their own data and cannot forge an enrolment. Cleans up after itself.
 *
 * Safe to run repeatedly. Touches only its own test documents.
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
  if (v.length > 1 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) {
    v = v.slice(1, -1);
  }
  process.env[line.slice(0, eq).trim()] = v;
}

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT = process.env.FIREBASE_PROJECT_ID;
const DOC = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

let passed = 0, failed = 0;
const check = (name, condition, detail) => {
  if (condition) { passed += 1; console.log(`  ${G}PASS${X} ${name}`); }
  else { failed += 1; console.log(`  ${R}FAIL${X} ${name}`); if (detail) console.log(`       ${D}${detail}${X}`); }
};

const { adminAuth, adminDb } = await import('../api/_lib/firebaseAdmin.js');
const auth = adminAuth();
const db = adminDb();

const STUDENT = 'bm-test-student-' + Date.now();
const OTHER = 'bm-test-other-' + Date.now();
const cleanup = [];

console.log(`\nStudent login — live test against ${PROJECT}\n`);

try {
  // ── sign in for real, the way the browser does ────────────────────────────
  console.log('Authentication');
  for (const uid of [STUDENT, OTHER]) {
    await auth.createUser({ uid, email: `${uid}@example.com`, displayName: 'Test Student' });
    cleanup.push(() => auth.deleteUser(uid).catch(() => {}));
  }
  check('Firebase Auth accepts new users', true);

  const customToken = await auth.createCustomToken(STUDENT);
  const signIn = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  ).then((r) => r.json());

  check('Client sign-in returns an ID token', Boolean(signIn.idToken),
        signIn.error?.message || 'no idToken returned');
  if (!signIn.idToken) throw new Error('cannot continue without an ID token');

  const idToken = signIn.idToken;
  const asStudent = (url, init = {}) =>
    fetch(url, { ...init, headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });

  // Verify the token the way /api/create-order does.
  const decoded = await auth.verifyIdToken(idToken);
  check('Server verifies that ID token', decoded.uid === STUDENT);

  // ── what a student may do ─────────────────────────────────────────────────
  console.log('\nSecurity rules — student permissions');

  const ownProfile = await asStudent(`${DOC}/users/${STUDENT}?updateMask.fieldPaths=uid&updateMask.fieldPaths=email`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { uid: { stringValue: STUDENT }, email: { stringValue: `${STUDENT}@example.com` } } }),
  });
  check('student CAN write their own profile', ownProfile.status === 200,
        `got ${ownProfile.status}`);
  cleanup.push(() => db.collection('users').doc(STUDENT).delete().catch(() => {}));

  const otherProfile = await asStudent(`${DOC}/users/${OTHER}?updateMask.fieldPaths=uid`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { uid: { stringValue: OTHER } } }),
  });
  check('student CANNOT write another user profile', otherProfile.status === 403,
        `expected 403, got ${otherProfile.status}`);

  // Seed an enrolment server-side, the way a real payment would.
  await db.collection('enrollments').doc(STUDENT + '-order').set({
    uid: STUDENT, courseId: 'nda-1-april-2027', courseTitle: 'NDA-1 April 2027',
    amount: 500, status: 'paid', paidAt: new Date().toISOString(),
    email: `${STUDENT}@example.com`, receiptNo: 'BM-TEST-0001',
  });
  cleanup.push(() => db.collection('enrollments').doc(STUDENT + '-order').delete().catch(() => {}));

  const readOwn = await asStudent(`${DOC}/enrollments/${STUDENT}-order`);
  check('student CAN read their own enrolment', readOwn.status === 200, `got ${readOwn.status}`);

  await db.collection('enrollments').doc(OTHER + '-order').set({
    uid: OTHER, courseId: 'nda-1-april-2027', status: 'paid', amount: 500,
    paidAt: new Date().toISOString(),
  });
  cleanup.push(() => db.collection('enrollments').doc(OTHER + '-order').delete().catch(() => {}));

  const readOther = await asStudent(`${DOC}/enrollments/${OTHER}-order`);
  check('student CANNOT read another enrolment', readOther.status === 403,
        `expected 403, got ${readOther.status}`);

  // ── the money guard ───────────────────────────────────────────────────────
  console.log('\nSecurity rules — the money guard');

  // A PATCH to a non-existent path creates the document, which is exactly how
  // a student would try to mint themselves a free seat from the browser.
  const forge = await asStudent(`${DOC}/enrollments/${STUDENT}-forged`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        uid: { stringValue: STUDENT },
        status: { stringValue: 'paid' },
        amount: { integerValue: '0' },
        courseId: { stringValue: 'nda-1-april-2027' },
      },
    }),
  });
  const forgeBody = await forge.json().catch(() => ({}));
  cleanup.push(() => db.collection('enrollments').doc(STUDENT + '-forged').delete().catch(() => {}));
  check('student CANNOT forge a free enrolment', forge.status === 403,
        `expected 403, got ${forge.status} ${forgeBody?.error?.message || ''}`);

  // Belt and braces: confirm nothing actually landed in the database.
  const forgedDoc = await db.collection('enrollments').doc(STUDENT + '-forged').get();
  check('no forged enrolment exists in the database', !forgedDoc.exists,
        'A FORGED ENROLMENT WAS WRITTEN - this would be a free course');

  const forgeOrder = await asStudent(`${DOC}/orders/forged-order`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { uid: { stringValue: STUDENT }, status: { stringValue: 'paid' } } }),
  });
  check('student CANNOT write an order', forgeOrder.status === 403, `got ${forgeOrder.status}`);

  const counter = await asStudent(`${DOC}/counters/receipts`);
  check('student CANNOT read the receipt counter', counter.status === 403, `got ${counter.status}`);

  // ── the dashboard query (needs the composite index) ───────────────────────
  console.log('\nDashboard query');
  const query = await asStudent(`${DOC}:runQuery`, {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'enrollments' }],
        where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: STUDENT } } },
        orderBy: [{ field: { fieldPath: 'paidAt' }, direction: 'DESCENDING' }],
      },
    }),
  });
  const qBody = await query.json().catch(() => ({}));
  const needsIndex = JSON.stringify(qBody).includes('requires an index');
  check('dashboard query runs (composite index present)', query.status === 200 && !needsIndex,
        needsIndex ? 'MISSING INDEX - the dashboard will show an error after login'
                   : `got ${query.status}`);
} catch (error) {
  failed += 1;
  console.log(`\n  ${R}ERROR${X} ${error.message}`);
} finally {
  for (const fn of cleanup.reverse()) await fn();
  console.log(`\n${D}cleaned up ${cleanup.length} test records${X}`);
}

console.log(`\n${failed === 0 ? G + 'All ' + passed + ' checks passed.' : R + passed + ' passed, ' + failed + ' failed.'}${X}\n`);
process.exit(failed === 0 ? 0 : 1);
