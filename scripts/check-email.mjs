/**
 * Verifies the Resend setup end to end.
 *
 *   npm run check:email           checks the key and the sending domain
 *   npm run check:email -- --send also sends a real test receipt to ADMIN_EMAIL
 *
 * The trap this catches: RESEND_FROM_EMAIL can only use a domain you have
 * VERIFIED in Resend. Point it at an unverified domain and every send fails -
 * silently, from the student's point of view.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', D = '\x1b[2m', X = '\x1b[0m';
const ok = (m) => console.log(`  ${G}OK${X}   ${m}`);
const warn = (m) => console.log(`  ${Y}WARN${X} ${m}`);

let problems = 0;
let needsSendTest = false;
const fail = (m, hint) => {
  problems += 1;
  console.log(`  ${R}FAIL${X} ${m}`);
  if (hint) console.log(`${D}       ${hint}${X}`);
};

const envPath = path.join(root, '.env');
if (!existsSync(envPath)) {
  console.error('\nNo .env file found. Copy .env.example to .env first.\n');
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

console.log('\nResend email check\n');

const apiKey = process.env.RESEND_API_KEY;
const fromRaw = process.env.RESEND_FROM_EMAIL || '';
const adminEmail = process.env.ADMIN_EMAIL;

// ── 1. the key ──────────────────────────────────────────────────────────────
console.log('API key');
if (!apiKey) {
  fail(
    'RESEND_API_KEY is empty.',
    'resend.com -> API Keys -> Create API Key -> Sending access. It starts with "re_".',
  );
} else if (!apiKey.startsWith('re_')) {
  fail(`RESEND_API_KEY does not start with "re_" (got "${apiKey.slice(0, 3)}...").`,
       'You may have pasted the From address or a domain ID instead of the key.');
} else {
  ok('RESEND_API_KEY present and correctly shaped');
}

// ── 2. the From address ─────────────────────────────────────────────────────
console.log('\nFrom address');
const fromEmail = (fromRaw.match(/<([^>]+)>/)?.[1] || fromRaw).trim();
const fromDomain = fromEmail.split('@')[1];

if (!fromEmail) {
  warn('RESEND_FROM_EMAIL is empty - will fall back to onboarding@resend.dev');
} else if (!fromDomain) {
  fail(`RESEND_FROM_EMAIL is not a valid address: "${fromRaw}"`);
} else {
  ok(`Sending as ${fromEmail}`);
}
if (adminEmail) ok(`Admin notifications go to ${adminEmail}`);
else fail('ADMIN_EMAIL is empty - nobody will be told about new enrolments.');

// ── 3. does Resend actually accept that domain? ─────────────────────────────
if (apiKey?.startsWith('re_') && fromDomain) {
  console.log('\nDomain verification');
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.status === 401 || res.status === 403) {
      // A "Sending access" key — the permission level we recommend — is not
      // allowed to list domains. That is not a broken key, so do not cry wolf:
      // the only conclusive test for a send-only key is an actual send.
      warn('This key cannot list domains, which is normal for a "Sending access" key.');
      console.log(`${D}       Cannot confirm "${fromDomain}" is verified this way.${X}`);
      console.log(`${D}       Test it for real:  npm run check:email -- --send${X}`);
      needsSendTest = true;
    } else if (!res.ok) {
      warn(`Resend returned ${res.status} listing domains; skipping this check.`);
    } else {
      const body = await res.json();
      const domains = body.data || [];
      ok('API key works');

      if (fromDomain === 'resend.dev') {
        warn('Sending from resend.dev - fine for testing, but often lands in spam.');
      } else {
        const match = domains.find((d) => d.name === fromDomain);
        if (!match) {
          fail(
            `"${fromDomain}" is not added to your Resend account, so every send will fail.`,
            'Add it at resend.com -> Domains, or set RESEND_FROM_EMAIL to a resend.dev address for now.',
          );
        } else {
          // Only the DKIM and SPF records matter for SENDING. Resend also
          // offers a "Receiving" MX record for inbound mail, which we do not
          // use — and which would outrank the real mail host and break the
          // domain's incoming email. A domain showing "partially_verified"
          // because only that record is pending is exactly what we want.
          const detail = await fetch(`https://api.resend.com/domains/${match.id}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          }).then((r) => r.json()).catch(() => ({}));

          const records = detail.records || [];
          const sending = records.filter((r) => /dkim|spf/i.test(r.record || ''));
          const unverifiedSending = sending.filter((r) => r.status !== 'verified');
          const receiving = records.filter((r) => /receiving/i.test(r.record || ''));

          if (sending.length && unverifiedSending.length === 0) {
            ok(`"${fromDomain}" — all sending records verified (DKIM + SPF)`);
            if (receiving.some((r) => r.status !== 'verified')) {
              ok('"Receiving" MX is pending — correct, do NOT add it');
              console.log(`${D}       That record is for inbound mail and would override your${X}`);
              console.log(`${D}       real mail host, breaking email to this domain.${X}`);
            }
          } else if (match.status === 'verified') {
            ok(`"${fromDomain}" is verified in Resend`);
          } else {
            fail(
              `"${fromDomain}" sending records are not all verified (domain status: ${match.status}).`,
              `Pending: ${unverifiedSending.map((r) => `${r.record} ${r.type} ${r.name}`).join(', ') || 'unknown'}`,
            );
          }
        }
      }

      if (domains.length) {
        console.log(`${D}       domains on the account: ${domains.map((d) => `${d.name} (${d.status})`).join(', ')}${X}`);
      }
    }
  } catch (error) {
    warn(`Could not reach Resend: ${error.message}`);
  }
}

// ── 4. optionally send a real email ─────────────────────────────────────────
if (process.argv.includes('--send') && problems === 0 && apiKey) {
  console.log('\nSending a real test email');
  try {
    const { buildReceiptEmail } = await import('../api/_lib/email.js');
    const { subject, html } = buildReceiptEmail({
      studentName: 'Test Student',
      courseTitle: 'NDA-1 April 2027',
      amount: 500,
      receiptNo: 'BM-TEST-0001',
      razorpayPaymentId: 'pay_TEST',
      razorpayOrderId: 'order_TEST',
      paidAt: new Date().toISOString(),
      whatsappLink: process.env.WHATSAPP_COMMUNITY_LINK || null,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromRaw || 'BrightMinds <onboarding@resend.dev>',
        to: adminEmail,
        subject: `[TEST] ${subject}`,
        html,
      }),
    });
    const body = await res.json();
    if (res.ok) {
      ok(`Test receipt sent to ${adminEmail} (id ${body.id})`);
      console.log(`${D}       Check the inbox - and the spam folder.${X}`);
    } else {
      fail(`Resend refused the send: ${body?.message || res.status}`);
    }
  } catch (error) {
    fail(`Could not send: ${error.message}`);
  }
}

console.log('');
if (problems === 0) {
  console.log(`${G}Email is configured correctly.${X}`);
  if (!process.argv.includes('--send')) {
    console.log(`${D}Send a real test receipt:  npm run check:email -- --send${X}`);
  }
  console.log('');
  process.exit(0);
}
console.log(`${R}${problems} problem(s) to fix.${X}\n`);
process.exit(1);
