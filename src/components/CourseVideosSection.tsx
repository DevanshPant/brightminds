import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, ChevronDown, Clock, FolderOpen,
  Loader2, Lock, Play, PlayCircle, Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCourseVideos, type CourseVideo } from '@/hooks/useCourseVideos';
import VideoPlayerDialog from '@/components/VideoPlayerDialog';

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
 * The server reads the Drive folder and sends back subjects and video ids only,
 * so anything uploaded to Drive appears here immediately - nothing needs
 * redeploying - while students never receive a Drive link they could open or
 * download from. Every lesson plays in VideoPlayerDialog on this page.
 */
const formatDuration = (ms: number | null) => {
  if (!ms) return null;
  const mins = Math.round(ms / 60000);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const CourseVideosSection = () => {
  const { videos, loading, error } = useCourseVideos();
  const [playing, setPlaying] = useState<{ video: CourseVideo; subject: string } | null>(null);
  const [openSubject, setOpenSubject] = useState<string | null>(null);

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

  const { hasAccess, reason, demoVideoId, daysRemaining, hoursRemaining, expiresAt, accessDays, libraryError } = videos;
  const subjects = videos.subjects || [];
  const endingSoon = hasAccess && (daysRemaining ?? 99) <= 2;

  return (
    <section className="mb-14">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-5">
        Course videos
      </h2>

      <VideoPlayerDialog
        video={playing?.video ?? null}
        subjectName={playing?.subject}
        onClose={() => setPlaying(null)}
      />

      {/* Enrolled, inside the window */}
      {hasAccess && (
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

          {libraryError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-muted-foreground">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              {libraryError}
            </div>
          ) : subjects.length === 0 ? (
            <div className="rounded-2xl bg-secondary/50 p-5 text-sm text-muted-foreground">
              No lessons have been uploaded yet. They will appear here automatically.
            </div>
          ) : (
            <div className="space-y-3">
              {subjects.map((subject) => {
                const open = openSubject === subject.id;
                return (
                  <div key={subject.id} className="rounded-2xl border border-primary/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenSubject(open ? null : subject.id)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-secondary/50 hover:bg-secondary transition-colors text-left"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <FolderOpen className="w-5 h-5 text-primary shrink-0" />
                        <span className="font-display font-bold text-foreground truncate">
                          {subject.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {subject.videos.length} lesson{subject.videos.length === 1 ? '' : 's'}
                        </span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {open && (
                      <ul className="divide-y divide-primary/10">
                        {subject.videos.map((video) => (
                          <li key={video.id}>
                            <button
                              type="button"
                              onClick={() => setPlaying({ video, subject: subject.name })}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left group"
                            >
                              <span className="w-9 h-9 rounded-full bg-gradient-accent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <Play className="w-4 h-4 text-foreground" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-foreground truncate">
                                  {video.name}
                                </span>
                                {formatDuration(video.durationMs) && (
                                  <span className="block text-xs text-muted-foreground">
                                    {formatDuration(video.durationMs)}
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Your access runs until <strong className="text-foreground">{formatDate(expiresAt)}</strong>.
            Lessons play here and are for your personal study only.
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
            {demoVideoId ? (
              <Button
                variant="hero"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() =>
                  setPlaying({
                    video: { id: demoVideoId, name: 'Demo class', durationMs: null, addedAt: null },
                    subject: 'Free preview',
                  })
                }
              >
                <PlayCircle className="w-4 h-4" />
                Watch the demo class
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
