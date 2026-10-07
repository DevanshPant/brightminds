import { applyCors, fail, methodGuard } from './_lib/http.js';
import { adminDb, requireUser } from './_lib/firebaseAdmin.js';
import { getCourse } from './_lib/courses.js';
import { driveIdFrom, listCourseLibrary } from './_lib/drive.js';

/** Quotes are .env syntax; a dashboard stores them literally. */
const env = (name) => {
  const raw = (process.env[name] || '').trim();
  return (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
    ? raw.slice(1, -1).trim()
    : raw;
};

const DAY = 24 * 60 * 60 * 1000;

/** Days each lesson stays open to a student. */
const ACCESS_DAYS = Number(env('COURSE_VIDEO_ACCESS_DAYS') || 7);

/**
 * How many lessons a signed-in visitor may watch before buying.
 *
 * Kept small on purpose: the people who have paid must get materially more than
 * the people who have not. The free ones are the OLDEST lessons, so the set
 * stays put as new lessons go up rather than quietly handing away each new
 * upload. COURSE_FREE_VIDEO_IDS overrides the choice if particular lessons
 * should be the free ones.
 */
const FREE_COUNT = Number(env('COURSE_FREE_VIDEO_COUNT') || 2);

const FREE_IDS = env('COURSE_FREE_VIDEO_IDS')
  .split(/[,\s]+/)
  .map((value) => driveIdFrom(value))
  .filter(Boolean);

const freeVideoIds = (library) => {
  if (FREE_IDS.length) return new Set(FREE_IDS);
  if (FREE_COUNT <= 0) return new Set();
  const all = library.subjects.flatMap((s) => s.videos);
  all.sort((a, b) => new Date(a.addedAt || 0).getTime() - new Date(b.addedAt || 0).getTime());
  return new Set(all.slice(0, FREE_COUNT).map((v) => v.id));
};

/**
 * When a lesson opens for this student, and when it closes.
 *
 * Every lesson runs its own clock, started by whichever came later: the lesson
 * being uploaded, or the student paying. So a lesson uploaded today gives every
 * current student a fresh week on it, and a student who enrols today gets a
 * full week on the lessons already there. Nobody is handed a window that ran
 * out before they could use it, and the course keeps rolling forward as more
 * lessons go up.
 *
 * An explicit videoAccessExpiresAt on the enrolment is a floor, not a ceiling,
 * so extending somebody by hand can never shorten a newer lesson.
 */
export const windowFor = (addedAt, paidAtMs, overrideMs, accessDays = ACCESS_DAYS) => {
  const uploadedMs = addedAt ? new Date(addedAt).getTime() : NaN;
  const opensAt = Math.max(Number.isNaN(uploadedMs) ? 0 : uploadedMs, paidAtMs);
  const expiresAt = Math.max(opensAt + accessDays * DAY, overrideMs || 0);
  return { opensAt, expiresAt };
};

/**
 * POST /api/course-videos
 * Auth: Firebase ID token.
 *
 * Returns the lessons a paid student may watch right now. A lesson whose window
 * has closed comes back named, but WITHOUT its Drive id: the id is the only
 * thing needed to play a video, so sending it alongside an "expired" flag would
 * make the expiry a suggestion rather than a limit.
 *
 * The window is enforced here rather than in Firestore rules, because anything
 * stored on the enrolment document stays readable by its owner forever.
 *
 * The demo video is returned to any signed-in user, so somebody can see what
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
  const demoVideoId = driveIdFrom(env('COURSE_DEMO_VIDEO_URL'));

  try {
    const snap = await adminDb()
      .collection('enrollments')
      .where('uid', '==', user.uid)
      .where('status', '==', 'paid')
      .limit(10)
      .get();

    // Subjects and video ids, never a shareable folder link. Each lesson is
    // played in an embedded player on our own page.
    let library = { subjects: [], totalVideos: 0 };
    let libraryError = null;
    try {
      library = await listCourseLibrary();
    } catch (error) {
      console.error('Could not read the course Drive folder:', error);
      libraryError = 'Videos are being set up. Please check back shortly.';
    }

    // Signed in but has not bought: the demo, plus the handful of free
    // lessons. Everything else is listed by name so they can see what the
    // course holds, but WITHOUT its id, so there is nothing to play.
    if (snap.empty) {
      const free = freeVideoIds(library);
      let freeVideos = 0;
      let lockedVideos = 0;

      const subjects = library.subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        videos: subject.videos.map((video) => {
          const isFree = free.has(video.id);
          if (isFree) freeVideos += 1;
          else lockedVideos += 1;
          return {
            ...(isFree ? { id: video.id } : {}),
            name: video.name,
            chapter: video.chapter,
            durationMs: video.durationMs,
            free: isFree,
            locked: !isFree,
          };
        }),
      }));

      return res.status(200).json({
        hasAccess: false,
        reason: 'not-enrolled',
        demoVideoId,
        subjects,
        totalVideos: library.totalVideos,
        freeVideos,
        lockedVideos,
        libraryError,
        watermark: [user.name, user.email].filter(Boolean).join('  ') || null,
        accessDays: ACCESS_DAYS,
      });
    }

    const now = Date.now();

    // Use the most recent enrolment, so re-buying restarts the clocks.
    const enrolments = snap.docs
      .map((d) => d.data())
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    const current = enrolments[0];
    const paidAtMs = new Date(current.paidAt).getTime();
    const overrideMs = current.videoAccessExpiresAt ? new Date(current.videoAccessExpiresAt).getTime() : 0;
    const course = getCourse(current.courseId);

    let openVideos = 0;
    let expiredVideos = 0;

    const subjects = library.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      videos: subject.videos.map((video) => {
        const { opensAt, expiresAt } = windowFor(video.addedAt, paidAtMs, overrideMs);
        const msLeft = expiresAt - now;
        const expired = msLeft <= 0;
        if (expired) expiredVideos += 1;
        else openVideos += 1;

        return {
          // Deliberately absent once this lesson's window has closed.
          ...(expired ? {} : { id: video.id }),
          name: video.name,
          chapter: video.chapter,
          durationMs: video.durationMs,
          expired,
          openedAt: new Date(opensAt).toISOString(),
          expiresAt: new Date(expiresAt).toISOString(),
          // Round up: with 10 hours left a student has "1 day", not "0 days".
          daysRemaining: expired ? 0 : Math.max(0, Math.ceil(msLeft / DAY)),
          hoursRemaining: expired ? 0 : Math.max(0, Math.floor(msLeft / (60 * 60 * 1000))),
        };
      }),
    }));

    return res.status(200).json({
      hasAccess: true,
      demoVideoId,
      subjects,
      totalVideos: library.totalVideos,
      openVideos,
      expiredVideos,
      libraryError,
      // Burnt across the picture while a lesson plays, so any recording of it
      // carries the name of the account it was taken from.
      watermark:
        [current.studentName || user.name, current.email || user.email].filter(Boolean).join('  ')
        || null,
      courseTitle: current.courseTitle || course?.title || null,
      receiptNo: current.receiptNo || null,
      paidAt: current.paidAt,
      accessDays: ACCESS_DAYS,
    });
  } catch (error) {
    return fail(res, 500, 'Could not check your course access.', error);
  }
}
