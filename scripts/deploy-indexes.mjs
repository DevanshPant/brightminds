/**
 * Creates any composite index from firestore.indexes.json that is not already
 * live. Idempotent: existing indexes are left alone.
 *
 *   npm run deploy:indexes
 *
 * Uses the service-account credentials in .env, so no `firebase login` needed.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', D = '\x1b[2m', X = '\x1b[0m';

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

const projectId = process.env.FIREBASE_PROJECT_ID;
const { getAdminApp } = await import('../api/_lib/firebaseAdmin.js');
const token = (await getAdminApp().options.credential.getAccessToken()).access_token;

const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups`;

const spec = JSON.parse(await readFile(path.join(root, 'firestore.indexes.json'), 'utf8'));

console.log(`\nDeploying composite indexes to ${projectId}\n`);

const listed = await fetch(`${base}/-/indexes`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
const live = listed.indexes || [];

const sameShape = (idx, want) => {
  if (!idx.name.includes(`/collectionGroups/${want.collectionGroup}/`)) return false;
  const f = (idx.fields || []).filter((x) => x.fieldPath !== '__name__');
  return (
    f.length === want.fields.length &&
    f.every((x, i) => x.fieldPath === want.fields[i].fieldPath && x.order === want.fields[i].order)
  );
};

let created = 0;
let failed = 0;

for (const want of spec.indexes) {
  const label = `${want.collectionGroup}: ${want.fields.map((f) => `${f.fieldPath} ${f.order === 'ASCENDING' ? 'asc' : 'desc'}`).join(', ')}`;

  if (live.some((idx) => sameShape(idx, want))) {
    console.log(`  ${D}skip${X}   ${label} ${D}(already exists)${X}`);
    continue;
  }

  const res = await fetch(`${base}/${want.collectionGroup}/indexes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ queryScope: want.queryScope || 'COLLECTION', fields: want.fields }),
  });
  const body = await res.json().catch(() => ({}));

  if (res.ok) {
    created += 1;
    console.log(`  ${G}created${X} ${label}`);
  } else if (res.status === 409 || /already exists/i.test(body?.error?.message || '')) {
    console.log(`  ${D}skip${X}   ${label} ${D}(already exists)${X}`);
  } else {
    failed += 1;
    console.log(`  ${R}FAILED${X} ${label}`);
    console.log(`         ${body?.error?.message || res.status}`);
  }
}

console.log('');
if (failed) {
  console.log(`${R}${failed} index(es) could not be created.${X}\n`);
  process.exit(1);
}
if (created) {
  console.log(`${Y}${created} index(es) created — Firestore builds these in the background.${X}`);
  console.log(`${D}Run \`npm run check:deploy\` in a minute to confirm they are READY.${X}\n`);
} else {
  console.log(`${G}All indexes already present.${X}\n`);
}
