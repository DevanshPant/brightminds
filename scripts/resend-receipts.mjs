/**
 * Re-sends the receipt for enrolments whose email failed.
 *
 *   npm run resend:receipts              dry run, lists who would be emailed
 *   npm run resend:receipts -- --send    actually sends
 *   npm run resend:receipts -- --send --all   re-send to everyone, not just failures
 *
 * A student who has paid must end up with a receipt. If the send failed at the
 * time - a bad from-address, an expired key, Resend down - this fixes it after
 * the cause is sorted, without touching the payment.
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

const SEND = process.argv.includes('--send');
const ALL = process.argv.includes('--all');

const { adminDb } = await import('../api/_lib/firebaseAdmin.js');
const { sendEnrollmentEmails } = await import('../api/_lib/email.js');
const db = adminDb();

console.log('\nResend receipts\n');

const snap = await db.collection('enrollments').where('status', '==', 'paid').get();
const targets = snap.docs.filter((d) => ALL || d.data().receiptEmailSent !== true);

if (targets.length === 0) {
  console.log(`${G}Every paid enrolment already has its receipt.${X}`);
  console.log(`${D}Re-send to everyone anyway with --all.${X}\n`);
  process.exit(0);
}

console.log(`${targets.length} enrolment(s) without a delivered receipt:\n`);
for (const doc of targets) {
  const e = doc.data();
  console.log(`  ${(e.receiptNo || '?').padEnd(14)} ${String(e.email || '(no email)').padEnd(32)} INR ${e.amount}`);
  if (e.emailError) console.log(`  ${D}   last error: ${e.emailError}${X}`);
}

if (!SEND) {
  console.log(`\n${Y}Dry run - nothing sent.${X}`);
  console.log(`${D}Send for real:  npm run resend:receipts -- --send${X}\n`);
  process.exit(0);
}

let sent = 0, failed = 0;
console.log('');
for (const doc of targets) {
  const enrollment = doc.data();
  // Pick up a WhatsApp link if one has been configured since they paid.
  const whatsappLink = process.env.WHATSAPP_COMMUNITY_LINK || enrollment.whatsappLink || null;
  const result = await sendEnrollmentEmails({ ...enrollment, whatsappLink });

  await doc.ref.set(
    {
      receiptEmailSent: result.studentEmailSent,
      adminEmailSent: result.adminEmailSent,
      emailError: result.reason || null,
      receiptResentAt: new Date().toISOString(),
    },
    { merge: true },
  );

  if (result.studentEmailSent) {
    sent += 1;
    console.log(`  ${G}sent${X}   ${enrollment.receiptNo}  ${enrollment.email}`);
  } else {
    failed += 1;
    console.log(`  ${R}failed${X} ${enrollment.receiptNo}  ${enrollment.email}`);
    console.log(`         ${result.reason || 'unknown error'}`);
  }
}

console.log(`\n${failed === 0 ? G : R}${sent} sent, ${failed} failed.${X}\n`);
process.exit(failed === 0 ? 0 : 1);
