import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { CourseVideo } from '@/hooks/useCourseVideos';

type Props = {
  video: CourseVideo | null;
  subjectName?: string;
  onClose: () => void;
};

/**
 * Plays a lesson inside the site.
 *
 * Drive's /preview embed is used rather than a raw file URL, so there is no
 * media URL in the page for a browser to "Save as". Turning OFF "Viewers can
 * download, print and copy" on the Drive folder removes the download control
 * from this player too.
 *
 * Worth being straight about the limit: nothing here stops a screen recorder.
 * That is true of every video on the web, Netflix included. This raises the
 * effort from one right-click to deliberate piracy, which is the realistic aim.
 */
const VideoPlayerDialog = ({ video, subjectName, onClose }: Props) => {
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

  if (!video) return null;

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
          <iframe
            src={`https://drive.google.com/file/d/${video.id}/preview`}
            title={video.name}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
            // Only what the player needs; no downloads, no top-level navigation.
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>

        <p className="text-xs text-white/50 mt-3 text-center">
          For your personal study only. Please do not record or share this lesson.
        </p>
      </div>
    </div>
  );
};

export default VideoPlayerDialog;
