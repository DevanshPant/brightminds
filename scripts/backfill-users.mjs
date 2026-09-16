/**
 * Adds signupAt / loginCount to student profiles created before those fields
 * existed. Idempotent - documents that already have them are left alone.
 *
 *   npm run backfill:users
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const raw of (await readFile(path.join(root, '.env'), 'utf8')).split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;
  let v = line.slice(eq + 1).trim();
  if (v.length > 1 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) v = v.slice(1, -1);
  process.env[line.slice(0, eq).trim()] = v;
}

const { adminDb } = await import('../api/_lib/firebaseAdmin.js');
const db = adminDb();

const users = await db.collection('users').get();
const enrolments = await db.collection('enrollments').get();

// Best available guess at when the account first appeared.
const earliestPayment = new Map();
enrolments.forEach((d) => {
  const e = d.data();
  const prev = earliestPayment.get(e.uid);
  if (!prev || new Date(e.paidAt) < new Date(prev)) earliestPayment.set(e.uid, e.paidAt);
});

let patched = 0;
for (const doc of users.docs) {
  const u = doc.data();
  if (u.signupAt && typeof u.loginCount === 'number') continue;

  const patch = {};
  if (!u.signupAt) {
    const ts = u.lastLoginAt?.toDate?.()?.toISOString?.();
    patch.signupAt = earliestPayment.get(u.uid) || ts || new Date().toISOString();
  }
  if (typeof u.loginCount !== 'number') patch.loginCount = 1;
  if (!u.lastLoginAt || typeof u.lastLoginAt !== 'string') {
    patch.lastLoginAt = u.lastLoginAt?.toDate?.()?.toISOString?.() || patch.signupAt || new Date().toISOString();
  }
  // Carry the phone number across from their payment if we have one.
  if (!u.phone) {
    const withPhone = enrolments.docs.map((d) => d.data()).find((e) => e.uid === u.uid && e.phone);
    if (withPhone) patch.phone = withPhone.phone;
  }

  await doc.ref.set(patch, { merge: true });
  patched += 1;
  console.log(`  patched ${doc.id}: ${Object.keys(patch).join(', ')}`);
}

console.log(`\n${patched} of ${users.size} user document(s) backfilled.\n`);
