import React from 'react';
import {
  Github,
  Settings2,
  Zap,
  ShieldCheck,
  History,
  Sun,
  Moon,
  Cpu,
  Home,
} from 'lucide-react';
import { PLATFORM_LIST } from '../config/platformThemes.js';
import PlatformIcon from './PlatformIcon.jsx';

export default function Header({
  activePlatform,
  onSelectPlatform,
  concurrency,
  hasSession,
  historyCount,
  theme,
  capabilities,
  onToggleTheme,
  onOpenHistory,
  onOpenSettings,
}) {
  const engineReady = capabilities?.ytDlpAvailable && capabilities?.ffmpegAvailable;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-300/70 bg-[#f4f1ea]/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#07070a]/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand (click returns Home) */}
        <button
          type="button"
          onClick={() => onSelectPlatform(null)}
          data-cursor="HOME"
          className="flex items-center gap-3 text-left transition hover:opacity-90"
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl prism-gradient shadow-lg shadow-pink-500/25">
            <Zap className="h-5 w-5 fill-white/90 text-white" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[#f4f1ea] bg-emerald-400 dark:border-[#07070a]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Reel<span className="prism-text">Jet</span>
              </span>
              <span className="rounded-full border border-[#ff5e2b]/35 bg-[#ff5e2b]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#ff5e2b]">
                Kinetic
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:block">
              Multi-Platform Video &amp; Audio Studio
            </p>
          </div>
        </button>

        {/* Quick Platform Switcher Pill Bar when inside a platform workspace */}
        {activePlatform && (
          <nav className="hidden items-center gap-1 rounded-2xl border border-slate-300/70 bg-white/70 p-1 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.03] xl:flex">
            <button
              type="button"
              onClick={() => onSelectPlatform(null)}
              data-cursor="HOME"
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-white/[0.08]"
            >
              <Home className="h-3.5 w-3.5" />
            </button>
            {PLATFORM_LIST.map((plat) => {
              const isCurrent = plat.id === activePlatform;
              return (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => onSelectPlatform(plat.id)}
                  data-cursor={plat.cursorLabel}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                    isCurrent
                      ? `bg-gradient-to-r ${plat.gradientClass} text-white shadow-sm`
                      : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <PlatformIcon platformId={plat.id} className="h-3.5 w-3.5" />
                  <span>{plat.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {!activePlatform && (
            <div
              title={
                engineReady
                  ? `yt-dlp ${capabilities.ytDlpVersion} + ffmpeg ${capabilities.ffmpegVersion}`
                  : 'Fast Instagram SSR engine active'
              }
              className="hidden items-center gap-2 rounded-full border border-slate-300/70 bg-white/70 px-3 py-1.5 text-xs text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 lg:flex"
            >
              <Cpu className={`h-3.5 w-3.5 ${engineReady ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span className="font-mono text-[11px]">
                {engineReady ? 'yt-dlp + ffmpeg' : 'Fast SSR'} • {concurrency}x
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenHistory}
            data-cursor="HISTORY"
            title="Download History"
            className="relative inline-flex items-center gap-1.5 rounded-xl border border-slate-300/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            <History className="h-4 w-4 text-violet-500 dark:text-violet-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-600 dark:text-violet-300">
                {historyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            data-cursor="THEME"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300/70 bg-white/80 text-slate-700 transition hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            data-cursor="SETTINGS"
            className="group relative inline-flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            <Settings2 className="h-4 w-4 text-slate-500 transition group-hover:rotate-45 group-hover:text-[#ff5e2b] dark:text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
            {hasSession && (
              <span
                title="Instagram session cookie active"
                className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-300"
              >
                <ShieldCheck className="h-3 w-3" />
              </span>
            )}
          </button>

          <a
            href="https://github.com/i-m-champion/Insta-downloader"
            target="_blank"
            rel="noreferrer"
            data-cursor="GITHUB"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            <Github className="h-4 w-4" />
            <span className="hidden md:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
