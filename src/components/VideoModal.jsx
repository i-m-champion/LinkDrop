import React, { useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Music2,
  Heart,
  MessageCircle,
  Film,
  HardDrive,
} from 'lucide-react';
import {
  formatBytes,
  formatCount,
  formatDuration,
  buildDownloadFilename,
} from '../utils/formatters.js';

export default function VideoModal({ item, filenameTemplate, sessionId, onClose }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item || !item.data) return null;
  const { data } = item;

  const streamUrl = `/api/stream/${encodeURIComponent(item.shortcode)}${
    sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
  }`;

  const filename = buildDownloadFilename(data, filenameTemplate, 0);
  const downloadParams = new URLSearchParams({ download: '1', filename });
  if (sessionId) downloadParams.set('sessionId', sessionId);
  const downloadUrl = `/api/stream/${encodeURIComponent(item.shortcode)}?${downloadParams.toString()}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="glass-panel relative grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-white/15 md:grid-cols-[1.1fr_1fr]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-slate-200 backdrop-blur-md transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Video Player */}
        <div className="flex max-h-[75vh] items-center justify-center bg-black">
          <video
            src={streamUrl}
            controls
            autoPlay
            playsInline
            loop
            className="h-full max-h-[75vh] w-full object-contain"
          />
        </div>

        {/* Details Panel */}
        <div className="flex flex-col justify-between gap-5 p-6">
          <div className="space-y-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-pink-300">
                @{data.username}
              </span>
              {data.fullName && (
                <p className="mt-1.5 text-sm font-semibold text-white">{data.fullName}</p>
              )}
            </div>

            {data.audioTitle && (
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                <Music2 className="h-4 w-4 shrink-0 text-pink-400" />
                <span className="truncate">{data.audioTitle}</span>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto pr-1 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
              {data.caption?.trim() || (
                <span className="italic text-slate-500">No caption provided.</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-slate-300">
                <Film className="h-3.5 w-3.5 text-violet-400" />
                <span>
                  {data.width}×{data.height}
                  {data.duration ? ` • ${formatDuration(data.duration)}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-slate-300">
                <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
                <span>{formatBytes(data.fileSize)}</span>
              </div>
              {data.likeCount !== null && (
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-slate-300">
                  <Heart className="h-3.5 w-3.5 text-rose-400" />
                  <span>{formatCount(data.likeCount)} likes</span>
                </div>
              )}
              {data.commentCount !== null && (
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-slate-300">
                  <MessageCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span>{formatCount(data.commentCount)} comments</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <a
              href={downloadUrl}
              download={filename}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl prism-gradient px-4 py-3 text-xs font-bold text-white shadow-lg shadow-pink-500/25 transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Download HD MP4
            </a>
            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.1]"
            >
              <ExternalLink className="h-4 w-4" />
              Instagram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

