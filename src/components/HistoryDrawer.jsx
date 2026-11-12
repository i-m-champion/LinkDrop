import React from 'react';
import { X, History, Trash2, RotateCcw, ExternalLink } from 'lucide-react';
import { PLATFORM_BADGES, formatDuration } from '../utils/formatters.js';

export default function HistoryDrawer({
  open,
  history,
  onClose,
  onRequeue,
  onClearHistory,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="glass-panel flex h-full w-full max-w-md flex-col border-l border-white/15 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Download History ({history.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400">
              <History className="mb-2 h-8 w-8 opacity-40" />
              <p>No downloads recorded yet.</p>
              <p className="mt-1 text-[11px] opacity-75">
                Completed videos &amp; audio tracks appear here automatically.
              </p>
            </div>
          ) : (
            history.map((entry) => {
              const pMeta = PLATFORM_BADGES[entry.platform] || PLATFORM_BADGES.web;
              return (
                <div
                  key={`${entry.id}-${entry.ts}`}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-white/[0.07] dark:bg-white/[0.03]"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${pMeta.pill}`}
                      >
                        {pMeta.short}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-700 dark:bg-white/[0.08] dark:text-slate-200">
                        {entry.format}
                        {entry.quality && entry.quality !== 'best' ? ` ${entry.quality}p` : ''}
                      </span>
                      {entry.duration && (
                        <span className="font-mono text-[10px] text-slate-400">
                          {formatDuration(entry.duration)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {entry.title}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      @{entry.username} • {new Date(entry.ts).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onRequeue(entry.url)}
                      title="Load URL back into Studio"
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Open Source"
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
