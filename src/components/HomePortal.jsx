import React, { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  ArrowUpRight,
  FolderArchive,
  Gauge,
  Link2,
  Music4,
  Scissors,
  Sparkles,
  Zap,
} from 'lucide-react';
import { PLATFORM_LIST, PLATFORM_MAP } from '../config/platformThemes.js';
import { parseClientMediaUrls } from '../utils/formatters.js';
import PlatformIcon from './PlatformIcon.jsx';
import SpotlightCard from './kinetic/SpotlightCard.jsx';

gsap.registerPlugin(useGSAP);

export default function HomePortal({ onSelectPlatform, onQuickLaunchUrl, capabilities }) {
  const rootRef = useRef(null);
  const [quickUrl, setQuickUrl] = useState('');

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;

      const tl = gsap.timeline({ defaults: { ease: 'power3.out', clearProps: 'transform' } });
      tl.fromTo(
        '.hero-line',
        { yPercent: 100 },
        { yPercent: 0, duration: 0.7, stagger: 0.08 }
      ).fromTo(
        '.portal-card',
        { y: 20 },
        { y: 0, duration: 0.5, stagger: 0.045 },
        '-=0.4'
      );
    },
    { scope: rootRef }
  );

  const detectedPreview = useMemo(() => {
    if (!quickUrl.trim()) return null;
    const parsed = parseClientMediaUrls(quickUrl);
    if (!parsed.length) return null;
    const platforms = [...new Set(parsed.map((p) => p.platform))];
    const target =
      platforms.length === 1 && PLATFORM_MAP[platforms[0]] ? platforms[0] : 'universal';
    return {
      count: parsed.length,
      target,
      meta: PLATFORM_MAP[target],
    };
  }, [quickUrl]);

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!detectedPreview) return;
    onQuickLaunchUrl(detectedPreview.target, quickUrl);
  };

  const yt = PLATFORM_MAP.youtube;
  const ig = PLATFORM_MAP.instagram;
  const secondaryPlatforms = PLATFORM_LIST.filter((p) =>
    ['twitter', 'tiktok', 'facebook', 'reddit'].includes(p.id)
  );
  const universal = PLATFORM_MAP.universal;

  const engineReady = capabilities?.ytDlpAvailable && capabilities?.ffmpegAvailable;

  return (
    <div ref={rootRef} className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      {/* Centered Clean Editorial Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span className="font-mono text-[11px] tracking-wide">
            {engineReady
              ? `yt-dlp ${capabilities.ytDlpVersion} + FFmpeg ${capabilities.ffmpegVersion} Ready`
              : 'High-Speed Video & Audio Batch Engine'}
          </span>
        </div>

        <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[3.75rem]">
          <span className="block overflow-hidden">
            <span className="hero-line block">Download Videos &amp; Audio</span>
          </span>
          <span className="block overflow-hidden">
            <span className="hero-line prism-text block">At Maximum Wire Speed</span>
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
          Select a platform below to open its tailored downloader workspace, or paste any link
          to jump straight in.
        </p>

        {/* Smart Quick-Launch URL Bar */}
        <form
          onSubmit={handleQuickSubmit}
          className="mx-auto mt-7 flex max-w-2xl items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-xl shadow-slate-900/5 backdrop-blur-xl transition focus-within:border-[#ff5e2b]/60 focus-within:ring-4 focus-within:ring-[#ff5e2b]/10 dark:border-white/10 dark:bg-[#0e1017]/95 dark:shadow-black/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
            <Link2 className="h-4 w-4 text-[#ff5e2b]" />
          </div>

          <input
            type="text"
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            placeholder="Paste a YouTube, Instagram, X, TikTok, or Reddit link..."
            className="w-full bg-transparent px-1.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-slate-500"
          />

          {detectedPreview && (
            <span
              className={`hidden shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold sm:inline-flex ${detectedPreview.meta.badgeClass}`}
            >
              {detectedPreview.meta.name}
            </span>
          )}

          <button
            type="submit"
            data-cursor="LAUNCH"
            disabled={!detectedPreview}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl prism-gradient px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Zap className="h-3.5 w-3.5 fill-white" />
            <span>Open</span>
          </button>
        </form>
      </section>

      {/* Platform Selector Grid */}
      <section className="mt-14">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5e2b]" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Select Platform Workspace
            </h2>
          </div>
          <span className="hidden font-mono text-xs text-slate-500 dark:text-slate-400 sm:inline">
            7 Dedicated Downloaders
          </span>
        </div>

        <div className="space-y-4">
          {/* Row 1: Flagship Dual Portals (YouTube + Instagram) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[yt, ig].map((platform) => (
              <SpotlightCard
                key={platform.id}
                spotColor={platform.spotColor}
                spotFill={platform.spotFill}
                cursorLabel={platform.cursorLabel}
                onClick={() => onSelectPlatform(platform.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectPlatform(platform.id);
                }}
                className="portal-card glass-panel group relative cursor-pointer overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-1 sm:p-7"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-80 transition group-hover:opacity-100 ${platform.gradientClass}`}
                />

                <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${platform.gradientClass} text-white shadow-lg transition duration-300 group-hover:scale-105`}
                      >
                        <PlatformIcon platformId={platform.id} className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                          {platform.name}
                        </h3>
                        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {platform.tagline}
                        </p>
                      </div>
                    </div>

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition duration-300 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-[#ff5e2b] group-hover:text-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300/85">
                    {platform.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4 dark:border-white/[0.07]">
                    <div className="flex flex-wrap gap-1.5">
                      {platform.highlights.map((h) => (
                        <span
                          key={h}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${platform.badgeClass}`}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 transition group-hover:text-[#ff5e2b] dark:text-slate-100">
                      Open {platform.name}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>

          {/* Row 2: 4 Compact Platform Cards (X, TikTok, Facebook, Reddit) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {secondaryPlatforms.map((platform) => (
              <SpotlightCard
                key={platform.id}
                spotColor={platform.spotColor}
                spotFill={platform.spotFill}
                cursorLabel={platform.cursorLabel}
                onClick={() => onSelectPlatform(platform.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectPlatform(platform.id);
                }}
                className="portal-card glass-panel group relative cursor-pointer overflow-hidden rounded-3xl p-5 transition duration-300 hover:-translate-y-1"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r opacity-75 transition group-hover:opacity-100 ${platform.gradientClass}`}
                />

                <div className="relative z-10 flex h-full flex-col justify-between gap-5">
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${platform.gradientClass} text-white shadow-md transition duration-300 group-hover:scale-105`}
                    >
                      <PlatformIcon platformId={platform.id} className="h-6 w-6" />
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 transition duration-300 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-[#ff5e2b] group-hover:text-white dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {platform.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {platform.tagline}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 dark:border-white/[0.07]">
                    <span className="text-xs font-semibold text-slate-700 transition group-hover:text-[#ff5e2b] dark:text-slate-200">
                      Open Downloader
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#ff5e2b]" />
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>

          {/* Row 3: Universal Multi-Site Batch Studio */}
          <SpotlightCard
            spotColor={universal.spotColor}
            spotFill={universal.spotFill}
            cursorLabel={universal.cursorLabel}
            maxTilt={3}
            onClick={() => onSelectPlatform(universal.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelectPlatform(universal.id);
            }}
            className="portal-card glass-panel group relative cursor-pointer overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-0.5"
          >
            <div className="relative z-10 flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex items-start gap-4 sm:items-center">
                <div
                  className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br p-3 ${universal.gradientClass} text-white shadow-lg transition duration-300 group-hover:scale-105`}
                >
                  <PlatformIcon platformId="universal" className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {universal.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-300">
                      <Sparkles className="h-3 w-3" />
                      Vimeo • Twitch • Pinterest • 1,000+ Sites
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                    {universal.description}
                  </p>
                </div>
              </div>

              <div className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white transition group-hover:bg-[#ff5e2b] dark:bg-white dark:text-slate-900 dark:group-hover:bg-[#ff5e2b] dark:group-hover:text-white">
                <span>Open Universal Batch</span>
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* Clean Capability Bar */}
      <section className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Gauge,
            title: 'Up to 8x Parallel Speed',
            desc: 'Resolve and stream batches concurrently with real-time progress.',
            color: 'text-[#ff5e2b]',
          },
          {
            icon: Music4,
            title: '4K Video & 320k Audio',
            desc: 'Mux adaptive 4K/1080p MP4s or rip crisp MP3, M4A, FLAC & WAV.',
            color: 'text-pink-500',
          },
          {
            icon: Scissors,
            title: 'Trim & .SRT Subtitles',
            desc: 'Cut exact timestamps before saving and extract full captions.',
            color: 'text-sky-500',
          },
          {
            icon: FolderArchive,
            title: 'Zero-Disk Batch ZIP',
            desc: 'Bundle selected downloads straight to a folder-organized ZIP.',
            color: 'text-violet-500',
          },
        ].map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 backdrop-blur-md dark:border-white/[0.06] dark:bg-white/[0.02]"
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 shrink-0 ${feat.color}`} />
                <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                  {feat.title}
                </h4>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {feat.desc}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
