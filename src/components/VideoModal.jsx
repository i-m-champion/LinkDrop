import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Music2,
  Heart,
  Eye,
  Film,
  HardDrive,
  Scissors,
  Subtitles,
  ImageDown,
  Loader2,
} from 'lucide-react';
import {
  PLATFORM_BADGES,
  formatBytes,
  formatCount,
  formatDuration,
  buildDownloadFilename,
  downloadViaPrepareSSE,
} from '../utils/formatters.js';

export default function VideoModal({
  item,
  filenameTemplate,
  sessionId,
  onClose,
  onRecordHistory,
  onToast,
}) {
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('best');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [subLang, setSubLang] = useState('en');
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!item) return;
    setFormat(item.format || 'mp4');
    setQuality(item.quality || 'best');
    setStartTime('');
    setEndTime('');
    setSubLang(item.data?.subtitleLangs?.[0] || 'en');
    setProgress(null);

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item || !item.data) return null;
  const { data } = item;
  const platformMeta = PLATFORM_BADGES[data.platform] || PLATFORM_BADGES.web;
  const isAudio = ['mp3', 'm4a', 'flac', 'wav'].includes(format);
  const availableQualities = data.qualities?.length ? data.qualities : [1080, 720, 480];

  const streamUrl = `/api/stream/${encodeURIComponent(data.id)}?url=${encodeURIComponent(
    data.url || ''
  )}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''}`;

  const handleDownload = async () => {
    if (progress) return;
    const filename = buildDownloadFilename(data, filenameTemplate, 0, format);
    setProgress({ stage: 'Starting...', percent: 4 });
    try {
      await downloadViaPrepareSSE(data, {
        format,
        quality,
        start: startTime.trim(),
        end: endTime.trim(),
        template: filenameTemplate,
        filename,
        sessionId,
        onProgress: (p) => setProgress(p),
      });
      onRecordHistory?.(data, format, quality);
      onToast?.(`Saved ${filename}`, 'success');
    } catch (err) {
      onToast?.(err.message || 'Download failed.', 'error');
    } finally {
      setProgress(null);
    }
  };

  const handleDownloadSubtitles = () => {
    const qs = new URLSearchParams({ lang: subLang, url: data.url || '' });
    if (sessionId) qs.set('sessionId', sessionId);
    const a = document.createElement('a');
    a.href = `/api/subtitles/${encodeURIComponent(data.id)}?${qs.toString()}`;
    a.download = buildDownloadFilename(data, filenameTemplate, 0, 'srt');
    document.body.appendChild(a);
    a.click();
    a.remove();
    onToast?.(`Downloading ${subLang.toUpperCase()} subtitles (.srt)...`, 'info');
  };

  const handleDownloadThumb = () => {
    const qs = new URLSearchParams({ download: '1', url: data.url || '' });
    if (sessionId) qs.set('sessionId', sessionId);
    const a = document.createElement('a');
    a.href = `/api/thumb/${encodeURIComponent(data.id)}?${qs.toString()}`;
    a.download = buildDownloadFilename(data, filenameTemplate, 0, 'jpg');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="glass-panel relative grid max-h-[90vh] w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200/90 md:grid-cols-[1.15fr_1fr]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-slate-200 backdrop-blur-md transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Video Player */}
        <div className="flex max-h-[45vh] items-center justify-center bg-black md:max-h-[85vh]">
          <video
            src={streamUrl}
            controls
            autoPlay
            playsInline
            loop
            className="h-full max-h-[45vh] w-full object-contain md:max-h-[85vh]"
          />
        </div>

        {/* Studio Inspector & Trim Panel */}
        <div className="flex flex-col justify-between gap-4 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <span
                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${platformMeta.pill}`}
              >
                {platformMeta.label}
              </span>
              <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-pink-600 dark:text-pink-300">
                @{data.username}
              </span>
            </div>

            <h3 className="text-sm font-bold leading-snug text-slate-900 dark:text-white">
              {data.title || 'Untitled Media'}
            </h3>

            {data.audioTitle && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300">
                <Music2 className="h-4 w-4 shrink-0 text-pink-500" />
                <span className="truncate">{data.audioTitle}</span>
              </div>
            )}

            <div className="max-h-24 overflow-y-auto pr-1 text-xs leading-relaxed text-slate-600 whitespace-pre-wrap dark:text-slate-300">
              {data.caption?.trim() || (
                <span className="italic text-slate-400">No description provided.</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2 text-slate-700 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-slate-300">
                <Film className="h-3.5 w-3.5 text-violet-500" />
                <span>
                  {data.width}×{data.height}
                  {data.duration ? ` • ${formatDuration(data.duration)}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2 text-slate-700 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-slate-300">
                <HardDrive className="h-3.5 w-3.5 text-cyan-500" />
                <span>{formatBytes(data.fileSize)}</span>
              </div>
              {data.viewCount !== null && (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2 text-slate-700 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-slate-300">
                  <Eye className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{formatCount(data.viewCount)} views</span>
                </div>
              )}
              {data.likeCount !== null && (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2 text-slate-700 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-slate-300">
                  <Heart className="h-3.5 w-3.5 text-rose-500" />
                  <span>{formatCount(data.likeCount)} likes</span>
                </div>
              )}
            </div>

            {/* Format & Quality */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-semibold dark:border-white/10 dark:bg-[#090a10]"
                >
                  <option value="mp4">MP4 Video</option>
                  <option value="mp3">MP3 Audio (320k)</option>
                  <option value="m4a">M4A Audio</option>
                  <option value="flac">FLAC Lossless</option>
                  <option value="wav">WAV Uncompressed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Quality
                </label>
                <select
                  value={quality}
                  disabled={isAudio}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-semibold disabled:opacity-45 dark:border-white/10 dark:bg-[#090a10]"
                >
                  <option value="best">Best Available</option>
                  {availableQualities.map((q) => (
                    <option key={q} value={String(q)}>
                      {q >= 2160 ? '4K (2160p)' : `${q}p`}
                    </option>
                  ))}
                  <option value="fast">Fast (360p)</option>
                </select>
              </div>
            </div>

            {/* Trim / Clip Studio */}
            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Scissors className="h-3.5 w-3.5 text-pink-500" />
                <span>Clip / Trim Range (Optional)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="Start (e.g. 00:05)"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs placeholder-slate-400 focus:border-pink-500 focus:outline-none dark:border-white/10 dark:bg-[#090a10]"
                />
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="End (e.g. 00:25)"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs placeholder-slate-400 focus:border-pink-500 focus:outline-none dark:border-white/10 dark:bg-[#090a10]"
                />
              </div>
            </div>

            {/* Subtitles & Cover Extras */}
            <div className="flex flex-wrap items-center gap-2">
              {data.subtitleLangs?.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={subLang}
                    onChange={(e) => setSubLang(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs dark:border-white/10 dark:bg-[#090a10]"
                  >
                    {data.subtitleLangs.map((l) => (
                      <option key={l} value={l}>
                        {l.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleDownloadSubtitles}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
                  >
                    <Subtitles className="h-3.5 w-3.5 text-cyan-500" />
                    .SRT
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleDownloadThumb}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
              >
                <ImageDown className="h-3.5 w-3.5 text-amber-500" />
                Save Cover
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {progress && (
              <div className="space-y-1 rounded-xl border border-pink-500/25 bg-pink-500/10 p-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-pink-600 dark:text-pink-200">
                  <span>{progress.stage}</span>
                  <span className="font-mono">
                    {progress.percent}%{progress.speed ? ` • ${progress.speed}` : ''}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/20">
                  <div
                    className="h-full rounded-full prism-gradient transition-all duration-200"
                    style={{ width: `${progress.percent || 10}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={Boolean(progress)}
                onClick={handleDownload}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl prism-gradient px-4 py-3 text-xs font-bold text-white shadow-lg shadow-pink-500/25 transition hover:brightness-110 disabled:opacity-60"
              >
                {progress ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing ({progress.percent}%)</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>
                      {startTime || endTime
                        ? `Download Trimmed ${format.toUpperCase()}`
                        : `Download ${format.toUpperCase()}`}
                    </span>
                  </>
                )}
              </button>
              <a
                href={data.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
              >
                <ExternalLink className="h-4 w-4" />
                Source
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
