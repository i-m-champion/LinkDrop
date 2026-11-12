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
  LayoutGrid,
  Table2,
  FolderTree,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters.js';

export default function BatchDock({
  items,
  selectedIds,
  filter,
  viewMode,
  groupByPlatform,
  onChangeFilter,
  onChangeViewMode,
  onToggleGroupByPlatform,
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

  const selectedReady = readyItems.filter((i) => selectedIds.has(i.id));
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
            <span className="flex items-center gap-2 font-semibold text-pink-500 dark:text-pink-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Resolving {readyItems.length + failedItems.length} of {items.length} media items...
            </span>
            <span className="font-mono text-slate-500 dark:text-slate-400">{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.06]">
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
            <span className="flex items-center gap-2 font-semibold text-pink-600 dark:text-pink-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-500 dark:text-pink-400" />
              Preparing &amp; streaming batch ZIP (muxing HD / audio if needed)...
            </span>
            <span className="font-mono text-pink-600 dark:text-pink-200">
              {formatBytes(zipState.bytesReceived)}
              {zipState.speedBps > 0 ? ` • ${formatBytes(zipState.speedBps)}/s` : ''}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        {/* Left: Stats, Filters, View Switch */}
        <div className="flex flex-wrap items-center gap-2">
          {readyItems.length > 0 && (
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              {allReadySelected ? (
                <CheckSquare className="h-3.5 w-3.5 text-pink-500" />
              ) : (
                <Square className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span>
                {selectedReady.length}/{readyItems.length}
              </span>
            </button>
          )}

          {/* Filter pills */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs dark:border-white/[0.07] dark:bg-[#0a0b11]">
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
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-white/[0.12] dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid / Table view switcher */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/[0.07] dark:bg-[#0a0b11]">
            <button
              type="button"
              onClick={() => onChangeViewMode('grid')}
              title="Card Grid View"
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-white/[0.12] dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode('table')}
              title="Compact Table View"
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-white/[0.12] dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Group ZIP by Platform toggle */}
          <button
            type="button"
            onClick={onToggleGroupByPlatform}
            title="Organize ZIP into platform folders (YouTube/, Instagram/, etc.)"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
              groupByPlatform
                ? 'border-violet-500/35 bg-violet-500/15 text-violet-600 dark:text-violet-300'
                : 'border-slate-200 bg-white text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400'
            }`}
          >
            <FolderTree className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Platform Folders</span>
          </button>

          {totalBytes > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-700 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-300">
              <HardDrive className="h-3.5 w-3.5 text-violet-500" />
              ~{formatBytes(totalBytes)}
            </span>
          )}
          {elapsedMs > 0 && extractingCount === 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
              <Timer className="h-3.5 w-3.5" />
              {(elapsedMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {failedItems.length > 0 && extractingCount === 0 && (
            <button
              type="button"
              onClick={onRetryFailed}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/20 dark:text-amber-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Failed ({failedItems.length})
            </button>
          )}

          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>

          <button
            type="button"
            disabled={selectedReady.length === 0 || zipState.active}
            onClick={() => onDownloadIndividualBatch(selectedReady)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
          >
            <Download className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
            Download All ({selectedReady.length})
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
