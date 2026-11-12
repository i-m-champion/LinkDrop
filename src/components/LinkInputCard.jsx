import React, { useMemo } from 'react';
import {
  ClipboardPaste,
  Sparkles,
  Trash2,
  Rocket,
  Loader2,
  Link2,
  Gauge,
} from 'lucide-react';
import { parseClientInstagramUrls } from '../utils/formatters.js';

const SPEED_MODES = [
  { label: 'Safe', value: 2, desc: '2x' },
  { label: 'Balanced', value: 5, desc: '5x' },
  { label: 'Turbo', value: 8, desc: '8x' },
];

const SAMPLE_LINKS = `https://www.instagram.com/reel/DTVTvUDj-b1/`;

export default function LinkInputCard({
  rawInput,
  onChangeInput,
  concurrency,
  onChangeConcurrency,
  isExtracting,
  onExtract,
  onToast,
}) {
  const parsed = useMemo(() => parseClientInstagramUrls(rawInput), [rawInput]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text?.trim()) {
        onToast?.('Clipboard is empty.', 'info');
        return;
      }
      const next = rawInput.trim() ? `${rawInput.trim()}\n${text.trim()}` : text.trim();
      onChangeInput(next);
      const count = parseClientInstagramUrls(text).length;
      onToast?.(
        count > 0
          ? `Pasted ${count} Instagram link${count > 1 ? 's' : ''} from clipboard.`
          : 'Pasted clipboard text.',
        'success'
      );
    } catch {
      onToast?.('Clipboard permission denied. Use Cmd/Ctrl + V in the box.', 'error');
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && parsed.length > 0 && !isExtracting) {
      e.preventDefault();
      onExtract(parsed);
    }
  };

  return (
    <section className="glass-panel relative overflow-hidden rounded-3xl p-5 sm:p-7">
      {/* Subtle top prism accent bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] prism-gradient opacity-80" />

      <div className="flex flex-col gap-5">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/15 text-pink-400">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Batch Link Studio</h2>
              <p className="text-xs text-slate-400">
                Paste 1 to 100 Instagram Reel or Post URLs — messy text is auto-cleaned
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePaste}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              <ClipboardPaste className="h-3.5 w-3.5 text-pink-400" />
              Paste
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeInput(rawInput.trim() ? `${rawInput.trim()}\n${SAMPLE_LINKS}` : SAMPLE_LINKS)
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Sample Link
            </button>
            {rawInput && (
              <button
                type="button"
                onClick={() => onChangeInput('')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={rawInput}
            onChange={(e) => onChangeInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            spellCheck={false}
            placeholder={`Paste multiple Instagram Reel links here (one per line, comma-separated, or mixed in text)...\n\nhttps://www.instagram.com/reel/DTVTvUDj-b1/\nhttps://www.instagram.com/reels/ABC123xyz/\nhttps://www.instagram.com/p/XYZ789uvw/`}
            className="w-full resize-y rounded-2xl border border-white/[0.09] bg-[#090a10]/90 px-4 py-3.5 font-mono text-xs leading-relaxed text-slate-100 placeholder-slate-500 shadow-inner transition focus:border-pink-500/60 focus:outline-none focus:ring-2 focus:ring-pink-500/20 sm:text-sm"
          />

          {/* Bottom-right live count indicator */}
          <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2">
            <span
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold backdrop-blur-md ${
                parsed.length > 0
                  ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  : 'border border-white/[0.08] bg-white/[0.04] text-slate-400'
              }`}
            >
              {parsed.length} unique {parsed.length === 1 ? 'link' : 'links'}
            </span>
          </div>
        </div>

        {/* Detected shortcodes preview strip */}
        {parsed.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Detected:
            </span>
            {parsed.slice(0, 12).map((item, idx) => (
              <span
                key={item.shortcode}
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2 py-0.5 font-mono text-[11px] text-slate-300"
              >
                <span className="text-slate-500">{idx + 1}.</span>
                {item.shortcode}
              </span>
            ))}
            {parsed.length > 12 && (
              <span className="rounded-lg bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-pink-300">
                +{parsed.length - 12} more
              </span>
            )}
          </div>
        )}

        {/* Controls Footer */}
        <div className="flex flex-col items-stretch justify-between gap-4 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center">
          {/* Speed Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Gauge className="h-4 w-4 text-amber-400" />
              Engine Speed:
            </span>
            <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#0a0b11] p-1">
              {SPEED_MODES.map((mode) => {
                const active = concurrency === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => onChangeConcurrency(mode.value)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? 'bg-white/[0.12] text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode.label}{' '}
                    <span className="font-mono text-[10px] text-pink-400">{mode.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Fetch CTA */}
          <button
            type="button"
            disabled={parsed.length === 0 || isExtracting}
            onClick={() => onExtract(parsed)}
            className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl prism-gradient px-6 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition duration-200 hover:scale-[1.01] hover:shadow-pink-500/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Extracting Reels...</span>
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                <span>
                  Fetch {parsed.length > 0 ? `${parsed.length} ` : ''}Reel
                  {parsed.length === 1 ? '' : 's'}
                </span>
                <kbd className="hidden rounded-md bg-black/25 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white/80 sm:inline-block">
                  ⌘↵
                </kbd>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

