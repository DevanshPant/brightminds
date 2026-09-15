import { applyCors, fail, methodGuard, parseJsonBody } from './_lib/http.js';
import { adminDb, requireUser } from './_lib/firebaseAdmin.js';
import { verifyPaymentSignature } from './_lib/razorpay.js';
import { fulfillOrder, getWhatsappLink } from './_lib/fulfill.js';

/**
 * POST /api/verify-payment
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Auth: Firebase ID token.
 *
 * Confirms the Checkout signature, then fulfils the order. The Razorpay
 * webhook is the backstop if the browser closes before this runs.
 */
export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!methodGuard(req, res, 'POST')) return;

  let user;
  try {
    user = await requireUser(req);
  } catch (error) {
    return fail(res, error.status || 401, error.message, error.cause);
  }

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = parseJsonBody(req);

  if (!orderId || !paymentId || !signature) {
    return fail(res, 400, 'Incomplete payment details received.');
  }

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    console.error('Signature mismatch for order', orderId);
    return fail(res, 400, 'We could not verify this payment. Please contact us before paying again.');
  }

  try {
    // The order must belong to the signed-in student.
    const orderSnap = await adminDb().collection('orders').doc(orderId).get();
    if (!orderSnap.exists) return fail(res, 404, 'We could not find this order.');
    if (orderSnap.data().uid !== user.uid) {
      return fail(res, 403, 'This order belongs to a different account.');
    }

    const { enrollment, emailResult } = await fulfillOrder({
      orderId,
      paymentId,
      source: 'checkout',
    });

    return res.status(200).json({
      success: true,
      enrollmentId: enrollment.enrollmentId,
      receiptNo: enrollment.receiptNo,
      whatsappLink: enrollment.whatsappLink || getWhatsappLink(),
      emailSent: Boolean(emailResult?.studentEmailSent),
    });
  } catch (error) {
    return fail(
      res,
      error.status || 500,
      error.message || 'Payment received but confirmation failed. Please contact us with your payment ID.',
      error,
    );
  }
}
