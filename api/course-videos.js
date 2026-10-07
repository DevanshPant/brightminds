import { applyCors, fail, methodGuard } from './_lib/http.js';
import { adminDb, requireUser } from './_lib/firebaseAdmin.js';
import { getCourse } from './_lib/courses.js';
import { listCourseLibrary } from './_lib/drive.js';

/** Quotes are .env syntax; a dashboard stores them literally. */
const env = (name) => {
  const raw = (process.env[name] || '').trim();
  return (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
    ? raw.slice(1, -1).trim()
    : raw;
};

/** Days of recording access from the moment of payment. */
const ACCESS_DAYS = Number(env('COURSE_VIDEO_ACCESS_DAYS') || 7);

/**
 * POST /api/course-videos
 * Auth: Firebase ID token.
 *
 * Returns the recordings link ONLY to a student with a paid enrolment that is
 * still inside its access window. The window is enforced here rather than in
 * Firestore rules, because a link stored on the enrolment document would stay
 * readable by its owner forever - expiry would be cosmetic.
 *
 * The demo video is returned to any signed-in user, so a student can see what
 * the course is like before buying.
 */
export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!methodGuard(req, res, 'POST')) return;

  let user;
  try {
    user = await requireUser(req);
  } catch (error) {
    return fail(res, error.status || 401, error.message, error.cause);
  }

  // Only the Drive file id, never the /view link: the demo plays in the same
  // embedded player as the lessons, so no video can be opened in Drive.
  const demoRaw = env('COURSE_DEMO_VIDEO_URL');
  const demoVideoId =
    (demoRaw.match(/\/d\/([-\w]+)/) || demoRaw.match(/[?&]id=([-\w]+)/) || [])[1]
    || (/^[-\w]{20,}$/.test(demoRaw) ? demoRaw : null);

  try {
    const snap = await adminDb()
      .collection('enrollments')
      .where('uid', '==', user.uid)
      .where('status', '==', 'paid')
      .limit(10)
      .get();

    if (snap.empty) {
      // Signed in but has not bought: demo only.
      return res.status(200).json({
        hasAccess: false,
        reason: 'not-enrolled',
        demoVideoId,
        accessDays: ACCESS_DAYS,
      });
    }

    const now = Date.now();

    // Use the most recent enrolment, so re-buying restarts the window.
    const enrolments = snap.docs
      .map((d) => d.data())
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    const current = enrolments[0];
    const paidAt = new Date(current.paidAt).getTime();

    // An explicit expiry on the record wins, so access can be extended by hand.
    const expiresAt = current.videoAccessExpiresAt
      ? new Date(current.videoAccessExpiresAt).getTime()
      : paidAt + ACCESS_DAYS * 24 * 60 * 60 * 1000;

    const course = getCourse(current.courseId);

    if (now > expiresAt) {
      return res.status(200).json({
        hasAccess: false,
        reason: 'expired',
        demoVideoId,
        courseTitle: current.courseTitle || course?.title || null,
        expiresAt: new Date(expiresAt).toISOString(),
        accessDays: ACCESS_DAYS,
      });
    }

    // Subjects and video ids, never a shareable folder link. Each video is
    // played in an embedded player on our own page.
    let library = { subjects: [], totalVideos: 0 };
    let libraryError = null;
    try {
      library = await listCourseLibrary();
    } catch (error) {
      console.error('Could not read the course Drive folder:', error);
      libraryError = 'Videos are being set up. Please check back shortly.';
    }

    const msLeft = expiresAt - now;
    return res.status(200).json({
      hasAccess: true,
      demoVideoId,
      subjects: library.subjects,
      totalVideos: library.totalVideos,
      libraryError,
      courseTitle: current.courseTitle || course?.title || null,
      receiptNo: current.receiptNo || null,
      paidAt: current.paidAt,
      expiresAt: new Date(expiresAt).toISOString(),
      // Round up: with 10 hours left a student has "1 day", not "0 days".
      daysRemaining: Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000))),
      hoursRemaining: Math.max(0, Math.floor(msLeft / (60 * 60 * 1000))),
      accessDays: ACCESS_DAYS,
    });
  } catch (error) {
    return fail(res, 500, 'Could not check your course access.', error);
  }
}
