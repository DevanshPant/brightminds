import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';

export type Profile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  fullName?: string | null;
  signInMethod?: string | null;
  phone?: string | null;
  signupAt?: string;
  lastLoginAt?: string;
  loginCount?: number;
};

/**
 * The signed-in student's own profile. Firestore rules allow a student to read
 * their own document, so this needs no special permission.
 */
export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as Profile) : null);
        setLoading(false);
      },
      (error) => {
        console.warn('Could not read profile:', error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  /**
   * We need both a number and an email: phone sign-in gives no email (and the
   * receipt has nowhere to go), Google gives no number. The write happens
   * server-side, so this can lag the first render by a moment.
   */
  const needsPhone = Boolean(user) && !loading && !profile?.phone;
  const needsEmail = Boolean(user) && !loading && !(profile?.email || user?.email);
  const needsProfile = needsPhone || needsEmail;

  return { profile, loading, needsPhone, needsEmail, needsProfile };
};
