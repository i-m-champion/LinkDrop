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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f6f5f1]/80 backdrop-blur-2xl dark:border-white/[0.06] dark:bg-[#07070b]/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Clean Brand Logo (click returns Home) */}
        <button
          type="button"
          onClick={() => onSelectPlatform(null)}
          data-cursor="HOME"
          className="group flex items-center gap-3 text-left transition hover:opacity-90"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl prism-gradient shadow-lg shadow-orange-500/20 transition-transform duration-300 group-hover:scale-105">
            <Zap className="h-4.5 w-4.5 fill-white text-white" />
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-[#f6f5f1] bg-emerald-400 dark:border-[#07070b]" />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Stream<span className="prism-text">Vault</span>
            </span>
          </div>
        </button>

        {/* Minimal Utility Controls */}
        <div className="flex items-center gap-2">
          <div
            title={
              engineReady
                ? `yt-dlp ${capabilities.ytDlpVersion} + ffmpeg ${capabilities.ffmpegVersion}`
                : 'Parallel Extraction Engine'
            }
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 md:flex"
          >
            <Cpu className={`h-3.5 w-3.5 ${engineReady ? 'text-emerald-500' : 'text-amber-500'}`} />
            <span className="font-mono text-[11px] font-medium">
              {engineReady ? 'Engine Online' : 'Fast Mode'} • {concurrency}x
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenHistory}
            data-cursor="HISTORY"
            title="Download History"
            className="relative inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.09]"
          >
            <History className="h-4 w-4 text-violet-500 dark:text-violet-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-600 dark:text-violet-300">
                {historyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            data-cursor="THEME"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/85 text-slate-700 transition hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.09]"
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
            className="group relative inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.09]"
          >
            <Settings2 className="h-4 w-4 text-slate-500 transition duration-300 group-hover:rotate-45 group-hover:text-[#ff5e2b] dark:text-slate-400" />
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.09]"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
