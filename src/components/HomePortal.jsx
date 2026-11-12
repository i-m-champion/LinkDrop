import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowUpRight, Sparkles, Terminal, Zap } from 'lucide-react';
import { PLATFORM_LIST } from '../config/platformThemes.js';
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
        { yPercent: 0, duration: 0.75, stagger: 0.08 }
      ).fromTo(
        '.portal-card',
        { y: 24 },
        { y: 0, duration: 0.55, stagger: 0.05 },
        '-=0.45'
      );
    },
    { scope: rootRef }
  );

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    const parsed = parseClientMediaUrls(quickUrl);
    if (!parsed.length) return;
    const platforms = new Set(parsed.map((p) => p.platform));
    const target =
      platforms.size === 1 && PLATFORM_LIST.some((pl) => pl.id === parsed[0].platform)
        ? parsed[0].platform
        : 'universal';
    onQuickLaunchUrl(target, quickUrl);
  };

  const yt = PLATFORM_LIST.find((p) => p.id === 'youtube');
  const ig = PLATFORM_LIST.find((p) => p.id === 'instagram');
  const middlePlatforms = PLATFORM_LIST.filter((p) =>
    ['twitter', 'tiktok', 'facebook', 'reddit'].includes(p.id)
  );
  const universal = PLATFORM_LIST.find((p) => p.id === 'universal');

  const engineReady = capabilities?.ytDlpAvailable && capabilities?.ffmpegAvailable;

  return (
    <div ref={rootRef} className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-7 sm:px-6 lg:px-8">
      {/* Compact Editorial Hero */}
      <section className="grid grid-cols-1 items-end gap-6 border-b border-slate-300/60 pb-8 dark:border-white/[0.08] lg:grid-cols-[1.3fr_0.9fr]">
        <div>
          <div className="mb-3 inline-flex items-center gap-2.5 rounded-full border border-slate-300/80 bg-white/80 px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-700 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f4f1ea]/80">
            <span className="h-2 w-2 rounded-full bg-[#ff5e2b] shadow-[0_0_10px_#ff5e2b]" />
            <span>
              {engineReady
                ? `Engine Ready • yt-dlp ${capabilities.ytDlpVersion} + FFmpeg ${capabilities.ffmpegVersion}`
                : 'Multi-Platform Video & Audio Engine'}
            </span>
          </div>

          <h1 className="font-display text-3xl font-extrabold leading-[1.04] tracking-tight text-slate-900 dark:text-[#f4f1ea] sm:text-5xl lg:text-[3.5rem]">
            <span className="block overflow-hidden">
              <span className="hero-line block">
                Download any{' '}
                <em className="font-serif text-[1.1em] font-normal italic text-[#ff5e2b]">
                  stream
                </em>
                ,
              </span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-line block">from every platform.</span>
            </span>
          </h1>
        </div>

        <div className="space-y-3.5">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300/90">
            Choose your platform below to open its dedicated downloader studio, or paste any link
            here to jump straight in.
          </p>

          {/* Instant Auto-Route Bar */}
          <form
            onSubmit={handleQuickSubmit}
            className="flex items-center gap-2 rounded-2xl border border-slate-300/80 bg-white/90 p-1.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#0d0e14]/90"
          >
            <Terminal className="ml-2.5 h-4 w-4 shrink-0 text-[#ff5e2b]" />
            <input
              type="text"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              placeholder="Paste any YouTube, Instagram, X, TikTok link..."
              className="w-full bg-transparent px-2 py-2 font-mono text-xs text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-slate-500"
            />
            <button
              type="submit"
              data-cursor="OPEN"
              disabled={!quickUrl.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#ff5e2b] px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              <Zap className="h-3.5 w-3.5" />
              Open
            </button>
          </form>
        </div>
      </section>

      {/* Section Header */}
      <div className="mt-8 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#ff5e2b]">
            Choose Platform to Download
          </span>
          <span className="hidden h-px w-12 bg-slate-300 dark:bg-white/15 sm:inline-block" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Click any platform button below to open its dedicated page
          </span>
        </div>
      </div>

      {/* Asymmetric Platform Selector Grid */}
      <div className="space-y-5">
        {/* Row 1: Flagship Dual Portals (YouTube + Instagram) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {[
            { platform: yt, indexLabel: '01 / YOUTUBE DOWNLOADER' },
            { platform: ig, indexLabel: '02 / INSTAGRAM DOWNLOADER' },
          ].map(({ platform, indexLabel }) => (
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
              className="portal-card glass-panel group cursor-pointer overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-1 sm:p-7"
            >
              <div className="relative z-10 flex h-full flex-col justify-between gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${platform.gradientClass} text-white shadow-xl transition duration-300 group-hover:scale-110`}
                    >
                      <PlatformIcon platformId={platform.id} className="h-7 w-7" />
                    </div>
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {indexLabel}
                      </span>
                      <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
                        {platform.name}
                      </h2>
                    </div>
                  </div>

                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/70 bg-white/70 text-slate-700 transition duration-300 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-[#ff5e2b] group-hover:text-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                    {platform.studioName} — {platform.tagline}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {platform.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4 dark:border-white/[0.08]">
                  <div className="flex flex-wrap gap-1.5">
                    {platform.highlights.map((h) => (
                      <span
                        key={h}
                        className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold ${platform.badgeClass}`}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:text-[#ff5e2b] dark:text-white">
                    Open {platform.name}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>

        {/* Row 2: 4 Dedicated Platform Buttons (X, TikTok, Facebook, Reddit) */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {middlePlatforms.map((platform, idx) => (
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
              className="portal-card glass-panel group cursor-pointer overflow-hidden rounded-3xl p-5 transition duration-300 hover:-translate-y-1"
            >
              <div className="relative z-10 flex h-full flex-col justify-between gap-4">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${platform.gradientClass} text-white shadow-lg transition duration-300 group-hover:scale-110`}
                  >
                    <PlatformIcon platformId={platform.id} className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-400">
                    0{idx + 3}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
                    {platform.name}
                  </h3>
                  <p className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                    {platform.studioName}
                  </p>
                  <p className="line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {platform.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 dark:border-white/[0.08]">
                  <span className="font-mono text-[11px] font-bold text-slate-700 group-hover:text-[#ff5e2b] dark:text-slate-200">
                    Download {platform.name.split(' ')[0]}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#ff5e2b]" />
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>

        {/* Row 3: Full-Width Universal Mixed Batch Studio */}
        <SpotlightCard
          spotColor={universal.spotColor}
          spotFill={universal.spotFill}
          cursorLabel={universal.cursorLabel}
          maxTilt={3.5}
          onClick={() => onSelectPlatform(universal.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelectPlatform(universal.id);
          }}
          className="portal-card glass-panel group cursor-pointer overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-0.5"
        >
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4 sm:items-center">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${universal.gradientClass} text-white shadow-xl transition duration-300 group-hover:scale-110`}
              >
                <PlatformIcon platformId="universal" className="h-7 w-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">
                    07 / ALL PLATFORMS MIX
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-violet-600 dark:text-violet-300">
                    <Sparkles className="h-2.5 w-2.5" />
                    Vimeo • Twitch • Pinterest • 1,000+ Sites
                  </span>
                </div>
                <h3 className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                  {universal.name} — Multi-Site Batch Downloader
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                  {universal.description}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-bold text-white transition group-hover:bg-[#ff5e2b] dark:bg-white dark:text-slate-900 dark:group-hover:bg-[#ff5e2b] dark:group-hover:text-white">
              <span>Open Universal Batch</span>
              <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
