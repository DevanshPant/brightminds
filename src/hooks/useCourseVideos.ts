import { useCallback, useEffect, useState } from 'react';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

export type CourseVideo = {
  /** Absent once this lesson's window has closed - the server withholds it. */
  id?: string;
  name: string;
  /** Set when a subject is split into chapter folders in Drive. */
  chapter?: string | null;
  durationMs: number | null;
  /** Watchable before buying. Only set on the not-enrolled response. */
  free?: boolean;
  /** Needs an enrolment. Only set on the not-enrolled response. */
  locked?: boolean;
  expired?: boolean;
  openedAt?: string;
  expiresAt?: string;
  daysRemaining?: number;
  hoursRemaining?: number;
};

export type CourseSubject = {
  id: string;
  name: string;
  videos: CourseVideo[];
};

export type CourseVideos = {
  hasAccess: boolean;
  reason?: 'not-enrolled';
  demoVideoId: string | null;
  subjects?: CourseSubject[];
  totalVideos?: number;
  openVideos?: number;
  expiredVideos?: number;
  freeVideos?: number;
  lockedVideos?: number;
  libraryError?: string | null;
  watermark?: string | null;
  courseTitle?: string | null;
  receiptNo?: string | null;
  paidAt?: string;
  accessDays: number;
};

/**
 * Course video access for the signed-in student.
 *
 * Each lesson runs its own week, so the server returns a per-lesson expiry and
 * withholds the Drive id of anything that has run out. No shareable Drive link
 * is ever sent to the browser, so a lesson cannot be passed on by copying a URL
 * out of the page.
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
