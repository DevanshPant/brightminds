/**
 * Tests who can reach the recordings link, against the live project.
 *
 *   npm run test:videos
 *
 * The link is the paid benefit, so the cases that matter are the refusals:
 * a signed-out visitor, a signed-in student who has not bought, and a student
 * whose access window has closed must all be refused. Creates throwaway users
 * and cleans up after itself.
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

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const RECORDINGS = process.env.COURSE_RECORDINGS_URL;

let passed = 0, failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  ${G}PASS${X} ${name}`); }
  else { failed += 1; console.log(`  ${R}FAIL${X} ${name}`); if (detail) console.log(`       ${D}${detail}${X}`); }
};

const handler = (await import('../api/course-videos.js')).default;
const { adminAuth, adminDb } = await import('../api/_lib/firebaseAdmin.js');
const auth = adminAuth();
const db = adminDb();

const mockRes = () => ({
  statusCode: null, body: null, headers: {},
  setHeader(k, v) { this.headers[k] = v; },
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; },
  end() { return this; },
});

const callAs = async (uid) => {
  const token = await auth.createCustomToken(uid);
  const signIn = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, returnSecureToken: true }) },
  ).then((r) => r.json());
  const res = mockRes();
  await handler({ method: 'POST', headers: { authorization: `Bearer ${signIn.idToken}` }, body: {} }, res);
  return res;
};

const stamp = Date.now();
const FRESH = 'bm-vid-fresh-' + stamp;
const EXPIRED = 'bm-vid-expired-' + stamp;
const NOBUY = 'bm-vid-nobuy-' + stamp;
const cleanup = [];

console.log('\nCourse video access\n');

try {
  console.log('Setup');
  check('COURSE_RECORDINGS_URL configured', Boolean(RECORDINGS));

  for (const uid of [FRESH, EXPIRED, NOBUY]) {
    await auth.createUser({ uid, email: `${uid}@example.com`, displayName: 'Video Test' });
    cleanup.push(() => auth.deleteUser(uid).catch(() => {}));
  }

  const now = Date.now();
  const mk = (uid, paidAtMs, extra = {}) => ({
    enrollmentId: uid + '-e', uid, email: `${uid}@example.com`,
    courseId: 'nda-1-april-2027', courseTitle: 'NDA (I) April 2027',
    amount: 499, status: 'paid', paidAt: new Date(paidAtMs).toISOString(),
    receiptNo: 'BM-TEST', ...extra,
  });

  await db.collection('enrollments').doc(FRESH + '-e').set(mk(FRESH, now - 2 * 86400000));
  cleanup.push(() => db.collection('enrollments').doc(FRESH + '-e').delete().catch(() => {}));

  // Paid 10 days ago: outside a 7-day window.
  await db.collection('enrollments').doc(EXPIRED + '-e').set(mk(EXPIRED, now - 10 * 86400000));
  cleanup.push(() => db.collection('enrollments').doc(EXPIRED + '-e').delete().catch(() => {}));

  check('test enrolments created', true);

  // ---- enrolled, inside the window ----------------------------------------
  console.log('\nEnrolled, 2 days in');
  const fresh = await callAs(FRESH);
  check('access granted', fresh.body?.hasAccess === true, JSON.stringify(fresh.body));
  check('recordings link returned', fresh.body?.recordingsUrl === RECORDINGS);
  check('days remaining looks right', fresh.body?.daysRemaining === 5,
        `got ${fresh.body?.daysRemaining}, expected 5`);
  check('expiry is reported', Boolean(fresh.body?.expiresAt));

  // ---- enrolled, window closed ---------------------------------------------
  console.log('\nEnrolled, 10 days in (window closed)');
  const expired = await callAs(EXPIRED);
  check('access refused', expired.body?.hasAccess === false);
  check('reason is "expired"', expired.body?.reason === 'expired');
  check('recordings link NOT returned', !expired.body?.recordingsUrl,
        'AN EXPIRED STUDENT COULD STILL WATCH');
  check('whole response is free of the link',
        !JSON.stringify(expired.body).includes('18UobfxSspHzxfQC8lDdrAr'));

  // ---- signed in, never bought ---------------------------------------------
  console.log('\nSigned in, never bought');
  const nobuy = await callAs(NOBUY);
  check('access refused', nobuy.body?.hasAccess === false);
  check('reason is "not-enrolled"', nobuy.body?.reason === 'not-enrolled');
  check('recordings link NOT returned', !nobuy.body?.recordingsUrl,
        'A NON-PAYING USER COULD WATCH');
  check('whole response is free of the link',
        !JSON.stringify(nobuy.body).includes('18UobfxSspHzxfQC8lDdrAr'));

  // ---- not signed in at all ------------------------------------------------
  console.log('\nNot signed in');
  const anon = mockRes();
  await handler({ method: 'POST', headers: {}, body: {} }, anon);
  check('rejected with 401', anon.statusCode === 401);
  check('no link in the response', !JSON.stringify(anon.body).includes('18UobfxSspHzxfQC8lDdrAr'));

  const wrongMethod = mockRes();
  await handler({ method: 'GET', headers: {}, body: {} }, wrongMethod);
  check('GET rejected with 405', wrongMethod.statusCode === 405);

  // ---- an explicit expiry on the record wins -------------------------------
  console.log('\nManually extended access');
  await db.collection('enrollments').doc(EXPIRED + '-e').set(
    { videoAccessExpiresAt: new Date(now + 3 * 86400000).toISOString() }, { merge: true },
  );
  const extended = await callAs(EXPIRED);
  check('extending videoAccessExpiresAt restores access', extended.body?.hasAccess === true,
        JSON.stringify(extended.body));
  check('link returned again', extended.body?.recordingsUrl === RECORDINGS);
} catch (error) {
  failed += 1;
  console.log(`\n  ${R}ERROR${X} ${error.message}`);
} finally {
  for (const fn of cleanup.reverse()) await fn();
  console.log(`\n${D}cleaned up ${cleanup.length} test records${X}`);
}

console.log('');
console.log(failed === 0 ? `${G}All ${passed} checks passed.${X}\n` : `${R}${passed} passed, ${failed} failed.${X}\n`);
process.exit(failed === 0 ? 0 : 1);
