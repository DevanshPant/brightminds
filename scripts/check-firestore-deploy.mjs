/**
 * Asks Firebase directly what is actually deployed: the live security rules and
 * the composite indexes. `check:firebase` proves the credentials work; this
 * proves the project is configured the way the app needs it.
 *
 *   npm run check:deploy
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', D = '\x1b[2m', X = '\x1b[0m';
const ok = (m) => console.log(`  ${G}OK${X}   ${m}`);
const bad = (m) => console.log(`  ${R}FAIL${X} ${m}`);
const warn = (m) => console.log(`  ${Y}WARN${X} ${m}`);

let problems = 0;
const fail = (m) => { problems += 1; bad(m); };

// ── load .env ───────────────────────────────────────────────────────────────
const envPath = path.join(root, '.env');
if (!existsSync(envPath)) {
  console.error('\nNo .env file found.\n');
  process.exit(1);
}
for (const raw of (await readFile(envPath, 'utf8')).split(/\r?\n/)) {
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

const projectId = process.env.FIREBASE_PROJECT_ID;
console.log(`\nFirestore deployment check — project ${projectId}\n`);

// ── access token from the service account ───────────────────────────────────
const { getAdminApp } = await import('../api/_lib/firebaseAdmin.js');
const app = getAdminApp();
const token = (await app.options.credential.getAccessToken()).access_token;

const api = async (url) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

// ── 1. security rules ───────────────────────────────────────────────────────
console.log('Security rules');
try {
  const releases = await api(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
  );

  if (releases.status === 403) {
    warn('The service account cannot read rules (missing IAM permission).');
    console.log(`${D}       Not fatal — check them by eye in the Firebase console.${X}`);
  } else if (releases.status !== 200) {
    fail(`Rules API returned ${releases.status}: ${releases.body?.error?.message || ''}`);
  } else {
    const release = (releases.body.releases || []).find((r) =>
      r.name.endsWith('/cloud.firestore'),
    );
    if (!release) {
      fail('No Firestore rules have ever been published for this project.');
    } else {
      const src = await api(
        `https://firebaserules.googleapis.com/v1/${release.rulesetName}`,
      );
      const live = (src.body?.source?.files || []).map((f) => f.content).join('\n');

      if (!live) {
        fail('Could not read the live ruleset contents.');
      } else if (/allow read, write: if true/.test(live)) {
        fail('DEFAULT TEST-MODE RULES ARE LIVE — your database is world-writable.');
      } else {
        ok(`Rules published ${new Date(release.updateTime).toLocaleString('en-IN')}`);

        // Does the live ruleset match what this repo expects?
        const expected = await readFile(path.join(root, 'firestore.rules'), 'utf8');
        const strip = (s) =>
          s.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
        if (strip(live) === strip(expected)) {
          ok('Live rules match firestore.rules in this repo');
        } else {
          fail('Live rules DIFFER from firestore.rules in this repo — redeploy them');
        }

        for (const [label, re] of [
          ['enrollments are server-write-only', /match \/enrollments\/\{[^}]+\}\s*\{[^}]*allow write: if false/],
          ['orders are server-write-only', /match \/orders\/\{[^}]+\}\s*\{[^}]*allow write: if false/],
          ['default deny at the end', /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false/],
        ]) {
          if (re.test(live)) ok(label);
          else fail(`live rules missing: ${label}`);
        }

        const admins = String(process.env.VITE_ADMIN_EMAILS || '')
          .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
        const missing = admins.filter((e) => !live.toLowerCase().includes(e));
        if (missing.length) fail(`admin email(s) not in live rules: ${missing.join(', ')}`);
        else if (admins.length) ok(`admin allowlist live (${admins.length})`);
      }
    }
  }
} catch (error) {
  fail(`Rules check failed: ${error.message}`);
}

// ── 2. composite indexes ────────────────────────────────────────────────────
console.log('\nComposite indexes');
const required = [
  // Only this one is genuinely required. The equality-only queries
  // (uid + courseId + status) are served by Firestore's automatic
  // single-field index merging, so they need no composite index.
  { collection: 'enrollments', fields: [['uid', 'ASCENDING'], ['paidAt', 'DESCENDING']],
    used: 'student dashboard (my courses)' },
];

try {
  const res = await api(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/-/indexes`,
  );

  if (res.status !== 200) {
    fail(`Index API returned ${res.status}: ${res.body?.error?.message || ''}`);
  } else {
    const live = res.body.indexes || [];
    for (const want of required) {
      const match = live.find((idx) => {
        if (!idx.name.includes(`/collectionGroups/${want.collection}/`)) return false;
        const f = (idx.fields || []).filter((x) => x.fieldPath !== '__name__');
        return (
          f.length === want.fields.length &&
          f.every((x, i) => x.fieldPath === want.fields[i][0] && x.order === want.fields[i][1])
        );
      });
      const label = `${want.collection}: ${want.fields.map((f) => `${f[0]} ${f[1] === 'ASCENDING' ? 'asc' : 'desc'}`).join(', ')}`;
      if (!match) {
        fail(`MISSING index — ${label}`);
        console.log(`${D}       Needed by: ${want.used}${X}`);
      } else if (match.state !== 'READY') {
        warn(`${label} — still building (state: ${match.state})`);
      } else {
        ok(label);
      }
    }
  }
} catch (error) {
  fail(`Index check failed: ${error.message}`);
}

console.log('');
if (problems === 0) {
  console.log(`${G}Firestore is deployed correctly.${X}\n`);
  process.exit(0);
}
console.log(`${R}${problems} problem(s) to fix.${X}`);
console.log(`${D}Fix both at once:  npm run firebase:deploy -- --project ${projectId}${X}\n`);
process.exit(1);
