import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';

export type Enrollment = {
  enrollmentId: string;
  uid: string;
  email: string | null;
  studentName: string | null;
  phone: string | null;
  courseId: string;
  courseTitle: string;
  amount: number;
  currency: string;
  status: string;
  receiptNo: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  paidAt: string;
  whatsappLink: string | null;
  receiptEmailSent?: boolean;
};

/**
 * Live view of the signed-in student's enrolments. Uses a realtime listener so
 * the dashboard fills in the moment the webhook or checkout writes the record.
 */
export const useEnrollments = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !user) {
      setEnrollments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'enrollments'),
      where('uid', '==', user.uid),
      orderBy('paidAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setEnrollments(snapshot.docs.map((d) => d.data() as Enrollment));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Could not load enrolments:', err);
        setError('We could not load your courses right now. Please refresh.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  const isEnrolledIn = (courseId: string) =>
    enrollments.some((e) => e.courseId === courseId && e.status === 'paid');

  return { enrollments, loading, error, isEnrolledIn };
};
