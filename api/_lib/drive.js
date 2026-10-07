import { JWT } from 'google-auth-library';

/** Quotes are .env syntax; a dashboard stores them literally. */
const env = (name) => {
  const raw = (process.env[name] || '').trim();
  return (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
    ? raw.slice(1, -1).trim()
    : raw;
};

/**
 * Reads the course Drive folder with the service account the project already
 * uses. Share the folder with FIREBASE_CLIENT_EMAIL as a Viewer and nothing
 * else is needed - no second set of credentials, no admin screen. Whatever is
 * uploaded to Drive shows up on the site.
 */
function serviceAccount() {
  const blob = env('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (blob) {
    const parsed = JSON.parse(blob.trim().startsWith('{') ? blob : Buffer.from(blob, 'base64').toString('utf8'));
    return { clientEmail: parsed.client_email, privateKey: parsed.private_key };
  }
  return {
    clientEmail: env('FIREBASE_CLIENT_EMAIL'),
    // Vercel stores newlines as the two characters \ and n.
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
  };
}

let cachedToken = null;
let cachedUntil = 0;

async function driveToken() {
  if (cachedToken && Date.now() < cachedUntil) return cachedToken;

  const { clientEmail, privateKey } = serviceAccount();
  if (!clientEmail || !privateKey) throw new Error('Firebase service account is not configured.');

  const jwt = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const { access_token: token } = await jwt.authorize();

  cachedToken = token;
  // Tokens last an hour; refresh a few minutes early.
  cachedUntil = Date.now() + 50 * 60 * 1000;
  return token;
}

const api = async (params) => {
  const token = await driveToken();
  const url = 'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams(params);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error?.message || `Drive API returned ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return body;
};

const FOLDER_MIME = 'application/vnd.google-apps.folder';

/**
 * The id from whatever was pasted into the setting.
 *
 * A Drive folder's id is easy to confuse with the URL it appears in, and the
 * URL is what the browser puts on the clipboard, so both are accepted. Drive's
 * own error for a URL is "File not found: ." which says nothing useful.
 */
export const driveIdFrom = (value) => {
  const raw = (value || '').trim();
  if (!raw) return null;
  const match =
    raw.match(/\/folders\/([-\w]+)/)
    || raw.match(/\/d\/([-\w]+)/)
    || raw.match(/[?&]id=([-\w]+)/);
  if (match) return match[1];
  return /^[-\w]{10,}$/.test(raw) ? raw : null;
};

const listChildren = (folderId) =>
  api({
    q: `'${folderId}' in parents and trashed = false`,
    fields:
      'files(id,name,mimeType,videoMediaMetadata(durationMillis),createdTime,capabilities(canDownload),copyRequiresWriterPermission)',
    orderBy: 'name_natural',
    pageSize: '200',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

const isVideo = (f) => typeof f.mimeType === 'string' && f.mimeType.startsWith('video/');

const toVideo = (f, chapter) => ({
  id: f.id,
  // Drop the file extension, which students have no use for.
  name: f.name.replace(/\.[^.]+$/, '').trim(),
  // The folder path below the subject, when a subject is split into chapters.
  chapter: chapter || null,
  durationMs: Number(f.videoMediaMetadata?.durationMillis) || null,
  addedAt: f.createdTime || null,
  // True when Drive would still offer this file for download inside the player.
  downloadable: f.copyRequiresWriterPermission !== true,
});

/**
 * Every video inside a subject, however deeply it is filed.
 *
 * Subjects are not filed consistently: some hold their videos directly, others
 * are split into chapter folders. Walking the whole subtree means neither
 * arrangement quietly disappears from the site, which is what happened when
 * this only looked one level down.
 */
async function collectVideos(folderId, chapter, depth, seen) {
  if (depth > 4 || seen.has(folderId)) return [];
  seen.add(folderId);

  const { files = [] } = await listChildren(folderId);
  const videos = files.filter(isVideo).map((f) => toVideo(f, chapter));

  const nested = await Promise.all(
    files
      .filter((f) => f.mimeType === FOLDER_MIME)
      .map((f) => collectVideos(f.id, chapter ? `${chapter} / ${f.name.trim()}` : f.name.trim(), depth + 1, seen)),
  );

  return videos.concat(...nested);
}

/**
 * The course library: each subject folder with the videos inside it.
 * Videos sitting loose at the top level are grouped under "Other".
 *
 * Returns only ids, names and durations - never a shareable folder URL.
 */
export async function listCourseLibrary() {
  const configured = env('COURSE_DRIVE_FOLDER_ID');
  if (!configured) throw new Error('COURSE_DRIVE_FOLDER_ID is not set.');

  const rootId = driveIdFrom(configured);
  if (!rootId) throw new Error('COURSE_DRIVE_FOLDER_ID is not a Drive folder id or URL.');

  // The demo is offered separately to everyone, so it is not a lesson.
  const demoId = driveIdFrom(env('COURSE_DEMO_VIDEO_URL'));

  const { files = [] } = await listChildren(rootId);
  const seen = new Set([rootId]);

  const subjects = await Promise.all(
    files
      .filter((f) => f.mimeType === FOLDER_MIME)
      .map(async (folder) => ({
        id: folder.id,
        name: folder.name.trim(),
        videos: await collectVideos(folder.id, null, 1, seen),
      })),
  );

  const loose = files.filter(isVideo).map((f) => toVideo(f, null));
  if (loose.length) subjects.push({ id: rootId, name: 'Other', videos: loose });

  const withVideos = subjects
    .map((s) => ({ ...s, videos: s.videos.filter((v) => v.id !== demoId) }))
    .filter((s) => s.videos.length > 0);

  return {
    subjects: withVideos,
    totalVideos: withVideos.reduce((n, s) => n + s.videos.length, 0),
    // Lets the setup check report which files Drive would still let a student
    // download from inside the player.
    downloadable: withVideos.flatMap((s) => s.videos.filter((v) => v.downloadable).map((v) => `${s.name} / ${v.name}`)),
  };
}
