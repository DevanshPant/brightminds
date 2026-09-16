/**
 * Checks that the Firebase credentials in .env are present, well-formed and
 * actually work - before you deploy and discover it at the checkout screen.
 *
 *   npm run check:firebase
 *
 * Reads .env directly (no dependency). Never prints a secret value.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const ok = (msg) => console.log(`  ${GREEN}✓${RESET} ${msg}`);
const bad = (msg) => console.log(`  ${RED}✗${RESET} ${msg}`);
const warn = (msg) => console.log(`  ${YELLOW}!${RESET} ${msg}`);

let problems = 0;
const fail = (msg) => {
  problems += 1;
  bad(msg);
};

/** Minimal .env parser: KEY=value, honours quotes, ignores comments. */
function parseEnv(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

console.log('\nFirebase configuration check\n');

if (!existsSync(envPath)) {
  console.log(`${RED}No .env file found.${RESET}`);
  console.log(`${DIM}Copy .env.example to .env and fill in your values:${RESET}`);
  console.log(`${DIM}  cp .env.example .env${RESET}\n`);
  process.exit(1);
}

const env = parseEnv(await readFile(envPath, 'utf8'));
const has = (key) => Boolean(env[key] && env[key].trim() && !env[key].includes('XXXX'));

// ── Browser SDK config ──────────────────────────────────────────────────────
console.log('Browser config (VITE_FIREBASE_*)');

const webVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

for (const key of webVars) {
  if (has(key)) ok(key);
  else fail(`${key} is missing or still a placeholder`);
}

if (has('VITE_FIREBASE_STORAGE_BUCKET')) ok('VITE_FIREBASE_STORAGE_BUCKET');
else warn('VITE_FIREBASE_STORAGE_BUCKET is empty (fine - nothing uses Storage yet)');

if (has('VITE_FIREBASE_MESSAGING_SENDER_ID')) ok('VITE_FIREBASE_MESSAGING_SENDER_ID');
else warn('VITE_FIREBASE_MESSAGING_SENDER_ID is empty (fine - no push notifications)');

if (has('VITE_FIREBASE_API_KEY') && !/^AIza[\w-]{30,}$/.test(env.VITE_FIREBASE_API_KEY)) {
  fail('VITE_FIREBASE_API_KEY does not look like a Firebase web API key (should start with "AIza")');
}

if (has('VITE_FIREBASE_AUTH_DOMAIN') && !/\.(firebaseapp\.com|web\.app)$/.test(env.VITE_FIREBASE_AUTH_DOMAIN)) {
  warn('VITE_FIREBASE_AUTH_DOMAIN usually ends in .firebaseapp.com - double-check it');
}

// ── Admin SDK credentials ───────────────────────────────────────────────────
console.log('\nServer credentials (Firebase Admin)');

const hasBlob = has('FIREBASE_SERVICE_ACCOUNT_JSON');
const hasTriple =
  has('FIREBASE_PROJECT_ID') && has('FIREBASE_CLIENT_EMAIL') && has('FIREBASE_PRIVATE_KEY');

if (!hasBlob && !hasTriple) {
  fail(
    'Admin credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY',
  );
} else {
  ok(hasBlob ? 'FIREBASE_SERVICE_ACCOUNT_JSON present' : 'Admin credentials present');
}

// The single most common mistake: a private key whose \n escapes got mangled.
if (has('FIREBASE_PRIVATE_KEY')) {
  const key = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  // The JSON file lists "private_key_id" directly above "private_key". Copying
  // the wrong one is the single easiest mistake here, so name it explicitly.
  if (/^[0-9a-f]{20,80}$/i.test(key.trim())) {
    fail(
      'FIREBASE_PRIVATE_KEY holds a plain hex string - that is the "private_key_id" field.\n' +
        '      You want "private_key", the long value just below it that starts with\n' +
        '      -----BEGIN PRIVATE KEY-----',
    );
  } else if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    fail('FIREBASE_PRIVATE_KEY is missing the "-----BEGIN PRIVATE KEY-----" header');
  } else if (!key.trimEnd().endsWith('-----END PRIVATE KEY-----')) {
    fail('FIREBASE_PRIVATE_KEY is missing the "-----END PRIVATE KEY-----" footer');
  } else if (key.split('\n').length < 3) {
    fail('FIREBASE_PRIVATE_KEY has no line breaks - keep the \\n sequences from the JSON file');
  } else {
    ok('FIREBASE_PRIVATE_KEY looks well-formed');
  }
}

for (const [webKey, adminKey] of [['VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID']]) {
  if (has(webKey) && has(adminKey) && env[webKey] !== env[adminKey]) {
    fail(`${webKey} and ${adminKey} point at different projects - they must match`);
  }
}

if (has('FIREBASE_CLIENT_EMAIL') && !/^[^@]+@[^.]+\.iam\.gserviceaccount\.com$/.test(env.FIREBASE_CLIENT_EMAIL)) {
  warn('FIREBASE_CLIENT_EMAIL usually ends in .iam.gserviceaccount.com - double-check it');
}

// ── Admin emails vs Firestore rules ─────────────────────────────────────────
console.log('\nAdmin access');

if (has('VITE_ADMIN_EMAILS')) {
  const admins = env.VITE_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  ok(`VITE_ADMIN_EMAILS: ${admins.length} address${admins.length === 1 ? '' : 'es'}`);

  const rules = await readFile(path.join(root, 'firestore.rules'), 'utf8');
  const missing = admins.filter((email) => !rules.toLowerCase().includes(email));
  if (missing.length > 0) {
    fail(
      `Not listed in firestore.rules → adminEmails(): ${missing.join(', ')}\n` +
        `      /admin will load but Firestore will refuse to return the data.`,
    );
  } else {
    ok('All admin emails are present in firestore.rules');
  }
} else {
  warn('VITE_ADMIN_EMAILS is empty - nobody will be able to open /admin');
}

// ── Live connection ─────────────────────────────────────────────────────────
if (problems === 0 && (hasBlob || hasTriple)) {
  console.log('\nLive connection test');
  for (const [key, value] of Object.entries(env)) process.env[key] = value;

  try {
    const { adminDb, adminAuth } = await import('../api/_lib/firebaseAdmin.js');

    const db = adminDb();
    const ref = db.collection('_healthcheck').doc('setup');
    await ref.set({ checkedAt: new Date().toISOString() });
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Wrote the document but could not read it back');
    await ref.delete();
    ok('Firestore write, read and delete all succeeded');

    await adminAuth().listUsers(1);
    ok('Firebase Auth is reachable');
  } catch (error) {
    problems += 1;
    bad(`Could not reach Firebase: ${error.message}`);
    const message = String(error.message || '');
    if (/PERMISSION_DENIED|403/.test(message)) {
      console.log(
        `${DIM}      The service account lacks permission, or Firestore has not been created yet.${RESET}`,
      );
    } else if (/NOT_FOUND|5 NOT_FOUND/.test(message)) {
      console.log(
        `${DIM}      Firestore database does not exist yet - create it in the Firebase console.${RESET}`,
      );
    } else if (/DECODER|PEM|private key/i.test(message)) {
      console.log(
        `${DIM}      The private key is malformed. Keep the \\n escapes and wrap it in double quotes.${RESET}`,
      );
    }
  }
}

console.log('');
if (problems === 0) {
  console.log(`${GREEN}✓ Firebase is configured correctly.${RESET}\n`);
  process.exit(0);
}
console.log(`${RED}✗ ${problems} problem${problems === 1 ? '' : 's'} to fix.${RESET}\n`);
process.exit(1);
