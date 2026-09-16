/**
 * Wipes enrolment data so testing can start from a clean slate.
 *
 *   npm run reset:data              dry run - shows what WOULD go, deletes nothing
 *   npm run reset:data -- --confirm backs everything up, then deletes
 *
 * Always writes a JSON backup before deleting. Firestore has no undo.
 *
 * Clears: users, enrollments, orders, counters, webhookEvents, _healthcheck
 * and the matching Firebase Auth accounts, so a signup can be retested from
 * scratch. Leaves security rules, indexes and configuration untouched.
 */
import { mkdir, writeFile } from 'node:fs/promises';
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

const CONFIRM = process.argv.includes('--confirm');
const COLLECTIONS = ['users', 'enrollments', 'orders', 'counters', 'webhookEvents', '_healthcheck'];

const { adminDb, adminAuth } = await import('../api/_lib/firebaseAdmin.js');
const db = adminDb();
const auth = adminAuth();

console.log(`\nReset test data — project ${process.env.FIREBASE_PROJECT_ID}\n`);

// ── inventory ───────────────────────────────────────────────────────────────
const snapshot = {};
let total = 0;

for (const name of COLLECTIONS) {
  const snap = await db.collection(name).get();
  snapshot[name] = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  total += snap.size;
  console.log(`  ${String(snap.size).padStart(3)}  ${name}`);
}

const users = await auth.listUsers(1000);
console.log(`  ${String(users.users.length).padStart(3)}  (Firebase Auth accounts)`);

// Anything that represents money gets called out by name before it goes.
const payments = snapshot.enrollments.filter((e) => e.data.status === 'paid');
if (payments.length) {
  console.log(`\n${Y}These are real payment records:${X}`);
  for (const p of payments) {
    console.log(
      `  ${p.data.receiptNo || '(no receipt)'}  INR ${p.data.amount}  ` +
        `${p.data.razorpayPaymentId || ''}  ${String(p.data.email || '').replace(/^(.{3})[^@]*/, '$1***')}`,
    );
  }
  console.log(`${D}  Deleting these does NOT refund anything. Refund in the Razorpay dashboard.${X}`);
}

if (total === 0 && users.users.length === 0) {
  console.log(`\n${G}Already empty — nothing to do.${X}\n`);
  process.exit(0);
}

if (!CONFIRM) {
  console.log(`\n${Y}Dry run — nothing deleted.${X}`);
  console.log(`${D}To go ahead:  npm run reset:data -- --confirm${X}\n`);
  process.exit(0);
}

// ── backup ──────────────────────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(root, 'backups');
await mkdir(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `firestore-${stamp}.json`);
await writeFile(
  backupPath,
  JSON.stringify(
    { takenAt: new Date().toISOString(), collections: snapshot, authUsers: users.users.map((u) => ({ uid: u.uid, email: u.email, displayName: u.displayName, phoneNumber: u.phoneNumber })) },
    null,
    2,
  ),
);
console.log(`\n${G}Backup written${X} ${path.relative(root, backupPath)}`);

// ── delete ──────────────────────────────────────────────────────────────────
console.log('\nDeleting:');
for (const name of COLLECTIONS) {
  const docs = snapshot[name];
  if (!docs.length) continue;
  // Batches cap at 500 writes.
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach((d) => batch.delete(db.collection(name).doc(d.id)));
    await batch.commit();
  }
  console.log(`  ${G}cleared${X} ${name} (${docs.length})`);
}

if (users.users.length) {
  const uids = users.users.map((u) => u.uid);
  const result = await auth.deleteUsers(uids);
  console.log(`  ${G}cleared${X} Firebase Auth accounts (${result.successCount} deleted, ${result.failureCount} failed)`);
}

// ── verify ──────────────────────────────────────────────────────────────────
console.log('\nVerifying:');
let leftover = 0;
for (const name of COLLECTIONS) {
  const snap = await db.collection(name).get();
  leftover += snap.size;
  console.log(`  ${snap.size === 0 ? G + 'empty  ' + X : R + String(snap.size) + ' left ' + X} ${name}`);
}
const remainingUsers = await auth.listUsers(10);
console.log(`  ${remainingUsers.users.length === 0 ? G + 'empty  ' + X : R + String(remainingUsers.users.length) + ' left ' + X} Firebase Auth`);

console.log('');
if (leftover === 0 && remainingUsers.users.length === 0) {
  console.log(`${G}Database is clean. Ready to test.${X}`);
  console.log(`${D}Backup kept at ${path.relative(root, backupPath)} (git-ignored).${X}\n`);
} else {
  console.log(`${R}Some records remain — re-run to clear them.${X}\n`);
  process.exit(1);
}
