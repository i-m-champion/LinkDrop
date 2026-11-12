import React, { useState } from 'react';
import {
  Play,
  Download,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Music2,
  Heart,
  Clock,
  CheckCircle2,
  Settings2,
} from 'lucide-react';
import {
  formatBytes,
  formatCount,
  formatDuration,
  buildDownloadFilename,
} from '../utils/formatters.js';

export default function ReelCard({
  item,
  index,
  selected,
  filenameTemplate,
  sessionId,
  onToggleSelect,
  onPreview,
  onRetry,
  onOpenSettings,
  onToast,
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isReady = item.status === 'ready' && item.data;
  const isError = item.status === 'error';
  const isLoading = item.status === 'extracting' || item.status === 'queued';

  const data = item.data || {};
  const durationLabel = formatDuration(data.duration);
  const resolutionLabel =
    data.width && data.height ? `${Math.min(data.width, data.height)}p` : 'HD';

  const handleCopyCdn = async () => {
    if (!data.videoUrl) return;
    try {
      await navigator.clipboard.writeText(data.videoUrl);
      setCopied(true);
      onToast?.('Direct MP4 CDN link copied!', 'success');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onToast?.('Failed to copy link.', 'error');
    }
  };

  const handleSingleDownload = () => {
    if (!isReady) return;
    setDownloading(true);
    const filename = buildDownloadFilename(data, filenameTemplate, index);
    const params = new URLSearchParams({
      download: '1',
      filename,
    });
    if (sessionId) params.set('sessionId', sessionId);

    const a = document.createElement('a');
    a.href = `/api/stream/${encodeURIComponent(item.shortcode)}?${params.toString()}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => setDownloading(false), 1200);
  };

  const thumbSrc = isReady
    ? `/api/thumb/${encodeURIComponent(item.shortcode)}${
        sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
      }`
    : null;

  return (
    <article
      className={`glass-card group relative flex flex-col overflow-hidden rounded-2xl transition duration-300 ${
        selected
          ? 'ring-2 ring-pink-500/70 shadow-lg shadow-pink-500/15'
          : 'hover:border-white/20 hover:-translate-y-0.5'
      }`}
    >
      {/* Media Thumbnail / State Box */}
      <div className="relative aspect-[9/12] w-full overflow-hidden bg-[#0b0c13]">
        {isLoading && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-5 text-center">
            <div className="shimmer-bar absolute inset-0" />
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
            </div>
            <div className="relative z-10 space-y-1">
              <p className="text-xs font-semibold text-white">
                {item.status === 'queued' ? 'Queued...' : 'Extracting stream...'}
              </p>
              <p className="font-mono text-[11px] text-slate-400">{item.shortcode}</p>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-rose-300">Extraction Failed</p>
              <p className="line-clamp-4 text-[11px] leading-relaxed text-slate-400">
                {item.error}
              </p>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onRetry(item)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.12]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
              {item.code === 'GATED' && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-500/15 px-3 py-1.5 text-xs font-semibold text-pink-200 transition hover:bg-pink-500/25"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Add Session
                </button>
              )}
            </div>
          </div>
        )}

        {isReady && (
          <>
            {thumbSrc ? (
              <img
                src={thumbSrc}
                alt={`Reel by @${data.username}`}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-xs text-slate-400">
                No Thumbnail
              </div>
            )}

            {/* Top/bottom gradients for legibility */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/45" />

            {/* Top bar: checkbox + quality badge */}
            <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onToggleSelect(item.shortcode)}
                aria-label="Select reel"
                className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                  selected
                    ? 'border-pink-400 bg-pink-500 text-white shadow-md shadow-pink-500/30'
                    : 'border-white/25 bg-black/50 text-transparent backdrop-blur-md hover:border-white/50'
                }`}
              >
                <Check className="h-4 w-4 stroke-[3]" />
              </button>

              <div className="flex items-center gap-1.5">
                {data.cached && (
                  <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300 backdrop-blur-md">
                    CACHED
                  </span>
                )}
                <span className="rounded-md border border-white/15 bg-black/55 px-2 py-0.5 font-mono text-[10px] font-semibold text-white backdrop-blur-md">
                  {resolutionLabel}
                </span>
              </div>
            </div>

            {/* Center Play Button */}
            <button
              type="button"
              onClick={() => onPreview(item)}
              aria-label="Preview reel"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white opacity-90 shadow-xl backdrop-blur-md transition duration-200 group-hover:scale-110 group-hover:border-pink-400/60 group-hover:bg-pink-500/80">
                <Play className="h-5 w-5 translate-x-0.5 fill-white" />
              </span>
            </button>

            {/* Bottom overlay badges */}
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white drop-shadow">
                  @{data.username}
                </p>
                {data.audioTitle && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-200/85">
                    <Music2 className="h-2.5 w-2.5 shrink-0 text-pink-300" />
                    <span className="truncate">{data.audioTitle}</span>
                  </p>
                )}
              </div>

              {durationLabel && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white backdrop-blur-md">
                  <Clock className="h-2.5 w-2.5 text-slate-300" />
                  {durationLabel}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between gap-3 p-3.5">
        {isReady ? (
          <>
            <div className="space-y-2">
              <p className="line-clamp-2 min-h-[2.25rem] text-xs leading-relaxed text-slate-300">
                {data.caption?.trim() || (
                  <span className="italic text-slate-500">No caption on this reel</span>
                )}
              </p>

              {/* Metadata Pills */}
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-slate-400">
                <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-slate-200">
                  {formatBytes(data.fileSize)}
                </span>
                {data.likeCount !== null && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5">
                    <Heart className="h-2.5 w-2.5 text-rose-400" />
                    {formatCount(data.likeCount)}
                  </span>
                )}
                {data.extractMs && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {data.extractMs}ms
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleSingleDownload}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl prism-gradient px-3 py-2 text-xs font-bold text-white shadow-md shadow-pink-500/20 transition hover:brightness-110 active:scale-[0.98]"
              >
                {downloading ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Download MP4</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyCdn}
                title="Copy direct MP4 URL"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.1] hover:text-white"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>

              <a
                href={data.url || item.url}
                target="_blank"
                rel="noreferrer"
                title="Open on Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.1] hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono">{item.shortcode}</span>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-slate-300"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

