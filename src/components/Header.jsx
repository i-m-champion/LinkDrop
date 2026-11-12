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
} from 'lucide-react';

export default function Header({
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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#07070b]/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl prism-gradient shadow-lg shadow-pink-500/25">
            <Zap className="h-5 w-5 fill-white/90 text-white" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-[#07070b]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Reel<span className="prism-text">Jet</span>
              </span>
              <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-300">
                Studio Pro
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              Universal Video &amp; Audio Batch Downloader • 1,000+ Platforms
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <div
            title={
              engineReady
                ? `yt-dlp ${capabilities.ytDlpVersion} + ffmpeg ${capabilities.ffmpegVersion}`
                : 'Fast Instagram SSR engine active'
            }
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1.5 text-xs text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 lg:flex"
          >
            <Cpu className={`h-3.5 w-3.5 ${engineReady ? 'text-emerald-500' : 'text-amber-500'}`} />
            <span className="font-mono text-[11px]">
              {engineReady ? 'yt-dlp + ffmpeg' : 'IG Fast Engine'} • {concurrency}x
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenHistory}
            title="Download History"
            className="relative inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
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
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
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
            className="group relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            <Settings2 className="h-4 w-4 text-slate-500 transition group-hover:rotate-45 group-hover:text-pink-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
            {hasSession && (
              <span
                title="Instagram session cookie active"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-300"
              >
                <ShieldCheck className="h-3 w-3" />
              </span>
            )}
          </button>

          <a
            href="https://github.com/i-m-champion/Insta-downloader"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            <Github className="h-4 w-4" />
            <span className="hidden md:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
