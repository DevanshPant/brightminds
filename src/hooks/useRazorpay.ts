import { useCallback, useState } from 'react';
import { apiPost, type CreateOrderResponse, type VerifyPaymentResponse } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** The slice of Razorpay Checkout we actually use. */
type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = {
  error?: { description?: string; reason?: string; code?: string };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  notes?: Record<string, string>;
  theme?: { color: string };
  modal?: { backdropclose?: boolean; escape?: boolean; ondismiss?: () => void };
  handler: (response: RazorpaySuccess) => void;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayFailure) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let scriptPromise: Promise<boolean> | null = null;

/** Loads Razorpay Checkout once and caches the promise. */
export const loadRazorpayScript = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
};

type StartCheckoutArgs = {
  courseId: string;
  token: string;
  name: string;
  email: string;
  phone?: string;
  onSuccess: (result: VerifyPaymentResponse) => void;
  onFailure: (message: string) => void;
  /** Money taken but the enrolment could not be confirmed — the worst case. */
  onUnconfirmed?: (details: { paymentId: string; orderId: string; message: string }) => void;
  onDismiss?: () => void;
};

export const useRazorpay = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const startCheckout = useCallback(async (args: StartCheckoutArgs) => {
    const { courseId, token, name, email, phone, onSuccess, onFailure, onUnconfirmed, onDismiss } = args;
    setIsProcessing(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          'Could not load the payment gateway. Check your internet connection and try again.',
        );
      }

      const order = await apiPost<CreateOrderResponse>(
        '/api/create-order',
        { courseId, phone },
        token,
      );

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'BrightMinds',
        description: order.courseTitle,
        image: `${window.location.origin}/android-chrome-192x192.png`,
        order_id: order.orderId,
        prefill: { name, email, contact: phone || '' },
        notes: { courseId },
        theme: { color: '#F5B700' },
        modal: {
          // Stops a stray tap outside the sheet from cancelling a payment on mobile.
          backdropclose: false,
          escape: true,
          ondismiss: () => {
            setIsProcessing(false);
            onDismiss?.();
          },
        },
        handler: async (response) => {
          try {
            const verified = await apiPost<VerifyPaymentResponse>(
              '/api/verify-payment',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              token,
            );
            onSuccess(verified);
          } catch (error) {
            // The student has paid. Do not let this disappear in a toast, and
            // always show the payment ID they will need to quote.
            const message = getErrorMessage(
              error,
              'Your payment went through but we could not confirm your enrolment.',
            );
            if (onUnconfirmed) {
              onUnconfirmed({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                message,
              });
            } else {
              onFailure(`${message} Payment ID: ${response.razorpay_payment_id}`);
            }
          } finally {
            setIsProcessing(false);
          }
        },
      });

      razorpay.on('payment.failed', (response) => {
        setIsProcessing(false);
        onFailure(
          response?.error?.description || 'Payment failed. No amount has been deducted.',
        );
      });

      razorpay.open();
    } catch (error) {
      setIsProcessing(false);
      onFailure(getErrorMessage(error));
    }
  }, []);

  return { startCheckout, isProcessing };
};
