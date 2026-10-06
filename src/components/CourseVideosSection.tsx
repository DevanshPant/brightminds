import { Link } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, Clock, ExternalLink, Loader2, Lock, PlayCircle, Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCourseVideos } from '@/hooks/useCourseVideos';

const formatDate = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
};

/**
 * Recorded classes for enrolled students, and a demo for everyone else.
 *
 * The link points at a Drive folder, so anything the teacher adds there shows
 * up for students immediately - nothing needs redeploying when a new class is
 * uploaded.
 */
const CourseVideosSection = () => {
  const { videos, loading, error } = useCourseVideos();

  if (loading && !videos) {
    return (
      <section className="mb-14">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-5">
          Course videos
        </h2>
        <div className="flex items-center gap-3 rounded-3xl border border-primary/10 bg-card p-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Checking your access...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-14">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-5">
          Course videos
        </h2>
        <div className="flex items-start gap-3 rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-muted-foreground">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          {error}
        </div>
      </section>
    );
  }

  if (!videos) return null;

  const { hasAccess, reason, demoUrl, recordingsUrl, daysRemaining, hoursRemaining, expiresAt, accessDays } = videos;
  const endingSoon = hasAccess && (daysRemaining ?? 99) <= 2;

  return (
    <section className="mb-14">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-5">
        Course videos
      </h2>

      {/* Enrolled, inside the window */}
      {hasAccess && recordingsUrl && (
        <div className="rounded-3xl border border-primary/15 bg-card p-6 sm:p-8 shadow-golden">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-golden shrink-0">
                <Video className="w-6 h-6 text-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  Recorded classes
                </h3>
                <p className="text-sm text-muted-foreground">
                  New classes appear here as they are uploaded.
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                endingSoon ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {daysRemaining === 0
                ? `${hoursRemaining}h left`
                : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}
            </span>
          </div>

          <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
            <a href={recordingsUrl} target="_blank" rel="noopener noreferrer">
              <PlayCircle className="w-4 h-4" />
              Watch recorded classes
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>

          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Your access runs until <strong className="text-foreground">{formatDate(expiresAt)}</strong>.
            Please do not share this link - it is tied to your enrolment.
          </p>
        </div>
      )}

      {/* Enrolled, window closed */}
      {!hasAccess && reason === 'expired' && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-4">
            <Lock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-lg font-bold text-foreground mb-1">
                Your video access has ended
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Recordings were available for {accessDays} days after your enrolment, until{' '}
                <strong className="text-foreground">{formatDate(expiresAt)}</strong>. Your enrolment
                and receipt are unaffected.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Need more time? Message us in the community or write to{' '}
            <a href="mailto:hello@brightmindsclasses.in" className="underline hover:text-foreground">
              hello@brightmindsclasses.in
            </a>
            .
          </p>
        </div>
      )}

      {/* Signed in, has not bought: demo only */}
      {!hasAccess && reason === 'not-enrolled' && (
        <div className="rounded-3xl border border-primary/10 bg-gradient-golden p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center shrink-0">
              <PlayCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">
                See what a class is like
              </h3>
              <p className="text-sm text-muted-foreground">
                Watch a free demo before you enrol.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {demoUrl ? (
              <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
                <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                  <PlayCircle className="w-4 h-4" />
                  Watch the demo class
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                A demo class will be available here shortly.
              </p>
            )}

            <Button variant="heroOutline" size="lg" className="w-full sm:w-auto" asChild>
              <Link to="/#courses">
                See the course
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Recorded classes unlock for {accessDays} days once you enrol.
          </p>
        </div>
      )}
    </section>
  );
};

export default CourseVideosSection;
