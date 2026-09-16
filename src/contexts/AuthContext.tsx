import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';
import { getErrorCode } from '@/lib/errors';
import { apiPost } from '@/lib/api';
import { AuthContext, type AuthContextValue } from '@/contexts/auth-context';

/** Errors that mean "popup won't work here" — fall back to a full redirect. */
const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/cancelled-popup-request',
  'auth/web-storage-unsupported',
]);

/**
 * Records the sign-in server-side, which also alerts the admin the first time
 * a student appears. Deliberately fire-and-forget: a failure here must never
 * stop someone getting into their account.
 */
const recordLogin = async (user: User) => {
  try {
    const token = await user.getIdToken();
    await apiPost('/api/register-login', {}, token);
  } catch (error) {
    console.warn('Could not record this sign-in:', error);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    // Complete any sign-in that used the redirect fallback.
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) void recordLogin(result.user);
      })
      .catch((error) => console.warn('Redirect sign-in failed:', error));

    // Only the two branches above record a login. This fires on every page
    // load for an existing session too, so counting here would turn a refresh
    // into a "sign-in".
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signingIn,
      configured: isFirebaseConfigured,

      signInWithGoogle: async () => {
        if (!auth) throw new Error('Student login is not configured yet.');
        setSigningIn(true);
        try {
          const result = await signInWithPopup(auth, googleProvider);
          await recordLogin(result.user);
        } catch (error) {
          const code = getErrorCode(error);
          // Many mobile browsers block popups — finish the sign-in via redirect.
          if (REDIRECT_FALLBACK_CODES.has(code)) {
            await signInWithRedirect(auth, googleProvider);
            return;
          }
          if (code === 'auth/popup-closed-by-user') return;
          throw error;
        } finally {
          setSigningIn(false);
        }
      },

      signOut: async () => {
        if (!auth) return;
        await fbSignOut(auth);
      },

      recordSignIn: (u: User) => recordLogin(u),

      getToken: async () => {
        if (!auth?.currentUser) throw new Error('You need to sign in first.');
        return auth.currentUser.getIdToken();
      },
    }),
    [user, loading, signingIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
