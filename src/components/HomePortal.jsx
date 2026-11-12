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
        '.hero-badge',
        { y: 12 },
        { y: 0, duration: 0.45 }
      )
        .fromTo(
          '.hero-line',
          { yPercent: 105 },
          { yPercent: 0, duration: 0.72, stagger: 0.09 },
          '-=0.25'
        )
        .fromTo(
          '.hero-search',
          { y: 16, scale: 0.98 },
          { y: 0, scale: 1, duration: 0.55 },
          '-=0.4'
        )
        .fromTo(
          '.portal-card',
          { y: 24, scale: 0.985 },
          { y: 0, scale: 1, duration: 0.55, stagger: 0.05 },
          '-=0.35'
        )
        .fromTo(
          '.feature-pill',
          { y: 14 },
          { y: 0, duration: 0.45, stagger: 0.05 },
          '-=0.3'
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
      {/* Ambient Floating Pastel Light Orbs */}
      <div className="pointer-events-none absolute -top-12 left-1/4 -z-10 h-72 w-72 rounded-full bg-orange-300/25 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute top-16 right-1/4 -z-10 h-80 w-80 rounded-full bg-pink-300/20 blur-3xl animate-float-reverse" />
      <div className="pointer-events-none absolute top-72 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-300/20 blur-3xl animate-pulse-slow" />

      {/* Centered Clean Light Editorial Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <div className="hero-badge mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-[11px] tracking-wide">
            {engineReady
              ? `yt-dlp ${capabilities.ytDlpVersion} + FFmpeg ${capabilities.ffmpegVersion} Ready`
              : 'High-Speed Video & Audio Batch Engine'}
          </span>
        </div>

        <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.8rem]">
          <span className="block overflow-hidden">
            <span className="hero-line block">Drop Any Link, Download</span>
          </span>
          <span className="block overflow-hidden">
            <span className="hero-line prism-text block">At Maximum Wire Speed</span>
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Choose a dedicated platform downloader below, or paste any video link to jump straight into
          its workspace.
        </p>

        {/* Smart Quick-Launch URL Bar */}
        <form
          onSubmit={handleQuickSubmit}
          className="hero-search group mx-auto mt-7 flex max-w-2xl items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl shadow-slate-900/[0.06] backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 focus-within:border-[#ff5e2b]/60 focus-within:ring-4 focus-within:ring-[#ff5e2b]/10"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ff5e2b] transition-transform duration-300 group-focus-within:scale-105 group-focus-within:rotate-6">
            <Link2 className="h-4 w-4" />
          </div>

          <input
            type="text"
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            placeholder="Paste a YouTube, Instagram, X, TikTok, or Reddit link..."
            className="w-full bg-transparent px-1.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
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
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl prism-gradient px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all duration-200 hover:scale-[1.03] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
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
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff5e2b]" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-800">
              Select Platform Workspace
            </h2>
          </div>
          <span className="hidden font-mono text-xs text-slate-500 sm:inline">
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
                className="portal-card glass-panel group relative cursor-pointer overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl sm:p-7"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-85 transition-opacity group-hover:opacity-100 ${platform.gradientClass}`}
                />

                <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${platform.gradientClass} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                      >
                        <PlatformIcon platformId={platform.id} className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                          {platform.name}
                        </h3>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          {platform.tagline}
                        </p>
                      </div>
                    </div>

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all duration-300 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-[#ff5e2b] group-hover:text-white">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-600">{platform.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
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
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 transition-colors group-hover:text-[#ff5e2b]">
                      Open {platform.name}
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                className="portal-card glass-panel group relative cursor-pointer overflow-hidden rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-80 transition-opacity group-hover:opacity-100 ${platform.gradientClass}`}
                />

                <div className="relative z-10 flex h-full flex-col justify-between gap-5">
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${platform.gradientClass} text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                    >
                      <PlatformIcon platformId={platform.id} className="h-6 w-6" />
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-[#ff5e2b] group-hover:text-white">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-xl font-bold tracking-tight text-slate-900">
                      {platform.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                      {platform.tagline}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/80 pt-3">
                    <span className="text-xs font-semibold text-slate-700 transition-colors group-hover:text-[#ff5e2b]">
                      Open Downloader
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#ff5e2b]" />
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
            className="portal-card glass-panel group relative cursor-pointer overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="relative z-10 flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex items-start gap-4 sm:items-center">
                <div
                  className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br p-3 ${universal.gradientClass} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                >
                  <PlatformIcon platformId="universal" className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-xl font-bold tracking-tight text-slate-900">
                      {universal.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                      <Sparkles className="h-3 w-3" />
                      Vimeo • Twitch • Pinterest • 1,000+ Sites
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">{universal.description}</p>
                </div>
              </div>

              <div className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-md transition-all duration-300 group-hover:scale-[1.03] group-hover:bg-[#ff5e2b]">
                <span>Open Universal Batch</span>
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* Animated Light-Mode Feature Strip */}
      <section className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Gauge,
            title: 'Up to 8x Parallel Speed',
            desc: 'Resolve and stream batches concurrently with real-time progress.',
            color: 'text-[#ff5e2b] bg-orange-50',
          },
          {
            icon: Music4,
            title: '4K Video & 320k Audio',
            desc: 'Mux adaptive 4K/1080p MP4s or rip crisp MP3, M4A, FLAC & WAV.',
            color: 'text-pink-600 bg-pink-50',
          },
          {
            icon: Scissors,
            title: 'Trim & .SRT Subtitles',
            desc: 'Cut exact timestamps before saving and extract full captions.',
            color: 'text-sky-600 bg-sky-50',
          },
          {
            icon: FolderArchive,
            title: 'Zero-Disk Batch ZIP',
            desc: 'Bundle selected downloads straight to a folder-organized ZIP.',
            color: 'text-violet-600 bg-violet-50',
          },
        ].map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              className="feature-pill group rounded-2xl border border-slate-200/90 bg-white/80 p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${feat.color} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </span>
                <h4 className="font-display text-sm font-semibold text-slate-900">{feat.title}</h4>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{feat.desc}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
