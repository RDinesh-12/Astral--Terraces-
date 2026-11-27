import {
  Gamepad,
  Home,
  Info,
  Play,
  RotateCw,
  Settings,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import React, {Suspense, useEffect, useRef, useState} from 'react';
import {THEME, TOTAL_LEVELS} from '../constants';
import {LEVELS} from '../levels';
import {
  computeTotalBestScore,
  countTotalCollectedRelics,
  getCosmeticById,
  TRAVELER_COSMETICS,
} from '../saveSystem';
import {SaveData, TravelerCosmetic} from '../types';
import {gameAudio} from '../utils/helper';

const LazyCharacterPreview3D = React.lazy(() => import('./CharacterPreview3D'));

// =========================================================================
// DECOUPLED SCROLLABLE MODAL SHELL (Prevents Mobile Clipping Bug)
// =========================================================================

function ScrollableModal({
  zIndex = 50,
  backdropClass = 'bg-[#18152b]/78 backdrop-blur-sm',
  children,
}: {
  zIndex?: number;
  backdropClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`fixed inset-0 ${backdropClass} overflow-y-auto touch-auto`}
      style={{
        zIndex,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}>
      <div className="min-h-full flex flex-col items-center p-3 sm:p-6">
        <div className="m-auto w-full flex flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 10-LEVEL SELECTION SCREEN (With Environment Palette Previews)
// =========================================================================

export function LevelSelectModal({
  saveData,
  currentLevel,
  isRewardedAdSupported = false,
  onSelectLevel,
  onUnlockLevelWithAd,
  onClose,
}: {
  saveData: SaveData;
  currentLevel: number;
  isRewardedAdSupported?: boolean;
  onSelectLevel: (levelNumber: number) => void;
  onUnlockLevelWithAd?: (levelNumber: number) => void;
  onClose: () => void;
}) {
  const completedSet = new Set(saveData.completedLevels);
  const totalRelicsFound = countTotalCollectedRelics(saveData);
  const totalRelicsPossible = LEVELS.reduce(
    (sum, l) => sum + l.relics.length,
    0,
  );
  const pct = Math.round((completedSet.size / TOTAL_LEVELS) * 100);

  return (
    <ScrollableModal zIndex={50}>
      <div className="w-full max-w-3xl bg-[#231f3b] border-2 border-[#a498cc] rounded-2xl p-5 sm:p-7 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-[#e0917a] font-semibold">
              Celestial Archipelago · 10 Worlds
            </div>
            <h2
              className="text-2xl sm:text-3xl font-bold text-[#f2d388]"
              style={{fontFamily: THEME.fontDisplay}}>
              Level Selection
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              onClose();
            }}
            className="min-w-[48px] min-h-[48px] px-4 rounded-full bg-[#342e54] hover:bg-[#473f70] border border-[#a498cc]/60 text-xs font-bold text-[#f3ece1] transition-colors">
            ✕ Back
          </button>
        </div>

        {/* Overall Journey Progress Bar */}
        <div className="p-3 rounded-xl bg-[#342e54] border border-[#a498cc]/40 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[#e6dced] font-semibold">
              Sanctuaries Illuminated: {completedSet.size} / {TOTAL_LEVELS} (
              {pct}%)
            </span>
            <span className="text-[#f2d388] font-semibold">
              ★ {totalRelicsFound} / {totalRelicsPossible} Star Relics
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#1a172e] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7ebdb6] via-[#f2d388] to-[#e0917a] transition-all duration-500"
              style={{width: `${Math.max(4, pct)}%`}}
            />
          </div>
        </div>

        {/* 10 Floating World Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {LEVELS.map((lvl) => {
            const isCompleted = completedSet.has(lvl.levelNumber);
            const isUnlocked = lvl.levelNumber <= saveData.highestUnlockedLevel;
            const canUnlockWithAd =
              !isUnlocked && isRewardedAdSupported && Boolean(onUnlockLevelWithAd);
            const isCurrent = lvl.levelNumber === currentLevel;
            const hasCheckpoint =
              saveData.checkpoint?.levelNumber === lvl.levelNumber;
            const relicsHere =
              saveData.collectedRelicsByLevel[lvl.levelNumber]?.length ?? 0;
            const bestScore = saveData.bestScores[lvl.levelNumber] ?? 0;
            const numLabel = String(lvl.levelNumber).padStart(2, '0');

            return (
              <button
                key={lvl.levelNumber}
                type="button"
                disabled={!isUnlocked && !canUnlockWithAd}
                onClick={() => {
                  if (isUnlocked) {
                    gameAudio.playConfirmSelect();
                    onSelectLevel(lvl.levelNumber);
                  } else if (canUnlockWithAd && onUnlockLevelWithAd) {
                    gameAudio.playCrispClick();
                    onUnlockLevelWithAd(lvl.levelNumber);
                  }
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 min-h-[76px] ${
                  !isUnlocked && !canUnlockWithAd
                    ? 'bg-[#1c1830]/75 border-[#7d70a6]/25 opacity-60 cursor-not-allowed'
                    : canUnlockWithAd
                      ? 'bg-[#2a2346] hover:bg-[#3a315e] border-[#f2d388]/45 cursor-pointer'
                      : isCurrent
                        ? 'bg-[#3c345e] border-[#e0917a] shadow-lg'
                        : 'bg-[#342e54] hover:bg-[#413966] border-[#a498cc]/50 cursor-pointer'
                }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-12 h-12 shrink-0 rounded-xl flex flex-col items-center justify-center font-bold border border-white/20 shadow-inner relative overflow-hidden"
                    style={{
                      background: `linear-gradient(165deg, ${lvl.palette.skyTop} 0%, ${lvl.palette.skyMid} 55%, ${lvl.palette.waterColor} 100%)`,
                    }}>
                    <span className="text-[10px] font-extrabold text-[#231f3b] bg-[#f3ece1]/80 px-1.5 rounded">
                      {numLabel}
                    </span>
                    <span className="text-xs mt-0.5 text-[#231f3b] drop-shadow-sm">
                      {isCompleted ? '✓' : isUnlocked ? '✦' : '🔒'}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-[#f3ece1] truncate">
                        {lvl.name}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded-full bg-[#231f3b] text-[10px] font-semibold text-[#b4a7db]">
                        {lvl.themeLabel}
                      </span>
                      <span
                        className={`text-[10px] font-medium ${canUnlockWithAd ? 'text-[#f2d388]' : 'text-[#7ebdb6]'}`}>
                        {isUnlocked
                          ? lvl.difficulty
                          : canUnlockWithAd
                            ? 'Watch Ad to Unlock'
                            : 'Locked'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1">
                  <div className="text-xs font-bold text-[#f2d388]">
                    {'★'.repeat(relicsHere)}
                    {'☆'.repeat(Math.max(0, lvl.relics.length - relicsHere))}
                  </div>
                  <div
                    className={`text-[11px] font-semibold ${canUnlockWithAd ? 'text-[#f2d388]' : 'text-[#7ebdb6]'}`}>
                    {hasCheckpoint
                      ? 'Resume →'
                      : bestScore > 0
                        ? `${bestScore} pts`
                        : isUnlocked
                          ? 'Enter →'
                          : canUnlockWithAd
                            ? 'Unlock (Ad) →'
                            : `W${lvl.levelNumber - 1}`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollableModal>
  );
}

// =========================================================================
// LOCAL PLAYER PROFILE MODAL (Editable Display Name, Local ID, 3D Preview)
// =========================================================================

export function CharacterProfileModal({
  saveData,
  onUpdateDisplayName,
  onSelectCosmetic,
  onClose,
}: {
  saveData: SaveData;
  onUpdateDisplayName: (name: string) => void;
  onSelectCosmetic: (cosmeticId: string) => void;
  onClose: () => void;
}) {
  const totalRelics = countTotalCollectedRelics(saveData);
  const completedCount = saveData.completedLevels.length;
  const totalBest = computeTotalBestScore(saveData);
  const activeCosmetic = getCosmeticById(saveData.selectedCosmetic);

  const [nameDraft, setNameDraft] = useState(saveData.profile.displayName);
  const [nameSavedBadge, setNameSavedBadge] = useState(false);

  useEffect(() => {
    setNameDraft(saveData.profile.displayName);
  }, [saveData.profile.displayName]);

  const commitName = () => {
    const cleaned = nameDraft.trim().slice(0, 24) || 'Pip';
    setNameDraft(cleaned);
    if (cleaned !== saveData.profile.displayName) {
      onUpdateDisplayName(cleaned);
      gameAudio.playConfirmSelect();
      setNameSavedBadge(true);
      window.setTimeout(() => setNameSavedBadge(false), 1800);
    }
  };

  return (
    <ScrollableModal zIndex={55}>
      <div className="w-full max-w-lg bg-[#231f3b] border-2 border-[#7ebdb6] rounded-2xl p-5 sm:p-7 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-[#7ebdb6] font-semibold">
              Local Player Profile
            </div>
            <h2
              className="text-2xl sm:text-3xl font-bold text-[#f2d388]"
              style={{fontFamily: THEME.fontDisplay}}>
              {saveData.profile.displayName} · Sky Cartographer
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              commitName();
              gameAudio.playCrispClick();
              onClose();
            }}
            className="min-w-[48px] min-h-[48px] px-4 rounded-full bg-[#342e54] hover:bg-[#473f70] border border-[#a498cc]/60 text-xs font-bold text-[#f3ece1] transition-colors">
            ✕ Back
          </button>
        </div>

        {/* Editable Local Profile Name & Unique Local ID */}
        <div className="p-3.5 rounded-xl bg-[#342e54] border border-[#7ebdb6]/45 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#e6dced]">
              Traveler Name (Saved Locally)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#231f3b] border border-[#a498cc]/40 font-mono text-[10px] text-[#b4a7db]">
              ID: {saveData.profile.playerId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              aria-label="Player Display Name"
              data-testid="player-name-input"
              maxLength={24}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitName();
                }
              }}
              placeholder="Enter traveler name..."
              className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#231f3b] border border-[#a498cc]/50 focus:border-[#f2d388] outline-none text-sm font-semibold text-[#f3ece1]"
            />
            <button
              type="button"
              onClick={commitName}
              className="min-h-[44px] px-4 rounded-xl bg-[#7ebdb6] hover:bg-[#95d1ca] text-[#231f3b] text-xs font-bold transition-colors shrink-0">
              {nameSavedBadge ? '✓ Saved' : 'Save Name'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-4 items-center bg-[#342e54] border border-[#a498cc]/40 rounded-xl p-4">
          <div className="w-full h-40 rounded-xl bg-gradient-to-b from-[#463e6e] to-[#231f3b] border border-[#a498cc]/30 overflow-hidden">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center text-xs text-[#b4a7db]">
                  Loading Pip...
                </div>
              }>
              <LazyCharacterPreview3D cosmetic={activeCosmetic} />
            </Suspense>
          </div>

          <div className="flex flex-col gap-2 text-xs text-[#e6dced] leading-relaxed">
            <p>
              <strong className="text-[#f2d388]">Pip</strong> is your gentle
              celestial cartographer wandering the floating sanctuaries with an
              amber star-lantern. Progress is stored safely in your browser.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-[#231f3b] border border-[#7ebdb6]/30">
                <div className="text-[10px] text-[#b4a7db]">Worlds</div>
                <div className="text-sm font-bold text-[#7ebdb6]">
                  {completedCount}/{TOTAL_LEVELS}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[#231f3b] border border-[#f2d388]/30">
                <div className="text-[10px] text-[#b4a7db]">Relics</div>
                <div className="text-sm font-bold text-[#f2d388]">
                  ★ {totalRelics}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[#231f3b] border border-[#a498cc]/30">
                <div className="text-[10px] text-[#b4a7db]">Best</div>
                <div className="text-sm font-bold text-[#f3ece1]">
                  {totalBest}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unlockable Cosmetic Tunics */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold text-[#f3ece1] uppercase tracking-wider">
            Traveler Attire ({activeCosmetic.name})
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TRAVELER_COSMETICS.map((cos) => {
              const unlocked = totalRelics >= cos.requiredRelics;
              const selected = cos.id === activeCosmetic.id;
              return (
                <button
                  key={cos.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    if (!unlocked) return;
                    gameAudio.playConfirmSelect();
                    onSelectCosmetic(cos.id);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all min-h-[54px] flex items-center gap-2.5 ${
                    !unlocked
                      ? 'bg-[#1c1830]/75 border-[#7d70a6]/25 opacity-60 cursor-not-allowed'
                      : selected
                        ? 'bg-[#423969] border-[#f2d388] shadow'
                        : 'bg-[#342e54] hover:bg-[#413966] border-[#a498cc]/40'
                  }`}>
                  <div className="flex items-center -space-x-1.5 shrink-0">
                    <span
                      className="w-5 h-5 rounded-full border border-white/40"
                      style={{backgroundColor: cos.tunicColor}}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-white/40"
                      style={{backgroundColor: cos.scarfColor}}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#f3ece1] truncate">
                      {cos.name}
                    </div>
                    <div className="text-[10px] text-[#b4a7db] truncate">
                      {unlocked
                        ? selected
                          ? 'Equipped'
                          : 'Tap to equip'
                        : `🔒 ${cos.unlockReqText}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollableModal>
  );
}

// =========================================================================
// SETTINGS MODAL
// =========================================================================

export function SettingsModal({
  saveData,
  onUpdateSettings,
  onRequestResetProgress,
  onClose,
}: {
  saveData: SaveData;
  onUpdateSettings: (patch: Partial<SaveData['settings']>) => void;
  onRequestResetProgress: () => void;
  onClose: () => void;
}) {
  const {settings} = saveData;
  const totalBest = computeTotalBestScore(saveData);

  return (
    <ScrollableModal zIndex={55}>
      <div className="w-full max-w-md bg-[#231f3b] border-2 border-[#a498cc] rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#f2d388]">
            <Settings size={20} />
            <h2
              className="text-2xl font-bold"
              style={{fontFamily: THEME.fontDisplay}}>
              Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              onClose();
            }}
            className="min-w-[48px] min-h-[48px] px-4 rounded-full bg-[#342e54] hover:bg-[#473f70] border border-[#a498cc]/60 text-xs font-bold text-[#f3ece1]">
            ✕ Done
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              onUpdateSettings({musicMuted: !settings.musicMuted});
            }}
            className="min-h-[48px] bg-[#342e54] hover:bg-[#473f70] border border-[#a498cc]/50 text-[#f3ece1] py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2">
            {settings.musicMuted ? (
              <VolumeX size={16} />
            ) : (
              <Volume2 size={16} />
            )}
            <span>Music: {settings.musicMuted ? 'Off' : 'On'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const nextMuted = !settings.sfxMuted;
              onUpdateSettings({sfxMuted: nextMuted});
              if (!nextMuted) gameAudio.playCrispClick();
            }}
            className="min-h-[48px] bg-[#342e54] hover:bg-[#473f70] border border-[#a498cc]/50 text-[#f3ece1] py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2">
            {settings.sfxMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>SFX: {settings.sfxMuted ? 'Off' : 'On'}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-[#342e54] border border-[#a498cc]/40 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#e6dced]">
              Rotation Drag Sensitivity
            </span>
            <span className="font-bold text-[#e0917a]">
              {settings.dragSensitivity.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={settings.dragSensitivity}
            onChange={(e) =>
              onUpdateSettings({dragSensitivity: parseFloat(e.target.value)})
            }
            className="w-full accent-[#e0917a] h-6 cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            gameAudio.playCrispClick();
            onUpdateSettings({
              highQualityEffects: !settings.highQualityEffects,
            });
          }}
          className="min-h-[48px] p-3.5 rounded-xl bg-[#342e54] hover:bg-[#413966] border border-[#a498cc]/40 flex items-center justify-between text-xs">
          <div className="text-left">
            <div className="font-semibold text-[#e6dced]">
              Atmospheric Bloom & Motes
            </div>
            <div className="text-[11px] text-[#b4a7db]">
              Switch to Eco on older mobile devices
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full font-bold ${
              settings.highQualityEffects
                ? 'bg-[#7ebdb6] text-[#231f3b]'
                : 'bg-[#231f3b] text-[#b4a7db]'
            }`}>
            {settings.highQualityEffects ? 'High' : 'Eco'}
          </span>
        </button>

        <div className="pt-2 border-t border-[#7d70a6]/40 flex items-center justify-between gap-2">
          <div className="text-xs text-[#b4a7db]">
            Saved Score:{' '}
            <strong className="text-[#7ebdb6]">{totalBest} pts</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              onRequestResetProgress();
            }}
            className="min-h-[44px] px-4 rounded-full bg-[#3d2536] hover:bg-[#57324b] border border-[#d998ab]/60 text-xs font-bold text-[#ffbfd0] transition-colors">
            Reset Progress
          </button>
        </div>
      </div>
    </ScrollableModal>
  );
}

// =========================================================================
// CONFIRM RESET / NEW GAME MODAL
// =========================================================================

export function ConfirmResetModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ScrollableModal zIndex={65}>
      <div className="w-full max-w-sm bg-[#231f3b] border-2 border-[#d998ab] rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-3">
        <h3
          className="text-2xl font-bold text-[#f2d388]"
          style={{fontFamily: THEME.fontDisplay}}>
          {title}
        </h3>
        <p className="text-xs text-[#e6dced] leading-relaxed">{message}</p>
        <div className="w-full grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              onCancel();
            }}
            className="min-h-[48px] rounded-full bg-[#342e54] hover:bg-[#473f70] border border-[#a498cc]/50 text-xs font-bold text-[#f3ece1]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              gameAudio.playConfirmSelect();
              onConfirm();
            }}
            className="min-h-[48px] rounded-full bg-[#d998ab] hover:bg-[#eab3c3] text-[#231f3b] text-xs font-bold">
            {confirmLabel}
          </button>
        </div>
      </div>
    </ScrollableModal>
  );
}

// =========================================================================
// HOW TO PLAY MODAL
// =========================================================================

export function HowToPlayModal({
  isMobile,
  onClose,
}: {
  isMobile: boolean;
  onClose: () => void;
}) {
  return (
    <ScrollableModal zIndex={60}>
      <div className="w-full max-w-md bg-[#231f3b] border-2 border-[#e0917a] rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-center gap-2 text-[#f2d388]">
          <Gamepad size={22} />
          <h2
            className="text-2xl font-bold"
            style={{fontFamily: THEME.fontDisplay}}>
            How to Play
          </h2>
        </div>

        <div className="flex flex-col gap-2.5 text-xs text-[#e6dced] leading-relaxed">
          <div className="p-3 rounded-xl bg-[#342e54] border border-[#a498cc]/40">
            <strong className="text-[#7ebdb6] block mb-0.5">
              1. Traverse Connected Pathways
            </strong>
            {isMobile
              ? 'Tap any connected stone tile to walk there smoothly, or use the bottom-left D-Pad.'
              : 'Click any walkable stone tile to pathfind, or walk with WASD / Arrow Keys.'}
          </div>
          <div className="p-3 rounded-xl bg-[#342e54] border border-[#a498cc]/40">
            <strong className="text-[#e0917a] block mb-0.5">
              2. Manipulate Architecture
            </strong>
            Step on Rune Plates to raise sunken bridges. Tap or drag Coral
            Cranks, Crystal Prisms, and Lift Crystals (or press E / ACT) to
            reshape the ruins.
          </div>
          <div className="p-3 rounded-xl bg-[#342e54] border border-[#a498cc]/40">
            <strong className="text-[#f2d388] block mb-0.5">
              3. Perspective Illusions
            </strong>
            {isMobile
              ? 'Swipe horizontally across the sky/water or tap ↶ / ↷ to orbit the camera. Separated tiers lock together seamlessly from the right vantage angle!'
              : 'Drag across the background (or press Q / R) to orbit the camera. Separated tiers lock together seamlessly from the right vantage angle!'}
          </div>
        </div>

        <button
          type="button"
          autoFocus
          onClick={() => {
            gameAudio.playCrispClick();
            onClose();
          }}
          className="min-h-[48px] w-full bg-[#e0917a] hover:bg-[#f0a994] text-[#231f3b] py-3 rounded-full font-bold text-sm transition-colors">
          Close Guide
        </button>
      </div>
    </ScrollableModal>
  );
}

// =========================================================================
// MAIN MENU CARD & PAUSE MENU CARD (Credits Removed, Clean Local Profile)
// =========================================================================

export function StartMenuOverlay({
  title,
  saveData,
  hasProgress,
  onContinue,
  onNewGame,
  onOpenLevels,
  onOpenCharacter,
  onOpenSettings,
  onOpenHowToPlay,
  onToggleMusic,
}: {
  title: string;
  saveData: SaveData;
  hasProgress: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onOpenLevels: () => void;
  onOpenCharacter: () => void;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
  onToggleMusic: () => void;
}) {
  const completedCount = saveData.completedLevels.length;
  const totalRelics = countTotalCollectedRelics(saveData);
  const resumeLevel =
    saveData.checkpoint?.levelNumber ?? saveData.currentLevel ?? 1;

  return (
    <ScrollableModal
      zIndex={40}
      backdropClass="bg-[#18152b]/45 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-[#231f3b]/92 border-2 border-[#a498cc] rounded-2xl p-4 sm:p-7 shadow-2xl flex flex-col items-center text-center">
        <div className="w-full flex items-center justify-between mb-1.5 sm:mb-2">
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              onOpenCharacter();
            }}
            className="min-h-[38px] px-3 py-1 rounded-full bg-[#342e54] hover:bg-[#473f70] border border-[#7ebdb6]/45 text-[11px] font-semibold text-[#7ebdb6] transition-colors max-w-[70%] truncate">
            ✦ {saveData.profile.displayName}
          </button>
          <button
            type="button"
            aria-label="Toggle Music"
            onClick={() => {
              gameAudio.playCrispClick();
              onToggleMusic();
            }}
            className="w-10 h-10 rounded-full bg-[#342e54] hover:bg-[#473f70] border border-[#a498cc]/50 flex items-center justify-center text-[#f3ece1] shrink-0">
            {saveData.settings.musicMuted ? (
              <VolumeX size={16} />
            ) : (
              <Volume2 size={16} />
            )}
          </button>
        </div>

        <h1
          className="text-3xl sm:text-5xl font-bold text-[#f2d388] mb-1.5 sm:mb-2 tracking-wide"
          style={{fontFamily: THEME.fontDisplay}}>
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-[#e6dced] mb-3.5 sm:mb-5 leading-relaxed">
          Guide Pip across ancient celestial islands by turning astrolabe
          bridges, attuning crystal prisms, and aligning impossible pathways.
        </p>

        {hasProgress && (
          <div className="w-full mb-3 sm:mb-4 px-3.5 py-2 rounded-xl bg-[#342e54] border border-[#7ebdb6]/35 flex items-center justify-between text-xs">
            <span className="text-[#7ebdb6] font-semibold">
              Worlds Lit: {completedCount}/{TOTAL_LEVELS}
            </span>
            <span className="text-[#f2d388] font-semibold">
              ★ {totalRelics} Relics
            </span>
          </div>
        )}

        <div className="w-full flex flex-col gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onContinue}
            autoFocus
            data-testid="start-button"
            className="min-h-[48px] w-full bg-[#e0917a] hover:bg-[#f0a994] text-[#231f3b] px-6 py-3 rounded-full font-bold text-base transition-colors flex items-center justify-center gap-2 shadow-lg">
            <Play size={18} />
            <span>
              {hasProgress
                ? `Continue (World ${String(resumeLevel).padStart(2, '0')})`
                : 'Play'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                onOpenLevels();
              }}
              className="min-h-[48px] bg-[#342e54] hover:bg-[#473f70] text-[#f3ece1] border border-[#a498cc]/60 px-3 py-2.5 rounded-full font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5">
              <Trophy size={15} />
              <span>Level Select</span>
            </button>

            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                onOpenCharacter();
              }}
              className="min-h-[48px] bg-[#342e54] hover:bg-[#473f70] text-[#7ebdb6] border border-[#7ebdb6]/50 px-3 py-2.5 rounded-full font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5">
              <span>✦</span>
              <span>Player Profile</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                onOpenHowToPlay();
              }}
              className="min-h-[44px] bg-[#342e54] hover:bg-[#473f70] text-[#e6dced] border border-[#a498cc]/45 px-3 py-2 rounded-full font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
              <Info size={14} />
              <span>How to Play</span>
            </button>

            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                onOpenSettings();
              }}
              className="min-h-[44px] bg-[#342e54] hover:bg-[#473f70] text-[#e6dced] border border-[#a498cc]/45 px-3 py-2 rounded-full font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
              <Settings size={14} />
              <span>Settings</span>
            </button>
          </div>

          {hasProgress && (
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                onNewGame();
              }}
              className="min-h-[42px] w-full bg-[#1b172e] hover:bg-[#2c254a] text-[#d998ab] border border-[#d998ab]/35 px-4 py-2 rounded-full font-semibold text-xs transition-colors">
              New Game (Reset Progress)
            </button>
          )}
        </div>
      </div>
    </ScrollableModal>
  );
}

export function PauseMenuOverlay({
  levelNumber,
  levelName,
  onResume,
  onRestartLevel,
  onOpenLevels,
  onOpenCharacter,
  onOpenSettings,
  onOpenHowToPlay,
  onQuitToMenu,
}: {
  levelNumber: number;
  levelName: string;
  onResume: () => void;
  onRestartLevel: () => void;
  onOpenLevels: () => void;
  onOpenCharacter: () => void;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
  onQuitToMenu: () => void;
}) {
  return (
    <ScrollableModal zIndex={40}>
      <div className="w-full max-w-sm bg-[#231f3b] border-2 border-[#a498cc] rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-2.5">
        <h2
          className="text-3xl font-bold text-[#f2d388]"
          style={{fontFamily: THEME.fontDisplay}}>
          Sanctuary Paused
        </h2>
        <p className="text-xs text-[#b4a7db] mb-1">
          World {levelNumber} · {levelName}
        </p>

        <button
          type="button"
          autoFocus
          onClick={onResume}
          className="min-h-[48px] w-full bg-[#7ebdb6] hover:bg-[#95d1ca] text-[#231f3b] py-3 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-colors">
          <Play size={18} />
          <span>Resume</span>
        </button>

        <button
          type="button"
          onClick={onRestartLevel}
          className="min-h-[48px] w-full bg-[#342e54] hover:bg-[#473f70] border border-[#e0917a]/50 text-[#e0917a] py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
          <RotateCw size={16} />
          <span>Restart World</span>
        </button>

        <div className="w-full grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              onOpenLevels();
            }}
            className="min-h-[48px] bg-[#342e54] hover:bg-[#473f70] border border-[#a498cc]/50 text-[#f3ece1] py-2.5 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5">
            <Trophy size={14} />
            <span>Level Select</span>
          </button>
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              onOpenCharacter();
            }}
            className="min-h-[48px] bg-[#342e54] hover:bg-[#473f70] border border-[#7ebdb6]/50 text-[#7ebdb6] py-2.5 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5">
            <span>✦</span>
            <span>Player Profile</span>
          </button>
        </div>

        <div className="w-full grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              onOpenSettings();
            }}
            className="min-h-[48px] bg-[#342e54] hover:bg-[#473f70] border border-[#a498cc]/50 text-[#e6dced] py-2.5 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5">
            <Settings size={14} />
            <span>Settings</span>
          </button>
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              onOpenHowToPlay();
            }}
            className="min-h-[48px] bg-[#342e54] hover:bg-[#473f70] border border-[#a498cc]/50 text-[#e6dced] py-2.5 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5">
            <Info size={14} />
            <span>Guide</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onQuitToMenu}
          className="min-h-[48px] w-full bg-[#1b172e] hover:bg-[#2c254a] border border-[#7d70a6]/40 text-[#b4a7db] py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-colors mt-1">
          <Home size={16} />
          <span>Main Menu</span>
        </button>
      </div>
    </ScrollableModal>
  );
}
