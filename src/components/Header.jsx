import React from 'react';
import {
  Github,
  Settings2,
  Zap,
  ShieldCheck,
  History,
} from 'lucide-react';

export default function Header({
  onSelectPlatform,
  hasSession,
  historyCount,
  onOpenHistory,
  onOpenSettings,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#faf9f6]/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* LinkDrop Brand Logo (click returns Home) */}
        <button
          type="button"
          onClick={() => onSelectPlatform(null)}
          data-cursor="HOME"
          className="group flex items-center gap-3 text-left transition hover:opacity-90"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl prism-gradient shadow-lg shadow-orange-500/20 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <Zap className="h-4.5 w-4.5 fill-white text-white" />
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-[#faf9f6] bg-emerald-500" />
            </span>
          </div>

          <span className="font-display text-xl font-bold tracking-tight text-slate-900">
            Link<span className="prism-text">Drop</span>
          </span>
        </button>

        {/* Minimal Light-Mode Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenHistory}
            data-cursor="HISTORY"
            title="Download History"
            className="relative inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow"
          >
            <History className="h-4 w-4 text-violet-600" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-700">
                {historyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            data-cursor="SETTINGS"
            className="group relative inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow"
          >
            <Settings2 className="h-4 w-4 text-slate-500 transition duration-300 group-hover:rotate-45 group-hover:text-[#ff5e2b]" />
            <span className="hidden sm:inline">Settings</span>
            {hasSession && (
              <span
                title="Instagram session cookie active"
                className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
              >
                <ShieldCheck className="h-3 w-3" />
              </span>
            )}
          </button>

          <a
            href="https://github.com/i-m-champion/LinkDrop"
            target="_blank"
            rel="noreferrer"
            data-cursor="GITHUB"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
