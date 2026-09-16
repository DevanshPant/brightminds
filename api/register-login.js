import { FieldValue } from 'firebase-admin/firestore';
import { applyCors, fail, methodGuard, parseJsonBody } from './_lib/http.js';
import { adminDb, requireUser } from './_lib/firebaseAdmin.js';
import { sendSignupEmail } from './_lib/email.js';

/**
 * POST /api/register-login
 * Auth: Firebase ID token. Body: { phone?: string }
 *
 * Records every sign-in against the student's profile so the admin can see who
 * has an account, not just who has paid. The admin is emailed once — on the
 * very first sign-in — because a mail per login would be unusable.
 *
 * Written server-side so `users` stays read-only to the browser; a student
 * cannot backdate their own signup or inflate their login count.
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

  const { phone, fullName, email } = parseJsonBody(req);
  const cleanPhone = typeof phone === 'string' ? phone.replace(/[^\d+]/g, '').slice(0, 15) : '';
  // The student can correct the name Google gave us.
  const cleanName = typeof fullName === 'string' ? fullName.trim().slice(0, 80) : '';
  // Phone sign-in carries no email, so the student supplies one for their receipt.
  const cleanEmail =
    typeof email === 'string' && /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email.trim())
      ? email.trim().toLowerCase().slice(0, 160)
      : '';

  try {
    const db = adminDb();
    const ref = db.collection('users').doc(user.uid);
    const now = new Date().toISOString();

    // One transaction decides whether this is a first sign-in, so two tabs
    // opening at once cannot both report a new signup.
    const { isNewStudent, profile } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists ? snap.data() : null;

      const next = {
        uid: user.uid,
        email: user.email || cleanEmail || existing?.email || null,
        signInMethod: user.firebase?.sign_in_provider || existing?.signInMethod || null,
        displayName: user.name || user.displayName || existing?.displayName || null,
        photoURL: user.picture || existing?.photoURL || null,
        emailVerified: Boolean(user.email_verified),
        lastLoginAt: now,
        loginCount: (existing?.loginCount || 0) + 1,
        signupAt: existing?.signupAt || now,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (cleanName) next.fullName = cleanName;
      else if (existing?.fullName) next.fullName = existing.fullName;
      // A verified phone from the token beats anything typed in a form.
      const tokenPhone = user.phone_number || '';
      if (tokenPhone) next.phone = tokenPhone.replace(/^\+91/, '');
      else if (cleanPhone) next.phone = cleanPhone;
      else if (existing?.phone) next.phone = existing.phone;

      tx.set(ref, next, { merge: true });
      return { isNewStudent: !existing, profile: next };
    });

    // Email the admin only the first time we ever see this student.
    let emailSent = false;
    if (isNewStudent) {
      const result = await sendSignupEmail({ ...profile, signupAt: now });
      emailSent = result.sent;
      await ref.set({ signupEmailSent: emailSent }, { merge: true });
    }

    return res.status(200).json({
      ok: true,
      isNewStudent,
      loginCount: profile.loginCount,
      adminNotified: emailSent,
    });
  } catch (error) {
    return fail(res, 500, 'Could not record this sign-in.', error);
  }
}
