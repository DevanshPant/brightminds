import { applyCors } from './_lib/http.js';

/**
 * GET /api/health
 * Reports which integrations are wired up, without ever echoing a secret.
 * Useful right after adding environment variables in Vercel.
 */
export default function handler(req, res) {
  if (applyCors(req, res)) return;

  const firebaseAdmin = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY),
  );

  const keyId = process.env.RAZORPAY_KEY_ID || '';

  return res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    configured: {
      firebaseAdmin,
      razorpayKeys: Boolean(keyId && process.env.RAZORPAY_KEY_SECRET),
      razorpayMode: keyId.startsWith('rzp_live') ? 'live' : keyId ? 'test' : 'unset',
      razorpayWebhook: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
      resend: Boolean(process.env.RESEND_API_KEY),
      whatsappLink: Boolean(process.env.WHATSAPP_COMMUNITY_LINK),
      adminEmail: Boolean(process.env.ADMIN_EMAIL),
    },
  });
}
