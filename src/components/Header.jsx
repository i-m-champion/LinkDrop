import React from 'react';
import { Github, Settings2, Zap, ShieldCheck } from 'lucide-react';

export default function Header({ concurrency, hasSession, onOpenSettings }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07070b]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl prism-gradient shadow-lg shadow-pink-500/25">
            <Zap className="h-5 w-5 text-white fill-white/90" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[#07070b] bg-emerald-400" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-white">
                Reel<span className="prism-text">Jet</span>
              </span>
              <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-pink-300">
                Turbo Batch
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              Multi-threaded Instagram Reel extractor &amp; wire-speed ZIP bundler
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px]">{concurrency}x Parallel Workers</span>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="group relative inline-flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            <Settings2 className="h-4 w-4 text-slate-400 transition group-hover:rotate-45 group-hover:text-pink-400" />
            <span>Studio Settings</span>
            {hasSession && (
              <span
                title="Instagram session cookie active"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300"
              >
                <ShieldCheck className="h-3 w-3" />
                Auth
              </span>
            )}
          </button>

          <a
            href="https://github.com/i-m-champion/Insta-downloader"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}

