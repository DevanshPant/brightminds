/**
 * Sets the recording access window on existing paid enrolments.
 *
 *   npm run set:video-access                 dry run
 *   npm run set:video-access -- --write      7 days from now
 *   npm run set:video-access -- --write --days 14
 *   npm run set:video-access -- --write --all   re-stamp everyone, including
 *                                               those who already have a window
 *
 * New students need nothing: their window is counted from their payment. This
 * exists for students who paid BEFORE recordings were offered - their window
 * would otherwise be measured from a date in the past and be over before it
 * started.
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
  if (v.length > 1 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) v = v.slice(1, -1);
  process.env[line.slice(0, eq).trim()] = v;
}

const argOf = (n) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? null : process.argv[i + 1]; };
const WRITE = process.argv.includes('--write');
const ALL = process.argv.includes('--all');
const days = Number(argOf('days') || process.env.COURSE_VIDEO_ACCESS_DAYS || 7);

const { adminDb } = await import('../api/_lib/firebaseAdmin.js');
const db = adminDb();

const now = new Date();
const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

console.log(`\nRecording access window - ${days} days from now\n`);
console.log(`  opens  : ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
console.log(`  closes : ${expires.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`);

const snap = await db.collection('enrollments').where('status', '==', 'paid').get();
const targets = snap.docs.filter((d) => ALL || !d.data().videoAccessExpiresAt);

if (targets.length === 0) {
  console.log(`${G}Every paid enrolment already has a window.${X}`);
  console.log(`${D}Re-stamp them all with --all.${X}\n`);
  process.exit(0);
}

const mask = (s) => String(s || '').replace(/^(.{3})[^@]*/, '$1***');
console.log(`${targets.length} of ${snap.size} paid enrolment(s) would be updated:\n`);
for (const doc of targets.slice(0, 30)) {
  const e = doc.data();
  const age = Math.floor((now - new Date(e.paidAt)) / 86400000);
  console.log(`  ${(e.receiptNo || '?').padEnd(14)} ${mask(e.email).padEnd(26)} paid ${age}d ago`);
}
if (targets.length > 30) console.log(`  ... and ${targets.length - 30} more`);

if (!WRITE) {
  console.log(`\n${Y}Dry run - nothing written.${X}`);
  console.log(`${D}Apply:  npm run set:video-access -- --write${X}\n`);
  process.exit(0);
}

let updated = 0;
for (let i = 0; i < targets.length; i += 400) {
  const batch = db.batch();
  targets.slice(i, i + 400).forEach((doc) => {
    batch.set(doc.ref, {
      videoAccessExpiresAt: expires.toISOString(),
      videoAccessGrantedAt: now.toISOString(),
    }, { merge: true });
    updated += 1;
  });
  await batch.commit();
}

console.log(`\n${G}${updated} enrolment(s) updated.${X}`);
console.log(`${D}They can watch until ${expires.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.${X}\n`);
