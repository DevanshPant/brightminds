import { useCallback, useEffect, useState } from 'react';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

export type CourseVideos = {
  hasAccess: boolean;
  reason?: 'not-enrolled' | 'expired';
  demoUrl: string | null;
  recordingsUrl?: string | null;
  courseTitle?: string | null;
  receiptNo?: string | null;
  paidAt?: string;
  expiresAt?: string;
  daysRemaining?: number;
  hoursRemaining?: number;
  accessDays: number;
};

/**
 * Course video access for the signed-in student.
 *
 * The recordings link is never held in the browser bundle or in Firestore -
 * the server returns it only while the access window is open, so it cannot be
 * recovered from a stale page or an expired enrolment record.
 */
export const useCourseVideos = () => {
  const { user, getToken } = useAuth();
  const [data, setData] = useState<CourseVideos | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      setData(await apiPost<CourseVideos>('/api/course-videos', {}, token));
      setError(null);
    } catch (err) {
      console.warn('Could not load course videos:', err);
      setError('Could not load your course videos. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return { videos: data, loading, error, reload: load };
};
