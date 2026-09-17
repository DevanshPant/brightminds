/**
 * Stamps the current WhatsApp community link onto paid enrolments.
 *
 *   npm run backfill:whatsapp              dry run
 *   npm run backfill:whatsapp -- --write   apply to enrolments missing a link
 *   npm run backfill:whatsapp -- --write --all   overwrite every link (use after
 *                                                the invite URL changes)
 *
 * The link is never published to the browser: a student sees it only through
 * their own enrolment record, which Firestore rules restrict to them. So when
 * the link is set after someone has already paid, or when it changes, their
 * record has to be updated for the button to appear on their dashboard.
 *
 * This only touches the dashboard. To EMAIL the link, use send:whatsapp-link.
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

const WRITE = process.argv.includes('--write');
const ALL = process.argv.includes('--all');
const link = process.env.WHATSAPP_COMMUNITY_LINK;

console.log('\nWhatsApp link backfill\n');

if (!link) {
  console.log(`${R}WHATSAPP_COMMUNITY_LINK is empty in .env.${X}\n`);
  process.exit(1);
}
if (!/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(link)) {
  console.log(`${Y}Warning:${X} that does not look like a WhatsApp invite link.\n  ${link}\n`);
}

const { adminDb } = await import('../api/_lib/firebaseAdmin.js');
const db = adminDb();

const snap = await db.collection('enrollments').where('status', '==', 'paid').get();
const targets = snap.docs.filter((d) => ALL || d.data().whatsappLink !== link);

if (targets.length === 0) {
  console.log(`${G}Every paid enrolment already carries the current link.${X}\n`);
  process.exit(0);
}

console.log(`${targets.length} of ${snap.size} paid enrolment(s) would be updated:\n`);
for (const doc of targets) {
  const e = doc.data();
  const had = e.whatsappLink ? (e.whatsappLink === link ? 'current' : 'an older link') : 'no link';
  console.log(`  ${(e.receiptNo || '?').padEnd(14)} ${String(e.email || '').padEnd(30)} (${had})`);
}

if (!WRITE) {
  console.log(`\n${Y}Dry run - nothing written.${X}`);
  console.log(`${D}Apply:  npm run backfill:whatsapp -- --write${X}\n`);
  process.exit(0);
}

let updated = 0;
for (let i = 0; i < targets.length; i += 400) {
  const batch = db.batch();
  targets.slice(i, i + 400).forEach((doc) => {
    batch.set(doc.ref, { whatsappLink: link, whatsappLinkUpdatedAt: new Date().toISOString() }, { merge: true });
    updated += 1;
  });
  await batch.commit();
}

console.log(`\n${G}${updated} enrolment(s) updated.${X}`);
console.log(`${D}The button now appears on their dashboard. To email it: npm run send:whatsapp-link -- --send${X}\n`);
