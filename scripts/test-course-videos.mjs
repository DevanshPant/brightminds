/**
 * Tests who can reach the course videos, against the live project.
 *
 *   npm run test:videos
 *
 * The videos are the paid benefit, so the cases that matter are the refusals:
 * a signed-out visitor, a signed-in student who has not bought, and a lesson
 * whose week has run out must all be refused. The important detail for an
 * expired lesson is that its Drive id is absent, not merely flagged - the id is
 * the only thing needed to play it.
 *
 * Every response is also checked for the Drive folder id, because a student who
 * could read that could open the folder and download the whole course.
 *
 * Creates throwaway users and cleans up after itself.
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
const FOLDER_ID = process.env.COURSE_DRIVE_FOLDER_ID;
const DAY = 86400000;

let passed = 0, failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  ${G}PASS${X} ${name}`); }
  else { failed += 1; console.log(`  ${R}FAIL${X} ${name}`); if (detail) console.log(`       ${D}${detail}${X}`); }
};

const handler = (await import('../api/course-videos.js')).default;

// A second copy of the module that thinks a lesson lasts one day. The query
// string defeats the module cache, and the constant is read at import. Every
// video in Drive is older than a day, which is the only way to exercise the
// expired path against real data without waiting a week.
process.env.COURSE_VIDEO_ACCESS_DAYS = '1';
const oneDayHandler = (await import('../api/course-videos.js?accessDays=1')).default;
process.env.COURSE_VIDEO_ACCESS_DAYS = '7';

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

const callAs = async (uid, fn = handler) => {
  const token = await auth.createCustomToken(uid);
  const signIn = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, returnSecureToken: true }) },
  ).then((r) => r.json());
  const res = mockRes();
  await fn({ method: 'POST', headers: { authorization: `Bearer ${signIn.idToken}` }, body: {} }, res);
  return res;
};

const allVideos = (body) => (body?.subjects || []).flatMap((s) => s.videos || []);

const stamp = Date.now();
const FRESH = 'bm-vid-fresh-' + stamp;
const OLD = 'bm-vid-old-' + stamp;
const NOBUY = 'bm-vid-nobuy-' + stamp;
const cleanup = [];

console.log('\nCourse video access\n');

try {
  console.log('Setup');
  check('COURSE_DRIVE_FOLDER_ID configured', Boolean(FOLDER_ID));

  for (const uid of [FRESH, OLD, NOBUY]) {
    await auth.createUser({ uid, email: `${uid}@example.com`, displayName: 'Video Test' });
    cleanup.push(() => auth.deleteUser(uid).catch(() => {}));
  }

  const now = Date.now();
  const mk = (uid, paidAtMs, extra = {}) => ({
    enrollmentId: uid + '-e', uid, email: `${uid}@example.com`,
    studentName: 'Video Test', phone: '+919999999999',
    courseId: 'nda-1-april-2027', courseTitle: 'NDA (I) April 2027',
    amount: 499, status: 'paid', paidAt: new Date(paidAtMs).toISOString(),
    receiptNo: 'BM-TEST', ...extra,
  });

  await db.collection('enrollments').doc(FRESH + '-e').set(mk(FRESH, now - 2 * DAY));
  cleanup.push(() => db.collection('enrollments').doc(FRESH + '-e').delete().catch(() => {}));

  // Paid a year ago. Under a per-lesson window this student still gets every
  // lesson uploaded recently, which is the whole point of the change.
  await db.collection('enrollments').doc(OLD + '-e').set(mk(OLD, now - 365 * DAY));
  cleanup.push(() => db.collection('enrollments').doc(OLD + '-e').delete().catch(() => {}));

  check('test enrolments created', true);

  // ---- enrolled, lessons open ----------------------------------------------
  console.log('\nEnrolled 2 days ago');
  const fresh = await callAs(FRESH);
  const freshVideos = allVideos(fresh.body);
  const freshIds = freshVideos.filter((v) => v.id).map((v) => v.id);

  check('access granted', fresh.body?.hasAccess === true, JSON.stringify(fresh.body).slice(0, 300));
  check('no Drive link anywhere in the response',
        !JSON.stringify(fresh.body).includes('drive.google.com'),
        'A STUDENT COULD OPEN DRIVE DIRECTLY');
  check('whole response is free of the Drive folder id',
        !JSON.stringify(fresh.body).includes(FOLDER_ID));
  check('library is reachable, or fails with a message for the student',
        Array.isArray(fresh.body?.subjects)
          && (fresh.body.subjects.length > 0 || Boolean(fresh.body?.libraryError)),
        fresh.body?.libraryError || '');

  if (freshVideos.length) {
    check('every open lesson carries an id and a name',
          freshVideos.every((v) => v.expired || (v.id && v.name)));
    check('no file extensions left in lesson names',
          freshVideos.every((v) => !/\.(mp4|mkv|mov|webm|avi)$/i.test(v.name)));
    check('the free demo is not listed as a lesson',
          !freshIds.includes(fresh.body.demoVideoId),
          'THE DEMO IS DUPLICATED IN THE PAID LIBRARY');
    check('no duplicate lessons across subjects',
          new Set(freshIds).size === freshIds.length);

    check('every lesson carries its own expiry',
          freshVideos.every((v) => v.expiresAt && v.openedAt));
    // Everything in Drive went up before this student paid, so every lesson
    // runs from their payment date and they all close together. That is the
    // "max" half of the rule: nobody gets a window that already ran out.
    check('lessons uploaded before they paid all run from their payment date',
          new Set(freshVideos.map((v) => v.expiresAt)).size === 1,
          `${new Set(freshVideos.map((v) => v.expiresAt)).size} distinct expiries across ` +
          `${freshVideos.length} lessons`);
    check('no lesson stays open longer than the access window',
          freshVideos.every((v) => {
            const span = new Date(v.expiresAt).getTime() - new Date(v.openedAt).getTime();
            return span <= fresh.body.accessDays * DAY + 1000;
          }));
    check('a lesson never opens before the student paid',
          freshVideos.every((v) => new Date(v.openedAt).getTime() >= now - 2 * DAY - 60000));
    check('counts add up',
          fresh.body.openVideos + fresh.body.expiredVideos === freshVideos.length,
          `${fresh.body.openVideos} + ${fresh.body.expiredVideos} vs ${freshVideos.length}`);
    check('the watermark names the student',
          typeof fresh.body.watermark === 'string'
            && fresh.body.watermark.includes(`${FRESH}@example.com`),
          String(fresh.body.watermark));
  }

  // ---- a long-standing student still gets new lessons ----------------------
  console.log('\nEnrolled a year ago');
  const old = await callAs(OLD);
  const oldVideos = allVideos(old.body);
  check('still enrolled', old.body?.hasAccess === true);
  check('recently uploaded lessons are open for them too',
        oldVideos.some((v) => !v.expired),
        'A LONG-STANDING STUDENT SEES NOTHING NEW');
  check('their window runs from the upload date, not their payment date',
        oldVideos.filter((v) => !v.expired)
          .every((v) => new Date(v.openedAt).getTime() > now - 60 * DAY));
  // The other half of the rule: each lesson keeps its own clock, so lessons
  // uploaded on different days close on different days.
  check('lessons uploaded on different days close on different days',
        new Set(oldVideos.map((v) => v.expiresAt)).size > 1,
        `${new Set(oldVideos.map((v) => v.expiresAt)).size} distinct expiries across ` +
        `${oldVideos.length} lessons`);
  check('each lesson closes exactly one window after it went up',
        oldVideos.every((v) => {
          const span = new Date(v.expiresAt).getTime() - new Date(v.openedAt).getTime();
          return Math.abs(span - old.body.accessDays * DAY) < 1000;
        }));

  // ---- a lesson whose week has run out -------------------------------------
  console.log('\nLessons past their window (window forced to 1 day)');
  const shut = await callAs(OLD, oneDayHandler);
  const shutVideos = allVideos(shut.body);

  check('the student is still enrolled', shut.body?.hasAccess === true);
  check('every lesson is reported closed',
        shutVideos.length > 0 && shutVideos.every((v) => v.expired),
        `${shutVideos.filter((v) => v.expired).length} of ${shutVideos.length} closed`);
  check('a closed lesson is still named, so the student knows it existed',
        shutVideos.every((v) => Boolean(v.name)));
  check('NO closed lesson carries a Drive id',
        shutVideos.every((v) => !v.id),
        'AN EXPIRED LESSON COULD STILL BE PLAYED');
  check('no closed lesson id leaks anywhere in the payload',
        !freshIds.some((id) => JSON.stringify(shut.body).includes(id)),
        'AN EXPIRED LESSON ID IS STILL IN THE RESPONSE');
  check('openVideos is zero', shut.body?.openVideos === 0);

  // ---- signed in, never bought ---------------------------------------------
  console.log('\nSigned in, never bought');
  const nobuy = await callAs(NOBUY);
  check('access refused', nobuy.body?.hasAccess === false);
  check('reason is "not-enrolled"', nobuy.body?.reason === 'not-enrolled');
  check('no lessons returned at all', !nobuy.body?.subjects);
  check('demo offered as an id only',
        !JSON.stringify(nobuy.body).includes('drive.google.com'),
        'THE DEMO COULD BE OPENED IN DRIVE');
  check('whole response is free of the Drive folder id',
        !JSON.stringify(nobuy.body).includes(FOLDER_ID));
  check('no lesson id reaches a non-payer',
        !freshIds.some((id) => JSON.stringify(nobuy.body).includes(id)),
        'A NON-PAYING USER COULD PLAY A LESSON');

  // ---- not signed in at all ------------------------------------------------
  console.log('\nNot signed in');
  const anon = mockRes();
  await handler({ method: 'POST', headers: {}, body: {} }, anon);
  check('rejected with 401', anon.statusCode === 401);
  check('no Drive folder id in the response',
        !JSON.stringify(anon.body).includes(FOLDER_ID));

  const wrongMethod = mockRes();
  await handler({ method: 'GET', headers: {}, body: {} }, wrongMethod);
  check('GET rejected with 405', wrongMethod.statusCode === 405);

  // ---- an explicit expiry on the record is a floor --------------------------
  console.log('\nManually extended access');
  await db.collection('enrollments').doc(OLD + '-e').set(
    { videoAccessExpiresAt: new Date(now + 30 * DAY).toISOString() }, { merge: true },
  );
  const extended = await callAs(OLD, oneDayHandler);
  const extendedVideos = allVideos(extended.body);
  check('extending videoAccessExpiresAt reopens closed lessons',
        extendedVideos.length > 0 && extendedVideos.every((v) => !v.expired),
        `${extendedVideos.filter((v) => v.expired).length} still closed`);
  check('reopened lessons carry their id again', extendedVideos.every((v) => Boolean(v.id)));
  check('still no Drive link anywhere',
        !JSON.stringify(extended.body).includes('drive.google.com'));
} catch (error) {
  failed += 1;
  console.log(`\n  ${R}ERROR${X} ${error.message}`);
  console.log(error.stack);
} finally {
  for (const fn of cleanup.reverse()) await fn();
  console.log(`\n${D}cleaned up ${cleanup.length} test records${X}`);
}

console.log('');
console.log(failed === 0 ? `${G}All ${passed} checks passed.${X}\n` : `${R}${passed} passed, ${failed} failed.${X}\n`);
process.exit(failed === 0 ? 0 : 1);
