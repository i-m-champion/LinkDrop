import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import PlatformIcon from './PlatformIcon.jsx';
import LinkInputCard from './LinkInputCard.jsx';
import BatchDock from './BatchDock.jsx';
import ReelCard from './ReelCard.jsx';
import MediaTable from './MediaTable.jsx';

gsap.registerPlugin(useGSAP);

export default function PlatformWorkspace({
  platformConfig,
  onBackHome,
  onSwitchPlatform,
  rawInput,
  onChangeInput,
  concurrency,
  onChangeConcurrency,
  defaultPresetId,
  onChangePresetId,
  isExtracting,
  onExtract,
  queue,
  filteredQueue,
  selectedIds,
  filter,
  viewMode,
  groupByPlatform,
  onChangeFilter,
  onChangeViewMode,
  onToggleGroupByPlatform,
  onToggleSelect,
  onToggleSelectAll,
  onUpdateItemOptions,
  onRetryItem,
  onRetryFailed,
  onClearAll,
  onDownloadZip,
  onDownloadIndividualBatch,
  zipState,
  elapsedMs,
  filenameTemplate,
  sessionId,
  hasSession,
  onPreview,
  onOpenSettings,
  onRecordHistory,
  onToast,
}) {
  const wsRef = useRef(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;

      gsap.fromTo(
        '.ws-reveal',
        { y: 18 },
        {
          y: 0,
          duration: 0.45,
          stagger: 0.06,
          ease: 'power3.out',
          clearProps: 'transform',
        }
      );
    },
    { scope: wsRef, dependencies: [platformConfig.id] }
  );

  return (
    <div ref={wsRef} className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-24 pt-7 sm:px-6 lg:px-8">
      {/* Workspace Top Studio Header */}
      <div className="ws-reveal relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 p-5 backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.025] sm:p-6">
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${platformConfig.gradientClass}`}
        />
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-4 sm:items-center">
            <button
              type="button"
              data-cursor="BACK"
              onClick={onBackHome}
              className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12] sm:mt-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Platforms</span>
            </button>

            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${platformConfig.gradientClass} text-white shadow-lg`}
            >
              <PlatformIcon platformId={platformConfig.id} className="h-6 w-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {platformConfig.name} Downloader
                </h1>
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${platformConfig.badgeClass}`}
                >
                  {platformConfig.studioName}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                {platformConfig.description}
              </p>
            </div>
          </div>

          {/* Platform-specific quick perks / action */}
          <div className="flex flex-wrap items-center gap-2">
            {platformConfig.id === 'instagram' && (
              <button
                type="button"
                data-cursor="AUTH"
                onClick={onOpenSettings}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  hasSession
                    ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-pink-500/35 bg-pink-500/10 text-pink-700 hover:bg-pink-500/20 dark:text-pink-300'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {hasSession ? 'Session Cookie Active' : 'Add Session Cookie'}
              </button>
            )}
            {platformConfig.highlights.slice(0, 2).map((h) => (
              <span
                key={h}
                className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 font-mono text-[11px] font-medium text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300"
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Link Input Card */}
      <div className="ws-reveal">
        <LinkInputCard
          platformConfig={platformConfig}
          rawInput={rawInput}
          onChangeInput={onChangeInput}
          onSwitchPlatform={onSwitchPlatform}
          concurrency={concurrency}
          onChangeConcurrency={onChangeConcurrency}
          defaultPresetId={defaultPresetId}
          onChangePresetId={onChangePresetId}
          isExtracting={isExtracting}
          onExtract={onExtract}
          onToast={onToast}
        />
      </div>

      {/* Sticky Batch Control Dock */}
      <BatchDock
        items={queue}
        selectedIds={selectedIds}
        filter={filter}
        viewMode={viewMode}
        groupByPlatform={groupByPlatform}
        onChangeFilter={onChangeFilter}
        onChangeViewMode={onChangeViewMode}
        onToggleGroupByPlatform={onToggleGroupByPlatform}
        onToggleSelectAll={onToggleSelectAll}
        onRetryFailed={onRetryFailed}
        onClearAll={onClearAll}
        onDownloadZip={onDownloadZip}
        onDownloadIndividualBatch={onDownloadIndividualBatch}
        zipState={zipState}
        elapsedMs={elapsedMs}
      />

      {/* Results Grid / Table */}
      {filteredQueue.length > 0 &&
        (viewMode === 'table' ? (
          <MediaTable
            items={filteredQueue}
            selectedIds={selectedIds}
            filenameTemplate={filenameTemplate}
            sessionId={sessionId}
            onToggleSelect={onToggleSelect}
            onUpdateItemOptions={onUpdateItemOptions}
            onPreview={onPreview}
            onRetry={onRetryItem}
            onRecordHistory={onRecordHistory}
            onToast={onToast}
          />
        ) : (
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredQueue.map((item, idx) => (
              <ReelCard
                key={item.id}
                item={item}
                index={idx}
                selected={selectedIds.has(item.id)}
                platformConfig={platformConfig}
                filenameTemplate={filenameTemplate}
                sessionId={sessionId}
                onToggleSelect={onToggleSelect}
                onUpdateItemOptions={onUpdateItemOptions}
                onPreview={onPreview}
                onRetry={onRetryItem}
                onOpenSettings={onOpenSettings}
                onRecordHistory={onRecordHistory}
                onToast={onToast}
              />
            ))}
          </section>
        ))}
    </div>
  );
}

