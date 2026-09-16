/** Small helpers shared by every serverless function. */

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://brightminds.in,https://www.brightminds.in,https://brightmindsclasses.in,https://www.brightmindsclasses.in,http://localhost:8080,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function methodGuard(req, res, method) {
  if (req.method !== method) {
    res.setHeader('Allow', method);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return false;
  }
  return true;
}

export function fail(res, status, message, details) {
  if (details) console.error(`[${status}] ${message}`, details);
  return res.status(status).json({ error: message });
}

/** Reads the untouched request body - required for webhook signature checks. */
export async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function parseJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}
