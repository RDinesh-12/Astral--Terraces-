// tslint:disable
/* eslint-disable */

/** 3D Vector. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 3D Position as a tuple. */
export type Position3D = [number, number, number];

/** Represents an object in the 3D scene. */
export interface Entity3D {
  id: string | number;
  type?: string;
  position: Vec3 | Position3D;
  rotation?: Vec3 | Position3D;
  scale?: Vec3 | Position3D;
  velocity?: Vec3;
  active?: boolean;
  [key: string]: any;
}

/** Represents a particle in a particle system. */
export interface Particle {
  id: string | number;
  position: Vec3 | Position3D;
  velocity?: Vec3 | Position3D;
  life: number;
  maxLife: number;
  color?: string;
  size?: number;
  [key: string]: any;
}

/** Tile material / visual archetype. */
export type TileKind =
  | 'stone'
  | 'mint'
  | 'lavender'
  | 'stair'
  | 'plate'
  | 'rotary'
  | 'elevator'
  | 'hidden'
  | 'goal';

/** Single walkable architectural node in a level. */
export interface TileNode {
  id: string;
  /** Local x, y, z (relative to mechanism pivot if groupId is set, else world). */
  x: number;
  y: number;
  z: number;
  kind: TileKind;
  /** Optional mechanism group controlling this tile's transform/visibility. */
  groupId?: string;
  /** Optional facing hint in radians for stairs/arches. */
  facingY?: number;
  /** If set, this tile starts hidden/retracted until its gateGroupId is active. */
  hiddenUntilGroup?: string;
  /** If set, this tile is a pressure plate that triggers the listed mechanisms. */
  plateTriggers?: string[];
  /** If true, pressure plate can toggle back and forth each time stepped on. */
  plateToggle?: boolean;
  /** Optional explicit neighbor overrides (for portals/arches). */
  explicitLinks?: string[];
  /** Decorative stepped column/buttress underneath tile. */
  pillarHeight?: number;
}

/** Rotary astrolabe crank, crystal switch, elevator, or gate mechanism. */
export type MechanismType = 'rotary' | 'elevator' | 'gate' | 'crystal';

export interface MechanismDef {
  id: string;
  type: MechanismType;
  label: string;
  /** Pivot / base world position. */
  pivot: Position3D;
  /** For 'elevator': offset applied when active (state = 1). */
  moveOffset?: Position3D;
  /** Initial integer state (0..3 for rotary, 0..1 for elevator/gate/crystal). */
  initialState: number;
  /** Position of clickable crank/crystal handle in world space. */
  crankPos?: Position3D;
  /** Whether player can directly click/activate the mechanism. */
  directInteract?: boolean;
  /** Coupled mechanism IDs that also advance/toggle when this mechanism triggers. */
  coupledIds?: string[];
}

/** Optical perspective connection that forms only at specific isometric camera angles. */
export interface PerspectiveLinkDef {
  id: string;
  nodeA: string;
  nodeB: string;
  /** Camera angle index (0..3) where the two elevations align optically. */
  alignedAngles: number[];
  /** Visual midpoint / shimmer arc anchor. */
  midPos: Position3D;
}

/** Optional hidden Star Relic pickup. */
export interface RelicDef {
  id: string;
  nodeId: string;
  label: string;
}

/** Non-walkable sculptural props & architectural landmarks. */
export interface ArchPropDef {
  id: string;
  kind:
    | 'archway'
    | 'tower'
    | 'planter'
    | 'lanternPedestal'
    | 'obelisk'
    | 'dome'
    | 'colonnade'
    | 'ruinPillar'
    | 'sundial'
    | 'waterfall';
  position: Position3D;
  rotationY?: number;
  scale?: number;
  color?: string;
  groupId?: string;
}

/** Coordinated pastel theme overrides per level. */
export interface LevelPalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  fogColor: string;
  waterColor: string;
  accentPrimary: string;
  accentSecondary: string;
}

/** Complete handcrafted puzzle chapter definition. */
export interface LevelDef {
  levelNumber: number;
  name: string;
  subtitle: string;
  difficulty: string;
  themeLabel: string;
  objective: string;
  hint: string;
  mechanicTag: string;
  fitRadius: number;
  startNodeId: string;
  goalNodeId: string;
  defaultCamAngle: number;
  center: Position3D;
  palette: LevelPalette;
  tiles: TileNode[];
  mechanisms: MechanismDef[];
  perspectiveLinks: PerspectiveLinkDef[];
  relics: RelicDef[];
  props: ArchPropDef[];
}

/** Live level HUD info synced from Game -> App on discrete events. */
export interface LevelHudInfo {
  levelName: string;
  subtitle: string;
  objective: string;
  hint: string;
  relicsCollected: number;
  relicsTotal: number;
  collectedRelicIds: string[];
  camAngle: number;
  isDraggingCamera: boolean;
  perspectiveAligned: boolean;
  hasPerspectiveLinks: boolean;
  canInteractNearby: boolean;
  nearbyLabel: string;
  statusBanner: string;
  blockedFeedback: string;
}

/** Character cosmetic palette option unlocked via progression. */
export interface TravelerCosmetic {
  id: string;
  name: string;
  tunicColor: string;
  scarfColor: string;
  capColor: string;
  unlockReqText: string;
  requiredRelics: number;
}

/** Structured persistent progression & settings save data. */
export interface GameSettings {
  musicMuted: boolean;
  sfxMuted: boolean;
  dragSensitivity: number;
  highQualityEffects: boolean;
}

/** Local player profile (no login or backend required). */
export interface PlayerProfile {
  playerId: string;
  displayName: string;
  createdAt: number;
}

/** Active in-level checkpoint & puzzle state snapshot. */
export interface ActiveLevelCheckpoint {
  levelNumber: number;
  checkpointNodeId: string;
  playerPos: Position3D;
  playerRotY: number;
  camAngle: number;
  mechStates: Record<string, number>;
  pressedPlates: string[];
  scoreAtLevel: number;
  updatedAt: number;
}

/** Save status feedback for unobtrusive UI indicator. */
export type SaveStatusState =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'restored'
  | 'error';

export interface SaveData {
  version: number;
  profile: PlayerProfile;
  highestUnlockedLevel: number;
  completedLevels: number[];
  currentLevel: number;
  lastPlayedLevel: number;
  bestScores: Record<number, number>;
  collectedRelicsByLevel: Record<number, string[]>;
  collectedRelicIds: string[];
  totalRelicCount: number;
  checkpoint: ActiveLevelCheckpoint | null;
  selectedCosmetic: string;
  settings: GameSettings;
}
