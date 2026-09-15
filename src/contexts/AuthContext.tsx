import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '@/lib/firebase';
import { getErrorCode } from '@/lib/errors';
import { AuthContext, type AuthContextValue } from '@/contexts/auth-context';

/** Errors that mean "popup won't work here" — fall back to a full redirect. */
const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/cancelled-popup-request',
  'auth/web-storage-unsupported',
]);

const syncUserProfile = async (user: User) => {
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        lastLoginAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    // A profile write failing must never block sign-in.
    console.warn('Could not sync user profile:', error);
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
        if (result?.user) void syncUserProfile(result.user);
      })
      .catch((error) => console.warn('Redirect sign-in failed:', error));

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) void syncUserProfile(nextUser);
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
          await syncUserProfile(result.user);
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

      getToken: async () => {
        if (!auth?.currentUser) throw new Error('You need to sign in first.');
        return auth.currentUser.getIdToken();
      },
    }),
    [user, loading, signingIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
