import { applyCors, fail } from './_lib/http.js';
import { requireUser } from './_lib/firebaseAdmin.js';
import { buildEnrolmentWorkbook } from './_lib/workbook.js';

const adminEmails = () =>
  String(process.env.VITE_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/**
 * GET /api/admin-export
 * Auth: Firebase ID token belonging to an allowlisted admin.
 *
 * Returns the student spreadsheet — the same file the admin receives attached
 * to every enrolment email, built by the same function.
 */
export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  let user;
  try {
    user = await requireUser(req);
  } catch (error) {
    return fail(res, error.status || 401, error.message, error.cause);
  }

  const email = String(user.email || '').toLowerCase();
  const allowed = adminEmails();

  // Verified email only — an unverified account claiming an admin address
  // must not be able to download every student's contact details.
  if (!email || !user.email_verified || !allowed.includes(email)) {
    return fail(res, 403, 'This export is restricted to administrators.');
  }

  try {
    const { buffer, filename } = await buildEnrolmentWorkbook();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buffer);
  } catch (error) {
    return fail(res, 500, 'Could not build the spreadsheet.', error);
  }
}
