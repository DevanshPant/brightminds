import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, ChevronDown, Clock, FolderOpen, Radio,
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

const formatDuration = (ms: number | null) => {
  if (!ms) return null;
  const mins = Math.round(ms / 60000);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

/** "3 days left", or hours once it is down to the last day. */
const formatLeft = (video: CourseVideo) => {
  const days = video.daysRemaining ?? 0;
  return days === 0
    ? `${video.hoursRemaining ?? 0}h left`
    : `${days} day${days === 1 ? '' : 's'} left`;
};

/**
 * Recorded classes for enrolled students, and a demo for everyone else.
 *
 * The server reads the Drive folder and sends back subjects and video ids only,
 * so anything uploaded to Drive appears here immediately - nothing needs
 * redeploying - while students never receive a Drive link they could open or
 * download from. Every lesson plays in VideoPlayerDialog on this page.
 *
 * Each lesson runs its own week, started by whichever came later: the lesson
 * going up, or the student paying. So the countdown is per lesson, not one
 * countdown for the whole course, and a lesson uploaded today reads "7 days
 * left" next to one uploaded last week reading "1 day left".
 */
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

  const { hasAccess, reason, demoVideoId, accessDays, libraryError, watermark } = videos;
  const subjects = videos.subjects || [];
  const openVideos = videos.openVideos ?? 0;
  const expiredVideos = videos.expiredVideos ?? 0;

  // Before buying, the lessons arrive in one list split by what is free. Only
  // the free ones carry an id, so only those can be played.
  const flat = subjects.flatMap((s) => s.videos.map((video) => ({ video, subjectName: s.name })));
  const freeLessons = flat.filter((x) => x.video.free);
  const lockedLessons = flat.filter((x) => x.video.locked);

  return (
    <section className="mb-14">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-5">
        Course videos
      </h2>

      <VideoPlayerDialog
        video={playing?.video ?? null}
        subjectName={playing?.subject}
        watermark={watermark}
        onClose={() => setPlaying(null)}
      />

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
                  Each lesson stays open for {accessDays} days from the day it is uploaded.
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                openVideos === 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {openVideos} open{expiredVideos > 0 ? `, ${expiredVideos} closed` : ''}
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
                const live = subject.videos.filter((v) => !v.expired).length;
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
                          {live} of {subject.videos.length} open
                        </span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {open && (
                      <ul className="divide-y divide-primary/10">
                        {subject.videos.map((video) => {
                          const key = video.id || `${subject.id}-${video.chapter || ''}-${video.name}`;

                          // Closed: named, but there is nothing to click, because
                          // the server did not send an id to play.
                          if (video.expired) {
                            return (
                              <li
                                key={key}
                                className="flex items-center gap-3 px-4 py-3 bg-secondary/20"
                              >
                                <span className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  {video.chapter && (
                                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 truncate">
                                      {video.chapter}
                                    </span>
                                  )}
                                  <span className="block text-sm font-medium text-muted-foreground truncate line-through">
                                    {video.name}
                                  </span>
                                  <span className="block text-xs text-muted-foreground/80">
                                    Closed on {formatDate(video.expiresAt)}
                                  </span>
                                </span>
                              </li>
                            );
                          }

                          const endingSoon = (video.daysRemaining ?? 0) <= 2;
                          return (
                            <li key={key}>
                              <button
                                type="button"
                                onClick={() =>
                                  setPlaying({
                                    video,
                                    subject: video.chapter ? `${subject.name} / ${video.chapter}` : subject.name,
                                  })
                                }
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left group"
                              >
                                <span className="w-9 h-9 rounded-full bg-gradient-accent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                  <Play className="w-4 h-4 text-foreground" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  {video.chapter && (
                                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-primary/80 truncate">
                                      {video.chapter}
                                    </span>
                                  )}
                                  <span className="block text-sm font-medium text-foreground truncate">
                                    {video.name}
                                  </span>
                                  {formatDuration(video.durationMs) && (
                                    <span className="block text-xs text-muted-foreground">
                                      {formatDuration(video.durationMs)}
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                                    endingSoon ? 'bg-amber-100 text-amber-800' : 'bg-secondary text-muted-foreground'
                                  }`}
                                >
                                  {formatLeft(video)}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Every new lesson opens for {accessDays} days of its own, so keep checking back.
            Lessons play here, carry your name, and are for your personal study only.
          </p>
        </div>
      )}

      {/* Signed in, has not bought: the demo plus a few free lessons */}
      {!hasAccess && reason === 'not-enrolled' && (
        <div className="rounded-3xl border border-primary/10 bg-gradient-golden p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center shrink-0">
              <PlayCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold text-foreground">
                Start watching for free
              </h3>
              <p className="text-sm text-muted-foreground">
                {freeLessons.length > 0
                  ? `The demo class and ${freeLessons.length} full lecture${freeLessons.length === 1 ? '' : 's'}, on the house.`
                  : 'Watch a free demo before you enrol.'}
              </p>
            </div>
          </div>

          {demoVideoId ? (
            <Button
              variant="hero"
              size="lg"
              className="w-full sm:w-auto mb-5"
              onClick={() =>
                setPlaying({
                  video: { id: demoVideoId, name: 'Demo class', durationMs: null },
                  subject: 'Free preview',
                })
              }
            >
              <PlayCircle className="w-4 h-4" />
              Watch the demo class
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground mb-5">
              A demo class will be available here shortly.
            </p>
          )}

          {freeLessons.length > 0 && (
            <div className="rounded-2xl bg-background/70 border border-primary/10 overflow-hidden mb-5">
              <p className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-primary bg-primary/5">
                Free lectures
              </p>
              <ul className="divide-y divide-primary/10">
                {freeLessons.map(({ video, subjectName }) => (
                  <li key={video.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setPlaying({
                          video,
                          subject: video.chapter ? `${subjectName} / ${video.chapter}` : subjectName,
                        })
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left group"
                    >
                      <span className="w-9 h-9 rounded-full bg-gradient-accent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 text-foreground" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-primary/80 truncate">
                          {video.chapter ? `${subjectName} / ${video.chapter}` : subjectName}
                        </span>
                        <span className="block text-sm font-medium text-foreground truncate">
                          {video.name}
                        </span>
                        {formatDuration(video.durationMs) && (
                          <span className="block text-xs text-muted-foreground">
                            {formatDuration(video.durationMs)}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                        FREE
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lockedLessons.length > 0 && (
            <div className="rounded-2xl bg-background/50 border border-primary/10 overflow-hidden mb-5">
              <p className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground bg-secondary/40">
                {lockedLessons.length} more lecture{lockedLessons.length === 1 ? '' : 's'} when you enrol
              </p>
              <ul className="divide-y divide-primary/10">
                {lockedLessons.slice(0, 6).map(({ video, subjectName }, i) => (
                  <li key={`${subjectName}-${video.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] uppercase tracking-wide text-muted-foreground/70 truncate">
                        {video.chapter ? `${subjectName} / ${video.chapter}` : subjectName}
                      </span>
                      <span className="block text-sm text-muted-foreground truncate">
                        {video.name}
                      </span>
                    </span>
                    {formatDuration(video.durationMs) && (
                      <span className="shrink-0 text-xs text-muted-foreground/70">
                        {formatDuration(video.durationMs)}
                      </span>
                    )}
                  </li>
                ))}
                {lockedLessons.length > 6 && (
                  <li className="px-4 py-2.5 text-xs text-muted-foreground">
                    and {lockedLessons.length - 6} more
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-2xl bg-background/70 border border-primary/15 p-4 mb-5">
            <Radio className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Live classes are running right now.</strong>{' '}
              Enrol and you join the live online classes as well, not only the recordings.
            </p>
          </div>

          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            To unlock the rest of the lectures, buy the course.
          </p>

          <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
            <Link to="/#courses">
              Buy the course
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Once you enrol, every lecture opens for {accessDays} days from the day it goes up,
            including the ones added later.
          </p>
        </div>
      )}
    </section>
  );
};

export default CourseVideosSection;
