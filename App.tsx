// tslint:disable
/* eslint-disable */
import {
  Info,
  Pause,
  Play,
  RotateCw,
  Trophy,
  Zap,
} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  CharacterProfileModal,
  ConfirmResetModal,
  HowToPlayModal,
  LevelSelectModal,
  PauseMenuOverlay,
  SettingsModal,
  StartMenuOverlay,
} from './components/GameOverlays';
import {getConfig, THEME, TOTAL_LEVELS} from './constants';
import {Game, type GameCommandBridge} from './Game';
import {createInitialInputSnapshot, type InputSnapshot} from './input';
import {LEVELS} from './levels';
import {runFullQaAudit} from './qa/geometryValidator';
import {
  clearSaveData,
  computeTotalBestScore,
  countTotalCollectedRelics,
  getCosmeticById,
  loadSaveResult,
  persistSaveData,
} from './saveSystem';
import {
  ActiveLevelCheckpoint,
  LevelHudInfo,
  SaveData,
  SaveStatusState,
} from './types';
import {platformBridge} from './platform/platformBridge';
import {gameAudio} from './utils';
import BackgroundMusic from './utils/BackgroundMusic';
import {
  GameState,
  MenuOverlay,
  useIsMobile,
} from './utils/helper';
import {
  usePlayground,
  usePlaygroundGameLifecycle,
  usePlaygroundResume,
  useRpc,
} from './utils/usePlayground';

const DEFAULT_HUD_INFO: LevelHudInfo = {
  levelName: LEVELS[0].name,
  subtitle: LEVELS[0].subtitle,
  objective: LEVELS[0].objective,
  hint: LEVELS[0].hint,
  relicsCollected: 0,
  relicsTotal: LEVELS[0].relics.length,
  collectedRelicIds: [],
  camAngle: LEVELS[0].defaultCamAngle,
  isDraggingCamera: false,
  perspectiveAligned: false,
  hasPerspectiveLinks: false,
  canInteractNearby: false,
  nearbyLabel: '',
  statusBanner: '',
  blockedFeedback: '',
};

/**
 * Compact mobile touch controls (bottom-left D-Pad + bottom-right ACT / Orbit).
 * Uniform 48x48px buttons, safe-area inset >= 32px (left-8 / right-8), and
 * pointer-events-auto strictly on buttons so the 3D canvas remains draggable/tappable.
 */
function MobileControls({
  inputRef,
  onRotateCam,
  onInteract,
  canInteract,
}: {
  inputRef: React.MutableRefObject<InputSnapshot>;
  onRotateCam: (delta: number) => void;
  onInteract: () => void;
  canInteract: boolean;
}) {
  const setDir = useCallback(
    (action: 'up' | 'down' | 'left' | 'right', active: boolean) => {
      inputRef.current.actions[action] = active;
    },
    [inputRef],
  );

  const releaseAll = useCallback(() => {
    inputRef.current.actions.up = false;
    inputRef.current.actions.down = false;
    inputRef.current.actions.left = false;
    inputRef.current.actions.right = false;
  }, [inputRef]);

  useEffect(() => {
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('blur', releaseAll);
      releaseAll();
    };
  }, [releaseAll]);

  const dpadBtnClass =
    'w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-[#231f3b]/85 active:bg-[#a498cc] border border-[#b4a7db]/50 text-[#f3ece1] font-bold text-sm flex items-center justify-center shadow-lg pointer-events-auto touch-none select-none transition-colors';

  const actionBtnClass =
    'w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-[#231f3b]/85 active:bg-[#e0917a] border border-[#e0917a]/60 text-[#f3ece1] font-bold text-xs flex items-center justify-center shadow-lg pointer-events-auto touch-none select-none transition-colors';

  return (
    <div className="absolute inset-0 pointer-events-none z-20 select-none">
      {/* Bottom-left D-Pad (safe >=32px margin from left edge) */}
      <div className="absolute left-8 bottom-6 grid grid-cols-3 gap-1.5 pointer-events-none">
        <div />
        <button
          type="button"
          aria-label="Move Up"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            setDir('up', true);
          }}
          onPointerUp={() => setDir('up', false)}
          onPointerLeave={() => setDir('up', false)}
          onPointerCancel={() => setDir('up', false)}
          onLostPointerCapture={() => setDir('up', false)}
          className={dpadBtnClass}>
          ▲
        </button>
        <div />
        <button
          type="button"
          aria-label="Move Left"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            setDir('left', true);
          }}
          onPointerUp={() => setDir('left', false)}
          onPointerLeave={() => setDir('left', false)}
          onPointerCancel={() => setDir('left', false)}
          onLostPointerCapture={() => setDir('left', false)}
          className={dpadBtnClass}>
          ◀
        </button>
        <button
          type="button"
          aria-label="Move Down"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            setDir('down', true);
          }}
          onPointerUp={() => setDir('down', false)}
          onPointerLeave={() => setDir('down', false)}
          onPointerCancel={() => setDir('down', false)}
          onLostPointerCapture={() => setDir('down', false)}
          className={dpadBtnClass}>
          ▼
        </button>
        <button
          type="button"
          aria-label="Move Right"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            setDir('right', true);
          }}
          onPointerUp={() => setDir('right', false)}
          onPointerLeave={() => setDir('right', false)}
          onPointerCancel={() => setDir('right', false)}
          onLostPointerCapture={() => setDir('right', false)}
          className={dpadBtnClass}>
          ▶
        </button>
      </div>

      {/* Bottom-right Camera Orbit & Interact Cluster (uniform 48x48px buttons) */}
      <div className="absolute right-8 bottom-6 flex items-center gap-2 pointer-events-none">
        <button
          type="button"
          aria-label="Orbit Camera Left"
          onPointerDown={(e) => {
            e.stopPropagation();
            onRotateCam(-1);
          }}
          className={actionBtnClass}>
          ↶
        </button>
        <button
          type="button"
          aria-label="Interact"
          data-testid="mobile-action"
          onPointerDown={(e) => {
            e.stopPropagation();
            onInteract();
          }}
          className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-full font-bold text-xs flex items-center justify-center shadow-lg pointer-events-auto touch-none select-none transition-colors border ${
            canInteract
              ? 'bg-[#e0917a] text-[#231f3b] border-[#fff3d1] animate-pulse'
              : 'bg-[#231f3b]/85 text-[#f3ece1] border-[#7ebdb6]/60'
          }`}>
          ACT
        </button>
        <button
          type="button"
          aria-label="Orbit Camera Right"
          onPointerDown={(e) => {
            e.stopPropagation();
            onRotateCam(1);
          }}
          className={actionBtnClass}>
          ↷
        </button>
      </div>
    </div>
  );
}

/** Unobtrusive Save Status Pill. */
function SaveStatusBadge({
  status,
  isMobile,
}: {
  status: SaveStatusState;
  isMobile: boolean;
}) {
  if (status === 'idle') return null;

  const labelMap: Record<Exclude<SaveStatusState, 'idle'>, string> = {
    saving: 'Saving...',
    saved: 'Saved locally',
    restored: 'Save restored',
    error: 'Save error',
  };

  const styleMap: Record<Exclude<SaveStatusState, 'idle'>, string> = {
    saving: 'bg-[#231f3b]/85 border-[#f2d388]/50 text-[#f2d388]',
    saved: 'bg-[#231f3b]/85 border-[#7ebdb6]/55 text-[#7ebdb6]',
    restored: 'bg-[#231f3b]/85 border-[#a498cc]/60 text-[#e6dced]',
    error: 'bg-[#3d2536]/92 border-[#d998ab]/75 text-[#ffbfd0]',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="save-status"
      className={`fixed pointer-events-none z-50 px-2.5 py-1 rounded-full border text-[11px] font-semibold shadow-md flex items-center gap-1.5 transition-opacity ${
        isMobile ? 'right-3 top-14' : 'left-3 bottom-3'
      } ${styleMap[status]}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'error'
            ? 'bg-[#ff8fa3]'
            : status === 'saving'
              ? 'bg-[#f2d388] animate-pulse'
              : 'bg-[#7ebdb6]'
        }`}
      />
      <span>{labelMap[status]}</span>
    </div>
  );
}

export default function App() {
  // --- PLAYGROUND SDK INTEGRATION ---
  const {sdk, isReady} = usePlayground();
  const [exitChat] = useRpc<Record<string, unknown>, void>('ExitChat');
  const isMobile = useIsMobile();
  const sharedInputRef = useRef<InputSnapshot>(createInitialInputSnapshot());
  const commandRef = useRef<GameCommandBridge | null>(null);

  // Load local save once on boot (never overwrites existing valid save with defaults)
  const initialLoadRef = useRef<ReturnType<typeof loadSaveResult> | null>(null);
  if (!initialLoadRef.current) {
    initialLoadRef.current = loadSaveResult();
  }
  const initialLoad = initialLoadRef.current;

  const [saveData, setSaveData] = useState<SaveData>(initialLoad.data);
  const saveDataRef = useRef(saveData);
  saveDataRef.current = saveData;

  const [saveStatus, setSaveStatus] = useState<SaveStatusState>(() =>
    initialLoad.hadError && !initialLoad.recoveredFromBackup
      ? 'error'
      : initialLoad.restoredFromSave
        ? 'restored'
        : 'idle',
  );
  const saveTimerRef = useRef<number | null>(null);

  const showSaveStatus = useCallback((next: SaveStatusState) => {
    setSaveStatus(next);
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (next === 'saved' || next === 'restored') {
      saveTimerRef.current = window.setTimeout(() => {
        setSaveStatus('idle');
      }, 2400);
    }
  }, []);

  // Ensure brand-new first-time browser session stores its generated local Player ID cleanly
  useEffect(() => {
    if (!initialLoad.restoredFromSave && !initialLoad.hadError) {
      const res = persistSaveData(saveDataRef.current);
      if (!res.ok) showSaveStatus('error');
    } else if (initialLoad.restoredFromSave) {
      showSaveStatus('restored');
    }
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSaveData = useCallback(
    (updater: (prev: SaveData) => SaveData) => {
      showSaveStatus('saving');
      setSaveData((prev) => {
        const next = updater(prev);
        const res = persistSaveData(next);
        showSaveStatus(res.ok ? 'saved' : 'error');
        return next;
      });
    },
    [showSaveStatus],
  );

  // Run automated 10-level geometry, collision & navigation QA audit on startup
  useEffect(() => {
    const report = runFullQaAudit();
    (window as unknown as Record<string, unknown>).__astralQaReport = report;
    if (!report.allPassed) {
      console.error('[Astral Terraces QA Audit] Failures detected:', report);
    } else {
      console.info(
        `[Astral Terraces QA Audit] All ${report.levels.length} levels passed.`,
      );
    }
  }, []);

  // Sync audio mute state from saved settings on mount
  useEffect(() => {
    if (gameAudio.getMuteState() !== saveData.settings.sfxMuted) {
      gameAudio.toggleMute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Do not remove: Playground save/resume
  const {initialLevel, initialScore, persistenceEnabled, autoStartPending} =
    usePlaygroundResume({
      isReady,
      onAutoStart: () => {
        if (gameStateRef.current.status === 'START') {
          initGame();
        }
      },
    });

  const localResumeLevel =
    saveData.checkpoint?.levelNumber ?? saveData.currentLevel ?? 1;
  const localResumeScore =
    saveData.checkpoint?.levelNumber === localResumeLevel
      ? saveData.checkpoint.scoreAtLevel
      : computeTotalBestScore(saveData);

  const resolvedStartLevel = persistenceEnabled
    ? Math.min(initialLevel, TOTAL_LEVELS)
    : localResumeLevel;
  const resolvedStartScore = persistenceEnabled
    ? initialScore
    : localResumeScore;

  const levelStartScoreRef = useRef(resolvedStartScore);
  const prevLevelRef = useRef(resolvedStartLevel);
  const runWonRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>({
    status: 'START',
    score: resolvedStartScore,
    level: resolvedStartLevel,
  });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [gameKey, setGameKey] = useState(0);
  const [hudInfo, setHudInfo] = useState<LevelHudInfo>(DEFAULT_HUD_INFO);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState<
    | 'none'
    | 'levels'
    | 'character'
    | 'settings'
    | 'howtoplay'
    | 'confirmReset'
  >('none');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (gameState.level !== prevLevelRef.current) {
      prevLevelRef.current = gameState.level;
      levelStartScoreRef.current = gameStateRef.current.score;
      setShowHint(false);
    }
  }, [gameState.level]);

  useEffect(() => {
    if (gameState.status === 'VICTORY') {
      runWonRef.current = true;
    }
  }, [gameState.status]);

  useEffect(() => {
    const canHandleBackKey = ['PLAYING', 'PAUSED'].includes(gameState.status);
    (window as unknown as Record<string, unknown>).canHandleBackKey =
      canHandleBackKey;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'PLAYGROUND_CAN_HANDLE_BACK_KEY',
          value: canHandleBackKey,
        },
        '*',
      );
    }
  }, [gameState.status]);

  // Flush live checkpoint snapshot synchronously to localStorage
  const flushCheckpointNow = useCallback(() => {
    if (gameStateRef.current.status !== 'PLAYING') return;
    const snap = commandRef.current?.getCheckpointSnapshot();
    if (!snap) return;
    updateSaveData((prev) => ({
      ...prev,
      currentLevel: snap.levelNumber,
      lastPlayedLevel: snap.levelNumber,
      checkpoint: snap,
    }));
  }, [updateSaveData]);

  // Flush checkpoint automatically when browser tab hides or closes (never wipes save)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushCheckpointNow();
      }
    };
    const handlePageHide = () => {
      flushCheckpointNow();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [flushCheckpointNow]);

  // Escape key handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (activeSubModal !== 'none') {
        e.preventDefault();
        setActiveSubModal('none');
        return;
      }
      if (gameStateRef.current.status === 'PLAYING') {
        e.preventDefault();
        setIsGameMenuOpen((prev) => {
          if (!prev) flushCheckpointNow();
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSubModal, flushCheckpointNow]);

  // --- Game Init / Run Control ---
  const startRun = useCallback(
    (
      level: number,
      score: number,
      options?: {clearCheckpoint?: boolean},
    ) => {
      const clampedLevel = Math.max(1, Math.min(TOTAL_LEVELS, level));
      levelStartScoreRef.current = score;
      prevLevelRef.current = clampedLevel;
      runWonRef.current = false;
      setIsGameMenuOpen(false);
      setActiveSubModal('none');
      setShowHint(false);
      Object.assign(sharedInputRef.current, createInitialInputSnapshot());

      updateSaveData((prev) => ({
        ...prev,
        currentLevel: clampedLevel,
        lastPlayedLevel: clampedLevel,
        highestUnlockedLevel: Math.max(prev.highestUnlockedLevel, clampedLevel),
        checkpoint: options?.clearCheckpoint
          ? null
          : prev.checkpoint?.levelNumber === clampedLevel
            ? prev.checkpoint
            : null,
      }));

      setGameState((prev) => ({
        ...prev,
        status: 'PLAYING',
        level: clampedLevel,
        score,
      }));
      setGameKey((prev) => prev + 1);

      if (sdk) {
        sdk.startGame();
      }
    },
    [sdk, updateSaveData],
  );

  const initGame = useCallback(() => {
    const saved = saveDataRef.current;
    if (persistenceEnabled && !runWonRef.current) {
      const targetLevel = gameStateRef.current.level;
      const resumeScore =
        saved.checkpoint?.levelNumber === targetLevel
          ? saved.checkpoint.scoreAtLevel
          : levelStartScoreRef.current;
      startRun(targetLevel, resumeScore);
    } else if (saved.checkpoint) {
      startRun(saved.checkpoint.levelNumber, saved.checkpoint.scoreAtLevel);
    } else if (
      saved.currentLevel > 1 ||
      saved.completedLevels.length > 0
    ) {
      startRun(saved.currentLevel, computeTotalBestScore(saved));
    } else {
      startRun(1, 0);
    }
  }, [startRun, persistenceEnabled]);

  const resetGame = useCallback(() => {
    startRun(1, computeTotalBestScore(saveDataRef.current), {
      clearCheckpoint: true,
    });
  }, [startRun]);

  const handleConfirmResetProgress = useCallback(() => {
    const fresh = clearSaveData(saveDataRef.current.profile);
    setSaveData(fresh);
    showSaveStatus('saved');
    setActiveSubModal('none');
    if (gameStateRef.current.status === 'PLAYING') {
      startRun(1, 0, {clearCheckpoint: true});
    } else {
      setGameState({status: 'START', score: 0, level: 1});
    }
  }, [startRun, showSaveStatus]);

  const handleRestartLevel = useCallback(() => {
    gameAudio.playCrispClick();
    setIsGameMenuOpen(false);
    setActiveSubModal('none');
    startRun(gameStateRef.current.level, levelStartScoreRef.current, {
      clearCheckpoint: true,
    });
  }, [startRun]);

  const handleNextLevel = useCallback(() => {
    gameAudio.playCrispClick();
    const nextLevel = Math.min(TOTAL_LEVELS, gameStateRef.current.level + 1);
    startRun(nextLevel, gameStateRef.current.score, {clearCheckpoint: true});
  }, [startRun]);

  const handleQuitToMenu = useCallback(() => {
    gameAudio.playCrispClick();
    flushCheckpointNow();
    setIsGameMenuOpen(false);
    setActiveSubModal('none');
    setShowHint(false);
    setGameState((prev) => ({...prev, status: 'START'}));
  }, [flushCheckpointNow]);

  // Save checkpoint snapshot on discrete puzzle mechanism / tile / camera updates
  const handleCheckpointUpdate = useCallback(
    (snapshot: ActiveLevelCheckpoint) => {
      updateSaveData((prev) => ({
        ...prev,
        currentLevel: snapshot.levelNumber,
        lastPlayedLevel: snapshot.levelNumber,
        checkpoint: snapshot,
      }));
    },
    [updateSaveData],
  );

  // Save Star Relic immediately on collection WITHOUT resetting player position or level!
  const handleRelicCollected = useCallback(
    (levelNum: number, relicId: string, snapshot: ActiveLevelCheckpoint) => {
      updateSaveData((prev) => {
        const existing = prev.collectedRelicsByLevel[levelNum] ?? [];
        const updatedForLevel = Array.from(new Set([...existing, relicId]));
        const updatedFlat = Array.from(
          new Set([...prev.collectedRelicIds, relicId]),
        );
        return {
          ...prev,
          currentLevel: levelNum,
          lastPlayedLevel: levelNum,
          collectedRelicsByLevel: {
            ...prev.collectedRelicsByLevel,
            [levelNum]: updatedForLevel,
          },
          collectedRelicIds: updatedFlat,
          totalRelicCount: updatedFlat.length,
          checkpoint: snapshot,
        };
      });
    },
    [updateSaveData],
  );

  // Save level completion & unlock next world immediately
  const handleLevelCompleted = useCallback(
    (levelNum: number, nextScore: number, relicIds: string[]) => {
      updateSaveData((prev) => {
        const completedSet = new Set(prev.completedLevels);
        completedSet.add(levelNum);
        const nextUnlock = Math.min(
          TOTAL_LEVELS,
          Math.max(prev.highestUnlockedLevel, levelNum + 1),
        );
        const existingRelics = prev.collectedRelicsByLevel[levelNum] ?? [];
        const mergedRelics = Array.from(
          new Set([...existingRelics, ...relicIds]),
        );
        const flatRelics = Array.from(
          new Set([...prev.collectedRelicIds, ...mergedRelics]),
        );
        const levelBest = Math.max(
          prev.bestScores[levelNum] ?? 0,
          getConfig('pointsPerLevel') +
            mergedRelics.length * getConfig('pointsPerRelic'),
        );
        const nextLevel =
          levelNum < TOTAL_LEVELS ? levelNum + 1 : TOTAL_LEVELS;
        return {
          ...prev,
          completedLevels: Array.from(completedSet).sort((a, b) => a - b),
          highestUnlockedLevel: nextUnlock,
          currentLevel: nextLevel,
          lastPlayedLevel: nextLevel,
          bestScores: {
            ...prev.bestScores,
            [levelNum]: Math.max(levelBest, Math.min(nextScore, 10000)),
          },
          collectedRelicsByLevel: {
            ...prev.collectedRelicsByLevel,
            [levelNum]: mergedRelics,
          },
          collectedRelicIds: flatRelics,
          totalRelicCount: flatRelics.length,
          checkpoint: null,
        };
      });

      platformBridge.reportScore({
        level: levelNum,
        score: nextScore,
        stars: relicIds.length,
        timeSeconds: 0,
        moves: 0,
      });
    },
    [updateSaveData],
  );

  const handleUpdateDisplayName = useCallback(
    (displayName: string) => {
      updateSaveData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          displayName,
        },
      }));
    },
    [updateSaveData],
  );

  const handleUpdateSettings = useCallback(
    (patch: Partial<SaveData['settings']>) => {
      if (typeof patch.sfxMuted === 'boolean') {
        if (gameAudio.getMuteState() !== patch.sfxMuted) {
          gameAudio.toggleMute();
        }
      }
      updateSaveData((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...patch,
        },
      }));
    },
    [updateSaveData],
  );

  // --- PLAYGROUND SDK SCORE & LIFECYCLE REPORTING ---
  usePlaygroundGameLifecycle(gameState, sdk);

  // --- UNIFIED PLATFORM BRIDGE (YouTube Playables, Facebook Gaming, Standalone) ---
  useEffect(() => {
    platformBridge.init().then(() => {
      platformBridge.reportGameReady();
    });

    const unsubPause = platformBridge.onPause(() => {
      if (gameStateRef.current.status === 'PLAYING') {
        setIsGameMenuOpen(true);
      }
    });

    const unsubAudio = platformBridge.onAudioMuteChange((isMuted) => {
      handleUpdateSettings({sfxMuted: isMuted, musicMuted: isMuted});
    });

    return () => {
      unsubPause();
      unsubAudio();
    };
  }, [handleUpdateSettings]);

  // Auto-start when ?autoplay or ?autostart=1 is in the URL
  const hasAutoplayed = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      !hasAutoplayed.current &&
      (params.has('autoplay') || params.get('autostart') === '1')
    ) {
      hasAutoplayed.current = true;
      initGame();
    }
  }, [initGame]);

  const isMusicPlaying =
    ['START', 'PLAYING', 'PAUSED', 'LEVEL_COMPLETE'].includes(
      gameState.status,
    ) && !isGameMenuOpen;

  const activeCosmetic = useMemo(
    () => getCosmeticById(saveData.selectedCosmetic),
    [saveData.selectedCosmetic],
  );

  const hasSavedProgress =
    saveData.completedLevels.length > 0 ||
    saveData.highestUnlockedLevel > 1 ||
    countTotalCollectedRelics(saveData) > 0 ||
    saveData.checkpoint !== null;

  const isAnyOverlayPaused = isGameMenuOpen || activeSubModal !== 'none';

  // Snapshot initial checkpoint & relics per gameKey (so in-level saves never remount or reset Pip)
  const runInitialRelics = useMemo(
    () => saveDataRef.current.collectedRelicsByLevel[gameState.level] ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameKey, gameState.level],
  );
  const runInitialCheckpoint = useMemo(
    () =>
      saveDataRef.current.checkpoint?.levelNumber === gameState.level
        ? saveDataRef.current.checkpoint
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameKey, gameState.level],
  );

  return (
    <div
      className="fixed inset-0 overflow-hidden touch-none flex flex-col bg-[#231f3b] text-[#f3ece1] select-none"
      style={{fontFamily: THEME.fontUi}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
      `}</style>

      <BackgroundMusic
        url={getConfig('backgroundMusicUrl')}
        isPlaying={isMusicPlaying}
        isMuted={saveData.settings.musicMuted}
        volume={getConfig('defaultMusicVolume')}
      />

      {/* Unobtrusive Save Status Pill */}
      <SaveStatusBadge status={saveStatus} isMobile={isMobile} />

      {/* TOP HUD BAR (Top-right reserved EXCLUSIVELY for Menu button) */}
      {gameState.status === 'PLAYING' && (
        <header className="w-full flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 p-2 px-3 bg-[#231f3b]/85 border-b border-[#7d70a6]/40 z-10 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto">
            <div className="px-2.5 py-1 rounded-full bg-[#342e54] border border-[#a498cc]/40 text-[11px] sm:text-xs font-semibold text-[#f3ece1]">
              W{String(gameState.level).padStart(2, '0')}/{TOTAL_LEVELS} ·{' '}
              {hudInfo.levelName}
            </div>
            <div className="px-2.5 py-1 rounded-full bg-[#342e54] border border-[#f2d388]/40 text-[11px] sm:text-xs font-semibold text-[#f2d388]">
              ★ {hudInfo.relicsCollected}/{hudInfo.relicsTotal}
            </div>
            <div className="px-2.5 py-1 rounded-full bg-[#342e54] border border-[#7ebdb6]/40 text-[11px] sm:text-xs font-semibold text-[#7ebdb6]">
              {gameState.score} pts
            </div>
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                setShowHint((v) => !v);
              }}
              className="min-h-[34px] px-2.5 py-1 rounded-full bg-[#342e54] hover:bg-[#473f70] border border-[#e0917a]/45 text-[11px] sm:text-xs font-semibold text-[#e0917a] transition-colors flex items-center gap-1">
              <Info size={13} />
              <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
            </button>
            <button
              type="button"
              onClick={handleRestartLevel}
              className="min-h-[34px] px-2.5 py-1 rounded-full bg-[#342e54] hover:bg-[#473f70] border border-[#b4a7db]/40 text-[11px] sm:text-xs font-semibold text-[#e6dced] transition-colors flex items-center gap-1">
              <RotateCw size={13} />
              <span>Reset</span>
            </button>
            {isMobile && (
              <button
                type="button"
                aria-label="Reset Camera Angle"
                onClick={() => commandRef.current?.resetCam()}
                className="min-h-[34px] px-2.5 py-1 rounded-full bg-[#342e54] hover:bg-[#473f70] border border-[#7ebdb6]/40 text-[11px] font-semibold text-[#7ebdb6] transition-colors">
                ⟲ View
              </button>
            )}
          </div>

          {/* Exclusively Menu button in top-right with safe padding */}
          <div className="ml-auto p-0.5 pointer-events-auto">
            <button
              type="button"
              aria-label="Open Game Menu"
              data-testid="menu-button"
              onClick={() => {
                gameAudio.playCrispClick();
                flushCheckpointNow();
                setIsGameMenuOpen(true);
              }}
              className="min-h-[36px] px-3 py-1.5 rounded-full bg-[#342e54] hover:bg-[#473f70] border border-[#b4a7db]/60 text-xs font-bold text-[#f3ece1] flex items-center gap-1.5 transition-colors shadow">
              <Pause size={14} />
              <span>Menu</span>
            </button>
          </div>
        </header>
      )}

      {/* 3D CANVAS WRAPPER */}
      <div className="flex-1 w-full min-h-0 relative flex items-center justify-center overflow-hidden">
        <Game
          key={gameKey}
          gameState={gameState}
          setGameState={setGameState}
          exitChat={exitChat}
          gameStateRef={gameStateRef}
          externalInputRef={sharedInputRef}
          paused={isAnyOverlayPaused}
          onHudUpdate={setHudInfo}
          onCheckpointUpdate={handleCheckpointUpdate}
          onRelicCollected={handleRelicCollected}
          onLevelCompleted={handleLevelCompleted}
          commandRef={commandRef}
          cosmetic={activeCosmetic}
          dragSensitivity={saveData.settings.dragSensitivity}
          highQualityEffects={saveData.settings.highQualityEffects}
          initialCollectedRelics={runInitialRelics}
          initialCheckpoint={runInitialCheckpoint}
        />

        {/* Slim Objective / Optical Status / Hint Banner */}
        {gameState.status === 'PLAYING' && !isAnyOverlayPaused && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 max-w-md w-[92%] flex flex-col items-center gap-1.5 pointer-events-none z-10">
            {hudInfo.blockedFeedback ? (
              <div className="px-3 py-1 rounded-full bg-[#3d2536]/92 border border-[#d998ab]/70 text-xs font-semibold text-[#ffbfd0] shadow-md text-center">
                {hudInfo.blockedFeedback}
              </div>
            ) : hudInfo.statusBanner ? (
              <div className="px-3 py-1 rounded-full bg-[#231f3b]/88 border border-[#f2d388]/65 text-xs font-semibold text-[#f2d388] shadow-md text-center">
                {hudInfo.statusBanner}
              </div>
            ) : (
              <div className="px-3 py-1 rounded-full bg-[#231f3b]/75 border border-[#a498cc]/35 text-[11px] text-[#e6dced] text-center truncate max-w-full">
                {hudInfo.objective}
              </div>
            )}

            {hudInfo.perspectiveAligned && (
              <div className="px-2.5 py-0.5 rounded-full bg-[#7ebdb6]/95 text-[#231f3b] text-[11px] font-bold shadow">
                ✦ Optical Pathway Aligned
              </div>
            )}

            {hudInfo.hasPerspectiveLinks &&
              !hudInfo.perspectiveAligned &&
              hudInfo.isDraggingCamera && (
                <div className="px-2.5 py-0.5 rounded-full bg-[#231f3b]/80 border border-[#b4a7db]/50 text-[#e6dced] text-[10px] font-semibold">
                  Inspecting Perspective · Release to Snap
                </div>
              )}

            {showHint && (
              <div className="px-3 py-2 rounded-xl bg-[#231f3b]/92 border border-[#e0917a]/60 text-xs text-[#f3ece1] shadow-lg text-center">
                {hudInfo.hint}
              </div>
            )}
          </div>
        )}

        {/* Mobile Virtual Touch Controls */}
        {gameState.status === 'PLAYING' &&
          isMobile &&
          !isAnyOverlayPaused && (
            <MobileControls
              inputRef={sharedInputRef}
              onRotateCam={(d) => commandRef.current?.rotateCam(d)}
              onInteract={() => commandRef.current?.interact()}
              canInteract={hudInfo.canInteractNearby}
            />
          )}

        {/* Desktop Compact Camera & Action Bar */}
        {gameState.status === 'PLAYING' &&
          !isMobile &&
          !isAnyOverlayPaused && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#231f3b]/85 border border-[#7d70a6]/50 shadow-lg z-10 pointer-events-auto">
              <button
                type="button"
                onClick={() => commandRef.current?.rotateCam(-1)}
                className="px-2.5 py-1 rounded-full bg-[#342e54] hover:bg-[#473f70] text-xs font-semibold text-[#e6dced] transition-colors">
                ↶ Orbit (Q)
              </button>
              <span className="text-[11px] text-[#b4a7db] px-1">
                Angle {hudInfo.camAngle + 1}/4
              </span>
              <button
                type="button"
                onClick={() => commandRef.current?.rotateCam(1)}
                className="px-2.5 py-1 rounded-full bg-[#342e54] hover:bg-[#473f70] text-xs font-semibold text-[#e6dced] transition-colors">
                Orbit (R) ↷
              </button>
              <button
                type="button"
                onClick={() => commandRef.current?.resetCam()}
                className="px-2.5 py-1 rounded-full bg-[#342e54] hover:bg-[#473f70] text-[11px] font-semibold text-[#7ebdb6] transition-colors">
                Reset View
              </button>
              <button
                type="button"
                onClick={() => commandRef.current?.interact()}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${
                  hudInfo.canInteractNearby
                    ? 'bg-[#e0917a] text-[#231f3b] hover:bg-[#f0a994]'
                    : 'bg-[#342e54] text-[#b4a7db] hover:bg-[#473f70]'
                }`}>
                <Zap size={12} />
                <span>
                  {hudInfo.canInteractNearby
                    ? `Activate ${hudInfo.nearbyLabel} (E)`
                    : 'Interact (E)'}
                </span>
              </button>
            </div>
          )}
      </div>

      {/* START OVERLAY */}
      {gameState.status === 'START' &&
        !autoStartPending &&
        activeSubModal === 'none' && (
          <StartMenuOverlay
            title={getConfig('title')}
            saveData={saveData}
            hasProgress={hasSavedProgress}
            onContinue={initGame}
            onNewGame={() => setActiveSubModal('confirmReset')}
            onOpenLevels={() => setActiveSubModal('levels')}
            onOpenCharacter={() => setActiveSubModal('character')}
            onOpenSettings={() => setActiveSubModal('settings')}
            onOpenHowToPlay={() => setActiveSubModal('howtoplay')}
            onToggleMusic={() =>
              handleUpdateSettings({musicMuted: !saveData.settings.musicMuted})
            }
          />
        )}

      {/* IN-GAME PAUSE MENU OVERLAY */}
      {isGameMenuOpen && activeSubModal === 'none' && (
        <PauseMenuOverlay
          levelNumber={gameState.level}
          levelName={hudInfo.levelName}
          onResume={() => {
            gameAudio.playCrispClick();
            setIsGameMenuOpen(false);
          }}
          onRestartLevel={handleRestartLevel}
          onOpenLevels={() => setActiveSubModal('levels')}
          onOpenCharacter={() => setActiveSubModal('character')}
          onOpenSettings={() => setActiveSubModal('settings')}
          onOpenHowToPlay={() => setActiveSubModal('howtoplay')}
          onQuitToMenu={handleQuitToMenu}
        />
      )}

      {/* SUB-MODALS */}
      {activeSubModal === 'levels' && (
        <LevelSelectModal
          saveData={saveData}
          currentLevel={gameState.level}
          onSelectLevel={(lvl) => {
            const scoreForLevel =
              saveData.checkpoint?.levelNumber === lvl
                ? saveData.checkpoint.scoreAtLevel
                : computeTotalBestScore(saveData);
            startRun(lvl, scoreForLevel);
          }}
          onClose={() => setActiveSubModal('none')}
        />
      )}

      {activeSubModal === 'character' && (
        <CharacterProfileModal
          saveData={saveData}
          onUpdateDisplayName={handleUpdateDisplayName}
          onSelectCosmetic={(cosId) => {
            updateSaveData((prev) => ({
              ...prev,
              selectedCosmetic: cosId,
            }));
          }}
          onClose={() => setActiveSubModal('none')}
        />
      )}

      {activeSubModal === 'settings' && (
        <SettingsModal
          saveData={saveData}
          onUpdateSettings={handleUpdateSettings}
          onRequestResetProgress={() => setActiveSubModal('confirmReset')}
          onClose={() => setActiveSubModal('none')}
        />
      )}

      {activeSubModal === 'howtoplay' && (
        <HowToPlayModal
          isMobile={isMobile}
          onClose={() => setActiveSubModal('none')}
        />
      )}

      {activeSubModal === 'confirmReset' && (
        <ConfirmResetModal
          title="Begin Anew?"
          message="This will clear all 10 unlocked worlds, checkpoints, collected Star Relics, and saved high scores so you can start a fresh journey from World 01."
          confirmLabel="Reset Progress"
          onConfirm={handleConfirmResetProgress}
          onCancel={() => setActiveSubModal('none')}
        />
      )}

      {/* WORLD COMPLETE OVERLAY (Worlds 1..9) */}
      {gameState.status === 'LEVEL_COMPLETE' && (
        <MenuOverlay tone="neutral" zIndex={40}>
          <div className="w-full max-w-sm bg-[#231f3b] border-2 border-[#7ebdb6] rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#7ebdb6]/20 border border-[#7ebdb6] flex items-center justify-center text-[#f2d388]">
              <Trophy size={24} />
            </div>
            <h2
              className="text-3xl font-bold text-[#f2d388]"
              style={{fontFamily: THEME.fontDisplay}}>
              World {String(gameState.level).padStart(2, '0')} Illuminated
            </h2>
            <p className="text-xs text-[#e6dced]">{hudInfo.levelName}</p>
            <div className="w-full grid grid-cols-2 gap-2 my-1">
              <div className="p-2.5 rounded-xl bg-[#342e54] border border-[#f2d388]/30">
                <div className="text-[11px] text-[#b4a7db]">Star Relics</div>
                <div className="text-sm font-bold text-[#f2d388]">
                  ★ {hudInfo.relicsCollected} / {hudInfo.relicsTotal}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#342e54] border border-[#7ebdb6]/30">
                <div className="text-[11px] text-[#b4a7db]">Score</div>
                <div className="text-sm font-bold text-[#7ebdb6]">
                  {gameState.score} pts
                </div>
              </div>
            </div>
            <button
              type="button"
              autoFocus
              onClick={handleNextLevel}
              className="min-h-[48px] w-full bg-[#7ebdb6] hover:bg-[#95d1ca] text-[#231f3b] py-3 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-colors">
              <Play size={18} />
              <span>Next World</span>
            </button>
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                setGameState((prev) => ({...prev, status: 'START'}));
                setActiveSubModal('levels');
              }}
              className="min-h-[44px] w-full bg-[#342e54] hover:bg-[#473f70] text-[#e6dced] py-2 rounded-full font-semibold text-xs transition-colors">
              Level Selection
            </button>
          </div>
        </MenuOverlay>
      )}

      {/* GRAND CONVERGENCE VICTORY OVERLAY (After World 10) */}
      {gameState.status === 'VICTORY' && (
        <MenuOverlay tone="victory" zIndex={40}>
          <div className="w-full max-w-md bg-[#231f3b] border-2 border-[#f2d388] rounded-2xl p-7 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#f2d388]/20 border border-[#f2d388] flex items-center justify-center text-[#f2d388]">
              <Trophy size={28} />
            </div>
            <h1
              className="text-4xl font-bold text-[#f2d388]"
              style={{fontFamily: THEME.fontDisplay}}>
              The Astral Convergence
            </h1>
            <p className="text-sm text-[#e6dced] leading-relaxed">
              {saveData.profile.displayName} guided Pip across all ten
              celestial terraces—uniting broken bridges, crystal observatories,
              and impossible stairways into radiant harmony.
            </p>
            <div className="w-full grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#342e54] border border-[#7ebdb6]/40">
                <div className="text-xs text-[#b4a7db]">Final Score</div>
                <div className="text-xl font-bold text-[#7ebdb6]">
                  {gameState.score} pts
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#342e54] border border-[#f2d388]/40">
                <div className="text-xs text-[#b4a7db]">Total Relics</div>
                <div className="text-xl font-bold text-[#f2d388]">
                  ★ {countTotalCollectedRelics(saveData)}
                </div>
              </div>
            </div>
            <button
              type="button"
              autoFocus
              onClick={resetGame}
              className="min-h-[48px] w-full bg-[#e0917a] hover:bg-[#f0a994] text-[#231f3b] py-3.5 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-colors shadow-lg">
              <RotateCw size={18} />
              <span>Play Again</span>
            </button>
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                setGameState((prev) => ({...prev, status: 'START'}));
                setActiveSubModal('levels');
              }}
              className="min-h-[44px] w-full bg-[#342e54] hover:bg-[#473f70] text-[#e6dced] py-2.5 rounded-full font-semibold text-xs transition-colors">
              Explore All 10 Worlds
            </button>
          </div>
        </MenuOverlay>
      )}
    </div>
  );
}
