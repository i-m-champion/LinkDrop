import React, { useState } from 'react';
import {
  Check,
  Download,
  Loader2,
  Play,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  PLATFORM_BADGES,
  buildDownloadFilename,
  downloadViaPrepareSSE,
  formatBytes,
  formatDuration,
} from '../utils/formatters.js';

function TableRow({
  item,
  index,
  selected,
  filenameTemplate,
  sessionId,
  onToggleSelect,
  onUpdateItemOptions,
  onPreview,
  onRetry,
  onRecordHistory,
  onToast,
}) {
  const [dlProgress, setDlProgress] = useState(null);
  const isReady = item.status === 'ready' && item.data;
  const isError = item.status === 'error';
  const data = item.data || {};
  const platformMeta = PLATFORM_BADGES[data.platform || item.platform] || PLATFORM_BADGES.web;

  const selectedFormat = item.format || 'mp4';
  const selectedQuality = item.quality || 'best';
  const isAudio = ['mp3', 'm4a', 'flac', 'wav'].includes(selectedFormat);
  const availableQualities = data.qualities?.length ? data.qualities : [1080, 720, 480];

  const handleDownload = async () => {
    if (!isReady || dlProgress) return;
    const filename = buildDownloadFilename(data, filenameTemplate, index, selectedFormat);
    setDlProgress({ stage: 'Preparing...', percent: 5 });
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

  return (
    <tr className="border-b border-slate-200/70 transition hover:bg-slate-100/60 dark:border-white/[0.06] dark:hover:bg-white/[0.03]">
      <td className="py-3 pl-4 pr-2">
        {isReady && (
          <button
            type="button"
            onClick={() => onToggleSelect(item.id)}
            className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
              selected
                ? 'border-pink-400 bg-pink-500 text-white'
                : 'border-slate-300 bg-white text-transparent dark:border-white/25 dark:bg-white/[0.05]'
            }`}
          >
            <Check className="h-3 w-3 stroke-[3]" />
          </button>
        )}
      </td>

      <td className="px-2 py-3">
        <span
          className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${platformMeta.pill}`}
        >
          {platformMeta.short}
        </span>
      </td>

      <td className="max-w-xs px-3 py-3">
        {isReady ? (
          <div>
            <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
              {data.title || data.caption || item.id}
            </p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              @{data.username}
            </p>
          </div>
        ) : isError ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.error}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-500" />
            <span className="truncate font-mono">{item.url}</span>
          </div>
        )}
      </td>

      <td className="px-2 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
        {isReady ? formatDuration(data.duration) || '—' : '—'}
      </td>

      <td className="px-2 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
        {isReady ? formatBytes(data.fileSize) : '—'}
      </td>

      <td className="px-2 py-3">
        {isReady && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedFormat}
              onChange={(e) => onUpdateItemOptions(item.id, { format: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] dark:border-white/10 dark:bg-[#090a10]"
            >
              <option value="mp4">MP4</option>
              <option value="mp3">MP3</option>
              <option value="m4a">M4A</option>
              <option value="flac">FLAC</option>
              <option value="wav">WAV</option>
            </select>
            <select
              value={selectedQuality}
              disabled={isAudio}
              onChange={(e) => onUpdateItemOptions(item.id, { quality: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] disabled:opacity-45 dark:border-white/10 dark:bg-[#090a10]"
            >
              <option value="best">Best</option>
              {availableQualities.map((q) => (
                <option key={q} value={String(q)}>
                  {q >= 2160 ? '4K' : `${q}p`}
                </option>
              ))}
              <option value="fast">360p</option>
            </select>
          </div>
        )}
      </td>

      <td className="py-3 pl-2 pr-4 text-right">
        {isReady && (
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPreview(item)}
              title="Preview & Trim"
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={Boolean(dlProgress)}
              onClick={handleDownload}
              className="inline-flex items-center gap-1 rounded-lg prism-gradient px-2.5 py-1.5 text-[11px] font-bold text-white"
            >
              {dlProgress ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{dlProgress.percent}%</span>
                </>
              ) : (
                <>
                  <Download className="h-3 w-3" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        )}
        {isError && (
          <button
            type="button"
            onClick={() => onRetry(item)}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-300"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
      </td>
    </tr>
  );
}

export default function MediaTable(props) {
  return (
    <section className="glass-panel overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
              <th className="py-3 pl-4 pr-2 w-8" />
              <th className="px-2 py-3">Source</th>
              <th className="px-3 py-3">Title &amp; Creator</th>
              <th className="px-2 py-3">Length</th>
              <th className="px-2 py-3">Size</th>
              <th className="px-2 py-3">Output</th>
              <th className="py-3 pl-2 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.items.map((item, index) => (
              <TableRow
                key={item.id}
                item={item}
                index={index}
                selected={props.selectedIds.has(item.id)}
                filenameTemplate={props.filenameTemplate}
                sessionId={props.sessionId}
                onToggleSelect={props.onToggleSelect}
                onUpdateItemOptions={props.onUpdateItemOptions}
                onPreview={props.onPreview}
                onRetry={props.onRetry}
                onRecordHistory={props.onRecordHistory}
                onToast={props.onToast}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

