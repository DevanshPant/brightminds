import crypto from 'node:crypto';
import Razorpay from 'razorpay';

let cachedClient = null;

export function getRazorpay() {
  if (cachedClient) return cachedClient;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  cachedClient = new Razorpay({ key_id, key_secret });
  return cachedClient;
}

/** Constant-time comparison so we never leak signature bytes via timing. */
function safeEqual(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Checkout handler signature: HMAC-SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw body, webhook_secret). */
export function verifyWebhookSignature({ rawBody, signature }) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !rawBody || !signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}
