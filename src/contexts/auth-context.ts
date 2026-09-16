import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthContextValue = {
  user: User | null;
  /** True until Firebase has reported the initial auth state. */
  loading: boolean;
  signingIn: boolean;
  /** False when the Firebase environment variables are not set yet. */
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string>;
  /** Report a sign-in that happened outside signInWithGoogle (e.g. phone OTP). */
  recordSignIn: (user: User) => Promise<void>;
};

/**
 * Kept in its own module (no components) so React Fast Refresh can hot-reload
 * the provider without invalidating the context identity for its consumers.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};
