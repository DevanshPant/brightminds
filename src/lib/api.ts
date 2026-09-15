/** Empty string = same origin (how it runs on Vercel). */
export const API_BASE: string = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });

  const text = await response.text();
  let data: { error?: string } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response (e.g. an HTML error page from the host).
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error || `Request failed (${response.status}). Please try again.`,
      response.status,
    );
  }
  return data as T;
}

export type CreateOrderResponse = {
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  courseTitle: string;
};

export type VerifyPaymentResponse = {
  success: true;
  enrollmentId: string;
  receiptNo: string;
  whatsappLink: string | null;
  emailSent: boolean;
};
