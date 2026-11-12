import React, { useState } from 'react';
import {
  Play,
  Download,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Music2,
  Heart,
  Eye,
  Clock,
  Check,
  Settings2,
  ImageDown,
  Scissors,
  Subtitles,
} from 'lucide-react';
import {
  PLATFORM_BADGES,
  formatBytes,
  formatCount,
  formatDuration,
  buildDownloadFilename,
  downloadViaPrepareSSE,
} from '../utils/formatters.js';

export default function ReelCard({
  item,
  index,
  selected,
  platformConfig,
  filenameTemplate,
  sessionId,
  onToggleSelect,
  onUpdateItemOptions,
  onPreview,
  onRetry,
  onOpenSettings,
  onRecordHistory,
  onToast,
}) {
  const [dlProgress, setDlProgress] = useState(null);

  const isReady = item.status === 'ready' && item.data;
  const isError = item.status === 'error';
  const isLoading = item.status === 'extracting' || item.status === 'queued';

  const data = item.data || {};
  const platformMeta = PLATFORM_BADGES[data.platform || item.platform] || PLATFORM_BADGES.web;
  const durationLabel = formatDuration(data.duration);

  const selectedFormat = item.format || 'mp4';
  const selectedQuality = item.quality || 'best';
  const isAudio = ['mp3', 'm4a', 'flac', 'wav'].includes(selectedFormat);
  const availableQualities = data.qualities?.length ? data.qualities : [1080, 720, 480];

  const gradClass = platformConfig?.gradientClass || 'from-[#ff5e2b] via-[#ec4899] to-[#8b5cf6]';
  const cardAspect =
    platformConfig?.cardAspect ||
    (data.platform === 'instagram' || data.platform === 'tiktok'
      ? 'aspect-[9/12]'
      : data.platform === 'youtube'
        ? 'aspect-video'
        : 'aspect-[16/11]');

  const handleDownload = async () => {
    if (!isReady || dlProgress) return;
    const filename = buildDownloadFilename(data, filenameTemplate, index, selectedFormat);
    setDlProgress({ stage: 'Starting...', percent: 4 });

    try {
      await downloadViaPrepareSSE(data, {
        format: selectedFormat,
        quality: selectedQuality,
        template: filenameTemplate,
        filename,
        sessionId,
        onProgress: (p) => setDlProgress(p),
      });
      onRecordHistory?.(data, selectedFormat, selectedQuality);
      onToast?.(`Downloaded ${filename}`, 'success');
    } catch (err) {
      onToast?.(err.message || 'Download failed.', 'error');
    } finally {
      setDlProgress(null);
    }
  };

  const handleDownloadThumb = () => {
    const qs = new URLSearchParams({ download: '1' });
    if (data.url) qs.set('url', data.url);
    if (sessionId) qs.set('sessionId', sessionId);
    const a = document.createElement('a');
    a.href = `/api/thumb/${encodeURIComponent(data.id)}?${qs.toString()}`;
    a.download = buildDownloadFilename(data, filenameTemplate, index, 'jpg');
    document.body.appendChild(a);
    a.click();
    a.remove();
    onToast?.('Saving full-resolution thumbnail...', 'info');
  };

  const thumbSrc = isReady
    ? `/api/thumb/${encodeURIComponent(data.id)}?url=${encodeURIComponent(data.url || '')}${
        sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''
      }`
    : null;

  return (
    <article
      style={{
        '--spot-color': platformConfig?.spotColor || 'rgba(255, 94, 43, 0.65)',
        '--spot-fill': platformConfig?.spotFill || 'rgba(255, 94, 43, 0.08)',
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.setProperty('--mx', '-999px');
        e.currentTarget.style.setProperty('--my', '-999px');
      }}
      className={`spotlight-card glass-card group relative flex flex-col overflow-hidden rounded-2xl transition duration-300 ${
        selected
          ? 'ring-2 ring-pink-500/70 shadow-lg shadow-pink-500/15'
          : 'hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-white/20'
      }`}
    >
      {/* Thumbnail Box */}
      <div className={`relative ${cardAspect} w-full overflow-hidden bg-slate-900`}>
        {isLoading && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-5 text-center">
            <div className="shimmer-bar absolute inset-0" />
            <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <Loader2 className="h-5 w-5 animate-spin text-[#ff5e2b]" />
            </div>
            <div className="relative z-10 space-y-1">
              <p className="text-xs font-semibold text-white">
                {item.status === 'queued' ? 'Queued...' : 'Extracting metadata...'}
              </p>
              <span
                className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${platformMeta.pill}`}
              >
                {platformMeta.label}
              </span>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-rose-300">Extraction Failed</p>
              <p className="line-clamp-3 text-[11px] leading-relaxed text-slate-400">
                {item.error}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onRetry(item)}
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.15]"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
              {item.code === 'GATED' && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1 rounded-xl border border-pink-500/30 bg-pink-500/15 px-3 py-1.5 text-xs font-semibold text-pink-200 transition hover:bg-pink-500/25"
                >
                  <Settings2 className="h-3 w-3" />
                  Auth
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
                alt={data.title || data.username}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-800 text-xs text-slate-400">
                No Cover
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/50" />

            <div className="absolute inset-x-2.5 top-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleSelect(item.id)}
                  aria-label="Select item"
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                    selected
                      ? 'border-pink-400 bg-pink-500 text-white shadow-md shadow-pink-500/30'
                      : 'border-white/25 bg-black/50 text-transparent backdrop-blur-md hover:border-white/60'
                  }`}
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </button>

                <span
                  className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold backdrop-blur-md ${platformMeta.pill}`}
                >
                  {platformMeta.short}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {data.subtitleLangs?.length > 0 && (
                  <span
                    title="Subtitles available"
                    className="rounded-md bg-black/60 p-1 text-cyan-300 backdrop-blur-md"
                  >
                    <Subtitles className="h-3 w-3" />
                  </span>
                )}
                {durationLabel && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white backdrop-blur-md">
                    <Clock className="h-2.5 w-2.5 text-slate-300" />
                    {durationLabel}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              data-cursor="PLAY"
              onClick={() => onPreview(item)}
              aria-label="Preview & Trim"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white opacity-90 shadow-xl backdrop-blur-md transition duration-200 group-hover:scale-110 group-hover:border-white/60 group-hover:bg-[#ff5e2b]">
                <Play className="h-4 w-4 translate-x-0.5 fill-white" />
              </span>
            </button>

            <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-white/95 drop-shadow">
                  @{data.username}
                </p>
                {data.audioTitle && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-200/80">
                    <Music2 className="h-2.5 w-2.5 shrink-0 text-pink-300" />
                    <span className="truncate">{data.audioTitle}</span>
                  </p>
                )}
              </div>
              {data.qualities?.[0] && (
                <span className="shrink-0 rounded-md border border-white/15 bg-black/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white backdrop-blur-md">
                  {data.qualities[0] >= 2160 ? '4K' : `${data.qualities[0]}p`}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Card Body */}
      <div className="relative z-10 flex flex-1 flex-col justify-between gap-3 p-3.5">
        {isReady ? (
          <>
            <div className="space-y-2">
              <h3 className="line-clamp-2 min-h-[2.25rem] text-xs font-bold leading-snug text-slate-900 dark:text-slate-100">
                {data.title || data.caption || item.id}
              </h3>

              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-white/[0.06] dark:text-slate-200">
                  {formatBytes(data.fileSize)}
                </span>
                {data.viewCount !== null && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 dark:bg-white/[0.04]">
                    <Eye className="h-2.5 w-2.5 text-cyan-500" />
                    {formatCount(data.viewCount)}
                  </span>
                )}
                {data.likeCount !== null && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 dark:bg-white/[0.04]">
                    <Heart className="h-2.5 w-2.5 text-rose-400" />
                    {formatCount(data.likeCount)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <select
                  value={selectedFormat}
                  onChange={(e) => onUpdateItemOptions(item.id, { format: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-[11px] font-semibold text-slate-800 focus:border-pink-500 focus:outline-none dark:border-white/[0.09] dark:bg-[#090a10] dark:text-slate-200"
                >
                  <option value="mp4">MP4 Video</option>
                  <option value="mp3">MP3 Audio</option>
                  <option value="m4a">M4A Audio</option>
                  <option value="flac">FLAC Audio</option>
                  <option value="wav">WAV Audio</option>
                </select>

                <select
                  value={selectedQuality}
                  disabled={isAudio}
                  onChange={(e) => onUpdateItemOptions(item.id, { quality: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-[11px] font-semibold text-slate-800 focus:border-pink-500 focus:outline-none disabled:opacity-45 dark:border-white/[0.09] dark:bg-[#090a10] dark:text-slate-200"
                >
                  <option value="best">Best Quality</option>
                  {availableQualities.map((q) => (
                    <option key={q} value={String(q)}>
                      {q >= 2160 ? '4K (2160p)' : `${q}p`}
                    </option>
                  ))}
                  <option value="fast">Fast (360p)</option>
                </select>
              </div>
            </div>

            {dlProgress && (
              <div className="space-y-1 rounded-xl border border-pink-500/25 bg-pink-500/10 p-2">
                <div className="flex items-center justify-between text-[10px] font-semibold text-pink-600 dark:text-pink-200">
                  <span className="truncate">{dlProgress.stage}</span>
                  <span className="font-mono">
                    {dlProgress.percent}%{dlProgress.speed ? ` • ${dlProgress.speed}` : ''}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-black/20">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${gradClass} transition-all duration-200`}
                    style={{ width: `${dlProgress.percent || 10}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-cursor="SAVE"
                disabled={Boolean(dlProgress)}
                onClick={handleDownload}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${gradClass} px-3 py-2 text-xs font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-60`}
              >
                {dlProgress ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{dlProgress.percent}%</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>{selectedFormat.toUpperCase()}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-cursor="TRIM"
                onClick={() => onPreview(item)}
                title="Preview, Trim Clip & Subtitles"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
              >
                <Scissors className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                data-cursor="COVER"
                onClick={handleDownloadThumb}
                title="Save Cover Thumbnail"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
              >
                <ImageDown className="h-3.5 w-3.5" />
              </button>

              <a
                href={data.url || item.url}
                target="_blank"
                rel="noreferrer"
                data-cursor="OPEN"
                title="Open Source URL"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate font-mono">{item.id}</span>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 hover:text-slate-300"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
