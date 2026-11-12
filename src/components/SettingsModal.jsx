import React from 'react';
import { X, Shield, FileVideo, Gauge, Eye, EyeOff } from 'lucide-react';
import { buildDownloadFilename } from '../utils/formatters.js';

const TEMPLATES = [
  { id: 'user_shortcode', label: '@username + Shortcode' },
  { id: 'numbered_user', label: '01_username + Shortcode' },
  { id: 'caption_shortcode', label: 'Caption + Shortcode' },
  { id: 'shortcode', label: 'Shortcode Only' },
];

export default function SettingsModal({
  open,
  onClose,
  concurrency,
  onChangeConcurrency,
  filenameTemplate,
  onChangeTemplate,
  sessionId,
  onChangeSessionId,
}) {
  const [showCookie, setShowCookie] = React.useState(false);

  if (!open) return null;

  const sampleMeta = {
    username: 'creators',
    shortcode: 'DTVTvUDj-b1',
    caption: 'What if it all goes right',
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
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Studio Settings</h3>
            <p className="text-xs text-slate-400">
              Tune parallel worker speed, file naming, and optional session auth
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Concurrency slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 font-semibold text-slate-200">
                <Gauge className="h-4 w-4 text-amber-400" />
                Parallel Extraction Workers
              </label>
              <span className="rounded-lg bg-white/[0.07] px-2 py-0.5 font-mono font-bold text-pink-300">
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
            <p className="text-[11px] text-slate-400">
              Higher threads resolve large batches faster. Use 2–4 if Instagram rate-limits your IP.
            </p>
          </div>

          {/* Filename template */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <FileVideo className="h-4 w-4 text-cyan-400" />
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
                      ? 'border-pink-500/60 bg-pink-500/15 text-white'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="font-mono text-[11px] text-slate-400">
              Preview:{' '}
              <span className="text-emerald-300">
                {buildDownloadFilename(sampleMeta, filenameTemplate, 0)}
              </span>
            </p>
          </div>

          {/* Optional Session Cookie */}
          <div className="space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Shield className="h-4 w-4 text-emerald-400" />
                Instagram Session Cookie (Optional)
              </label>
              {sessionId && (
                <button
                  type="button"
                  onClick={() => onChangeSessionId('')}
                  className="text-[11px] font-medium text-rose-400 hover:underline"
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
                placeholder="Paste sessionid cookie value for age-restricted reels..."
                className="w-full rounded-xl border border-white/[0.09] bg-[#08090e] py-2 pl-3 pr-10 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-pink-500/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCookie((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showCookie ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-400">
              Only needed for age-restricted or private reels you follow. Saved locally in your
              browser&apos;s <code className="text-slate-300">localStorage</code> — never persisted
              on the server. Grab <code className="text-slate-300">sessionid</code> from DevTools
              → Application → Cookies → <code className="text-slate-300">instagram.com</code>.
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

