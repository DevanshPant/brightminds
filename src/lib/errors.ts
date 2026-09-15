/** Firebase, Razorpay and fetch all throw differently. Normalise them. */
export const getErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
};

/** Firebase auth errors carry a stable `code` such as `auth/popup-blocked`. */
export const getErrorCode = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';
