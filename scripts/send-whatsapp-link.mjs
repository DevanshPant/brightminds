/**
 * Emails the WhatsApp community link to every enrolled student.
 *
 * For when the link arrives after students have already paid — their original
 * receipt said "your invite is on its way", and this is what sends it.
 *
 *   npm run send:whatsapp-link              dry run, lists who would be emailed
 *   npm run send:whatsapp-link -- --send    actually sends
 *
 * Safe to re-run: students already marked as sent are skipped unless you pass
 * --force. Reads the link from WHATSAPP_COMMUNITY_LINK in .env.
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
const FORCE = process.argv.includes('--force');
const link = process.env.WHATSAPP_COMMUNITY_LINK;
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL || 'BrightMinds <onboarding@resend.dev>';

console.log('\nWhatsApp community link — send to enrolled students\n');

if (!link) {
  console.log(`${R}WHATSAPP_COMMUNITY_LINK is empty in .env.${X}`);
  console.log(`${D}Paste the invite link into WHATSAPP_COMMUNITY_LINK (and VITE_WHATSAPP_COMMUNITY_LINK) first.${X}\n`);
  process.exit(1);
}
if (!/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(link)) {
  console.log(`${Y}Warning:${X} that does not look like a WhatsApp invite link:`);
  console.log(`  ${link}\n`);
}
if (SEND && !apiKey) {
  console.log(`${R}RESEND_API_KEY is empty — cannot send.${X}\n`);
  process.exit(1);
}

const { adminDb } = await import('../api/_lib/firebaseAdmin.js');
const db = adminDb();

const snap = await db.collection('enrollments').where('status', '==', 'paid').get();

// One email per student, even if they bought more than one course.
const byEmail = new Map();
snap.docs.forEach((doc) => {
  const e = doc.data();
  if (!e.email) return;
  if (!FORCE && e.whatsappLinkSentAt) return;
  if (!byEmail.has(e.email)) byEmail.set(e.email, { ...e, ref: doc.ref });
});

const recipients = [...byEmail.values()];

if (recipients.length === 0) {
  console.log(`${G}Nobody to email${X} — every enrolled student has already been sent the link.`);
  console.log(`${D}Re-send to everyone anyway with --force.${X}\n`);
  process.exit(0);
}

console.log(`${recipients.length} student(s) would receive the link:\n`);
recipients.forEach((r) =>
  console.log(`  ${(r.studentName || '(no name)').padEnd(22)} ${r.email}`),
);

if (!SEND) {
  console.log(`\n${Y}Dry run — nothing sent.${X}`);
  console.log(`${D}Send for real:  npm run send:whatsapp-link -- --send${X}\n`);
  process.exit(0);
}

const { buildReceiptEmail } = await import('../api/_lib/email.js');
let sent = 0, failed = 0;

for (const r of recipients) {
  // Re-uses the receipt template with the link present, so the student gets a
  // complete record rather than a bare link with no context.
  const { html } = buildReceiptEmail({ ...r, whatsappLink: link });
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: r.email,
        subject: `Join the BrightMinds community — ${r.courseTitle}`,
        html,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);

    await r.ref.set({ whatsappLinkSentAt: new Date().toISOString() }, { merge: true });
    sent += 1;
    console.log(`  ${G}sent${X}   ${r.email}`);
  } catch (error) {
    failed += 1;
    console.log(`  ${R}failed${X} ${r.email} — ${error.message}`);
  }
}

console.log(`\n${failed === 0 ? G : R}${sent} sent, ${failed} failed.${X}\n`);
process.exit(failed === 0 ? 0 : 1);
