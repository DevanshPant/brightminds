import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Credentials come from either
 *   FIREBASE_SERVICE_ACCOUNT_JSON  (whole service-account JSON, raw or base64), or
 *   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 */
function resolveServiceAccount() {
  const blob = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (blob) {
    const decoded = blob.trim().startsWith('{')
      ? blob
      : Buffer.from(blob, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel stores newlines as the two characters \ and n.
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .replace(/^"|"$/g, '');

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

let cachedApp = null;

export function getAdminApp() {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApp();
    return cachedApp;
  }

  const serviceAccount = resolveServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.',
    );
  }

  cachedApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
  return cachedApp;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());

/** Verifies the `Authorization: Bearer <idToken>` header. Returns the decoded token. */
export async function requireUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    const error = new Error('You need to be signed in to do this.');
    error.status = 401;
    throw error;
  }

  try {
    return await adminAuth().verifyIdToken(token);
  } catch (cause) {
    const error = new Error('Your session has expired. Please sign in again.');
    error.status = 401;
    error.cause = cause;
    throw error;
  }
}
