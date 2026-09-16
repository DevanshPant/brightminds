/**
 * Exercises the serverless handlers end-to-end with mock req/res objects.
 * No Firebase, Razorpay or Resend account required - these tests cover the
 * guards that run BEFORE any external service is touched, which is exactly
 * where a mistake would be most expensive.
 *
 *   npm run test:api
 */
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = 'test_secret_abc123';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test_xyz789';
process.env.RESEND_API_KEY = '';
process.env.WHATSAPP_COMMUNITY_LINK = 'https://chat.whatsapp.com/TESTLINK123';

const createOrder = (await import('../api/create-order.js')).default;
const verifyPayment = (await import('../api/verify-payment.js')).default;
const webhook = (await import('../api/razorpay-webhook.js')).default;
const health = (await import('../api/health.js')).default;
const registerLogin = (await import('../api/register-login.js')).default;
const adminExport = (await import('../api/admin-export.js')).default;

let passed = 0;
let failed = 0;

// Failures print via console.log, NOT console.error: this file stubs
// console.error to silence expected noise from the handlers, and a failure
// printed through it would vanish - leaving a red count with no explanation.
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  ✗ ${name}`);
    console.log(`      ${String(error.message).split(String.fromCharCode(10))[0]}`);
  }
};

/** Minimal stand-in for the Vercel response object. */
function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

const mockReq = (overrides = {}) => ({
  method: 'POST',
  headers: {},
  body: {},
  ...overrides,
});

const sign = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

// Firebase Admin is deliberately unconfigured here, so any handler that reaches
// it fails loudly. Silence the expected console noise.
const originalError = console.error;
console.error = () => {};

console.log('\n/api/health');
await test('reports configuration status without leaking secrets', async () => {
  const res = mockRes();
  await health(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 200);
  // Nothing is fully configured in this run, so "degraded" is the correct,
  // honest answer. Reporting "ok" here is what hid a real outage.
  assert.equal(res.body.status, 'degraded');
  assert.ok(Array.isArray(res.body.problems) && res.body.problems.length > 0);
  assert.equal(res.body.configured.razorpayKeys, true);
  assert.equal(res.body.configured.razorpayMode, 'test');
  assert.equal(res.body.configured.whatsappLink, true);
  assert.equal(res.body.configured.resendApiKey, false);
  // No secret value may appear anywhere in the response.
  assert.doesNotMatch(JSON.stringify(res.body), /test_secret_abc123|whsec_test_xyz789/);
});

await test('flags a missing RESEND_FROM_EMAIL as a problem, not a pass', async () => {
  // Without it the server silently falls back to resend.dev, which can only
  // email the Resend account owner - so every student gets nothing.
  const before = process.env.RESEND_FROM_EMAIL;
  delete process.env.RESEND_FROM_EMAIL;
  try {
    const res = mockRes();
    await health(mockReq({ method: 'GET' }), res);
    assert.equal(res.body.configured.resendFromConfigured, false);
    assert.equal(res.body.configured.canEmailStudents, false);
    assert.equal(res.body.status, 'degraded');
    assert.ok(
      res.body.problems.some((p) => /RESEND_FROM_EMAIL/.test(p)),
      'health did not name the missing variable',
    );
  } finally {
    if (before !== undefined) process.env.RESEND_FROM_EMAIL = before;
  }
});

await test('reports a working email setup as healthy', async () => {
  const before = process.env.RESEND_FROM_EMAIL;
  const beforeKey = process.env.RESEND_API_KEY;
  process.env.RESEND_FROM_EMAIL = 'BrightMinds <noreply@brightmindsclasses.in>';
  process.env.RESEND_API_KEY = 're_test_key';
  try {
    const res = mockRes();
    await health(mockReq({ method: 'GET' }), res);
    assert.equal(res.body.configured.canEmailStudents, true);
    assert.equal(res.body.configured.resendFromResolved, 'BrightMinds <noreply@brightmindsclasses.in>');
  } finally {
    if (before !== undefined) process.env.RESEND_FROM_EMAIL = before; else delete process.env.RESEND_FROM_EMAIL;
    process.env.RESEND_API_KEY = beforeKey;
  }
});

console.log('\n/api/create-order');
await test('rejects an unauthenticated request with 401', async () => {
  const res = mockRes();
  await createOrder(mockReq({ body: { courseId: 'nda-1-april-2027' } }), res);
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /signed in/i);
});

await test('rejects a malformed Authorization header with 401', async () => {
  const res = mockRes();
  await createOrder(
    mockReq({ headers: { authorization: 'Basic abc' }, body: { courseId: 'nda-1-april-2027' } }),
    res,
  );
  assert.equal(res.statusCode, 401);
});

await test('rejects a GET with 405', async () => {
  const res = mockRes();
  await createOrder(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'POST');
});

await test('answers a CORS preflight without running the handler', async () => {
  const res = mockRes();
  await createOrder(
    mockReq({ method: 'OPTIONS', headers: { origin: 'https://brightmindsclasses.in' } }),
    res,
  );
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://brightmindsclasses.in');
});

console.log('\n/api/verify-payment');
await test('rejects an unauthenticated request with 401', async () => {
  const res = mockRes();
  await verifyPayment(
    mockReq({
      body: {
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'sig',
      },
    }),
    res,
  );
  assert.equal(res.statusCode, 401);
});

await test('never confirms a payment without a valid token', async () => {
  // Even with a perfectly valid signature, no token means no enrolment.
  const signature = sign('order_1|pay_1', process.env.RAZORPAY_KEY_SECRET);
  const res = mockRes();
  await verifyPayment(
    mockReq({
      body: {
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature,
      },
    }),
    res,
  );
  assert.equal(res.statusCode, 401);
  assert.notEqual(res.body.success, true);
});

console.log('\n/api/razorpay-webhook');
await test('rejects a missing signature with 401', async () => {
  const res = mockRes();
  await webhook(mockReq({ body: Buffer.from('{"event":"payment.captured"}') }), res);
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /signature/i);
});

await test('rejects a forged signature with 401', async () => {
  const rawBody = '{"event":"payment.captured"}';
  const res = mockRes();
  await webhook(
    mockReq({
      headers: { 'x-razorpay-signature': sign(rawBody, 'attacker_secret') },
      body: Buffer.from(rawBody),
    }),
    res,
  );
  assert.equal(res.statusCode, 401);
});

await test('rejects a body altered after signing with 401', async () => {
  const signed = '{"event":"payment.captured","amount":50000}';
  const tampered = '{"event":"payment.captured","amount":1}';
  const res = mockRes();
  await webhook(
    mockReq({
      headers: { 'x-razorpay-signature': sign(signed, process.env.RAZORPAY_WEBHOOK_SECRET) },
      body: Buffer.from(tampered),
    }),
    res,
  );
  assert.equal(res.statusCode, 401);
});

await test('rejects a GET with 405', async () => {
  const res = mockRes();
  await webhook(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
});

await test('a valid signature gets past auth and reaches processing', async () => {
  // Firebase Admin is unconfigured in this test run, so a correctly signed
  // webhook must fail at the database step (500), never at the signature step.
  const rawBody = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } },
  });
  const res = mockRes();
  await webhook(
    mockReq({
      headers: {
        'x-razorpay-signature': sign(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET),
        'x-razorpay-event-id': 'evt_test_1',
      },
      body: Buffer.from(rawBody),
    }),
    res,
  );
  assert.equal(res.statusCode, 500);
  assert.notEqual(res.statusCode, 401);
});

await test('malformed JSON with a valid signature is a 400, not a crash', async () => {
  const rawBody = 'not json at all';
  const res = mockRes();
  await webhook(
    mockReq({
      headers: { 'x-razorpay-signature': sign(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET) },
      body: Buffer.from(rawBody),
    }),
    res,
  );
  assert.equal(res.statusCode, 400);
});

console.log('\n/api/register-login');
await test('rejects an unauthenticated request with 401', async () => {
  const res = mockRes();
  await registerLogin(mockReq({ body: {} }), res);
  assert.equal(res.statusCode, 401);
});

await test('rejects a GET with 405', async () => {
  const res = mockRes();
  await registerLogin(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
});

console.log('\n/api/admin-export');
await test('rejects an unauthenticated download with 401', async () => {
  const res = mockRes();
  await adminExport(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 401);
});

await test('rejects a POST with 405', async () => {
  const res = mockRes();
  await adminExport(mockReq({ method: 'POST' }), res);
  assert.equal(res.statusCode, 405);
});

await test('never leaks student data without a verified admin token', async () => {
  // No token at all must never reach the spreadsheet builder.
  const res = mockRes();
  await adminExport(mockReq({ method: 'GET', headers: { authorization: 'Bearer nonsense' } }), res);
  assert.ok(res.statusCode === 401 || res.statusCode === 403,
    `expected 401/403, got ${res.statusCode}`);
  assert.notEqual(res.statusCode, 200);
});

console.error = originalError;

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
