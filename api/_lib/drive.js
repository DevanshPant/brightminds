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

const listChildren = (folderId, extraQuery) =>
  api({
    q: `'${folderId}' in parents and trashed = false${extraQuery || ''}`,
    fields: 'files(id,name,mimeType,videoMediaMetadata(durationMillis),createdTime,modifiedTime,thumbnailLink)',
    orderBy: 'name_natural',
    pageSize: '200',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

/**
 * The course library: each subject folder with the videos inside it.
 * Videos sitting loose at the top level are grouped under "Other".
 *
 * Returns only ids, names and durations - never a shareable folder URL.
 */
export async function listCourseLibrary() {
  const rootId = env('COURSE_DRIVE_FOLDER_ID');
  if (!rootId) throw new Error('COURSE_DRIVE_FOLDER_ID is not set.');

  const root = await listChildren(rootId);
  const folders = (root.files || []).filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
  const looseVideos = (root.files || []).filter((f) => f.mimeType?.startsWith('video/'));

  const toVideo = (f) => ({
    id: f.id,
    name: f.name.replace(/\.[^.]+$/, ''),
    durationMs: Number(f.videoMediaMetadata?.durationMillis) || null,
    addedAt: f.createdTime || null,
  });

  // One request per subject, run together.
  const subjects = await Promise.all(
    folders.map(async (folder) => {
      const children = await listChildren(folder.id, " and mimeType contains 'video/'");
      return {
        id: folder.id,
        name: folder.name,
        videos: (children.files || []).map(toVideo),
      };
    }),
  );

  if (looseVideos.length) {
    subjects.push({ id: rootId, name: 'Other', videos: looseVideos.map(toVideo) });
  }

  const withVideos = subjects.filter((s) => s.videos.length > 0);
  return {
    subjects: withVideos,
    totalVideos: withVideos.reduce((n, s) => n + s.videos.length, 0),
  };
}
