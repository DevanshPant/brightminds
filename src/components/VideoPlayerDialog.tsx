import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { CourseVideo } from '@/hooks/useCourseVideos';

type Props = {
  video: CourseVideo | null;
  subjectName?: string;
  /** Who is watching, burnt across the picture. */
  watermark?: string | null;
  onClose: () => void;
};

/** Corners and edges the watermark drifts between, so it cannot be cropped out. */
const SPOTS = [
  { top: '8%', left: '6%' },
  { top: '8%', right: '6%' },
  { top: '46%', left: '28%' },
  { bottom: '22%', left: '6%' },
  { bottom: '22%', right: '6%' },
  { top: '28%', right: '14%' },
];

/**
 * Plays a lesson inside the site.
 *
 * Drive's /preview embed is used rather than a raw file URL, so there is no
 * media URL in the page for a browser to "Save as", and the lesson's Drive id
 * only reaches the browser while the student's window for it is open.
 *
 * On recording, the honest position: a video a browser can play can be captured
 * with OBS, a phone camera or Windows Game Bar, and no website can prevent that
 * - Netflix included, which is why its apps fall back to a black frame rather
 * than claiming to stop it. What is achievable is making a leak traceable, so
 * the watcher's name and email drift across the picture the whole time. A
 * recording made from this page carries the account it came from, which is what
 * actually deters sharing.
 */
const VideoPlayerDialog = ({ video, subjectName, watermark, onClose }: Props) => {
  const [spot, setSpot] = useState(0);

  // Close on Escape, and stop the page behind from scrolling.
  useEffect(() => {
    if (!video) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [video, onClose]);

  // Drift the mark around. A fixed position would be cropped off in seconds.
  useEffect(() => {
    if (!video || !watermark) return;
    const id = window.setInterval(() => setSpot((n) => (n + 1) % SPOTS.length), 9000);
    return () => window.clearInterval(id);
  }, [video, watermark]);

  // Dated so a leaked copy says when it was taken, not only by whom.
  const stamp = useMemo(
    () => new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }),
    [video?.id],
  );

  if (!video || !video.id) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={video.name}
    >
      <div
        className="w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            {subjectName && (
              <p className="text-xs uppercase tracking-wide text-white/60 mb-0.5">{subjectName}</p>
            )}
            <h3 className="font-display text-lg sm:text-xl font-bold text-white truncate">
              {video.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close player"
            className="shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ aspectRatio: '16 / 9' }}>
          {/*
            Drive draws its own download and pop-out buttons in the top-right of
            the player, inside a cross-origin frame, so they cannot be styled
            away. This pad sits over them and swallows the click. The real fix is
            turning off "Viewers can download, print and copy" on each file,
            which npm run check:drive reports on; this covers the files owned by
            other teachers, where that cannot be set from here. It is
            deliberately small, so the playback controls along the bottom and the
            centre of the picture stay clickable.
          */}
          <div
            aria-hidden="true"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 right-0 h-14 w-32 z-20 cursor-default"
          />

          <iframe
            src={`https://drive.google.com/file/d/${video.id}/preview`}
            title={video.name}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
            // Only what the player needs; no downloads, no top-level navigation.
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />

          {watermark && (
            <div
              aria-hidden="true"
              // pointer-events-none matters: the mark must never swallow a click
              // meant for the play button underneath it.
              className="absolute z-10 pointer-events-none select-none transition-all duration-1000 ease-in-out max-w-[70%]"
              style={SPOTS[spot]}
            >
              <span
                className="block text-[11px] sm:text-xs font-semibold leading-tight text-white/35 truncate"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
              >
                {watermark}
              </span>
              <span
                className="block text-[10px] text-white/25"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
              >
                BrightMinds  {stamp}
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-white/50 mt-3 text-center">
          Your name is shown on this lesson. Recording or sharing it is traceable to your account.
        </p>
      </div>
    </div>
  );
};

export default VideoPlayerDialog;
