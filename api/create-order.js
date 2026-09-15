import { FieldValue } from 'firebase-admin/firestore';
import { applyCors, fail, methodGuard, parseJsonBody } from './_lib/http.js';
import { adminDb, requireUser } from './_lib/firebaseAdmin.js';
import { getCourse, toPaise } from './_lib/courses.js';
import { getRazorpay } from './_lib/razorpay.js';

/**
 * POST /api/create-order
 * Body: { courseId: string, phone?: string }
 * Auth: Firebase ID token.
 *
 * The client never sends an amount — the price is looked up server-side.
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

  const { courseId, phone } = parseJsonBody(req);
  const course = getCourse(courseId);
  if (!course) return fail(res, 400, 'That course is not available.');

  // Digits only, 10-15 long (optional field).
  const cleanPhone = typeof phone === 'string' ? phone.replace(/[^\d+]/g, '').slice(0, 15) : '';

  try {
    const db = adminDb();

    // Block a second purchase of a course the student already owns.
    const existing = await db
      .collection('enrollments')
      .where('uid', '==', user.uid)
      .where('courseId', '==', course.id)
      .where('status', '==', 'paid')
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({
        error: 'You are already enrolled in this course.',
        alreadyEnrolled: true,
      });
    }

    const amountInPaise = toPaise(course.price);

    // Razorpay rejects anything under 100 paise (₹1). Catching it here turns a
    // mis-typed price in the catalogue into a clear server log rather than an
    // opaque gateway error in front of the student.
    if (!Number.isInteger(amountInPaise) || amountInPaise < 100) {
      return fail(
        res,
        500,
        'This course is not available for online payment right now.',
        `Course "${course.id}" has an invalid price: ${course.price} (${amountInPaise} paise)`,
      );
    }

    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: course.currency || 'INR',
      // Razorpay caps receipt at 40 chars.
      receipt: `bm_${course.id}_${user.uid}`.slice(0, 40),
      notes: {
        courseId: course.id,
        uid: user.uid,
        email: user.email || '',
      },
    });

    await db.collection('orders').doc(order.id).set({
      razorpayOrderId: order.id,
      uid: user.uid,
      email: user.email || null,
      studentName: user.name || user.displayName || null,
      phone: cleanPhone || null,
      courseId: course.id,
      courseTitle: course.title,
      amount: course.price,
      amountInPaise,
      currency: course.currency || 'INR',
      status: 'created',
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      orderId: order.id,
      amount: amountInPaise,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      courseTitle: course.title,
    });
  } catch (error) {
    const message = error?.error?.description || error?.message || 'Could not start the payment.';
    return fail(res, 500, message, error);
  }
}
