import React, { useMemo, useState } from 'react';
import {
  ClipboardPaste,
  Sparkles,
  Trash2,
  Rocket,
  Loader2,
  Link2,
  Gauge,
  ListVideo,
  SlidersHorizontal,
} from 'lucide-react';
import {
  FORMAT_PRESETS,
  PLATFORM_BADGES,
  parseClientMediaUrls,
} from '../utils/formatters.js';

const SPEED_MODES = [
  { label: 'Safe', value: 2, desc: '2x' },
  { label: 'Balanced', value: 5, desc: '5x' },
  { label: 'Turbo', value: 8, desc: '8x' },
];

const SAMPLE_LINKS = `https://www.instagram.com/reel/DTVTvUDj-b1/
https://www.youtube.com/watch?v=jNQXAC9IVRw`;

export default function LinkInputCard({
  rawInput,
  onChangeInput,
  concurrency,
  onChangeConcurrency,
  defaultPresetId,
  onChangePresetId,
  isExtracting,
  onExtract,
  onToast,
}) {
  const [expandingPlaylist, setExpandingPlaylist] = useState(false);

  const parsed = useMemo(() => parseClientMediaUrls(rawInput), [rawInput]);

  const platformCounts = useMemo(() => {
    const map = {};
    for (const item of parsed) {
      map[item.platform] = (map[item.platform] || 0) + 1;
    }
    return Object.entries(map);
  }, [parsed]);

  const playlistCandidates = useMemo(
    () => parsed.filter((p) => p.isPlaylist || p.playlistUrl),
    [parsed]
  );

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text?.trim()) {
        onToast?.('Clipboard is empty.', 'info');
        return;
      }
      const next = rawInput.trim() ? `${rawInput.trim()}\n${text.trim()}` : text.trim();
      onChangeInput(next);
      const count = parseClientMediaUrls(text).length;
      onToast?.(
        count > 0
          ? `Pasted ${count} media link${count > 1 ? 's' : ''} from clipboard.`
          : 'Pasted clipboard text.',
        'success'
      );
    } catch {
      onToast?.('Clipboard permission denied. Use Cmd/Ctrl + V in the box.', 'error');
    }
  };

  const handleExpandPlaylist = async (targetItem) => {
    const playlistUrl = targetItem.playlistUrl || targetItem.url;
    setExpandingPlaylist(true);
    try {
      const res = await fetch('/api/playlist/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: playlistUrl, limit: 30 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not expand playlist.');
      if (!json.items?.length) throw new Error('No videos found in this playlist.');

      const expandedUrls = json.items.map((i) => i.url).join('\n');
      const existingNonPlaylist = parsed
        .filter((p) => !p.isPlaylist && p.id !== targetItem.id)
        .map((p) => p.url);
      const merged = [...existingNonPlaylist, expandedUrls].filter(Boolean).join('\n');
      onChangeInput(merged);
      onToast?.(
        `Expanded "${json.title}" into ${json.items.length} video links!`,
        'success'
      );
    } catch (err) {
      onToast?.(err.message || 'Playlist expansion failed.', 'error');
    } finally {
      setExpandingPlaylist(false);
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] prism-gradient opacity-80" />

      <div className="flex flex-col gap-5">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/15 text-pink-500 dark:text-pink-400">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Universal Batch Studio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mix YouTube, Shorts, Playlists, Instagram Reels, TikTok, X, Reddit &amp; more in one batch
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePaste}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              <ClipboardPaste className="h-3.5 w-3.5 text-pink-500 dark:text-pink-400" />
              Paste
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeInput(rawInput.trim() ? `${rawInput.trim()}\n${SAMPLE_LINKS}` : SAMPLE_LINKS)
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
              Sample Mix
            </button>
            {rawInput && (
              <button
                type="button"
                onClick={() => onChangeInput('')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-rose-300"
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
            placeholder={`Paste any combination of video or audio links here...\n\nhttps://www.youtube.com/watch?v=jNQXAC9IVRw\nhttps://www.instagram.com/reel/DTVTvUDj-b1/\nhttps://www.tiktok.com/@user/video/123456\nhttps://x.com/user/status/123456`}
            className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3.5 font-mono text-xs leading-relaxed text-slate-900 placeholder-slate-400 shadow-inner transition focus:border-pink-500/60 focus:outline-none focus:ring-2 focus:ring-pink-500/20 dark:border-white/[0.09] dark:bg-[#090a10]/90 dark:text-slate-100 dark:placeholder-slate-500 sm:text-sm"
          />

          <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2">
            <span
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold backdrop-blur-md ${
                parsed.length > 0
                  ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border border-slate-200 bg-white/80 text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400'
              }`}
            >
              {parsed.length} unique {parsed.length === 1 ? 'link' : 'links'}
            </span>
          </div>
        </div>

        {/* Platform Detection Breakdown + Playlist Expand Banner */}
        {parsed.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Detected:
              </span>
              {platformCounts.map(([plat, count]) => {
                const meta = PLATFORM_BADGES[plat] || PLATFORM_BADGES.web;
                return (
                  <span
                    key={plat}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[11px] font-semibold ${meta.pill}`}
                  >
                    <span className="font-mono">{count}</span>
                    <span>{meta.label}</span>
                  </span>
                );
              })}
            </div>

            {playlistCandidates.length > 0 && (
              <button
                type="button"
                disabled={expandingPlaylist}
                onClick={() => handleExpandPlaylist(playlistCandidates[0])}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/25 disabled:opacity-50 dark:text-rose-300"
              >
                {expandingPlaylist ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ListVideo className="h-3.5 w-3.5" />
                )}
                <span>
                  {expandingPlaylist ? 'Expanding Playlist...' : 'Expand Playlist (up to 30)'}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Default Format Preset Bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/70 p-2.5 dark:border-white/[0.06] dark:bg-[#0a0b11]/80">
          <span className="inline-flex items-center gap-1.5 px-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <SlidersHorizontal className="h-3.5 w-3.5 text-pink-500" />
            Default Output:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {FORMAT_PRESETS.map((preset) => {
              const active = defaultPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangePresetId(preset.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'prism-gradient text-white shadow-sm shadow-pink-500/25'
                      : 'bg-white text-slate-700 hover:bg-slate-200/70 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls Footer */}
        <div className="flex flex-col items-stretch justify-between gap-4 border-t border-slate-200/80 pt-4 dark:border-white/[0.06] sm:flex-row sm:items-center">
          {/* Speed Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Gauge className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              Engine Speed:
            </span>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/[0.08] dark:bg-[#0a0b11]">
              {SPEED_MODES.map((mode) => {
                const active = concurrency === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => onChangeConcurrency(mode.value)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-white/[0.12] dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {mode.label}{' '}
                    <span className="font-mono text-[10px] text-pink-500 dark:text-pink-400">
                      {mode.desc}
                    </span>
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
                <span>Extracting Media...</span>
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                <span>
                  Fetch {parsed.length > 0 ? `${parsed.length} ` : ''}Item
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
