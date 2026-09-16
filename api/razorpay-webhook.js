import { FieldValue } from 'firebase-admin/firestore';
import { readRawBody } from './_lib/http.js';
import { adminDb } from './_lib/firebaseAdmin.js';
import { verifyWebhookSignature } from './_lib/razorpay.js';
import { fulfillOrder } from './_lib/fulfill.js';

/** Razorpay signs the exact bytes it sent, so the body must not be parsed. */
export const config = {
  api: { bodyParser: false },
};

/**
 * POST /api/razorpay-webhook
 *
 * The safety net: if the student closes the tab before /api/verify-payment
 * runs, this still enrols them and sends the receipt. Fulfilment is
 * idempotent, so both paths firing is harmless.
 *
 * Always replies 200 once the signature is valid - a non-2xx makes Razorpay
 * retry, and we do not want retries for problems a retry cannot fix.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    console.error('Could not read webhook body:', error);
    return res.status(400).json({ error: 'Bad request' });
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!verifyWebhookSignature({ rawBody, signature })) {
    console.error('Rejected webhook with invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const eventId = req.headers['x-razorpay-event-id'] || `${event.event}-${Date.now()}`;
  const payment = event?.payload?.payment?.entity;

  let db;
  try {
    db = adminDb();
  } catch (error) {
    console.error('Firebase Admin is not configured:', error);
    return res.status(500).json({ error: 'Server not configured' });
  }

  const eventRef = db.collection('webhookEvents').doc(String(eventId));

  // Claim the event. create() fails if the document already exists, so a
  // duplicate delivery is rejected here rather than processed twice.
  try {
    await eventRef.create({
      eventId: String(eventId),
      event: event.event,
      receivedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (error?.code === 6 || /already exists/i.test(error?.message || '')) {
      return res.status(200).json({ ok: true, duplicate: true });
    }
    console.error('Could not claim webhook event:', error);
    return res.status(500).json({ error: 'Processing failed' });
  }

  try {
    switch (event.event) {
      case 'payment.captured':
      case 'order.paid': {
        const orderId = payment?.order_id || event?.payload?.order?.entity?.id;
        const paymentId = payment?.id;
        if (!orderId || !paymentId) break;

        const result = await fulfillOrder({ orderId, paymentId, source: 'webhook' });
        console.log(
          `Webhook fulfilled ${orderId}`,
          result.alreadyFulfilled ? '(already done)' : '(new enrolment)',
        );
        break;
      }

      case 'payment.failed': {
        const orderId = payment?.order_id;
        if (!orderId) break;
        await db.collection('orders').doc(orderId).set(
          {
            status: 'failed',
            failureReason: payment?.error_description || 'Payment failed',
            razorpayPaymentId: payment?.id || null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        break;
      }

      default:
        // Other events are acknowledged and ignored.
        break;
    }

    await eventRef.set({ processedAt: FieldValue.serverTimestamp() }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    // Release the claim so Razorpay's retry can process this event properly
    // instead of being turned away as a duplicate.
    await eventRef.delete().catch((cleanupError) =>
      console.error('Could not release webhook claim:', cleanupError),
    );
    // 500 asks Razorpay to retry - correct for transient Firestore errors.
    return res.status(500).json({ error: 'Processing failed' });
  }
}
