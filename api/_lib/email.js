import { Resend } from 'resend';

const BRAND = {
  gold: '#F5B700',
  amber: '#FF9F1A',
  ink: '#1A1714',
  muted: '#6B6257',
  cream: '#FFFBF0',
  border: '#F0E4C4',
};

/**
 * Quotes are .env syntax, but a dashboard like Vercel stores them literally.
 * A from-address of "Name <a@b.com>" WITH the quote characters is rejected by
 * Resend, and the failure only shows up after a student has already paid.
 * Strip them wherever an env var is read.
 */
const env = (name, fallback = '') => {
  const raw = (process.env[name] || '').trim();
  const unquoted =
    (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
      ? raw.slice(1, -1).trim()
      : raw;
  return unquoted || fallback;
};

const SITE_URL = env('SITE_URL', 'https://brightmindsclasses.in');
const SUPPORT_EMAIL = env('ADMIN_EMAIL', 'hello@brightmindsclasses.in');

/** Resend accepts `a@b.com` or `Name <a@b.com>` and nothing else. */
export const senderAddress = () => {
  const from = env('RESEND_FROM_EMAIL');
  if (!from) return 'BrightMinds <onboarding@resend.dev>';
  if (/^[^<>@\s]+@[^<>@\s]+$/.test(from)) return from;
  if (/^[^<>]+<[^<>@\s]+@[^<>@\s]+>$/.test(from)) return from;
  // Recover a usable address from something malformed rather than failing.
  const inner = from.match(/<([^<>]+@[^<>]+)>/)?.[1] || from.match(/([^\s<>"']+@[^\s<>"']+)/)?.[1];
  if (inner) {
    console.warn(`RESEND_FROM_EMAIL was malformed (${from}); using <${inner}>`);
    return `BrightMinds <${inner}>`;
  }
  console.error(`RESEND_FROM_EMAIL is unusable (${from}); falling back to resend.dev`);
  return 'BrightMinds <onboarding@resend.dev>';
};

let cachedResend = null;
function getResend() {
  const apiKey = env('RESEND_API_KEY');
  if (!apiKey) return null;
  if (!cachedResend) cachedResend = new Resend(apiKey);
  return cachedResend;
}

/** Never interpolate user input into HTML without this. */
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatINR = (rupees) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(rupees));

const formatIST = (date) =>
  new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const row = (label, value) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};color:${BRAND.muted};font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};color:${BRAND.ink};font-size:14px;font-weight:600;text-align:right;word-break:break-all;">${escapeHtml(value)}</td>
  </tr>`;

/** Mobile-safe shell: single 600px column, inline styles, no external CSS. */
const shell = (title, inner) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid ${BRAND.border};border-radius:20px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="background:linear-gradient(135deg,${BRAND.gold} 0%,${BRAND.amber} 100%);padding:28px 24px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.5px;">BrightMinds</div>
          <div style="font-size:13px;color:${BRAND.ink};opacity:0.75;margin-top:4px;">Ignite. Innovate. Inspire.</div>
        </td></tr>
        <tr><td style="padding:28px 24px;">${inner}</td></tr>
        <tr><td style="padding:20px 24px;background:${BRAND.cream};border-top:1px solid ${BRAND.border};text-align:center;color:${BRAND.muted};font-size:12px;line-height:1.7;">
          Questions? Reply to this email or write to
          <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.ink};">${SUPPORT_EMAIL}</a><br>
          <a href="${SITE_URL}" style="color:${BRAND.muted};">${SITE_URL.replace(/^https?:\/\//, '')}</a>
          &nbsp;&middot;&nbsp; &copy; ${new Date().getFullYear()} BrightMinds
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const whatsappButton = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td style="border-radius:12px;background:#25D366;">
      <a href="${href}" style="display:block;padding:15px 28px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;

/** Receipt + WhatsApp community invite, sent to the student on successful payment. */
export function buildReceiptEmail(enrollment) {
  const {
    studentName,
    courseTitle,
    amount,
    receiptNo,
    razorpayPaymentId,
    razorpayOrderId,
    paidAt,
    whatsappLink,
  } = enrollment;

  const whatsappBlock = whatsappLink
    ? `
      <div style="margin:28px 0 8px;padding:22px;background:#F0FFF4;border:1px solid #C6F6D5;border-radius:16px;text-align:center;">
        <div style="font-size:17px;font-weight:700;color:${BRAND.ink};margin-bottom:6px;">One last step - join the community</div>
        <p style="margin:0 0 18px;font-size:14px;color:${BRAND.muted};line-height:1.6;">
          Batch timings, class links and study material are shared <strong>only</strong> in our private WhatsApp community. Please join now so you do not miss the first session.
        </p>
        ${whatsappButton(whatsappLink, 'Join the WhatsApp community')}
        <p style="margin:16px 0 0;font-size:12px;color:${BRAND.muted};word-break:break-all;">
          Button not working? Open this link:<br><a href="${whatsappLink}" style="color:${BRAND.ink};">${escapeHtml(whatsappLink)}</a>
        </p>
      </div>`
    : `
      <div style="margin:28px 0 8px;padding:20px;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:16px;">
        <div style="font-size:15px;font-weight:700;color:${BRAND.ink};margin-bottom:6px;">Your community invite is on its way</div>
        <p style="margin:0;font-size:14px;color:${BRAND.muted};line-height:1.6;">
          We will email you the private WhatsApp community link shortly. You can also find it any time on your
          <a href="${SITE_URL}/dashboard" style="color:${BRAND.ink};">BrightMinds dashboard</a>.
        </p>
      </div>`;

  const inner = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;padding:6px 14px;border-radius:999px;background:#F0FFF4;color:#22803C;font-size:12px;font-weight:700;">PAYMENT SUCCESSFUL</div>
      <h1 style="margin:16px 0 8px;font-size:24px;color:${BRAND.ink};">You are enrolled, ${escapeHtml(studentName || 'student')}!</h1>
      <p style="margin:0;font-size:15px;color:${BRAND.muted};line-height:1.6;">
        Welcome to <strong style="color:${BRAND.ink};">${escapeHtml(courseTitle)}</strong>. Your seat is confirmed.
      </p>
    </div>

    <div style="padding:20px;border:1px solid ${BRAND.border};border-radius:16px;">
      <div style="font-size:13px;font-weight:700;color:${BRAND.ink};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">Payment receipt</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row('Receipt no.', receiptNo)}
        ${row('Course', courseTitle)}
        ${row('Amount paid', formatINR(amount))}
        ${row('Payment ID', razorpayPaymentId)}
        ${row('Order ID', razorpayOrderId)}
        <tr>
          <td style="padding:10px 0;color:${BRAND.muted};font-size:14px;">Paid on</td>
          <td style="padding:10px 0;color:${BRAND.ink};font-size:14px;font-weight:600;text-align:right;">${escapeHtml(formatIST(paidAt))}</td>
        </tr>
      </table>
    </div>

    ${whatsappBlock}

    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.muted};line-height:1.7;">
      Keep this email - it is your official receipt. You can also view it any time by signing in at
      <a href="${SITE_URL}/dashboard" style="color:${BRAND.ink};">${SITE_URL.replace(/^https?:\/\//, '')}/dashboard</a>.
    </p>`;

  return {
    subject: `Payment received - you are enrolled in ${courseTitle} (${receiptNo})`,
    html: shell('BrightMinds payment receipt', inner),
  };
}

/** Internal notification so the admin sees every enrolment immediately. */
export function buildAdminEmail(enrollment, workbookStats) {
  const totals = workbookStats
    ? `
    <div style="margin:0 0 20px;padding:14px 16px;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:14px;">
      <div style="font-size:13px;color:${BRAND.muted};">
        <strong style="color:${BRAND.ink};font-size:15px;">${workbookStats.enrolled}</strong> students enrolled
        &nbsp;·&nbsp;
        <strong style="color:${BRAND.ink};font-size:15px;">${workbookStats.registered}</strong> registered
      </div>
      <div style="margin-top:6px;font-size:13px;color:${BRAND.muted};">
        The attached Excel file has every student with their contact details, updated just now.
      </div>
    </div>`
    : '';

  const inner = `
    <h1 style="margin:0 0 6px;font-size:21px;color:${BRAND.ink};">New enrolment</h1>
    <p style="margin:0 0 20px;font-size:14px;color:${BRAND.muted};">
      ${escapeHtml(enrollment.studentName || 'A student')} just paid for ${escapeHtml(enrollment.courseTitle)}.
    </p>
    ${totals}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:16px;">
      ${row('Name', enrollment.studentName)}
      ${row('Email', enrollment.email)}
      ${row('Phone', enrollment.phone || 'Not provided')}
      ${row('Course', enrollment.courseTitle)}
      ${row('Amount', formatINR(enrollment.amount))}
      ${row('Receipt no.', enrollment.receiptNo)}
      ${row('Payment ID', enrollment.razorpayPaymentId)}
      ${row('Order ID', enrollment.razorpayOrderId)}
      ${row('Source', enrollment.source || 'checkout')}
      ${row('Paid at (IST)', formatIST(enrollment.paidAt))}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:${BRAND.muted};">
      Full list: <a href="${SITE_URL}/admin" style="color:${BRAND.ink};">${SITE_URL.replace(/^https?:\/\//, '')}/admin</a>
    </p>`;

  return {
    subject: `New enrolment - ${enrollment.studentName || enrollment.email} - ${formatINR(enrollment.amount)}`,
    html: shell('New BrightMinds enrolment', inner),
  };
}

/**
 * Tells the admin a new student has signed in for the very first time.
 * Sent once per student, on signup - not on every login, which would be spam.
 */
export function buildSignupEmail(user) {
  const inner = `
    <h1 style="margin:0 0 6px;font-size:21px;color:${BRAND.ink};">New student signed up</h1>
    <p style="margin:0 0 20px;font-size:14px;color:${BRAND.muted};">
      They have created an account but have <strong>not paid yet</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:16px;">
      ${row('Name', user.displayName || 'Not provided')}
      ${row('Email', user.email)}
      ${row('Phone', user.phone || 'Not provided yet')}
      ${row('Signed up (IST)', formatIST(user.signupAt))}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:${BRAND.muted};">
      Full list and Excel export: <a href="${SITE_URL}/admin" style="color:${BRAND.ink};">${SITE_URL.replace(/^https?:\/\//, '')}/admin</a>
    </p>`;

  return {
    subject: `New signup - ${user.displayName || user.email}`,
    html: shell('New BrightMinds signup', inner),
  };
}

/** Fire-and-forget admin alert for a brand-new student account. */
export async function sendSignupEmail(user) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY missing - skipping signup notification.');
    return { sent: false, reason: 'not-configured' };
  }

  try {
    const { subject, html } = buildSignupEmail(user);
    const response = await resend.emails.send({
      from: senderAddress(),
      to: env('ADMIN_EMAIL', SUPPORT_EMAIL),
      subject,
      html,
    });
    if (response?.error) throw new Error(response.error.message || 'Resend rejected the signup email');
    return { sent: true };
  } catch (error) {
    console.error('Failed to send signup notification:', error);
    return { sent: false, reason: error?.message };
  }
}

/**
 * Sends the student receipt and the admin notification.
 * Email failures are logged and reported but never fail the payment -
 * the enrolment is already recorded in Firestore by this point.
 */
export async function sendEnrollmentEmails(enrollment) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY missing - skipping enrolment emails.');
    return { studentEmailSent: false, adminEmailSent: false, reason: 'not-configured' };
  }

  const from = senderAddress();
  const adminEmail = env('ADMIN_EMAIL', SUPPORT_EMAIL);
  const result = { studentEmailSent: false, adminEmailSent: false };

  if (enrollment.email) {
    try {
      const { subject, html } = buildReceiptEmail(enrollment);
      const response = await resend.emails.send({
        from,
        to: enrollment.email,
        replyTo: adminEmail,
        subject,
        html,
      });
      if (response?.error) throw new Error(response.error.message || 'Resend rejected the receipt email');
      result.studentEmailSent = true;
    } catch (error) {
      console.error('Failed to send student receipt:', error);
      result.reason = error?.message;
    }
  }

  // The admin notification carries the up-to-date student spreadsheet.
  // Building it must never stop the notification going out, so it is attempted
  // separately and the email is sent either way.
  let attachments;
  try {
    const { buildEnrolmentWorkbook } = await import('./workbook.js');
    const workbook = await buildEnrolmentWorkbook();
    attachments = [{ filename: workbook.filename, content: workbook.buffer.toString('base64') }];
    result.workbookAttached = true;
    result.workbookStats = { registered: workbook.registered, enrolled: workbook.enrolled };
  } catch (error) {
    console.error('Could not build the student workbook for the admin email:', error);
    result.workbookAttached = false;
  }

  try {
    const { subject, html } = buildAdminEmail(enrollment, result.workbookStats);
    const response = await resend.emails.send({
      from,
      to: adminEmail,
      subject,
      html,
      ...(attachments ? { attachments } : {}),
    });
    if (response?.error) throw new Error(response.error.message || 'Resend rejected the admin email');
    result.adminEmailSent = true;
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }

  return result;
}
