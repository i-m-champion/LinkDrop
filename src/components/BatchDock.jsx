import React from 'react';
import {
  Archive,
  Download,
  RefreshCw,
  Trash2,
  CheckSquare,
  Square,
  Loader2,
  Timer,
  HardDrive,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters.js';

export default function BatchDock({
  items,
  selectedCodes,
  filter,
  onChangeFilter,
  onToggleSelectAll,
  onRetryFailed,
  onClearAll,
  onDownloadZip,
  onDownloadIndividualBatch,
  zipState,
  elapsedMs,
}) {
  if (items.length === 0) return null;

  const readyItems = items.filter((i) => i.status === 'ready');
  const failedItems = items.filter((i) => i.status === 'error');
  const extractingCount = items.filter(
    (i) => i.status === 'extracting' || i.status === 'queued'
  ).length;

  const selectedReady = readyItems.filter((i) => selectedCodes.has(i.shortcode));
  const totalBytes = selectedReady.reduce((acc, i) => acc + (i.data?.fileSize || 0), 0);
  const allReadySelected =
    readyItems.length > 0 && selectedReady.length === readyItems.length;

  const progressPct =
    items.length > 0
      ? Math.round(((readyItems.length + failedItems.length) / items.length) * 100)
      : 0;

  return (
    <section className="glass-panel sticky top-[72px] z-30 rounded-2xl p-4 transition-all">
      {/* Live extraction progress bar */}
      {extractingCount > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-semibold text-pink-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Extracting {readyItems.length + failedItems.length} of {items.length} reels...
            </span>
            <span className="font-mono text-slate-400">{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full prism-gradient transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ZIP download live progress */}
      {zipState.active && (
        <div className="mb-3 rounded-xl border border-pink-500/25 bg-pink-500/10 px-3.5 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-semibold text-pink-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-400" />
              Streaming ZIP bundle at wire speed...
            </span>
            <span className="font-mono text-pink-200">
              {formatBytes(zipState.bytesReceived)}
              {zipState.speedBps > 0 ? ` • ${formatBytes(zipState.speedBps)}/s` : ''}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        {/* Left: Stats & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Select all toggle */}
          {readyItems.length > 0 && (
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              {allReadySelected ? (
                <CheckSquare className="h-3.5 w-3.5 text-pink-400" />
              ) : (
                <Square className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span>
                {selectedReady.length}/{readyItems.length} selected
              </span>
            </button>
          )}

          {/* Filter pills */}
          <div className="inline-flex rounded-xl border border-white/[0.07] bg-[#0a0b11] p-1 text-xs">
            {[
              { id: 'all', label: `All (${items.length})` },
              { id: 'ready', label: `Ready (${readyItems.length})` },
              { id: 'error', label: `Failed (${failedItems.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeFilter(tab.id)}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  filter === tab.id
                    ? 'bg-white/[0.12] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Size & speed badges */}
          {totalBytes > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 font-mono text-[11px] text-slate-300">
              <HardDrive className="h-3.5 w-3.5 text-violet-400" />
              {formatBytes(totalBytes)}
            </span>
          )}
          {elapsedMs > 0 && extractingCount === 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[11px] text-emerald-300">
              <Timer className="h-3.5 w-3.5" />
              {(elapsedMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>

        {/* Right: Batch Download & Management Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {failedItems.length > 0 && extractingCount === 0 && (
            <button
              type="button"
              onClick={onRetryFailed}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Failed ({failedItems.length})
            </button>
          )}

          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>

          <button
            type="button"
            disabled={selectedReady.length === 0 || zipState.active}
            onClick={() => onDownloadIndividualBatch(selectedReady)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            Download All MP4s ({selectedReady.length})
          </button>

          <button
            type="button"
            disabled={selectedReady.length === 0 || zipState.active}
            onClick={() => onDownloadZip(selectedReady)}
            className="inline-flex items-center gap-2 rounded-xl prism-gradient px-4 py-2 text-xs font-bold text-white shadow-lg shadow-pink-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {zipState.active ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
            <span>Download ZIP ({selectedReady.length})</span>
          </button>
        </div>
      </div>
    </section>
  );
}

