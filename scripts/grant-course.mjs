/**
 * Grants someone the course without a payment.
 *
 *   npm run grant:course -- --email you@example.com
 *   npm run grant:course -- --email you@example.com --days 30
 *   npm run grant:course -- --email you@example.com --revoke
 *
 * For the owner and staff testing the real student experience. The enrolment
 * is marked complimentary with amount 0, so it never inflates the revenue
 * figure on /admin or in the spreadsheet, and it is obvious in the data what
 * it is. No email is sent.
 *
 * The person must have signed in at least once, so there is an account to
 * attach it to.
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

const argOf = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
};
const email = (argOf('email') || '').trim().toLowerCase();
const days = Number(argOf('days') || process.env.COURSE_VIDEO_ACCESS_DAYS || 7);
const REVOKE = process.argv.includes('--revoke');
const COURSE_ID = argOf('course') || 'nda-1-april-2027';

console.log('\nComplimentary course access\n');

if (!email) {
  console.log(`${R}Pass an email:${X}  npm run grant:course -- --email you@example.com\n`);
  process.exit(1);
}

const { adminAuth, adminDb } = await import('../api/_lib/firebaseAdmin.js');
const { getCourse } = await import('../api/_lib/courses.js');
const auth = adminAuth();
const db = adminDb();

const course = getCourse(COURSE_ID);
if (!course) {
  console.log(`${R}Unknown course "${COURSE_ID}".${X}\n`);
  process.exit(1);
}

let user;
try {
  user = await auth.getUserByEmail(email);
} catch {
  console.log(`${R}No account for ${email}.${X}`);
  console.log(`${D}Ask them to sign in at the site once, then run this again.${X}\n`);
  process.exit(1);
}

const docId = `comp_${user.uid}_${COURSE_ID}`;
const ref = db.collection('enrollments').doc(docId);

// ---- revoke ----------------------------------------------------------------
if (REVOKE) {
  const existing = await ref.get();
  if (!existing.exists) {
    console.log(`${Y}No complimentary enrolment to remove for ${email}.${X}\n`);
    process.exit(0);
  }
  await ref.delete();
  console.log(`${G}Removed${X} the complimentary enrolment for ${email}.\n`);
  process.exit(0);
}

// ---- grant -----------------------------------------------------------------
const now = new Date();
const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const paid = await db.collection('enrollments')
  .where('uid', '==', user.uid).where('courseId', '==', COURSE_ID)
  .where('status', '==', 'paid').limit(5).get();
const realPayment = paid.docs.find((d) => !d.id.startsWith('comp_'));
if (realPayment) {
  console.log(`${Y}Note:${X} ${email} already has a real paid enrolment (${realPayment.data().receiptNo}).`);
  console.log(`${D}Granting anyway; the newest enrolment decides video access.${X}\n`);
}

const profile = (await db.collection('users').doc(user.uid).get()).data() || {};

await ref.set({
  enrollmentId: docId,
  uid: user.uid,
  email: user.email,
  studentName: profile.fullName || profile.displayName || user.displayName || null,
  phone: profile.phone || null,
  courseId: course.id,
  courseTitle: course.title,
  // Complimentary: zero amount keeps the revenue total honest.
  amount: 0,
  currency: course.currency || 'INR',
  status: 'paid',
  isComplimentary: true,
  receiptNo: `BM-COMP-${user.uid.slice(0, 6).toUpperCase()}`,
  razorpayOrderId: docId,
  razorpayPaymentId: 'complimentary',
  paidAt: now.toISOString(),
  videoAccessExpiresAt: expires.toISOString(),
  source: 'complimentary',
  whatsappLink: process.env.WHATSAPP_COMMUNITY_LINK || null,
  receiptEmailSent: false,
  adminEmailSent: false,
  grantedAt: now.toISOString(),
}, { merge: true });

console.log(`${G}Granted${X} ${course.title} to ${email}`);
console.log(`  uid           : ${user.uid}`);
console.log(`  video access  : ${days} day(s), until ${expires.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
console.log(`  amount        : INR 0 (complimentary - excluded from revenue)`);
console.log(`\n${D}They will see it on /dashboard immediately. No email was sent.${X}`);
console.log(`${D}Remove it with:  npm run grant:course -- --email ${email} --revoke${X}\n`);
