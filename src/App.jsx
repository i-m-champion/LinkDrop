import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Zap,
  Layers,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import Header from './components/Header.jsx';
import LinkInputCard from './components/LinkInputCard.jsx';
import BatchDock from './components/BatchDock.jsx';
import ReelCard from './components/ReelCard.jsx';
import VideoModal from './components/VideoModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { buildDownloadFilename } from './utils/formatters.js';

function useLocalStorage(key, initialValue) {
  const [val, setVal] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const setStored = useCallback(
    (next) => {
      setVal((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // ignore
        }
        return resolved;
      });
    },
    [key]
  );
  return [val, setStored];
}

export default function App() {
  const [rawInput, setRawInput] = useState('');
  const [concurrency, setConcurrency] = useLocalStorage('reeljet:concurrency', 5);
  const [filenameTemplate, setFilenameTemplate] = useLocalStorage(
    'reeljet:template',
    'user_shortcode'
  );
  const [sessionId, setSessionId] = useLocalStorage('reeljet:sessionid', '');

  const [queue, setQueue] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [isExtracting, setIsExtracting] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [previewItem, setPreviewItem] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [zipState, setZipState] = useState({
    active: false,
    bytesReceived: 0,
    speedBps: 0,
  });

  const abortRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, id: Date.now() });
    toastTimerRef.current = setTimeout(() => setToast(null), 3400);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const runBatchExtraction = useCallback(
    async (parsedItems, { mergeIntoExisting = false } = {}) => {
      if (!parsedItems.length) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsExtracting(true);
      if (!mergeIntoExisting) {
        setElapsedMs(0);
        setFilter('all');
        setQueue(
          parsedItems.map((p) => ({
            shortcode: p.shortcode,
            url: p.url,
            status: 'queued',
            data: null,
            error: null,
          }))
        );
        setSelectedCodes(new Set());
      } else {
        const retryCodes = new Set(parsedItems.map((p) => p.shortcode));
        setQueue((prev) =>
          prev.map((q) =>
            retryCodes.has(q.shortcode) ? { ...q, status: 'queued', error: null } : q
          )
        );
      }

      try {
        const response = await fetch('/api/extract/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: parsedItems,
            concurrency,
            sessionId,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || `Server error (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const handleSseBlock = (block) => {
          const lines = block.split('\n');
          let eventType = 'message';
          let dataLine = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLine += line.slice(5).trim();
          }
          if (!dataLine) return;
          const payload = JSON.parse(dataLine);

          if (eventType === 'item') {
            setQueue((prev) =>
              prev.map((entry) => {
                if (entry.shortcode !== payload.shortcode) return entry;
                return {
                  ...entry,
                  status: payload.status,
                  data: payload.data ?? entry.data,
                  error: payload.error ?? null,
                };
              })
            );
            if (payload.status === 'ready') {
              setSelectedCodes((prev) => {
                const next = new Set(prev);
                next.add(payload.shortcode);
                return next;
              });
            }
          } else if (eventType === 'done') {
            setElapsedMs(payload.elapsedMs || 0);
            if (payload.succeeded > 0) {
              showToast(
                `Extracted ${payload.succeeded}/${payload.total} reel${
                  payload.total === 1 ? '' : 's'
                } in ${(payload.elapsedMs / 1000).toFixed(2)}s`,
                payload.failed > 0 ? 'info' : 'success'
              );
            } else {
              showToast('Could not extract any reels. Check links or settings.', 'error');
            }
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';
          for (const block of blocks) {
            if (block.trim()) handleSseBlock(block);
          }
        }
        if (buffer.trim()) handleSseBlock(buffer);
      } catch (err) {
        if (err.name !== 'AbortError') {
          showToast(err.message || 'Batch extraction failed.', 'error');
        }
      } finally {
        setIsExtracting(false);
      }
    },
    [concurrency, sessionId, showToast]
  );

  const handleToggleSelect = (shortcode) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(shortcode)) next.delete(shortcode);
      else next.add(shortcode);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const readyCodes = queue.filter((q) => q.status === 'ready').map((q) => q.shortcode);
    const allSelected = readyCodes.every((c) => selectedCodes.has(c));
    if (allSelected) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(readyCodes));
    }
  };

  const handleRetryItem = (item) => {
    runBatchExtraction([{ shortcode: item.shortcode, url: item.url }], {
      mergeIntoExisting: true,
    });
  };

  const handleRetryFailed = () => {
    const failed = queue
      .filter((q) => q.status === 'error')
      .map((q) => ({ shortcode: q.shortcode, url: q.url }));
    if (failed.length) {
      runBatchExtraction(failed, { mergeIntoExisting: true });
    }
  };

  const handleClearAll = () => {
    abortRef.current?.abort();
    setQueue([]);
    setSelectedCodes(new Set());
    setElapsedMs(0);
    setIsExtracting(false);
  };

  const handleDownloadZip = async (selectedItems) => {
    if (!selectedItems.length || zipState.active) return;

    setZipState({ active: true, bytesReceived: 0, speedBps: 0 });
    const startedAt = Date.now();

    try {
      const response = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortcodes: selectedItems.map((i) => i.shortcode),
          template: filenameTemplate,
          concurrency: Math.min(concurrency, 6),
          sessionId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`ZIP creation failed (HTTP ${response.status})`);
      }

      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        const elapsedSec = Math.max(0.15, (Date.now() - startedAt) / 1000);
        setZipState({
          active: true,
          bytesReceived: received,
          speedBps: Math.round(received / elapsedSec),
        });
      }

      const blob = new Blob(chunks, { type: 'application/zip' });
      const blobUrl = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `reeljet-${selectedItems.length}-reels-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      showToast(`Downloaded ${selectedItems.length} reels as ZIP!`, 'success');
    } catch (err) {
      showToast(err.message || 'ZIP download failed.', 'error');
    } finally {
      setZipState({ active: false, bytesReceived: 0, speedBps: 0 });
    }
  };

  const handleDownloadIndividualBatch = async (selectedItems) => {
    if (!selectedItems.length) return;
    showToast(`Starting ${selectedItems.length} MP4 downloads...`, 'info');

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      const filename = buildDownloadFilename(item.data, filenameTemplate, i);
      const params = new URLSearchParams({ download: '1', filename });
      if (sessionId) params.set('sessionId', sessionId);

      const a = document.createElement('a');
      a.href = `/api/stream/${encodeURIComponent(item.shortcode)}?${params.toString()}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Short stagger so browsers don't throttle concurrent download prompts
      await new Promise((r) => setTimeout(r, 320));
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (filter === 'ready') return item.status === 'ready';
    if (filter === 'error') return item.status === 'error';
    return true;
  });

  return (
    <div className="relative min-h-screen bg-[#07070b] text-slate-100">
      {/* Ambient studio backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="bg-studio-grid absolute inset-0 opacity-70" />
        <div className="animate-pulse-slow absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-pink-600/15 blur-[130px]" />
        <div className="animate-pulse-slow absolute right-[-120px] top-24 h-[460px] w-[460px] rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute bottom-[-180px] left-1/3 h-[380px] w-[380px] rounded-full bg-orange-500/10 blur-[140px]" />
      </div>

      <Header
        concurrency={concurrency}
        hasSession={Boolean(sessionId?.trim())}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="relative z-10 mx-auto flex max-w-7xl flex-col gap-7 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Zero-watermark HD MP4s • Parallel Streaming • Instant ZIP</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Download dozens of{' '}
            <span className="prism-text">Instagram Reels</span> at once.
          </h1>
          <p className="mx-auto mt-3.5 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Paste multiple Reel links below. ReelJet resolves every stream concurrently in real
            time, lets you preview in HD, and bundles your entire batch into one wire-speed ZIP.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Up to 10x Parallel Threads
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">
              <Layers className="h-3.5 w-3.5 text-pink-400" />
              Store-Mode ZIP Streaming
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              100% Local &amp; Private
            </span>
          </div>
        </section>

        {/* Batch Link Input */}
        <LinkInputCard
          rawInput={rawInput}
          onChangeInput={setRawInput}
          concurrency={concurrency}
          onChangeConcurrency={setConcurrency}
          isExtracting={isExtracting}
          onExtract={(items) => runBatchExtraction(items)}
          onToast={showToast}
        />

        {/* Sticky Batch Control Dock */}
        <BatchDock
          items={queue}
          selectedCodes={selectedCodes}
          filter={filter}
          onChangeFilter={setFilter}
          onToggleSelectAll={handleToggleSelectAll}
          onRetryFailed={handleRetryFailed}
          onClearAll={handleClearAll}
          onDownloadZip={handleDownloadZip}
          onDownloadIndividualBatch={handleDownloadIndividualBatch}
          zipState={zipState}
          elapsedMs={elapsedMs}
        />

        {/* Extracted Grid */}
        {filteredQueue.length > 0 && (
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredQueue.map((item, idx) => (
              <ReelCard
                key={item.shortcode}
                item={item}
                index={idx}
                selected={selectedCodes.has(item.shortcode)}
                filenameTemplate={filenameTemplate}
                sessionId={sessionId}
                onToggleSelect={handleToggleSelect}
                onPreview={setPreviewItem}
                onRetry={handleRetryItem}
                onOpenSettings={() => setSettingsOpen(true)}
                onToast={showToast}
              />
            ))}
          </section>
        )}
      </main>

      {/* Modals */}
      <VideoModal
        item={previewItem}
        filenameTemplate={filenameTemplate}
        sessionId={sessionId}
        onClose={() => setPreviewItem(null)}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        concurrency={concurrency}
        onChangeConcurrency={setConcurrency}
        filenameTemplate={filenameTemplate}
        onChangeTemplate={setFilenameTemplate}
        sessionId={sessionId}
        onChangeSessionId={setSessionId}
      />

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-2.5 rounded-2xl border border-white/15 bg-[#12141e]/95 px-4 py-3 text-xs font-medium text-white shadow-2xl backdrop-blur-xl">
          {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />}
          {toast.type === 'info' && <Info className="h-4 w-4 shrink-0 text-pink-400" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

