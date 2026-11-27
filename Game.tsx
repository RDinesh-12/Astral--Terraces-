import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {Bloom, EffectComposer} from '@react-three/postprocessing';
import {
  CapsuleCollider,
  Physics,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier';
import type {MutableRefObject} from 'react';
import React, {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import {
  ArchProp,
  CrankControl,
  FunctionalDustField,
  PastelEnvironment,
  PerspectiveSeam,
  StarRelicMesh,
  TileBlock,
  TravelerPip,
  useSkyGradientTexture,
  useStoneTexture,
} from './components/WorldVisuals';
import {getConfig, TOTAL_LEVELS} from './constants';
import {InputSnapshot, useInput} from './input';
import {
  buildWalkableGraph,
  computeOpticalSeamEdges,
  evaluateLevelNodes,
  findNextHintTarget,
  findPathBFS,
  getLevelDustAnchors,
  LEVELS,
  resolveMechanismTrigger,
} from './levels';
import {
  ActiveLevelCheckpoint,
  LevelDef,
  LevelHudInfo,
  MechanismDef,
  TileNode,
  TravelerCosmetic,
} from './types';
import {gameAudio, GameState, isBodyAlive, toVec3, useIsMobile} from './utils';

// Static Orthographic Canvas camera config (never recreated per render)
const INITIAL_ORTHO_CAMERA = {
  zoom: 36,
  near: 0.1,
  far: 240,
  position: [26, 26, 26] as [number, number, number],
};

// Pre-allocated GC-safe temporaries for useFrame
const tmpCamTarget = new THREE.Vector3();
const tmpCamPos = new THREE.Vector3();
const tmpCamForward = new THREE.Vector3();
const tmpCamRight = new THREE.Vector3();
const tmpDesiredDir = new THREE.Vector3();
const tmpNodeDelta = new THREE.Vector3();
const tmpSunFocus = new THREE.Vector3();

const CAM_ANGLES = [
  Math.PI * 0.25, // 0: Front-Right (+X, +Z) -> ray (+1, +1, +1)
  Math.PI * 0.75, // 1: Front-Left  (+X, -Z) -> ray (+1, +1, -1)
  Math.PI * 1.25, // 2: Back-Left   (-X, -Z) -> ray (-1, +1, -1)
  Math.PI * 1.75, // 3: Back-Right  (-X, +Z) -> ray (-1, +1, +1)
];

const ORTHO_CAM_RADIUS = 36;
const SUN_OFFSET: readonly [number, number, number] = [14, 24, 12];
const SUN_SHADOW_EXTENT = 25;

export interface GameCommandBridge {
  rotateCam: (delta: number) => void;
  resetCam: () => void;
  interact: () => void;
  getCheckpointSnapshot: () => ActiveLevelCheckpoint;
}

interface SceneProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  inputRef: MutableRefObject<InputSnapshot>;
  exitChat: (payload: Record<string, unknown>) => Promise<void>;
  gameStateRef: MutableRefObject<GameState>;
  paused: boolean;
  onHudUpdate: (info: LevelHudInfo) => void;
  onCheckpointUpdate?: (snapshot: ActiveLevelCheckpoint) => void;
  onRelicCollected?: (
    level: number,
    relicId: string,
    snapshot: ActiveLevelCheckpoint,
  ) => void;
  onLevelCompleted?: (
    level: number,
    score: number,
    relicIds: string[],
  ) => void;
  commandRef: MutableRefObject<GameCommandBridge | null>;
  cosmetic: TravelerCosmetic;
  dragSensitivity: number;
  highQualityEffects: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  initialCollectedRelics: string[];
  initialCheckpoint: ActiveLevelCheckpoint | null;
}

/**
 * Animated mechanism wrapper (smoothly rotates rotary bridges or slides elevators).
 */
function AnimatedMechanismGroup({
  mech,
  targetState,
  dragDeltaRad = 0,
  children,
}: {
  mech: MechanismDef;
  targetState: number;
  dragDeltaRad?: number;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const currentAngle = useRef(targetState * (Math.PI / 2));
  const currentOffset = useRef(
    new THREE.Vector3(
      targetState % 2 === 1 ? (mech.moveOffset?.[0] ?? 0) : 0,
      targetState % 2 === 1 ? (mech.moveOffset?.[1] ?? 0) : 0,
      targetState % 2 === 1 ? (mech.moveOffset?.[2] ?? 0) : 0,
    ),
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.1);
    const speed = getConfig('mechanismSpeed') * 1.8;

    if (mech.type === 'rotary') {
      const targetRad = targetState * (Math.PI / 2) + dragDeltaRad;
      currentAngle.current = THREE.MathUtils.lerp(
        currentAngle.current,
        targetRad,
        Math.min(1, dt * speed),
      );
      groupRef.current.rotation.y = currentAngle.current;
    } else if (mech.type === 'elevator') {
      const raised = targetState % 2 === 1;
      const off = mech.moveOffset ?? [0, 0, 0];
      const tx = raised ? off[0] : 0;
      const ty = raised ? off[1] : 0;
      const tz = raised ? off[2] : 0;
      currentOffset.current.x = THREE.MathUtils.lerp(
        currentOffset.current.x,
        tx,
        Math.min(1, dt * speed),
      );
      currentOffset.current.y = THREE.MathUtils.lerp(
        currentOffset.current.y,
        ty,
        Math.min(1, dt * speed),
      );
      currentOffset.current.z = THREE.MathUtils.lerp(
        currentOffset.current.z,
        tz,
        Math.min(1, dt * speed),
      );
      groupRef.current.position.set(
        mech.pivot[0] + currentOffset.current.x,
        mech.pivot[1] + currentOffset.current.y,
        mech.pivot[2] + currentOffset.current.z,
      );
    }
  });

  if (mech.type === 'gate' || mech.type === 'crystal') {
    return <group>{children}</group>;
  }

  return (
    <group
      ref={groupRef}
      position={[
        mech.pivot[0] +
          (mech.type === 'elevator' && targetState % 2 === 1
            ? (mech.moveOffset?.[0] ?? 0)
            : 0),
        mech.pivot[1] +
          (mech.type === 'elevator' && targetState % 2 === 1
            ? (mech.moveOffset?.[1] ?? 0)
            : 0),
        mech.pivot[2] +
          (mech.type === 'elevator' && targetState % 2 === 1
            ? (mech.moveOffset?.[2] ?? 0)
            : 0),
      ]}
      rotation={[
        0,
        mech.type === 'rotary' ? targetState * (Math.PI / 2) : 0,
        0,
      ]}>
      {children}
    </group>
  );
}

/**
 * Directional sun light with bounded shadow frustum centered on the island.
 */
function SunLight({
  center,
  shadowMapSize,
}: {
  center: [number, number, number];
  shadowMapSize: number;
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    tmpSunFocus.set(center[0], center[1], center[2]);
    light.position.set(
      tmpSunFocus.x + SUN_OFFSET[0],
      tmpSunFocus.y + SUN_OFFSET[1],
      tmpSunFocus.z + SUN_OFFSET[2],
    );
    light.target.position.copy(tmpSunFocus);
    light.target.updateMatrixWorld();
  });

  return (
    <directionalLight
      ref={lightRef}
      intensity={getConfig('sunIntensity')}
      color={getConfig('sunColor')}
      castShadow
      shadow-mapSize={[shadowMapSize, shadowMapSize]}
      shadow-camera-near={1}
      shadow-camera-far={75}
      shadow-camera-left={-SUN_SHADOW_EXTENT}
      shadow-camera-right={SUN_SHADOW_EXTENT}
      shadow-camera-top={SUN_SHADOW_EXTENT}
      shadow-camera-bottom={-SUN_SHADOW_EXTENT}
      shadow-bias={-0.0004}
      shadow-normalBias={0.025}
    />
  );
}

/**
 * Responsive Orthographic Zoom adapter so portrait phones, landscape phones,
 * tablets, and widescreen desktops always frame the full island without cropping.
 */
function ResponsiveOrthoCamera({fitRadius}: {fitRadius: number}) {
  const {camera, size} = useThree();

  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      const w = Math.max(240, size.width);
      const h = Math.max(240, size.height);
      const isPortrait = h > w;
      const isCompactViewport = w < 640 || h < 500;
      const worldSpanW =
        fitRadius * (isPortrait ? 2.18 : isCompactViewport ? 2.35 : 2.18);
      const worldSpanH =
        fitRadius * (isPortrait ? 2.52 : isCompactViewport ? 2.1 : 1.78);
      const zoomX = w / worldSpanW;
      const zoomY = h / worldSpanH;
      camera.zoom = Math.max(10, Math.min(54, Math.min(zoomX, zoomY)));
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height, fitRadius]);

  return null;
}

function resolveInitialLevelState(
  level: LevelDef,
  checkpoint: ActiveLevelCheckpoint | null,
) {
  const mechInit: Record<string, number> = {};
  for (const m of level.mechanisms) {
    mechInit[m.id] = m.initialState;
  }

  const validCheckpoint =
    checkpoint && checkpoint.levelNumber === level.levelNumber
      ? checkpoint
      : null;

  if (validCheckpoint) {
    for (const m of level.mechanisms) {
      if (typeof validCheckpoint.mechStates[m.id] === 'number') {
        mechInit[m.id] = validCheckpoint.mechStates[m.id];
      }
    }
  }

  const evalNodes = evaluateLevelNodes(level, mechInit);
  const startNodeValid =
    validCheckpoint &&
    evalNodes.get(validCheckpoint.checkpointNodeId)?.active
      ? validCheckpoint.checkpointNodeId
      : level.startNodeId;
  const startWorld = evalNodes.get(startNodeValid);

  const useSavedPos = Boolean(
    validCheckpoint && startNodeValid === validCheckpoint.checkpointNodeId,
  );
  const pos: [number, number, number] = useSavedPos && validCheckpoint
    ? [
        Number.isFinite(validCheckpoint.playerPos[0])
          ? validCheckpoint.playerPos[0]
          : (startWorld?.wx ?? 0),
        Number.isFinite(validCheckpoint.playerPos[1])
          ? validCheckpoint.playerPos[1]
          : (startWorld?.wy ?? 0),
        Number.isFinite(validCheckpoint.playerPos[2])
          ? validCheckpoint.playerPos[2]
          : (startWorld?.wz ?? 0),
      ]
    : [startWorld?.wx ?? 0, startWorld?.wy ?? 0, startWorld?.wz ?? 0];

  const rotY = validCheckpoint ? validCheckpoint.playerRotY : 0;
  const camAngle = validCheckpoint
    ? validCheckpoint.camAngle
    : level.defaultCamAngle;
  const pressedPlates = validCheckpoint
    ? validCheckpoint.pressedPlates.filter((id) =>
        level.tiles.some((t) => t.id === id && t.kind === 'plate'),
      )
    : [];

  return {
    mechInit,
    startNodeId: startNodeValid,
    pos,
    rotY,
    camAngle,
    pressedPlates,
  };
}

function Scene({
  gameState,
  setGameState,
  inputRef,
  exitChat,
  gameStateRef,
  paused,
  onHudUpdate,
  onCheckpointUpdate,
  onRelicCollected,
  onLevelCompleted,
  commandRef,
  cosmetic,
  dragSensitivity,
  highQualityEffects,
  containerRef,
  initialCollectedRelics,
  initialCheckpoint,
}: SceneProps) {
  const {camera, scene} = useThree();
  const stoneTexture = useStoneTexture();

  const levelIdx = Math.max(
    0,
    Math.min(LEVELS.length - 1, (gameState.level || 1) - 1),
  );
  const level: LevelDef = LEVELS[levelIdx];

  const skyTex = useSkyGradientTexture(
    level.palette.skyTop,
    level.palette.skyMid,
    level.palette.skyBottom,
  );

  useEffect(() => {
    scene.background = skyTex;
  }, [scene, skyTex]);

  // Capture initial checkpoint & relics in refs so saving NEVER triggers a level reset
  const initialCheckpointRef = useRef(initialCheckpoint);
  const initialRelicsRef = useRef(initialCollectedRelics);

  const bootResolved = useMemo(
    () => resolveInitialLevelState(level, initialCheckpointRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level.levelNumber],
  );

  // Discrete puzzle state
  const [mechStates, setMechStates] = useState<Record<string, number>>(
    () => bootResolved.mechInit,
  );
  const [camAngle, setCamAngle] = useState<number>(bootResolved.camAngle);
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);
  const [collectedRelics, setCollectedRelics] = useState<string[]>(
    () => initialRelicsRef.current,
  );
  const [pressedPlates, setPressedPlates] = useState<string[]>(
    () => bootResolved.pressedPlates,
  );
  const [hoveredTileId, setHoveredTileId] = useState<string | null>(null);
  const [blockedTileId, setBlockedTileId] = useState<string | null>(null);
  const [pathQueue, setPathQueue] = useState<string[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const [interactingAnim, setInteractingAnim] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string>('');
  const [blockedFeedback, setBlockedFeedback] = useState<string>('');
  const [nearbyMechId, setNearbyMechId] = useState<string | null>(null);
  const [crankDragOffsets, setCrankDragOffsets] = useState<
    Record<string, number>
  >({});
  const [currentNodeTrack, setCurrentNodeTrack] = useState<string>(
    () => bootResolved.startNodeId,
  );
  const [isPlayerIdle, setIsPlayerIdle] = useState(false);

  // Refs synced for frame-rate-independent imperative locomotion
  const mechStatesRef = useRef(mechStates);
  mechStatesRef.current = mechStates;
  const camAngleRef = useRef(camAngle);
  camAngleRef.current = camAngle;
  const collectedRelicsRef = useRef(collectedRelics);
  collectedRelicsRef.current = collectedRelics;
  const pressedPlatesRef = useRef(pressedPlates);
  pressedPlatesRef.current = pressedPlates;
  const pathQueueRef = useRef<string[]>(pathQueue);
  pathQueueRef.current = pathQueue;
  const celebratingRef = useRef(celebrating);
  celebratingRef.current = celebrating;
  const interactingAnimRef = useRef(interactingAnim);
  interactingAnimRef.current = interactingAnim;
  const isPlayerIdleRef = useRef(isPlayerIdle);
  isPlayerIdleRef.current = isPlayerIdle;
  const lastInputAtRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : Date.now(),
  );

  const markPlayerActive = useCallback(() => {
    lastInputAtRef.current =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (isPlayerIdleRef.current) {
      isPlayerIdleRef.current = false;
      setIsPlayerIdle(false);
    }
  }, []);

  // Traveler & camera imperative refs
  const playerVisualRef = useRef<THREE.Group>(null);
  const playerBodyRef = useRef<RapierRigidBody>(null);
  const [isWalking, setIsWalking] = useState(false);
  const isWalkingRef = useRef(false);

  const worldNodes = useMemo(
    () => evaluateLevelNodes(level, mechStates),
    [level, mechStates],
  );
  const worldNodesRef = useRef(worldNodes);
  worldNodesRef.current = worldNodes;

  const walkableGraph = useMemo(
    () => buildWalkableGraph(level, worldNodes, camAngle, !isDraggingCamera),
    [level, worldNodes, camAngle, isDraggingCamera],
  );
  const walkableGraphRef = useRef(walkableGraph);
  walkableGraphRef.current = walkableGraph;

  const navRef = useRef({
    currentNodeId: bootResolved.startNodeId,
    targetNodeId: null as string | null,
    segmentProgress: 0,
    segmentStartPos: new THREE.Vector3(...bootResolved.pos),
    pos: new THREE.Vector3(...bootResolved.pos),
    rotY: bootResolved.rotY,
    stepTimer: 0,
    goalTriggered: false,
  });

  // Smooth orbital camera & touch/mouse drag state
  const camOrbitRef = useRef({
    yaw: CAM_ANGLES[bootResolved.camAngle] ?? CAM_ANGLES[0],
    dragActive: false,
    dragging: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startYaw: CAM_ANGLES[bootResolved.camAngle] ?? CAM_ANGLES[0],
  });

  // Direct crank drag state (separate from camera drag!)
  const crankDragRef = useRef<{
    mechId: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    deltaRad: number;
  } | null>(null);

  // Helper to build a full checkpoint snapshot from live refs (zero state reset)
  const buildCheckpointSnapshot = useCallback(
    (
      overrideMechStates?: Record<string, number>,
      overridePlates?: string[],
      overrideCamAngle?: number,
    ): ActiveLevelCheckpoint => {
      return {
        levelNumber: level.levelNumber,
        checkpointNodeId: navRef.current.currentNodeId,
        playerPos: [
          Number(navRef.current.pos.x.toFixed(3)),
          Number(navRef.current.pos.y.toFixed(3)),
          Number(navRef.current.pos.z.toFixed(3)),
        ],
        playerRotY: Number(navRef.current.rotY.toFixed(4)),
        camAngle: overrideCamAngle ?? camAngleRef.current,
        mechStates: {...(overrideMechStates ?? mechStatesRef.current)},
        pressedPlates: [...(overridePlates ?? pressedPlatesRef.current)],
        scoreAtLevel: gameStateRef.current.score,
        updatedAt: Date.now(),
      };
    },
    [level.levelNumber, gameStateRef],
  );

  // Sync visual/physics transform on initial mount
  useEffect(() => {
    if (playerVisualRef.current) {
      playerVisualRef.current.position.copy(navRef.current.pos);
      playerVisualRef.current.rotation.y = navRef.current.rotY;
    }
    if (playerBodyRef.current && isBodyAlive(playerBodyRef.current)) {
      playerBodyRef.current.setNextKinematicTranslation(
        toVec3(navRef.current.pos),
      );
    }
  }, []);

  const bannerTimerRef = useRef<number | null>(null);
  const flashBanner = useCallback((msg: string) => {
    setStatusBanner(msg);
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(bannerTimerRef.current);
    }
    bannerTimerRef.current = window.setTimeout(() => {
      setStatusBanner('');
    }, 2600);
  }, []);

  const blockedTimerRef = useRef<number | null>(null);
  const flashBlocked = useCallback((tileId: string, msg: string) => {
    setBlockedTileId(tileId);
    setBlockedFeedback(msg);
    if (blockedTimerRef.current !== null) {
      window.clearTimeout(blockedTimerRef.current);
    }
    blockedTimerRef.current = window.setTimeout(() => {
      setBlockedTileId(null);
      setBlockedFeedback('');
    }, 1800);
  }, []);

  const interactTimerRef = useRef<number | null>(null);
  const pulseInteractAnim = useCallback(() => {
    setInteractingAnim(true);
    if (interactTimerRef.current !== null) {
      window.clearTimeout(interactTimerRef.current);
    }
    interactTimerRef.current = window.setTimeout(() => {
      setInteractingAnim(false);
    }, 380);
  }, []);

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current !== null)
        window.clearTimeout(bannerTimerRef.current);
      if (blockedTimerRef.current !== null)
        window.clearTimeout(blockedTimerRef.current);
      if (interactTimerRef.current !== null)
        window.clearTimeout(interactTimerRef.current);
    };
  }, []);

  // Activate mechanisms (rotary, crystal, elevator, gate, and coupled sisters) + auto-save
  const triggerMechanisms = useCallback(
    (
      mechIds: string[],
      isPlate = false,
      deltaSteps = 1,
      overridePlates?: string[],
    ) => {
      markPlayerActive();
      const occupiedNodeIds = [navRef.current.currentNodeId];
      if (navRef.current.targetNodeId) {
        occupiedNodeIds.push(navRef.current.targetNodeId);
      }

      const result = resolveMechanismTrigger(
        level,
        mechStatesRef.current,
        mechIds,
        deltaSteps,
        occupiedNodeIds,
      );

      if (!result.allowed) {
        gameAudio.playErrorBuzz();
        flashBlocked(
          result.blockedNodeId ?? navRef.current.currentNodeId,
          result.blockedReason ?? 'Step off the summoned platform first',
        );
        return;
      }

      const {nextStates, labels} = result;

      if (labels.length > 0) {
        setMechStates(nextStates);
        setPathQueue([]);
        navRef.current.targetNodeId = null;
        if (isPlate) {
          gameAudio.playPowerupChime();
          flashBanner(`${labels.join(' & ')} awakened`);
        } else {
          pulseInteractAnim();
          gameAudio.playConfirmSelect();
          flashBanner(`${labels.join(' & ')} shifted`);
        }

        // Persist mechanism state immediately (while Pip stays right where Pip is)
        onCheckpointUpdate?.(
          buildCheckpointSnapshot(nextStates, overridePlates),
        );
      }
    },
    [
      level,
      flashBanner,
      flashBlocked,
      pulseInteractAnim,
      onCheckpointUpdate,
      buildCheckpointSnapshot,
    ],
  );

  // Snap / set camera quadrant and notify if an optical illusion just formed
  const applyCamAngle = useCallback(
    (nextAngle: number) => {
      markPlayerActive();
      const normalized = ((nextAngle % 4) + 4) % 4;
      setCamAngle(normalized);
      const aligned = level.perspectiveLinks.some((pl) =>
        pl.alignedAngles.includes(normalized),
      );
      if (aligned) {
        gameAudio.playPowerupChime();
        flashBanner('Optical Pathway Aligned!');
      }
      onCheckpointUpdate?.(
        buildCheckpointSnapshot(undefined, undefined, normalized),
      );
    },
    [
      level.perspectiveLinks,
      flashBanner,
      onCheckpointUpdate,
      buildCheckpointSnapshot,
    ],
  );

  const rotateCamera = useCallback(
    (delta: number) => {
      gameAudio.playCrispClick();
      applyCamAngle(camAngleRef.current + delta);
    },
    [applyCamAngle],
  );

  const resetCamera = useCallback(() => {
    gameAudio.playCrispClick();
    applyCamAngle(level.defaultCamAngle);
    flashBanner('Viewpoint Reset');
  }, [applyCamAngle, level.defaultCamAngle, flashBanner]);

  // Direct drag on Rotary Crank vs Click on Crank
  const handleBeginCrankDrag = useCallback(
    (mechId: string, clientX: number, clientY: number, pointerId: number) => {
      if (
        gameStateRef.current.status !== 'PLAYING' ||
        paused ||
        celebratingRef.current
      )
        return;
      crankDragRef.current = {
        mechId,
        pointerId,
        startX: clientX,
        startY: clientY,
        moved: false,
        deltaRad: 0,
      };
    },
    [gameStateRef, paused],
  );

  // Container-level Touch & Mouse Drag Rotation for world inspection + crank dragging
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      if (gameStateRef.current.status !== 'PLAYING' || paused) return;
      markPlayerActive();
      if (crankDragRef.current) return;
      if (camOrbitRef.current.dragActive) return;

      camOrbitRef.current.dragActive = true;
      camOrbitRef.current.dragging = false;
      camOrbitRef.current.pointerId = e.pointerId;
      camOrbitRef.current.startX = e.clientX;
      camOrbitRef.current.startY = e.clientY;
      camOrbitRef.current.startYaw = camOrbitRef.current.yaw;
    };

    const onPointerMove = (e: PointerEvent) => {
      const cd = crankDragRef.current;
      if (cd && cd.pointerId === e.pointerId) {
        const dx = e.clientX - cd.startX;
        const dy = e.clientY - cd.startY;
        if (!cd.moved && Math.hypot(dx, dy) > 10) {
          cd.moved = true;
        }
        if (cd.moved) {
          const rad = (dx - dy * 0.4) * 0.014 * dragSensitivity;
          cd.deltaRad = rad;
          setCrankDragOffsets((prev) => ({...prev, [cd.mechId]: rad}));
        }
        return;
      }

      const co = camOrbitRef.current;
      if (!co.dragActive || co.pointerId !== e.pointerId) return;
      const dx = e.clientX - co.startX;
      const dy = e.clientY - co.startY;
      if (!co.dragging && Math.hypot(dx, dy) > 12) {
        co.dragging = true;
        setIsDraggingCamera(true);
      }
      if (co.dragging) {
        co.yaw = co.startYaw - dx * 0.008 * dragSensitivity;
      }
    };

    const onPointerEnd = (e: PointerEvent) => {
      const cd = crankDragRef.current;
      if (cd && cd.pointerId === e.pointerId) {
        crankDragRef.current = null;
        setCrankDragOffsets((prev) => {
          const copy = {...prev};
          delete copy[cd.mechId];
          return copy;
        });
        if (!cd.moved) {
          triggerMechanisms([cd.mechId], false, 1);
        } else {
          const steps = Math.round(cd.deltaRad / (Math.PI / 2));
          if (steps !== 0) {
            triggerMechanisms([cd.mechId], false, steps);
          } else {
            gameAudio.playCrispClick();
          }
        }
        return;
      }

      const co = camOrbitRef.current;
      if (!co.dragActive || co.pointerId !== e.pointerId) return;
      const wasDragging = co.dragging;
      co.dragActive = false;
      co.dragging = false;
      co.pointerId = -1;

      if (wasDragging) {
        setIsDraggingCamera(false);
        let bestIdx = 0;
        let bestDiff = Infinity;
        for (let i = 0; i < CAM_ANGLES.length; i++) {
          const diff = Math.abs(
            THREE.MathUtils.euclideanModulo(
              co.yaw - CAM_ANGLES[i] + Math.PI,
              Math.PI * 2,
            ) - Math.PI,
          );
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = i;
          }
        }
        if (bestIdx !== camAngleRef.current) {
          gameAudio.playCrispClick();
        }
        applyCamAngle(bestIdx);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
    };
  }, [
    containerRef,
    dragSensitivity,
    gameStateRef,
    paused,
    triggerMechanisms,
    applyCamAngle,
  ]);

  // Find nearest directly interactable mechanism within reach
  const findNearbyMech = useCallback((): MechanismDef | null => {
    const px = navRef.current.pos.x;
    const py = navRef.current.pos.y;
    const pz = navRef.current.pos.z;
    const currNode = level.tiles.find(
      (t) => t.id === navRef.current.currentNodeId,
    );

    let best: MechanismDef | null = null;
    let bestDist = 4.4;

    for (const m of level.mechanisms) {
      if (!m.directInteract) continue;
      if (currNode?.groupId === m.id) return m;
      const anchor = m.crankPos ?? m.pivot;
      const maxRange = m.type === 'rotary' ? 4.4 : 2.9;
      const dist = Math.hypot(
        px - anchor[0],
        (py - anchor[1]) * 1.4,
        pz - anchor[2],
      );
      if (dist < maxRange && dist < bestDist) {
        bestDist = dist;
        best = m;
      }
    }
    return best;
  }, [level.mechanisms, level.tiles]);

  // Interact with nearby mechanism or specific clicked mechanism
  const handleActivateCrank = useCallback(
    (mechId?: string) => {
      if (gameStateRef.current.status !== 'PLAYING' || celebratingRef.current)
        return;
      if (mechId) {
        const m = level.mechanisms.find((x) => x.id === mechId);
        if (m && m.directInteract) {
          triggerMechanisms([m.id], false, 1);
        }
        return;
      }
      const nearby = findNearbyMech();
      if (nearby) {
        triggerMechanisms([nearby.id], false, 1);
      } else {
        gameAudio.playErrorBuzz();
      }
    },
    [findNearbyMech, gameStateRef, level.mechanisms, triggerMechanisms],
  );

  // Expose HUD & snapshot commands to App.tsx
  useEffect(() => {
    commandRef.current = {
      rotateCam: rotateCamera,
      resetCam: resetCamera,
      interact: () => handleActivateCrank(),
      getCheckpointSnapshot: () => buildCheckpointSnapshot(),
    };
    return () => {
      commandRef.current = null;
    };
  }, [
    commandRef,
    rotateCamera,
    resetCamera,
    handleActivateCrank,
    buildCheckpointSnapshot,
  ]);

  // Handle clicking / tapping a walkable tile (skip if camera was dragged)
  const handleSelectTile = useCallback(
    (tileId: string) => {
      if (
        gameStateRef.current.status !== 'PLAYING' ||
        paused ||
        celebratingRef.current ||
        camOrbitRef.current.dragging
      ) {
        return;
      }
      markPlayerActive();
      const startId =
        navRef.current.targetNodeId ?? navRef.current.currentNodeId;
      const path = findPathBFS(walkableGraphRef.current, startId, tileId);
      if (path && path.length > 0) {
        gameAudio.playCrispClick();
        const trimmed = path[0] === startId ? path.slice(1) : path;
        setPathQueue(trimmed);
      } else {
        gameAudio.playErrorBuzz();
        const hasPersp = level.perspectiveLinks.length > 0;
        flashBlocked(
          tileId,
          hasPersp
            ? 'Path blocked — rotate the camera or shift bridges!'
            : 'Path disconnected — activate a bridge, crystal, or dial first!',
        );
      }
    },
    [gameStateRef, paused, level.perspectiveLinks.length, flashBlocked],
  );

  // Reset idle timer whenever gameplay resumes or unpauses
  useEffect(() => {
    if (!paused && gameState.status === 'PLAYING') {
      markPlayerActive();
    }
  }, [paused, gameState.status, markPlayerActive]);

  // Identify next functional mechanism/plate/perspective/goal to illuminate on idle
  const nextHintTarget = useMemo(
    () =>
      findNextHintTarget(
        level,
        currentNodeTrack,
        mechStates,
        camAngle,
        pressedPlates,
      ),
    [level, currentNodeTrack, mechStates, camAngle, pressedPlates],
  );

  // Collect all functional anchors across the level for floating light-dust particles
  const dustAnchors = useMemo(
    () => getLevelDustAnchors(level, worldNodes, mechStates, pressedPlates),
    [level, worldNodes, mechStates, pressedPlates],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.dataset.idleActive = isPlayerIdle ? 'true' : 'false';
    el.dataset.dustAnchors = String(dustAnchors.length);
  }, [containerRef, isPlayerIdle, dustAnchors.length]);

  // Sync discrete HUD info up to App.tsx
  const perspectiveAligned = level.perspectiveLinks.some((pl) =>
    pl.alignedAngles.includes(camAngle),
  );

  useEffect(() => {
    const nearby = findNearbyMech();
    setNearbyMechId(nearby?.id ?? null);
    onHudUpdate({
      levelName: level.name,
      subtitle: level.subtitle,
      objective: level.objective,
      hint: level.hint,
      relicsCollected: collectedRelics.length,
      relicsTotal: level.relics.length,
      collectedRelicIds: collectedRelics,
      camAngle,
      isDraggingCamera,
      perspectiveAligned,
      hasPerspectiveLinks: level.perspectiveLinks.length > 0,
      canInteractNearby: Boolean(nearby),
      nearbyLabel: nearby?.label ?? '',
      idleHintLabel: isPlayerIdle && nextHintTarget ? nextHintTarget.label : '',
      statusBanner,
      blockedFeedback,
    });
  }, [
    level,
    collectedRelics,
    camAngle,
    isDraggingCamera,
    perspectiveAligned,
    isPlayerIdle,
    nextHintTarget,
    statusBanner,
    blockedFeedback,
    mechStates,
    onHudUpdate,
    findNearbyMech,
  ]);

  // Node arrival logic: trigger plates, collect star relics (WITHOUT resetting player!), complete goal
  const onArriveNode = useCallback(
    (nodeId: string) => {
      const node = level.tiles.find((t) => t.id === nodeId);
      if (!node) return;

      const nearby = findNearbyMech();
      setNearbyMechId(nearby?.id ?? null);

      let nextPlates = pressedPlatesRef.current;
      let plateTriggered = false;

      // 1. Pressure plate activation
      if (node.kind === 'plate' && node.plateTriggers?.length) {
        const alreadyPressed = pressedPlatesRef.current.includes(node.id);
        if (!alreadyPressed || node.plateToggle) {
          plateTriggered = true;
          nextPlates = !alreadyPressed
            ? [...pressedPlatesRef.current, node.id]
            : pressedPlatesRef.current.filter((id) => id !== node.id);
          setPressedPlates(nextPlates);
          triggerMechanisms(node.plateTriggers, true, 1, nextPlates);
        }
      }

      // 2. Star Relic pickup — NEVER resets player position, rotation, checkpoint, or level!
      const relic = level.relics.find((r) => r.nodeId === node.id);
      const relicNewlyCollected =
        Boolean(relic) && !collectedRelicsRef.current.includes(relic!.id);
      if (relic && relicNewlyCollected) {
        const updatedRelics = Array.from(
          new Set([...collectedRelicsRef.current, relic.id]),
        );
        setCollectedRelics(updatedRelics);
        gameAudio.playCoinPickup();
        flashBanner(`Discovered ${relic.label}!`);
        const snapshot = buildCheckpointSnapshot(undefined, nextPlates);
        snapshot.scoreAtLevel =
          gameStateRef.current.score + getConfig('pointsPerRelic');
        setGameState((prev) => ({
          ...prev,
          score: prev.score + getConfig('pointsPerRelic'),
        }));
        onRelicCollected?.(level.levelNumber, relic.id, snapshot);
      }

      // 3. Sanctuary Beacon Goal
      if (node.id === level.goalNodeId && !navRef.current.goalTriggered) {
        navRef.current.goalTriggered = true;
        setCelebrating(true);
        setPathQueue([]);
        navRef.current.targetNodeId = null;
        flashBanner('Sanctuary Beacon Illuminated!');

        const isFinal = level.levelNumber >= TOTAL_LEVELS;
        if (isFinal) {
          gameAudio.playVictoryFanfare();
        } else {
          gameAudio.playLevelUpStinger();
        }

        const bonus = getConfig('pointsPerLevel');
        const nextScore = gameStateRef.current.score + bonus;
        onLevelCompleted?.(
          level.levelNumber,
          nextScore,
          collectedRelicsRef.current,
        );

        window.setTimeout(() => {
          setGameState((prev) => {
            if (prev.status !== 'PLAYING') return prev;
            return {
              ...prev,
              score: prev.score + bonus,
              status: isFinal ? 'VICTORY' : 'LEVEL_COMPLETE',
            };
          });
        }, 1250);
        return;
      }

      // 4. Discrete tile checkpoint auto-save (never per-frame, only on discrete tile arrival)
      if (!plateTriggered && !relicNewlyCollected) {
        onCheckpointUpdate?.(buildCheckpointSnapshot(undefined, nextPlates));
      }
    },
    [
      level,
      findNearbyMech,
      triggerMechanisms,
      flashBanner,
      buildCheckpointSnapshot,
      onRelicCollected,
      onCheckpointUpdate,
      onLevelCompleted,
      gameStateRef,
      setGameState,
    ],
  );

  // Edge-trigger refs for keyboard actions
  const prevCancelRef = useRef(false);
  const prevRotLeftRef = useRef(false);
  const prevRotRightRef = useRef(false);
  const prevInteractRef = useRef(false);

  // Main R3F Game Loop
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.08);
    const input = inputRef.current;

    if (input) {
      const cancelPressed = input.actions.cancel;
      if (cancelPressed && !prevCancelRef.current) {
        const st = gameStateRef.current.status;
        if (st === 'START') {
          exitChat({}).catch(() => {});
        } else if (['GAME_OVER', 'VICTORY'].includes(st)) {
          setGameState((prev) => ({...prev, status: 'START'}));
        }
      }
      prevCancelRef.current = cancelPressed;
    }

    if (gameStateRef.current.status === 'START') {
      camOrbitRef.current.yaw += dt * 0.14;
    } else if (!camOrbitRef.current.dragging) {
      const targetYaw = CAM_ANGLES[camAngleRef.current] ?? CAM_ANGLES[0];
      const yawDiff =
        THREE.MathUtils.euclideanModulo(
          targetYaw - camOrbitRef.current.yaw + Math.PI,
          Math.PI * 2,
        ) - Math.PI;
      camOrbitRef.current.yaw += yawDiff * Math.min(1, dt * 7.5);
    }

    const orbitYaw = camOrbitRef.current.yaw;
    const horizDist = ORTHO_CAM_RADIUS;
    const vertDist = ORTHO_CAM_RADIUS * Math.SQRT1_2;
    tmpCamPos.set(
      level.center[0] + Math.sin(orbitYaw) * horizDist,
      level.center[1] + vertDist,
      level.center[2] + Math.cos(orbitYaw) * horizDist,
    );
    camera.position.lerp(tmpCamPos, Math.min(1, dt * 14));
    tmpCamTarget.set(level.center[0], level.center[1], level.center[2]);
    camera.lookAt(tmpCamTarget);

    if (paused || gameStateRef.current.status !== 'PLAYING') return;

    if (input) {
      const rotL = input.actions.rotateLeft;
      const rotR = input.actions.rotateRight;
      const act = input.actions.interact || input.actions.confirm;

      if (rotL && !prevRotLeftRef.current) rotateCamera(-1);
      if (rotR && !prevRotRightRef.current) rotateCamera(1);
      if (act && !prevInteractRef.current && !celebratingRef.current) {
        handleActivateCrank();
      }
      prevRotLeftRef.current = rotL;
      prevRotRightRef.current = rotR;
      prevInteractRef.current = act;
    }

    const nav = navRef.current;
    if (celebratingRef.current) {
      if (playerVisualRef.current) {
        playerVisualRef.current.position.copy(nav.pos);
        playerVisualRef.current.rotation.y += dt * 2.5;
      }
      return;
    }

    const beginSegmentTo = (nextId: string) => {
      const cw = worldNodesRef.current.get(nav.currentNodeId);
      if (cw) {
        nav.segmentStartPos.set(cw.wx, cw.wy, cw.wz);
      } else {
        nav.segmentStartPos.copy(nav.pos);
      }
      nav.targetNodeId = nextId;
      nav.segmentProgress = 0;
    };

    let moveX = 0;
    let moveZ = 0;
    if (input) {
      if (input.actions.left) moveX -= 1;
      if (input.actions.right) moveX += 1;
      if (input.actions.up) moveZ -= 1;
      if (input.actions.down) moveZ += 1;
      if (
        input.analogMove &&
        Math.hypot(input.analogMove.x, input.analogMove.y) > 0.25
      ) {
        moveX += input.analogMove.x;
        moveZ += input.analogMove.y;
      }
    }
    const hasDirInput = Math.hypot(moveX, moveZ) > 0.2;

    if (hasDirInput || camOrbitRef.current.dragging) {
      markPlayerActive();
    }

    if (hasDirInput && !nav.targetNodeId && pathQueueRef.current.length === 0) {
      camera.getWorldDirection(tmpCamForward);
      tmpCamForward.y = 0;
      if (tmpCamForward.lengthSq() > 1e-5) tmpCamForward.normalize();
      tmpCamRight.set(-tmpCamForward.z, 0, tmpCamForward.x);

      tmpDesiredDir
        .set(0, 0, 0)
        .addScaledVector(tmpCamRight, moveX)
        .addScaledVector(tmpCamForward, -moveZ);
      if (tmpDesiredDir.lengthSq() > 1e-5) {
        tmpDesiredDir.normalize();
        const neighbors =
          walkableGraphRef.current.get(nav.currentNodeId) ?? [];
        const currWorld = worldNodesRef.current.get(nav.currentNodeId);
        if (currWorld) {
          let bestId: string | null = null;
          let bestDot = 0.42;
          for (const nid of neighbors) {
            const nw = worldNodesRef.current.get(nid);
            if (!nw) continue;
            const seam = computeOpticalSeamEdges(
              currWorld.wx,
              currWorld.wy,
              currWorld.wz,
              nw.wx,
              nw.wy,
              nw.wz,
              camAngleRef.current,
            );
            if (seam.isOptical) {
              tmpNodeDelta.set(
                seam.edgeA[0] - currWorld.wx,
                0,
                seam.edgeA[2] - currWorld.wz,
              );
            } else {
              tmpNodeDelta.set(nw.wx - currWorld.wx, 0, nw.wz - currWorld.wz);
            }
            if (tmpNodeDelta.lengthSq() < 1e-4) continue;
            tmpNodeDelta.normalize();
            const dot = tmpDesiredDir.dot(tmpNodeDelta);
            if (dot > bestDot) {
              bestDot = dot;
              bestId = nid;
            }
          }
          if (bestId) {
            beginSegmentTo(bestId);
          }
        }
      }
    }

    if (!nav.targetNodeId && pathQueueRef.current.length > 0) {
      const nextId = pathQueueRef.current[0];
      const neighbors = walkableGraphRef.current.get(nav.currentNodeId) ?? [];
      if (neighbors.includes(nextId)) {
        beginSegmentTo(nextId);
        setPathQueue((q) => q.slice(1));
      } else {
        setPathQueue([]);
      }
    }

    let walkingNow = false;
    if (nav.targetNodeId) {
      const targetWorld = worldNodesRef.current.get(nav.targetNodeId);
      if (!targetWorld || !targetWorld.active) {
        nav.targetNodeId = null;
        nav.segmentProgress = 0;
      } else {
        const ax = nav.segmentStartPos.x;
        const ay = nav.segmentStartPos.y;
        const az = nav.segmentStartPos.z;
        const bx = targetWorld.wx;
        const by = targetWorld.wy;
        const bz = targetWorld.wz;

        const seam = computeOpticalSeamEdges(
          ax,
          ay,
          az,
          bx,
          by,
          bz,
          camAngleRef.current,
        );
        const speed = getConfig('moveSpeed');
        const stepProgress = (speed * dt) / 2.0;
        nav.segmentProgress = Math.min(1, nav.segmentProgress + stepProgress);
        const p = nav.segmentProgress;

        let faceDx = bx - ax;
        let faceDz = bz - az;

        if (seam.isOptical) {
          if (p < 0.5) {
            const sub = p * 2;
            nav.pos.set(
              THREE.MathUtils.lerp(ax, seam.edgeA[0], sub),
              ay,
              THREE.MathUtils.lerp(az, seam.edgeA[2], sub),
            );
            faceDx = seam.edgeA[0] - ax;
            faceDz = seam.edgeA[2] - az;
          } else {
            const sub = (p - 0.5) * 2;
            nav.pos.set(
              THREE.MathUtils.lerp(seam.edgeB[0], bx, sub),
              by,
              THREE.MathUtils.lerp(seam.edgeB[2], bz, sub),
            );
            faceDx = bx - seam.edgeB[0];
            faceDz = bz - seam.edgeB[2];
          }
        } else {
          nav.pos.set(
            THREE.MathUtils.lerp(ax, bx, p),
            THREE.MathUtils.lerp(ay, by, p),
            THREE.MathUtils.lerp(az, bz, p),
          );
        }

        if (Math.hypot(faceDx, faceDz) > 0.02) {
          const targetRotY = Math.atan2(faceDx, faceDz) + Math.PI;
          const turn =
            THREE.MathUtils.euclideanModulo(
              targetRotY - nav.rotY + Math.PI,
              Math.PI * 2,
            ) - Math.PI;
          nav.rotY += THREE.MathUtils.clamp(turn, -12 * dt, 12 * dt);
        }

        if (p >= 1) {
          nav.pos.set(bx, by, bz);
          const arrivedId = nav.targetNodeId;
          nav.currentNodeId = arrivedId;
          nav.targetNodeId = null;
          nav.segmentProgress = 0;
          setCurrentNodeTrack(arrivedId);
          onArriveNode(arrivedId);
        } else {
          walkingNow = true;
          nav.stepTimer += dt;
          if (nav.stepTimer >= 0.32) {
            nav.stepTimer = 0;
            gameAudio.playFootstepStone();
          }
        }
      }
    } else {
      const currWorld = worldNodesRef.current.get(nav.currentNodeId);
      if (currWorld) {
        nav.pos.x = THREE.MathUtils.lerp(
          nav.pos.x,
          currWorld.wx,
          Math.min(1, dt * 10),
        );
        nav.pos.y = THREE.MathUtils.lerp(
          nav.pos.y,
          currWorld.wy,
          Math.min(1, dt * 10),
        );
        nav.pos.z = THREE.MathUtils.lerp(
          nav.pos.z,
          currWorld.wz,
          Math.min(1, dt * 10),
        );
      }
    }

    if (walkingNow !== isWalkingRef.current) {
      isWalkingRef.current = walkingNow;
      setIsWalking(walkingNow);
    }

    if (walkingNow) {
      markPlayerActive();
    } else {
      const nowMs =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const idleNow =
        !paused &&
        gameStateRef.current.status === 'PLAYING' &&
        !celebratingRef.current &&
        !interactingAnimRef.current &&
        nowMs - lastInputAtRef.current >= 4000;
      if (idleNow !== isPlayerIdleRef.current) {
        isPlayerIdleRef.current = idleNow;
        setIsPlayerIdle(idleNow);
      }
    }

    if (playerVisualRef.current) {
      playerVisualRef.current.position.copy(nav.pos);
      playerVisualRef.current.rotation.y = nav.rotY;
    }
    if (playerBodyRef.current && isBodyAlive(playerBodyRef.current)) {
      playerBodyRef.current.setNextKinematicTranslation(toVec3(nav.pos));
    }
  });

  const staticTiles = useMemo(
    () => level.tiles.filter((t) => !t.groupId),
    [level.tiles],
  );
  const groupedTiles = useMemo(() => {
    const map = new Map<string, TileNode[]>();
    for (const m of level.mechanisms) {
      map.set(
        m.id,
        level.tiles.filter((t) => t.groupId === m.id),
      );
    }
    return map;
  }, [level.mechanisms, level.tiles]);

  const activePathSet = useMemo(() => new Set(pathQueue), [pathQueue]);

  const reachableFromPlayer = useMemo(() => {
    const currId =
      navRef.current.targetNodeId ?? navRef.current.currentNodeId;
    const set = new Set<string>();
    const q = [currId];
    set.add(currId);
    let idx = 0;
    while (idx < q.length) {
      const c = q[idx++];
      for (const nxt of walkableGraph.get(c) ?? []) {
        if (!set.has(nxt)) {
          set.add(nxt);
          q.push(nxt);
        }
      }
    }
    return set;
  }, [walkableGraph]);

  return (
    <group>
      <fog attach="fog" args={[level.palette.fogColor, 44, 108]} />
      <PastelEnvironment
        enableParticles={
          Boolean(getConfig('enableParticles')) && highQualityEffects
        }
        palette={level.palette}
      />

      {staticTiles.map((tile) => {
        const w = worldNodes.get(tile.id);
        const isHiddenTile = Boolean(tile.hiddenUntilGroup);
        const isGateActive = w ? w.active : false;
        return (
          <TileBlock
            key={tile.id}
            id={tile.id}
            position={[tile.x, tile.y, tile.z]}
            kind={tile.kind}
            facingY={tile.facingY}
            pillarHeight={tile.pillarHeight}
            isHiddenTile={isHiddenTile}
            isGateActive={isGateActive}
            isPressed={pressedPlates.includes(tile.id)}
            isHovered={hoveredTileId === tile.id}
            isReachable={reachableFromPlayer.has(tile.id)}
            isBlockedPulse={blockedTileId === tile.id}
            isTargetHighlight={activePathSet.has(tile.id)}
            stoneTexture={stoneTexture}
            onSelect={handleSelectTile}
            onHover={setHoveredTileId}
          />
        );
      })}

      {level.mechanisms.map((mech) => {
        const tilesInGroup = groupedTiles.get(mech.id) ?? [];
        const st = mechStates[mech.id] ?? mech.initialState;
        return (
          <AnimatedMechanismGroup
            key={mech.id}
            mech={mech}
            targetState={st}
            dragDeltaRad={crankDragOffsets[mech.id] ?? 0}>
            {tilesInGroup.map((tile) => (
              <TileBlock
                key={tile.id}
                id={tile.id}
                position={[tile.x, tile.y, tile.z]}
                kind={tile.kind}
                facingY={tile.facingY}
                pillarHeight={tile.pillarHeight}
                isHovered={hoveredTileId === tile.id}
                isReachable={reachableFromPlayer.has(tile.id)}
                isBlockedPulse={blockedTileId === tile.id}
                isTargetHighlight={activePathSet.has(tile.id)}
                stoneTexture={stoneTexture}
                onSelect={handleSelectTile}
                onHover={setHoveredTileId}
              />
            ))}
          </AnimatedMechanismGroup>
        );
      })}

      {level.mechanisms
        .filter((m) => m.directInteract && m.crankPos)
        .map((m) => {
          const st = mechStates[m.id] ?? m.initialState;
          const isElevRaised = m.type === 'elevator' && st % 2 === 1;
          const off = m.moveOffset ?? [0, 0, 0];
          const pos: [number, number, number] = [
            m.crankPos![0] + (isElevRaised ? off[0] : 0),
            m.crankPos![1] + (isElevRaised ? off[1] : 0),
            m.crankPos![2] + (isElevRaised ? off[2] : 0),
          ];
          return (
            <CrankControl
              key={`crank-${m.id}`}
              id={m.id}
              position={pos}
              type={m.type}
              stateVal={st}
              nearby={nearbyMechId === m.id}
              dragDeltaRad={crankDragOffsets[m.id] ?? 0}
              onActivate={handleActivateCrank}
              onBeginDrag={handleBeginCrankDrag}
            />
          );
        })}

      {level.perspectiveLinks.map((pl) => {
        const a = worldNodes.get(pl.nodeA);
        const b = worldNodes.get(pl.nodeB);
        if (!a || !b || !a.active || !b.active) return null;
        return (
          <PerspectiveSeam
            key={pl.id}
            posA={[a.wx, a.wy, a.wz]}
            posB={[b.wx, b.wy, b.wz]}
            aligned={
              !isDraggingCamera && pl.alignedAngles.includes(camAngle)
            }
          />
        );
      })}

      {level.relics.map((relic) => {
        const nw = worldNodes.get(relic.nodeId);
        if (!nw || !nw.active) return null;
        return (
          <StarRelicMesh
            key={relic.id}
            position={[nw.wx, nw.wy, nw.wz]}
            collected={collectedRelics.includes(relic.id)}
          />
        );
      })}

      {level.props.map((prop) => (
        <ArchProp
          key={prop.id}
          prop={prop}
          celebrating={prop.kind === 'dome' && celebrating}
        />
      ))}

      <FunctionalDustField
        anchors={dustAnchors}
        idleBoostId={
          isPlayerIdle && !celebrating && nextHintTarget
            ? nextHintTarget.targetId
            : null
        }
      />

      <RigidBody
        ref={playerBodyRef}
        type="kinematicPosition"
        colliders={false}
        position={bootResolved.pos}>
        <CapsuleCollider args={[0.45, 0.3]} position={[0, 0.75, 0]} />
      </RigidBody>
      <group
        ref={playerVisualRef}
        position={bootResolved.pos}
        rotation={[0, bootResolved.rotY, 0]}>
        <TravelerPip
          walking={isWalking}
          celebrating={celebrating}
          interacting={interactingAnim}
          idleEmote={isPlayerIdle && !isWalking && !celebrating && !interactingAnim}
          tunicColor={cosmetic.tunicColor}
          scarfColor={cosmetic.scarfColor}
          capColor={cosmetic.capColor}
          enablePointLight={highQualityEffects}
        />
      </group>
    </group>
  );
}

function probeWebGLCapabilities(): {available: boolean; isSoftwareGl: boolean} {
  if (typeof document === 'undefined') {
    return {available: true, isSoftwareGl: false};
  }
  try {
    const probeCanvas = document.createElement('canvas');
    probeCanvas.width = 1;
    probeCanvas.height = 1;
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return {available: false, isSoftwareGl: true};
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    const isSoftwareGl =
      /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    probeCanvas.width = 0;
    probeCanvas.height = 0;
    return {available: true, isSoftwareGl};
  } catch {
    return {available: false, isSoftwareGl: true};
  }
}

function WebGlUnavailableFallback() {
  return (
    <div
      role="alert"
      className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-200 p-6 text-center text-sm">
      3D graphics unavailable on this device or browser tab.
    </div>
  );
}

const WEBGL_CONTEXT_ERROR_RE = /webgl2? context/i;

interface CanvasErrorBoundaryProps {
  readonly children: React.ReactNode;
}
interface CanvasErrorBoundaryState {
  readonly error: Error | null;
}

class CanvasErrorBoundary extends Component {
  declare readonly props: CanvasErrorBoundaryProps;
  state: CanvasErrorBoundaryState = {error: null};

  static getDerivedStateFromError(error: Error): CanvasErrorBoundaryState {
    return {error};
  }

  componentDidCatch(error: Error): void {
    if (WEBGL_CONTEXT_ERROR_RE.test(error?.message ?? '')) {
      console.error(error);
    }
  }

  render(): React.ReactNode {
    const {error} = this.state;
    if (error) {
      if (!WEBGL_CONTEXT_ERROR_RE.test(error.message ?? '')) {
        throw error;
      }
      return <WebGlUnavailableFallback />;
    }
    return this.props.children;
  }
}

/** Main game component. Renders the Orthographic Isometric R3F Canvas with physics & post-processing. */
export function Game({
  gameState,
  setGameState,
  exitChat,
  gameStateRef,
  externalInputRef,
  paused = false,
  onHudUpdate,
  onCheckpointUpdate,
  onRelicCollected,
  onLevelCompleted,
  commandRef,
  cosmetic,
  dragSensitivity = 1.0,
  highQualityEffects = true,
  initialCollectedRelics = [],
  initialCheckpoint = null,
}: {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  exitChat: (payload: Record<string, unknown>) => Promise<void>;
  gameStateRef: React.MutableRefObject<GameState>;
  externalInputRef?: React.MutableRefObject<InputSnapshot>;
  paused?: boolean;
  onHudUpdate: (info: LevelHudInfo) => void;
  onCheckpointUpdate?: (snapshot: ActiveLevelCheckpoint) => void;
  onRelicCollected?: (
    level: number,
    relicId: string,
    snapshot: ActiveLevelCheckpoint,
  ) => void;
  onLevelCompleted?: (
    level: number,
    score: number,
    relicIds: string[],
  ) => void;
  commandRef: MutableRefObject<GameCommandBridge | null>;
  cosmetic: TravelerCosmetic;
  dragSensitivity?: number;
  highQualityEffects?: boolean;
  initialCollectedRelics?: string[];
  initialCheckpoint?: ActiveLevelCheckpoint | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useInput(containerRef, {enabled: true, externalInputRef});
  const [webGlCaps, setWebGlCaps] = useState(probeWebGLCapabilities);
  const webGlAvailable = webGlCaps.available;
  const isSoftwareGl = webGlCaps.isSoftwareGl;
  const isMobile = useIsMobile();

  const levelIdx = Math.max(
    0,
    Math.min(LEVELS.length - 1, (gameState.level || 1) - 1),
  );
  const currentLevel = LEVELS[levelIdx];

  const createGlRenderer = useCallback(
    (defaultProps: Record<string, unknown>) => {
      try {
        const renderer = new THREE.WebGLRenderer({
          ...defaultProps,
          antialias: !isSoftwareGl,
        });
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.02;
        return renderer;
      } catch (err) {
        console.error(err);
        setWebGlCaps({available: false, isSoftwareGl: true});
        return new Promise<never>(() => {});
      }
    },
    [isSoftwareGl],
  );

  const shadowSize = highQualityEffects ? (isMobile ? 512 : 1024) : 512;
  const enableGpuPostFx = highQualityEffects && !isSoftwareGl;

  return (
    <div ref={containerRef} className="w-full h-full canvas-wrapper">
      {webGlAvailable ? (
        <CanvasErrorBoundary>
          <Canvas
            orthographic
            shadows={enableGpuPostFx}
            dpr={isSoftwareGl ? 1 : highQualityEffects ? [1, 1.5] : [1, 1.25]}
            camera={INITIAL_ORTHO_CAMERA}
            gl={createGlRenderer}>
            <Suspense fallback={null}>
              <ResponsiveOrthoCamera fitRadius={currentLevel.fitRadius} />

              {/* Inlined 3-Point Celestial Lighting Rig */}
              <ambientLight
                color={getConfig('ambientColor')}
                intensity={getConfig('ambientIntensity')}
              />
              <SunLight
                center={currentLevel.center}
                shadowMapSize={shadowSize}
              />
              <hemisphereLight
                color={getConfig('hemiSkyColor')}
                groundColor={getConfig('hemiGroundColor')}
                intensity={getConfig('hemiIntensity')}
              />

              <Physics
                paused={paused || gameState.status !== 'PLAYING'}
                gravity={[0, getConfig('gravity'), 0]}
                timeStep="vary">
                <Scene
                  gameState={gameState}
                  setGameState={setGameState}
                  inputRef={inputRef}
                  exitChat={exitChat}
                  gameStateRef={gameStateRef}
                  paused={paused}
                  onHudUpdate={onHudUpdate}
                  onCheckpointUpdate={onCheckpointUpdate}
                  onRelicCollected={onRelicCollected}
                  onLevelCompleted={onLevelCompleted}
                  commandRef={commandRef}
                  cosmetic={cosmetic}
                  dragSensitivity={dragSensitivity}
                  highQualityEffects={highQualityEffects}
                  containerRef={containerRef}
                  initialCollectedRelics={initialCollectedRelics}
                  initialCheckpoint={initialCheckpoint}
                />
              </Physics>

              {enableGpuPostFx && (
                <EffectComposer>
                  <Bloom
                    luminanceThreshold={1.12}
                    luminanceSmoothing={0.85}
                    intensity={0.28}
                    mipmapBlur
                  />
                </EffectComposer>
              )}
            </Suspense>
          </Canvas>
        </CanvasErrorBoundary>
      ) : (
        <WebGlUnavailableFallback />
      )}
    </div>
  );
}
