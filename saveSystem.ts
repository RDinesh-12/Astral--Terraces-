import {TOTAL_LEVELS} from './constants';
import {
  ActiveLevelCheckpoint,
  PlayerProfile,
  Position3D,
  SaveData,
  TravelerCosmetic,
} from './types';

export const SAVE_STORAGE_KEY = 'astralTerraces_save_v1';
export const SAVE_BACKUP_KEY = 'astralTerraces_save_v1_backup';
const LEGACY_KEYS = ['astral_terraces_save_v2', 'astral_terraces_save_v1'];
const SAVE_VERSION = 3;

export const TRAVELER_COSMETICS: TravelerCosmetic[] = [
  {
    id: 'meadow_mint',
    name: 'Sage & Turquoise',
    tunicColor: '#7ebdb6',
    scarfColor: '#d998ab',
    capColor: '#a498cc',
    unlockReqText: 'Default Traveler Attire',
    requiredRelics: 0,
  },
  {
    id: 'lavender_dusk',
    name: 'Indigo Dusk',
    tunicColor: '#a498cc',
    scarfColor: '#f2d388',
    capColor: '#4e4875',
    unlockReqText: 'Collect 3 Star Relics',
    requiredRelics: 3,
  },
  {
    id: 'coral_dawn',
    name: 'Muted Coral Dawn',
    tunicColor: '#e0917a',
    scarfColor: '#7ebdb6',
    capColor: '#d998ab',
    unlockReqText: 'Collect 6 Star Relics',
    requiredRelics: 6,
  },
  {
    id: 'astral_gold',
    name: 'Celestial Sovereign',
    tunicColor: '#f2d388',
    scarfColor: '#766aa0',
    capColor: '#e0917a',
    unlockReqText: 'Collect 10 Star Relics',
    requiredRelics: 10,
  },
];

export function generateLocalPlayerId(): string {
  try {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return `AT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    }
  } catch {
    // Fallback below
  }
  const partA = Math.floor(100000 + Math.random() * 899999).toString(36);
  const partB = (Date.now() % 1679616).toString(36).padStart(4, '0');
  return `AT-${partA}${partB}`.toUpperCase();
}

export function createDefaultProfile(): PlayerProfile {
  return {
    playerId: generateLocalPlayerId(),
    displayName: 'Pip',
    createdAt: Date.now(),
  };
}

export function createDefaultSaveData(): SaveData {
  return {
    version: SAVE_VERSION,
    profile: createDefaultProfile(),
    highestUnlockedLevel: 1,
    completedLevels: [],
    currentLevel: 1,
    lastPlayedLevel: 1,
    bestScores: {},
    collectedRelicsByLevel: {},
    collectedRelicIds: [],
    totalRelicCount: 0,
    checkpoint: null,
    selectedCosmetic: 'meadow_mint',
    settings: {
      musicMuted: false,
      sfxMuted: false,
      dragSensitivity: 1.0,
      highQualityEffects: true,
    },
  };
}

function clampLevel(val: unknown, fallback = 1): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(val)));
}

function sanitizePosition3D(raw: unknown): Position3D | null {
  if (!Array.isArray(raw) || raw.length !== 3) return null;
  const [x, y, z] = raw;
  if (
    typeof x === 'number' &&
    Number.isFinite(x) &&
    typeof y === 'number' &&
    Number.isFinite(y) &&
    typeof z === 'number' &&
    Number.isFinite(z)
  ) {
    return [x, y, z];
  }
  return null;
}

function sanitizeCheckpoint(raw: unknown): ActiveLevelCheckpoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const levelNumber = clampLevel(obj.levelNumber, 0);
  if (levelNumber < 1 || levelNumber > TOTAL_LEVELS) return null;
  if (typeof obj.checkpointNodeId !== 'string' || !obj.checkpointNodeId) {
    return null;
  }
  const playerPos = sanitizePosition3D(obj.playerPos);
  if (!playerPos) return null;

  const playerRotY =
    typeof obj.playerRotY === 'number' && Number.isFinite(obj.playerRotY)
      ? obj.playerRotY
      : 0;
  const camAngle =
    typeof obj.camAngle === 'number' && Number.isFinite(obj.camAngle)
      ? ((Math.floor(obj.camAngle) % 4) + 4) % 4
      : 0;

  const mechStates: Record<string, number> = {};
  if (obj.mechStates && typeof obj.mechStates === 'object') {
    for (const [k, v] of Object.entries(
      obj.mechStates as Record<string, unknown>,
    )) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        mechStates[k] = Math.floor(v);
      }
    }
  }

  const pressedPlates = Array.isArray(obj.pressedPlates)
    ? Array.from(
        new Set(
          obj.pressedPlates.filter(
            (p): p is string => typeof p === 'string' && p.length > 0,
          ),
        ),
      )
    : [];

  const scoreAtLevel =
    typeof obj.scoreAtLevel === 'number' &&
    Number.isFinite(obj.scoreAtLevel) &&
    obj.scoreAtLevel >= 0
      ? Math.floor(obj.scoreAtLevel)
      : 0;

  const updatedAt =
    typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt)
      ? obj.updatedAt
      : Date.now();

  return {
    levelNumber,
    checkpointNodeId: obj.checkpointNodeId,
    playerPos,
    playerRotY,
    camAngle,
    mechStates,
    pressedPlates,
    scoreAtLevel,
    updatedAt,
  };
}

export function sanitizeSaveData(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  // Validate profile
  const rawProf =
    obj.profile && typeof obj.profile === 'object'
      ? (obj.profile as Record<string, unknown>)
      : null;
  const playerId =
    rawProf &&
    typeof rawProf.playerId === 'string' &&
    rawProf.playerId.trim().length > 0
      ? rawProf.playerId.trim().slice(0, 32)
      : generateLocalPlayerId();
  const displayName =
    rawProf &&
    typeof rawProf.displayName === 'string' &&
    rawProf.displayName.trim().length > 0
      ? rawProf.displayName.trim().slice(0, 24)
      : 'Pip';
  const createdAt =
    rawProf &&
    typeof rawProf.createdAt === 'number' &&
    Number.isFinite(rawProf.createdAt)
      ? rawProf.createdAt
      : Date.now();

  const completedLevels = Array.isArray(obj.completedLevels)
    ? Array.from(
        new Set(
          obj.completedLevels
            .filter(
              (n): n is number => typeof n === 'number' && Number.isFinite(n),
            )
            .map((n) => Math.floor(n))
            .filter((n) => n >= 1 && n <= TOTAL_LEVELS),
        ),
      ).sort((a, b) => a - b)
    : [];

  const maxCompleted =
    completedLevels.length > 0 ? Math.max(...completedLevels) : 0;
  const highestUnlockedLevel = Math.max(
    clampLevel(obj.highestUnlockedLevel, 1),
    Math.min(TOTAL_LEVELS, maxCompleted + 1),
  );
  const currentLevel = Math.min(
    highestUnlockedLevel,
    clampLevel(obj.currentLevel ?? obj.lastPlayedLevel, 1),
  );
  const lastPlayedLevel = Math.min(
    highestUnlockedLevel,
    clampLevel(obj.lastPlayedLevel ?? currentLevel, currentLevel),
  );

  const bestScores: Record<number, number> = {};
  if (obj.bestScores && typeof obj.bestScores === 'object') {
    for (const [k, v] of Object.entries(
      obj.bestScores as Record<string, unknown>,
    )) {
      const lvl = Number(k);
      if (
        Number.isInteger(lvl) &&
        lvl >= 1 &&
        lvl <= TOTAL_LEVELS &&
        typeof v === 'number' &&
        Number.isFinite(v) &&
        v >= 0
      ) {
        bestScores[lvl] = Math.floor(v);
      }
    }
  }

  const collectedRelicsByLevel: Record<number, string[]> = {};
  const flatRelicSet = new Set<string>();
  if (
    obj.collectedRelicsByLevel &&
    typeof obj.collectedRelicsByLevel === 'object'
  ) {
    for (const [k, v] of Object.entries(
      obj.collectedRelicsByLevel as Record<string, unknown>,
    )) {
      const lvl = Number(k);
      if (
        Number.isInteger(lvl) &&
        lvl >= 1 &&
        lvl <= TOTAL_LEVELS &&
        Array.isArray(v)
      ) {
        const deduped = Array.from(
          new Set(
            v.filter((s): s is string => typeof s === 'string' && s.length > 0),
          ),
        );
        collectedRelicsByLevel[lvl] = deduped;
        for (const r of deduped) flatRelicSet.add(r);
      }
    }
  }
  if (Array.isArray(obj.collectedRelicIds)) {
    for (const r of obj.collectedRelicIds) {
      if (typeof r === 'string' && r.length > 0) flatRelicSet.add(r);
    }
  }
  const collectedRelicIds = Array.from(flatRelicSet);

  const rawSettings =
    obj.settings && typeof obj.settings === 'object'
      ? (obj.settings as Record<string, unknown>)
      : {};
  const dragSens =
    typeof rawSettings.dragSensitivity === 'number' &&
    Number.isFinite(rawSettings.dragSensitivity)
      ? Math.max(0.5, Math.min(2.0, rawSettings.dragSensitivity))
      : 1.0;

  const selectedCosmetic =
    typeof obj.selectedCosmetic === 'string' &&
    TRAVELER_COSMETICS.some((c) => c.id === obj.selectedCosmetic)
      ? obj.selectedCosmetic
      : 'meadow_mint';

  const checkpoint = sanitizeCheckpoint(obj.checkpoint);

  return {
    version: SAVE_VERSION,
    profile: {
      playerId,
      displayName,
      createdAt,
    },
    highestUnlockedLevel,
    completedLevels,
    currentLevel,
    lastPlayedLevel,
    bestScores,
    collectedRelicsByLevel,
    collectedRelicIds,
    totalRelicCount: collectedRelicIds.length,
    checkpoint,
    selectedCosmetic,
    settings: {
      musicMuted: Boolean(rawSettings.musicMuted),
      sfxMuted: Boolean(rawSettings.sfxMuted),
      dragSensitivity: dragSens,
      highQualityEffects:
        typeof rawSettings.highQualityEffects === 'boolean'
          ? rawSettings.highQualityEffects
          : true,
    },
  };
}

function tryParseAndSanitize(rawJson: string | null): SaveData | null {
  if (!rawJson) return null;
  try {
    const parsed: unknown = JSON.parse(rawJson);
    return sanitizeSaveData(parsed);
  } catch {
    return null;
  }
}

export function isPlaygamaManagedStorage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as {bridge?: unknown}).bridge !== 'undefined'
  );
}

export function parseAndSanitizeSaveData(raw: unknown): SaveData | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return tryParseAndSanitize(raw);
  }
  return sanitizeSaveData(raw);
}

export interface LoadSaveResult {
  data: SaveData;
  restoredFromSave: boolean;
  recoveredFromBackup: boolean;
  hadError: boolean;
}

/**
 * Loads and validates save data from localStorage (or returns defaults when managed by Playgama Bridge).
 * Falls back safely to backup key if primary is corrupted, and never
 * overwrites existing valid storage with empty default data.
 */
export function loadSaveResult(): LoadSaveResult {
  try {
    if (
      typeof window === 'undefined' ||
      isPlaygamaManagedStorage() ||
      !window.localStorage
    ) {
      return {
        data: createDefaultSaveData(),
        restoredFromSave: false,
        recoveredFromBackup: false,
        hadError: false,
      };
    }

    const primaryRaw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    const primaryParsed = tryParseAndSanitize(primaryRaw);
    if (primaryParsed) {
      return {
        data: primaryParsed,
        restoredFromSave: true,
        recoveredFromBackup: false,
        hadError: false,
      };
    }

    const backupRaw = window.localStorage.getItem(SAVE_BACKUP_KEY);
    const backupParsed = tryParseAndSanitize(backupRaw);
    if (backupParsed) {
      // Restore primary from valid backup
      try {
        window.localStorage.setItem(
          SAVE_STORAGE_KEY,
          JSON.stringify(backupParsed),
        );
      } catch {
        // Ignore write-back error here
      }
      return {
        data: backupParsed,
        restoredFromSave: true,
        recoveredFromBackup: true,
        hadError: Boolean(primaryRaw),
      };
    }

    // Legacy migration only when neither primary nor backup exists
    if (!primaryRaw && !backupRaw) {
      for (const legacyKey of LEGACY_KEYS) {
        const legacyRaw = window.localStorage.getItem(legacyKey);
        const legacyParsed = tryParseAndSanitize(legacyRaw);
        if (legacyParsed) {
          persistSaveData(legacyParsed);
          return {
            data: legacyParsed,
            restoredFromSave: true,
            recoveredFromBackup: false,
            hadError: false,
          };
        }
      }
      return {
        data: createDefaultSaveData(),
        restoredFromSave: false,
        recoveredFromBackup: false,
        hadError: false,
      };
    }

    // Both primary and backup existed but failed validation -> corrupted
    return {
      data: createDefaultSaveData(),
      restoredFromSave: false,
      recoveredFromBackup: false,
      hadError: true,
    };
  } catch {
    return {
      data: createDefaultSaveData(),
      restoredFromSave: false,
      recoveredFromBackup: false,
      hadError: true,
    };
  }
}

export function loadSaveData(): SaveData {
  return loadSaveResult().data;
}

export interface PersistResult {
  ok: boolean;
  error?: string;
}

/**
 * Atomically serializes, validates, writes, and verifies save data
 * across both primary and backup localStorage keys.
 */
export function persistSaveData(data: SaveData): PersistResult {
  try {
    const normalized = sanitizeSaveData(data);
    if (!normalized) {
      return {ok: false, error: 'Invalid save payload'};
    }
    if (typeof window === 'undefined' || isPlaygamaManagedStorage()) {
      return {ok: true};
    }
    if (!window.localStorage) {
      return {ok: false, error: 'Local storage unavailable'};
    }
    const json = JSON.stringify(normalized);
    // Validate JSON round-trip before writing
    JSON.parse(json);

    window.localStorage.setItem(SAVE_STORAGE_KEY, json);
    const readBack = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (readBack !== json) {
      return {ok: false, error: 'Verification mismatch'};
    }
    window.localStorage.setItem(SAVE_BACKUP_KEY, json);
    return {ok: true};
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Storage write failed',
    };
  }
}

/**
 * Resets progression while optionally preserving the player's local profile identity.
 */
export function clearSaveData(preserveProfile?: PlayerProfile): SaveData {
  const fresh = createDefaultSaveData();
  if (preserveProfile) {
    fresh.profile = {
      playerId: preserveProfile.playerId,
      displayName: preserveProfile.displayName,
      createdAt: preserveProfile.createdAt,
    };
  }
  persistSaveData(fresh);
  return fresh;
}

export function countTotalCollectedRelics(data: SaveData): number {
  const unique = new Set<string>(data.collectedRelicIds);
  for (const arr of Object.values(data.collectedRelicsByLevel)) {
    for (const id of arr) unique.add(id);
  }
  return unique.size;
}

export function computeTotalBestScore(data: SaveData): number {
  let total = 0;
  for (const val of Object.values(data.bestScores)) {
    total += val;
  }
  return total;
}

export function getCosmeticById(id: string): TravelerCosmetic {
  return (
    TRAVELER_COSMETICS.find((c) => c.id === id) ?? TRAVELER_COSMETICS[0]
  );
}
