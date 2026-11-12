import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import Header from './components/Header.jsx';
import HomePortal from './components/HomePortal.jsx';
import PlatformWorkspace from './components/PlatformWorkspace.jsx';
import VideoModal from './components/VideoModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import HistoryDrawer from './components/HistoryDrawer.jsx';
import KineticCursor from './components/kinetic/KineticCursor.jsx';
import HeroShaderCanvas from './components/kinetic/HeroShaderCanvas.jsx';
import { PLATFORM_MAP } from './config/platformThemes.js';
import {
  FORMAT_PRESETS,
  buildDownloadFilename,
  downloadViaPrepareSSE,
} from './utils/formatters.js';

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

function getPlatformFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (hash && PLATFORM_MAP[hash]) return hash;
  return null;
}

export default function App() {
  const [activePlatform, setActivePlatform] = useState(() => getPlatformFromHash());
  const [inputsByPlatform, setInputsByPlatform] = useState({});

  const [theme, setTheme] = useLocalStorage('reeljet:theme', 'dark');
  const [concurrency, setConcurrency] = useLocalStorage('reeljet:concurrency', 5);
  const [filenameTemplate, setFilenameTemplate] = useLocalStorage('reeljet:template', 'title_id');
  const [defaultPresetId, setDefaultPresetId] = useLocalStorage('reeljet:preset', 'mp4_best');
  const [groupByPlatform, setGroupByPlatform] = useLocalStorage('reeljet:groupPlatform', true);
  const [viewMode, setViewMode] = useLocalStorage('reeljet:viewMode', 'grid');
  const [sessionId, setSessionId] = useLocalStorage('reeljet:sessionid', '');
  const [history, setHistory] = useLocalStorage('reeljet:history', []);

  const [capabilities, setCapabilities] = useState(null);
  const [queue, setQueue] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [isExtracting, setIsExtracting] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [previewItem, setPreviewItem] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [zipState, setZipState] = useState({
    active: false,
    bytesReceived: 0,
    speedBps: 0,
  });

  const abortRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Sync URL hash <-> activePlatform
  useEffect(() => {
    const onHashChange = () => {
      setActivePlatform(getPlatformFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateToPlatform = useCallback((platformId) => {
    const nextHash = platformId && PLATFORM_MAP[platformId] ? `#/${platformId}` : '#/';
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    setActivePlatform(platformId && PLATFORM_MAP[platformId] ? platformId : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Sync dark/light class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // Fetch capabilities
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((j) => setCapabilities(j.capabilities || null))
      .catch(() => {});
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, id: Date.now() });
    toastTimerRef.current = setTimeout(() => setToast(null), 3600);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const currentPlatformConfig = activePlatform ? PLATFORM_MAP[activePlatform] : null;
  const currentRawInput = activePlatform ? inputsByPlatform[activePlatform] || '' : '';

  const setCurrentRawInput = useCallback(
    (nextText) => {
      if (!activePlatform) return;
      setInputsByPlatform((prev) => ({ ...prev, [activePlatform]: nextText }));
    },
    [activePlatform]
  );

  const handleQuickLaunchUrl = useCallback(
    (targetPlatform, urlText) => {
      setInputsByPlatform((prev) => ({ ...prev, [targetPlatform]: urlText }));
      navigateToPlatform(targetPlatform);
      showToast(`Opened ${PLATFORM_MAP[targetPlatform]?.name || 'Studio'} workspace.`, 'success');
    },
    [navigateToPlatform, showToast]
  );

  const activePreset =
    FORMAT_PRESETS.find((p) => p.id === defaultPresetId) || FORMAT_PRESETS[0];

  const handleChangePresetId = (presetId) => {
    setDefaultPresetId(presetId);
    const preset = FORMAT_PRESETS.find((p) => p.id === presetId);
    if (preset && queue.length > 0) {
      setQueue((prev) =>
        prev.map((q) => ({
          ...q,
          format: preset.format,
          quality: preset.quality,
        }))
      );
      showToast(`Applied "${preset.label}" to queue items.`, 'info');
    }
  };

  const recordHistory = useCallback(
    (data, format, quality) => {
      if (!data?.id) return;
      setHistory((prev) => {
        const entry = {
          id: data.id,
          platform: data.platform,
          title: data.title || data.caption || data.id,
          username: data.username || data.platform,
          url: data.url,
          duration: data.duration,
          format,
          quality,
          ts: Date.now(),
        };
        const deduped = prev.filter((h) => !(h.id === entry.id && h.format === entry.format));
        return [entry, ...deduped].slice(0, 50);
      });
    },
    [setHistory]
  );

  const runBatchExtraction = useCallback(
    async (parsedItems, { mergeIntoExisting = false } = {}) => {
      const nonPlaylistItems = parsedItems.filter((p) => !p.isPlaylist);
      if (!nonPlaylistItems.length) {
        showToast(
          'Playlist link detected! Click "Expand Playlist" above to load its videos first.',
          'info'
        );
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const preset = FORMAT_PRESETS.find((p) => p.id === defaultPresetId) || FORMAT_PRESETS[0];

      setIsExtracting(true);
      if (!mergeIntoExisting) {
        setElapsedMs(0);
        setFilter('all');
        setQueue(
          nonPlaylistItems.map((p) => ({
            id: p.id,
            shortcode: p.shortcode || null,
            platform: p.platform,
            url: p.url,
            format: preset.format,
            quality: preset.quality,
            status: 'queued',
            data: null,
            error: null,
          }))
        );
        setSelectedIds(new Set());
      } else {
        const retryIds = new Set(nonPlaylistItems.map((p) => p.id));
        setQueue((prev) =>
          prev.map((q) =>
            retryIds.has(q.id) ? { ...q, status: 'queued', error: null } : q
          )
        );
      }

      try {
        const response = await fetch('/api/extract/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: nonPlaylistItems,
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
          const targetId = payload.id || payload.shortcode;

          if (eventType === 'item') {
            setQueue((prev) =>
              prev.map((entry) => {
                if (entry.id !== targetId) return entry;
                return {
                  ...entry,
                  status: payload.status,
                  data: payload.data ?? entry.data,
                  error: payload.error ?? null,
                };
              })
            );
            if (payload.status === 'ready') {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                next.add(targetId);
                return next;
              });
            }
          } else if (eventType === 'done') {
            setElapsedMs(payload.elapsedMs || 0);
            if (payload.succeeded > 0) {
              showToast(
                `Resolved ${payload.succeeded}/${payload.total} item${
                  payload.total === 1 ? '' : 's'
                } in ${(payload.elapsedMs / 1000).toFixed(2)}s`,
                payload.failed > 0 ? 'info' : 'success'
              );
            } else {
              showToast('Could not extract any media. Check links or settings.', 'error');
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
    [concurrency, defaultPresetId, sessionId, showToast]
  );

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const readyIds = queue.filter((q) => q.status === 'ready').map((q) => q.id);
    const allSelected = readyIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(readyIds));
  };

  const handleUpdateItemOptions = (id, patch) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const handleRetryItem = (item) => {
    runBatchExtraction([item], { mergeIntoExisting: true });
  };

  const handleRetryFailed = () => {
    const failed = queue.filter((q) => q.status === 'error');
    if (failed.length) runBatchExtraction(failed, { mergeIntoExisting: true });
  };

  const handleClearAll = () => {
    abortRef.current?.abort();
    setQueue([]);
    setSelectedIds(new Set());
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
          items: selectedItems.map((i) => ({
            id: i.id,
            url: i.data?.url || i.url,
            format: i.format || activePreset.format,
            quality: i.quality || activePreset.quality,
          })),
          template: filenameTemplate,
          format: activePreset.format,
          quality: activePreset.quality,
          groupByPlatform,
          concurrency: Math.min(concurrency, 5),
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
      a.download = `streamvault-${selectedItems.length}-files-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      for (const item of selectedItems) {
        recordHistory(
          item.data,
          item.format || activePreset.format,
          item.quality || activePreset.quality
        );
      }

      showToast(`Downloaded ${selectedItems.length} items as ZIP!`, 'success');
    } catch (err) {
      showToast(err.message || 'ZIP download failed.', 'error');
    } finally {
      setZipState({ active: false, bytesReceived: 0, speedBps: 0 });
    }
  };

  const handleDownloadIndividualBatch = async (selectedItems) => {
    if (!selectedItems.length) return;
    showToast(`Processing ${selectedItems.length} downloads...`, 'info');

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      const fmt = item.format || activePreset.format;
      const qual = item.quality || activePreset.quality;
      const filename = buildDownloadFilename(item.data, filenameTemplate, i, fmt);
      try {
        await downloadViaPrepareSSE(item.data, {
          format: fmt,
          quality: qual,
          template: filenameTemplate,
          filename,
          sessionId,
        });
        recordHistory(item.data, fmt, qual);
      } catch (err) {
        showToast(`Failed ${filename}: ${err.message}`, 'error');
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    showToast(`Completed batch download of ${selectedItems.length} files!`, 'success');
  };

  const filteredQueue = queue.filter((item) => {
    if (filter === 'ready') return item.status === 'ready';
    if (filter === 'error') return item.status === 'error';
    return true;
  });

  const shaderAccentA = currentPlatformConfig?.shaderA || '#ff5e2b';
  const shaderAccentB = currentPlatformConfig?.shaderB || '#8b5cf6';

  return (
    <div className="relative min-h-screen bg-[#f6f5f1] text-slate-900 dark:bg-[#07070b] dark:text-[#f6f5f1]">
      {/* Custom 60-120fps Morphing Cursor (Desktop Only) */}
      <KineticCursor />

      {/* 60fps Three.js GLSL FBM Plasma Canvas */}
      <HeroShaderCanvas
        accentA={shaderAccentA}
        accentB={shaderAccentB}
        isDark={theme === 'dark'}
      />

      {/* Architectural Hairline Grid Overlay */}
      <div className="bg-studio-grid pointer-events-none fixed inset-0 z-0 opacity-50" />

      <div className="relative z-10">
        <Header
          onSelectPlatform={navigateToPlatform}
          concurrency={concurrency}
          hasSession={Boolean(sessionId?.trim())}
          historyCount={history.length}
          theme={theme}
          capabilities={capabilities}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {!currentPlatformConfig ? (
          <HomePortal
            onSelectPlatform={navigateToPlatform}
            onQuickLaunchUrl={handleQuickLaunchUrl}
            capabilities={capabilities}
          />
        ) : (
          <PlatformWorkspace
            platformConfig={currentPlatformConfig}
            onBackHome={() => navigateToPlatform(null)}
            onSwitchPlatform={(targetId) => {
              const txt = currentRawInput;
              setInputsByPlatform((prev) => ({ ...prev, [targetId]: txt }));
              navigateToPlatform(targetId);
            }}
            rawInput={currentRawInput}
            onChangeInput={setCurrentRawInput}
            concurrency={concurrency}
            onChangeConcurrency={setConcurrency}
            defaultPresetId={defaultPresetId}
            onChangePresetId={handleChangePresetId}
            isExtracting={isExtracting}
            onExtract={(items) => runBatchExtraction(items)}
            queue={queue}
            filteredQueue={filteredQueue}
            selectedIds={selectedIds}
            filter={filter}
            viewMode={viewMode}
            groupByPlatform={groupByPlatform}
            onChangeFilter={setFilter}
            onChangeViewMode={setViewMode}
            onToggleGroupByPlatform={() => setGroupByPlatform((v) => !v)}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onUpdateItemOptions={handleUpdateItemOptions}
            onRetryItem={handleRetryItem}
            onRetryFailed={handleRetryFailed}
            onClearAll={handleClearAll}
            onDownloadZip={handleDownloadZip}
            onDownloadIndividualBatch={handleDownloadIndividualBatch}
            zipState={zipState}
            elapsedMs={elapsedMs}
            filenameTemplate={filenameTemplate}
            sessionId={sessionId}
            hasSession={Boolean(sessionId?.trim())}
            onPreview={setPreviewItem}
            onOpenSettings={() => setSettingsOpen(true)}
            onRecordHistory={recordHistory}
            onToast={showToast}
          />
        )}
      </div>

      {/* Modals & Drawers */}
      <VideoModal
        item={previewItem}
        filenameTemplate={filenameTemplate}
        sessionId={sessionId}
        onClose={() => setPreviewItem(null)}
        onRecordHistory={recordHistory}
        onToast={showToast}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        concurrency={concurrency}
        onChangeConcurrency={setConcurrency}
        filenameTemplate={filenameTemplate}
        onChangeTemplate={setFilenameTemplate}
        groupByPlatform={groupByPlatform}
        onToggleGroupByPlatform={() => setGroupByPlatform((v) => !v)}
        sessionId={sessionId}
        onChangeSessionId={setSessionId}
      />

      <HistoryDrawer
        open={historyOpen}
        history={history}
        onClose={() => setHistoryOpen(false)}
        onRequeue={(url) => {
          const target = activePlatform || 'universal';
          setInputsByPlatform((prev) => ({
            ...prev,
            [target]: prev[target]?.trim() ? `${prev[target].trim()}\n${url}` : url,
          }));
          if (!activePlatform) navigateToPlatform('universal');
          setHistoryOpen(false);
          showToast('Added URL back to Studio.', 'success');
        }}
        onClearHistory={() => {
          setHistory([]);
          showToast('Cleared download history.', 'info');
        }}
      />

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-2.5 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-xs font-medium text-slate-900 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-[#12141e]/95 dark:text-white">
          {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />}
          {toast.type === 'info' && <Info className="h-4 w-4 shrink-0 text-[#ff5e2b]" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
