/**
 * Offline tests for the money-handling code paths - no Firebase, Razorpay or
 * Resend account needed. Run this after changing anything under api/.
 *
 *   npm run test:payments
 */
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

process.env.RAZORPAY_KEY_SECRET = 'test_secret_abc123';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test_xyz789';
process.env.WHATSAPP_COMMUNITY_LINK = 'https://chat.whatsapp.com/TESTLINK123';
process.env.ADMIN_EMAIL = 'admin@brightmindsclasses.in';
process.env.SITE_URL = 'https://brightmindsclasses.in';

const { verifyPaymentSignature, verifyWebhookSignature } = await import('../api/_lib/razorpay.js');
const { buildReceiptEmail, buildAdminEmail, senderAddress } = await import('../api/_lib/email.js');
const { getCourse, toPaise, COURSES } = await import('../api/_lib/courses.js');
const { readRawBody, applyCors } = await import('../api/_lib/http.js');

let passed = 0;
let failed = 0;

const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.message}`);
  }
};

const sign = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

console.log('\nRazorpay checkout signature');
test('accepts a correctly signed payment', () => {
  const orderId = 'order_TEST123';
  const paymentId = 'pay_TEST456';
  const signature = sign(`${orderId}|${paymentId}`, process.env.RAZORPAY_KEY_SECRET);
  assert.equal(verifyPaymentSignature({ orderId, paymentId, signature }), true);
});

test('rejects a tampered payment id', () => {
  const signature = sign('order_TEST123|pay_TEST456', process.env.RAZORPAY_KEY_SECRET);
  assert.equal(
    verifyPaymentSignature({ orderId: 'order_TEST123', paymentId: 'pay_EVIL', signature }),
    false,
  );
});

test('rejects a signature made with the wrong secret', () => {
  const signature = sign('order_TEST123|pay_TEST456', 'attacker_secret');
  assert.equal(
    verifyPaymentSignature({ orderId: 'order_TEST123', paymentId: 'pay_TEST456', signature }),
    false,
  );
});

test('rejects missing fields instead of throwing', () => {
  assert.equal(verifyPaymentSignature({ orderId: '', paymentId: '', signature: '' }), false);
  assert.equal(verifyPaymentSignature({}), false);
});

test('rejects a signature of the wrong length without throwing', () => {
  assert.equal(
    verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_1', signature: 'short' }),
    false,
  );
});

console.log('\nRazorpay webhook signature');
test('accepts a correctly signed webhook body', () => {
  const rawBody = JSON.stringify({ event: 'payment.captured', payload: {} });
  const signature = sign(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET);
  assert.equal(verifyWebhookSignature({ rawBody, signature }), true);
});

test('rejects a body modified after signing', () => {
  const rawBody = JSON.stringify({ event: 'payment.captured', amount: 50000 });
  const signature = sign(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET);
  const tampered = JSON.stringify({ event: 'payment.captured', amount: 1 });
  assert.equal(verifyWebhookSignature({ rawBody: tampered, signature }), false);
});

test('rejects a webhook signed with the checkout secret', () => {
  const rawBody = '{"event":"payment.captured"}';
  const signature = sign(rawBody, process.env.RAZORPAY_KEY_SECRET);
  assert.equal(verifyWebhookSignature({ rawBody, signature }), false);
});

console.log('\nCourse catalogue and pricing');
test('the launch course resolves', () => {
  const course = getCourse('nda-1-april-2027');
  assert.ok(course, 'course not found');
  assert.ok(course.price > 0, 'course has no price');
  assert.equal(course.currency, 'INR');
});

test('unknown course ids return null', () => {
  assert.equal(getCourse('does-not-exist'), null);
  assert.equal(getCourse(undefined), null);
});

test('rupees convert to paise without float drift', () => {
  assert.equal(toPaise(500), 50000);
  assert.equal(toPaise(499.99), 49999);
  assert.equal(toPaise(0.1), 10);
});

test('every course clears the 100-paise Razorpay minimum', () => {
  for (const [id, course] of Object.entries(COURSES)) {
    const paise = toPaise(course.price);
    assert.ok(Number.isInteger(paise), `${id} produces fractional paise`);
    assert.ok(paise >= 100, `${id} is below Razorpay's 100-paise minimum`);
  }
});

test('every course has a positive integer price', () => {
  for (const [id, course] of Object.entries(COURSES)) {
    assert.ok(Number.isFinite(course.price) && course.price > 0, `${id} has a bad price`);
    assert.equal(toPaise(course.price) % 1, 0, `${id} produces fractional paise`);
  }
});

console.log('\nReceipt email');
const sampleEnrollment = {
  studentName: 'Aarav Sharma',
  email: 'aarav@example.com',
  phone: '9876543210',
  courseTitle: 'NDA-1 April 2027',
  amount: 499,
  receiptNo: 'BM-2026-0001',
  razorpayPaymentId: 'pay_TEST456',
  razorpayOrderId: 'order_TEST123',
  paidAt: '2026-09-15T09:30:00.000Z',
  whatsappLink: process.env.WHATSAPP_COMMUNITY_LINK,
  source: 'checkout',
};

test('receipt includes amount, receipt number and payment id', () => {
  const { subject, html } = buildReceiptEmail(sampleEnrollment);
  assert.match(subject, /BM-2026-0001/);
  assert.match(html, /499/);
  assert.match(html, /pay_TEST456/);
  assert.match(html, /Aarav Sharma/);
  assert.match(html, /NDA-1 April 2027/);
});

test('receipt renders the WhatsApp community button', () => {
  const { html } = buildReceiptEmail(sampleEnrollment);
  assert.match(html, /chat\.whatsapp\.com\/TESTLINK123/);
  assert.match(html, /Join the WhatsApp community/);
});

test('receipt degrades gracefully with no WhatsApp link yet', () => {
  const { html } = buildReceiptEmail({ ...sampleEnrollment, whatsappLink: null });
  assert.doesNotMatch(html, /Join the WhatsApp community/);
  assert.match(html, /on its way/);
});

test('receipt escapes HTML in student-supplied values', () => {
  const { html } = buildReceiptEmail({
    ...sampleEnrollment,
    studentName: '<img src=x onerror=alert(1)>',
  });
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x/);
});

test('receipt is mobile friendly (viewport + constrained width)', () => {
  const { html } = buildReceiptEmail(sampleEnrollment);
  assert.match(html, /name="viewport"/);
  assert.match(html, /max-width:600px/);
});

test('admin notification carries the contact details', () => {
  const { subject, html } = buildAdminEmail(sampleEnrollment);
  assert.match(subject, /Aarav Sharma/);
  assert.match(html, /aarav@example\.com/);
  assert.match(html, /9876543210/);
  assert.match(html, /BM-2026-0001/);
});

console.log('\nSender address');
// A dashboard like Vercel stores quotes literally, unlike a .env file. A
// from-address wrapped in quote marks is rejected by Resend AFTER the student
// has paid, so every shape has to be normalised before it is sent.
const senderFor = (value) => {
  const before = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_FROM_EMAIL = value;
  try {
    return senderAddress();
  } finally {
    process.env.RESEND_FROM_EMAIL = before;
  }
};

test('strips double quotes pasted from a dashboard', () => {
  assert.equal(
    senderFor('"BrightMinds <noreply@brightmindsclasses.in>"'),
    'BrightMinds <noreply@brightmindsclasses.in>',
  );
});

test('leaves a correct address untouched', () => {
  assert.equal(
    senderFor('BrightMinds <noreply@brightmindsclasses.in>'),
    'BrightMinds <noreply@brightmindsclasses.in>',
  );
  assert.equal(senderFor('noreply@brightmindsclasses.in'), 'noreply@brightmindsclasses.in');
});

test('trims stray whitespace', () => {
  assert.equal(
    senderFor('   BrightMinds <noreply@brightmindsclasses.in>   '),
    'BrightMinds <noreply@brightmindsclasses.in>',
  );
});

test('falls back to a sendable address rather than failing', () => {
  assert.match(senderFor(''), /@/);
  assert.match(senderFor('not an email at all'), /@/);
});

console.log('\nHTTP helpers');
test('raw body reader handles a Buffer body', async () => {
  const body = await readRawBody({ body: Buffer.from('{"a":1}') });
  assert.equal(body, '{"a":1}');
});

test('CORS allows the production origin and blocks an unknown one', () => {
  const makeRes = () => {
    const headers = {};
    return {
      headers,
      setHeader: (k, v) => {
        headers[k] = v;
      },
      status() {
        return this;
      },
      end() {},
    };
  };

  const allowed = makeRes();
  applyCors({ method: 'GET', headers: { origin: 'https://brightmindsclasses.in' } }, allowed);
  assert.equal(allowed.headers['Access-Control-Allow-Origin'], 'https://brightmindsclasses.in');

  const blocked = makeRes();
  applyCors({ method: 'GET', headers: { origin: 'https://evil.example.com' } }, blocked);
  assert.equal(blocked.headers['Access-Control-Allow-Origin'], undefined);
});

test('preflight requests short-circuit', () => {
  let ended = false;
  const res = {
    setHeader() {},
    status() {
      return this;
    },
    end() {
      ended = true;
    },
  };
  const handled = applyCors({ method: 'OPTIONS', headers: {} }, res);
  assert.equal(handled, true);
  assert.equal(ended, true);
});

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
