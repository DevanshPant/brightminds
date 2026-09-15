import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin.js';
import { sendEnrollmentEmails } from './email.js';

export const getWhatsappLink = () => process.env.WHATSAPP_COMMUNITY_LINK || null;

/**
 * Sequential, human-readable receipt numbers (BM-2026-0001) produced inside the
 * same transaction that marks the order paid, so numbers never repeat or skip.
 */
function nextReceiptNo(counterSnapshot) {
  const year = new Date().getFullYear();
  const current = counterSnapshot.exists ? counterSnapshot.data() : {};
  const seq = current.year === year ? Number(current.seq || 0) + 1 : 1;
  return { receiptNo: `BM-${year}-${String(seq).padStart(4, '0')}`, year, seq };
}

/**
 * Turns a verified payment into an enrolment. Safe to call many times for the
 * same order: the Checkout handler and the Razorpay webhook both call it, and
 * whichever arrives second is a no-op.
 *
 * @returns {Promise<{enrollment: object, alreadyFulfilled: boolean}>}
 */
export async function fulfillOrder({ orderId, paymentId, source }) {
  const db = adminDb();
  const orderRef = db.collection('orders').doc(orderId);
  const enrollmentRef = db.collection('enrollments').doc(orderId);
  const counterRef = db.collection('counters').doc('receipts');

  const outcome = await db.runTransaction(async (tx) => {
    const [orderSnap, enrollmentSnap] = await Promise.all([
      tx.get(orderRef),
      tx.get(enrollmentRef),
    ]);

    if (!orderSnap.exists) {
      const error = new Error('We could not find this order. Please contact support.');
      error.status = 404;
      throw error;
    }

    // Already fulfilled by the other path (handler vs webhook).
    if (enrollmentSnap.exists) {
      return { enrollment: enrollmentSnap.data(), alreadyFulfilled: true };
    }

    const counterSnap = await tx.get(counterRef);
    const { receiptNo, year, seq } = nextReceiptNo(counterSnap);

    const order = orderSnap.data();
    const paidAt = new Date().toISOString();

    const enrollment = {
      enrollmentId: orderId,
      uid: order.uid,
      email: order.email || null,
      studentName: order.studentName || null,
      phone: order.phone || null,
      courseId: order.courseId,
      courseTitle: order.courseTitle,
      amount: order.amount, // rupees
      currency: order.currency || 'INR',
      status: 'paid',
      receiptNo,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      paidAt,
      source: source || 'checkout',
      whatsappLink: getWhatsappLink(),
      whatsappJoined: false,
      createdAt: FieldValue.serverTimestamp(),
    };

    tx.set(enrollmentRef, enrollment);
    tx.set(counterRef, { year, seq, updatedAt: FieldValue.serverTimestamp() });
    tx.set(
      orderRef,
      {
        status: 'paid',
        razorpayPaymentId: paymentId,
        paidAt,
        receiptNo,
        fulfilledBy: source || 'checkout',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { enrollment, alreadyFulfilled: false };
  });

  // Emails go out once, outside the transaction, only on first fulfilment.
  if (!outcome.alreadyFulfilled) {
    const emailResult = await sendEnrollmentEmails(outcome.enrollment);
    await enrollmentRef.set(
      {
        receiptEmailSent: emailResult.studentEmailSent,
        adminEmailSent: emailResult.adminEmailSent,
        emailError: emailResult.reason || null,
      },
      { merge: true },
    );
    outcome.emailResult = emailResult;
  }

  return outcome;
}
