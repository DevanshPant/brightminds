import { applyCors } from './_lib/http.js';
import { senderAddress } from './_lib/email.js';

/** Quotes are .env syntax; a dashboard stores them literally. */
const env = (name) => {
  const raw = (process.env[name] || '').trim();
  return (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
    ? raw.slice(1, -1).trim()
    : raw;
};

/**
 * GET /api/health
 *
 * Reports every environment variable the server needs, and whether the values
 * will actually work — not just whether something is present. Never echoes a
 * secret: keys are reported as booleans, addresses are shown because they are
 * not secret and are exactly what goes wrong.
 */
export default function handler(req, res) {
  if (applyCors(req, res)) return;

  const firebaseAdmin = Boolean(
    env('FIREBASE_SERVICE_ACCOUNT_JSON') ||
      (env('FIREBASE_PROJECT_ID') && env('FIREBASE_CLIENT_EMAIL') && env('FIREBASE_PRIVATE_KEY')),
  );

  const keyId = env('RAZORPAY_KEY_ID');
  const fromConfigured = Boolean(env('RESEND_FROM_EMAIL'));
  const resolvedFrom = senderAddress();
  const usingResendDev = resolvedFrom.includes('resend.dev');

  // Things that are set but will not actually work in production.
  const problems = [];
  if (!firebaseAdmin) problems.push('FIREBASE_* credentials are missing — payments cannot be recorded.');
  if (!keyId || !env('RAZORPAY_KEY_SECRET')) problems.push('RAZORPAY_* keys are missing — checkout cannot start.');
  if (!env('RESEND_API_KEY')) problems.push('RESEND_API_KEY is missing — no receipts will be sent.');
  if (!fromConfigured) {
    problems.push(
      'RESEND_FROM_EMAIL is NOT set — falling back to resend.dev, which can only ' +
        'email the Resend account owner. Students will receive nothing.',
    );
  } else if (usingResendDev) {
    problems.push(
      `RESEND_FROM_EMAIL is set but unusable (resolved to ${resolvedFrom}). ` +
        'It must be "Name <you@yourdomain>" on a domain verified in Resend.',
    );
  }
  if (!env('ADMIN_EMAIL')) problems.push('ADMIN_EMAIL is missing — nobody is told about new enrolments.');
  if (!env('VITE_ADMIN_EMAILS')) problems.push('VITE_ADMIN_EMAILS is missing — /api/admin-export will refuse everyone.');
  if (!env('RAZORPAY_WEBHOOK_SECRET')) {
    problems.push('RAZORPAY_WEBHOOK_SECRET is missing — a payment is lost if the browser closes early.');
  }

  return res.status(200).json({
    status: problems.length === 0 ? 'ok' : 'degraded',
    time: new Date().toISOString(),
    configured: {
      firebaseAdmin,
      razorpayKeys: Boolean(keyId && env('RAZORPAY_KEY_SECRET')),
      razorpayMode: keyId.startsWith('rzp_live') ? 'live' : keyId ? 'test' : 'unset',
      razorpayWebhook: Boolean(env('RAZORPAY_WEBHOOK_SECRET')),
      resendApiKey: Boolean(env('RESEND_API_KEY')),
      resendFromConfigured: fromConfigured,
      resendFromResolved: resolvedFrom,
      canEmailStudents: Boolean(env('RESEND_API_KEY')) && fromConfigured && !usingResendDev,
      adminEmail: env('ADMIN_EMAIL') || null,
      adminAllowlist: Boolean(env('VITE_ADMIN_EMAILS')),
      siteUrl: env('SITE_URL') || null,
      whatsappLink: Boolean(env('WHATSAPP_COMMUNITY_LINK')),
    },
    problems,
  });
}
