import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type Student = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phone?: string | null;
  emailVerified?: boolean;
  signupAt: string;
  lastLoginAt: string;
  loginCount: number;
};

/**
 * Every student who has ever signed in — not just those who paid.
 * Admin-only: Firestore rules reject this query for anyone else.
 */
export const useStudents = (enabled: boolean) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !enabled) {
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Deliberately no orderBy: Firestore excludes documents missing the
    // ordered field, which would hide older accounts entirely. Sorted below.
    const q = query(collection(db, 'users'), limit(1000));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setStudents(
          snapshot.docs
            .map((d) => d.data() as Student)
            .sort((a, b) => String(b.signupAt || '').localeCompare(String(a.signupAt || ''))),
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Could not load students:', err);
        setError(
          'Could not load the student list. Check that your account is in the admin list in firestore.rules.',
        );
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [enabled]);

  return { students, loading, error };
};
