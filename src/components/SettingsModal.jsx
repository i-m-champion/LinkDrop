import React from 'react';
import { X, Shield, FileVideo, Gauge, Eye, EyeOff, FolderTree } from 'lucide-react';
import { buildDownloadFilename } from '../utils/formatters.js';

const TEMPLATES = [
  { id: 'title_id', label: 'Title + ID' },
  { id: 'numbered_title', label: '01_Title + ID' },
  { id: 'user_id', label: '@creator + ID' },
  { id: 'id_only', label: 'ID Only' },
];

export default function SettingsModal({
  open,
  onClose,
  concurrency,
  onChangeConcurrency,
  filenameTemplate,
  onChangeTemplate,
  groupByPlatform,
  onToggleGroupByPlatform,
  sessionId,
  onChangeSessionId,
}) {
  const [showCookie, setShowCookie] = React.useState(false);

  if (!open) return null;

  const sampleMeta = {
    username: 'creators',
    id: 'jNQXAC9IVRw',
    title: 'Me at the zoo',
    caption: 'Me at the zoo',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-lg rounded-3xl border border-white/15 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/[0.08]">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Studio Settings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Parallel concurrency, filename formatting, ZIP grouping &amp; auth
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Concurrency slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <Gauge className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                Parallel Extraction Workers
              </label>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono font-bold text-pink-600 dark:bg-white/[0.07] dark:text-pink-300">
                {concurrency} threads
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={concurrency}
              onChange={(e) => onChangeConcurrency(Number(e.target.value))}
              className="w-full accent-pink-500"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Higher threads resolve large batches faster. Use 2–4 if a platform rate-limits your IP.
            </p>
          </div>

          {/* Filename template */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <FileVideo className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
              Downloaded Filename Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChangeTemplate(t.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                    filenameTemplate === t.id
                      ? 'border-pink-500/60 bg-pink-500/15 text-slate-900 dark:text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Preview:{' '}
              <span className="text-emerald-600 dark:text-emerald-300">
                {buildDownloadFilename(sampleMeta, filenameTemplate, 0, 'mp4')}
              </span>
            </p>
          </div>

          {/* Group ZIP toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-100/70 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.025]">
            <div className="flex items-center gap-2.5">
              <FolderTree className="h-4 w-4 text-violet-500" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Organize ZIP by Platform Folders
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Groups batch downloads into YouTube/, Instagram/, TikTok/, etc.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleGroupByPlatform}
              className={`h-6 w-11 rounded-full p-0.5 transition ${
                groupByPlatform ? 'bg-pink-500' : 'bg-slate-300 dark:bg-white/15'
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  groupByPlatform ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Optional Session Cookie */}
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-100/70 p-4 dark:border-white/[0.08] dark:bg-white/[0.025]">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Shield className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                Instagram Session Cookie (Optional)
              </label>
              {sessionId && (
                <button
                  type="button"
                  onClick={() => onChangeSessionId('')}
                  className="text-[11px] font-medium text-rose-500 hover:underline"
                >
                  Clear Cookie
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type={showCookie ? 'text' : 'password'}
                value={sessionId}
                onChange={(e) => onChangeSessionId(e.target.value)}
                placeholder="Paste Instagram sessionid cookie for gated reels..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-pink-500/60 focus:outline-none dark:border-white/[0.09] dark:bg-[#08090e] dark:text-slate-100 dark:placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowCookie((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                {showCookie ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Only needed for age-restricted Instagram reels. Saved strictly in your browser&apos;s{' '}
              <code>localStorage</code>.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl prism-gradient px-5 py-2 text-xs font-bold text-white shadow-md shadow-pink-500/20 transition hover:brightness-110"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
