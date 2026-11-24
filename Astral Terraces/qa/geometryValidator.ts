import {
  buildWalkableGraph,
  computeOpticalSeamEdges,
  evaluateLevelNodes,
  LEVELS,
} from '../levels';
import {ArchPropDef, LevelDef} from '../types';

export interface Aabb3D {
  label: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export type QaSeverity = 'critical' | 'warning';

export interface QaFinding {
  levelNumber: number;
  levelName: string;
  objectName: string;
  worldPosition: [number, number, number];
  problemType: string;
  severity: QaSeverity;
  details: string;
}

export interface LevelQaSummary {
  levelNumber: number;
  levelName: string;
  geometry: 'Pass' | 'Fail';
  collision: 'Pass' | 'Fail';
  navigation: 'Pass' | 'Fail';
  playerMovement: 'Pass' | 'Fail';
  status: 'Pass' | 'Fail';
  goalReachable: boolean;
  relicsReachable: number;
  relicsTotal: number;
  exploredStates: number;
  findings: QaFinding[];
}

export interface FullQaReport {
  allPassed: boolean;
  levels: LevelQaSummary[];
  totalFindings: number;
}

function boxesOverlap(a: Aabb3D, b: Aabb3D, eps = 0.01): boolean {
  return (
    a.minX + eps < b.maxX &&
    a.maxX - eps > b.minX &&
    a.minY + eps < b.maxY &&
    a.maxY - eps > b.minY &&
    a.minZ + eps < b.maxZ &&
    a.maxZ - eps > b.minZ
  );
}

function rotateXZ(
  lx: number,
  lz: number,
  rotY: number,
): [number, number] {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [lx * c + lz * s, -lx * s + lz * c];
}

function makeBox(
  label: string,
  cx: number,
  cy: number,
  cz: number,
  hx: number,
  hy: number,
  hz: number,
): Aabb3D {
  return {
    label,
    minX: cx - hx,
    maxX: cx + hx,
    minY: cy - hy,
    maxY: cy + hy,
    minZ: cz - hz,
    maxZ: cz + hz,
  };
}

/** Returns physical obstacle AABBs for an ArchProp in world space. */
export function getPropObstacleBoxes(prop: ArchPropDef): Aabb3D[] {
  const [px, py, pz] = prop.position;
  const s = prop.scale ?? 1;
  const rotY = prop.rotationY ?? 0;
  const boxes: Aabb3D[] = [];

  const pushLocal = (
    suffix: string,
    lx: number,
    ly: number,
    lz: number,
    hx: number,
    hy: number,
    hz: number,
  ) => {
    const [rx, rz] = rotateXZ(lx * s, lz * s, rotY);
    const absCos = Math.abs(Math.cos(rotY));
    const absSin = Math.abs(Math.sin(rotY));
    const whx = (hx * absCos + hz * absSin) * s;
    const whz = (hx * absSin + hz * absCos) * s;
    boxes.push(
      makeBox(`${prop.id}:${suffix}`, px + rx, py + ly * s, pz + rz, whx, hy * s, whz),
    );
  };

  switch (prop.kind) {
    case 'archway':
      pushLocal('leftPillar', -0.86, 1.1, 0, 0.12, 1.1, 0.16);
      pushLocal('rightPillar', 0.86, 1.1, 0, 0.12, 1.1, 0.16);
      break;
    case 'colonnade':
      pushLocal('colLeft', -1.55, 1.4, 0, 0.16, 1.4, 0.16);
      pushLocal('colMid', 0, 1.4, 0, 0.16, 1.4, 0.16);
      pushLocal('colRight', 1.55, 1.4, 0, 0.16, 1.4, 0.16);
      break;
    case 'dome':
      for (const [cx, cz] of [
        [-0.74, -0.74],
        [0.74, -0.74],
        [-0.74, 0.74],
        [0.74, 0.74],
      ]) {
        pushLocal(`col_${cx}_${cz}`, cx, 1.3, cz, 0.13, 1.3, 0.13);
      }
      break;
    case 'planter':
      pushLocal('pot', 0, 0.55, 0, 0.36, 0.55, 0.36);
      break;
    case 'obelisk':
      pushLocal('shaft', 0, 1.4, 0, 0.38, 1.4, 0.38);
      break;
    case 'ruinPillar':
      pushLocal('ruin', 0, 0.9, 0, 0.45, 0.9, 0.45);
      break;
    case 'sundial':
      pushLocal('sundial', 0, 0.45, 0, 0.46, 0.45, 0.46);
      break;
    case 'waterfall':
      pushLocal('basin', 0, 0.3, 0, 0.7, 0.3, 0.6);
      break;
    case 'tower':
      pushLocal('tower', 0, 1.5, 0, 0.85, 1.5, 0.85);
      break;
    case 'lanternPedestal':
      pushLocal('lantern', 0, 0.55, 0, 0.46, 0.55, 0.46);
      break;
  }

  return boxes;
}

/**
 * Runs a full automated Geometry, Collider & Reachability audit on a single level.
 */
export function auditLevel(level: LevelDef): LevelQaSummary {
  const findings: QaFinding[] = [];

  // 1. Collect prop & mechanism obstacle AABBs
  const staticObstacles: Aabb3D[] = [];
  for (const p of level.props) {
    staticObstacles.push(...getPropObstacleBoxes(p));
  }
  for (const m of level.mechanisms) {
    if (m.type === 'crystal' && m.crankPos) {
      const [cx, cy, cz] = m.crankPos;
      staticObstacles.push(
        makeBox(`crystal:${m.id}`, cx, cy - 0.15, cz, 0.36, 0.7, 0.36),
      );
    }
    if (m.type === 'rotary' && m.crankPos) {
      // Mounted at y = pivot.y - 1.25 on pillar side (+1.05, 0)
      const [cx, cy, cz] = [
        m.pivot[0] + 1.05,
        m.pivot[1] - 1.25,
        m.pivot[2],
      ];
      staticObstacles.push(makeBox(`crank:${m.id}`, cx, cy, cz, 0.2, 0.4, 0.4));
    }
  }

  // 2. Enumerate reachable puzzle states via BFS over mechanism states & camera angles
  const initMechs: Record<string, number> = {};
  for (const m of level.mechanisms) initMechs[m.id] = m.initialState;

  // Screen-space projection onto y=0 plane for orthographic camera angle 0..3
  const projectToScreenY0 = (
    x: number,
    y: number,
    z: number,
    cam: number,
  ): [number, number] => {
    const sx = cam === 0 || cam === 1 ? 1 : -1;
    const sz = cam === 0 || cam === 3 ? 1 : -1;
    return [x - y * sx, z - y * sz];
  };

  // Validate optical links for visual overlap or slab-skirt overhang
  const checkedScreenStates = new Set<string>();
  const anglesToCheckForOverlaps = Array.from(
    new Set([
      level.defaultCamAngle,
      ...level.perspectiveLinks.flatMap((pl) => pl.alignedAngles),
    ]),
  );

  for (const pl of level.perspectiveLinks) {
    const nodeA = level.tiles.find((t) => t.id === pl.nodeA);
    const nodeB = level.tiles.find((t) => t.id === pl.nodeB);
    if (!nodeA || !nodeB) continue;
    for (const ang of pl.alignedAngles) {
      const [ax, az] = projectToScreenY0(nodeA.x, nodeA.y, nodeA.z, ang);
      const [bx, bz] = projectToScreenY0(nodeB.x, nodeB.y, nodeB.z, ang);
      const stepX = bx - ax;
      const stepZ = bz - az;
      const isEdgeToEdge =
        (Math.abs(stepX) < 0.05 && Math.abs(Math.abs(stepZ) - 2) < 0.05) ||
        (Math.abs(stepZ) < 0.05 && Math.abs(Math.abs(stepX) - 2) < 0.05);
      if (!isEdgeToEdge) {
        findings.push({
          levelNumber: level.levelNumber,
          levelName: level.name,
          objectName: pl.id,
          worldPosition: pl.midPos,
          problemType: 'Misaligned Optical Seam',
          severity: 'critical',
          details: `Optical link ${pl.id} is not edge-to-edge (step ${stepX}, ${stepZ}) at angle ${ang}.`,
        });
      }
      const dy = nodeB.y - nodeA.y;
      const sx = ang === 0 || ang === 1 ? 1 : -1;
      const sz = ang === 0 || ang === 3 ? 1 : -1;
      const hasOverhang =
        dy > 0 ? stepX * sx < -0.1 || stepZ * sz < -0.1 : stepX * sx > 0.1 || stepZ * sz > 0.1;
      if (hasOverhang) {
        findings.push({
          levelNumber: level.levelNumber,
          levelName: level.name,
          objectName: pl.id,
          worldPosition: pl.midPos,
          problemType: 'Optical Seam Slab Overhang',
          severity: 'critical',
          details: `Optical link ${pl.id} at angle ${ang} has higher tile skirt hanging over lower tile.`,
        });
      }
    }
  }

  const encodeState = (
    nodeId: string,
    mechs: Record<string, number>,
    cam: number,
  ) => {
    const mStr = level.mechanisms
      .map((m) => {
        const raw = mechs[m.id] ?? m.initialState;
        return m.type === 'rotary' ? ((raw % 4) + 4) % 4 : raw % 2;
      })
      .join(',');
    return `${nodeId}|${cam}|${mStr}`;
  };

  interface SimState {
    nodeId: string;
    mechs: Record<string, number>;
    cam: number;
  }

  const queue: SimState[] = [
    {nodeId: level.startNodeId, mechs: initMechs, cam: level.defaultCamAngle},
  ];
  const visited = new Set<string>([
    encodeState(level.startNodeId, initMechs, level.defaultCamAngle),
  ]);
  const visitedNodes = new Set<string>([level.startNodeId]);
  const checkedMechKeySet = new Set<string>();
  const checkedEdgeSet = new Set<string>();

  let goalReachable = false;
  const relicsFound = new Set<string>();

  const applyMechToggle = (
    mechs: Record<string, number>,
    mechIds: string[],
    delta = 1,
  ): Record<string, number> => {
    const next = {...mechs};
    const q = [...mechIds];
    const seen = new Set<string>();
    while (q.length > 0) {
      const id = q.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const def = level.mechanisms.find((m) => m.id === id);
      if (!def) continue;
      if (def.type === 'rotary') {
        next[id] = (((next[id] ?? def.initialState) + delta) % 4 + 4) % 4;
      } else {
        next[id] = (next[id] ?? def.initialState) === 0 ? 1 : 0;
      }
      if (def.coupledIds) {
        for (const cid of def.coupledIds) {
          if (!seen.has(cid)) q.push(cid);
        }
      }
    }
    return next;
  };

  let head = 0;
  const MAX_STATES = 6000;
  while (head < queue.length && visited.size < MAX_STATES) {
    const cur = queue[head++];
    if (cur.nodeId === level.goalNodeId) goalReachable = true;
    for (const r of level.relics) {
      if (r.nodeId === cur.nodeId) relicsFound.add(r.id);
    }

    const evalNodes = evaluateLevelNodes(level, cur.mechs);
    const graph = buildWalkableGraph(level, evalNodes, cur.cam, true);

    // Geometry & collision checks for each unique mechanism configuration
    const mechKey = level.mechanisms
      .map((m) => {
        const raw = cur.mechs[m.id] ?? m.initialState;
        return m.type === 'rotary' ? ((raw % 4) + 4) % 4 : raw % 2;
      })
      .join(',');

    if (!checkedMechKeySet.has(mechKey)) {
      checkedMechKeySet.add(mechKey);
      const activeEntries = Array.from(evalNodes.values()).filter(
        (e) => e.active,
      );

      // A. Duplicate / overlapping active walkable tiles
      for (let i = 0; i < activeEntries.length; i++) {
        for (let j = i + 1; j < activeEntries.length; j++) {
          const a = activeEntries[i];
          const b = activeEntries[j];
          if (
            Math.abs(a.wx - b.wx) < 1.85 &&
            Math.abs(a.wy - b.wy) < 0.75 &&
            Math.abs(a.wz - b.wz) < 1.85
          ) {
            findings.push({
              levelNumber: level.levelNumber,
              levelName: level.name,
              objectName: `${a.node.id} vs ${b.node.id}`,
              worldPosition: [a.wx, a.wy, a.wz],
              problemType: 'Overlapping Walkable Tiles',
              severity: 'critical',
              details: `Active tiles ${a.node.id} and ${b.node.id} overlap in world space.`,
            });
          }
        }
      }

      // A2. Screen-space orthographic projection overlap across different elevations
      if (level.perspectiveLinks.length > 0) {
        for (const ang of anglesToCheckForOverlaps) {
          const sKey = `${mechKey}@${ang}`;
          if (checkedScreenStates.has(sKey)) continue;
          checkedScreenStates.add(sKey);
          for (let i = 0; i < activeEntries.length; i++) {
            for (let j = i + 1; j < activeEntries.length; j++) {
              const a = activeEntries[i];
              const b = activeEntries[j];
              if (Math.abs(a.wy - b.wy) < 1.0) continue;
              const [ax, az] = projectToScreenY0(a.wx, a.wy, a.wz, ang);
              const [bx, bz] = projectToScreenY0(b.wx, b.wy, b.wz, ang);
              if (Math.abs(ax - bx) < 0.25 && Math.abs(az - bz) < 0.25) {
                findings.push({
                  levelNumber: level.levelNumber,
                  levelName: level.name,
                  objectName: `${a.node.id} vs ${b.node.id} (cam ${ang})`,
                  worldPosition: [a.wx, a.wy, a.wz],
                  problemType: 'Screen-Space Optical Tile Overlap',
                  severity: 'critical',
                  details: `At camera angle ${ang}, ${a.node.id} (y=${a.wy}) visually overlaps ${b.node.id} (y=${b.wy}).`,
                });
              }
            }
          }
        }
      }

      // B. Supporting pillars intersecting lower walkable tiles
      for (const upper of activeEntries) {
        const ph = upper.node.pillarHeight ?? 0;
        if (ph <= 0) continue;
        const pillarBox = makeBox(
          `pillar:${upper.node.id}`,
          upper.wx,
          upper.wy - 0.85 - ph / 2,
          upper.wz,
          0.62,
          ph / 2 + 0.15,
          0.62,
        );
        for (const lower of activeEntries) {
          if (lower.node.id === upper.node.id) continue;
          const lowerClearance = makeBox(
            `tileClearance:${lower.node.id}`,
            lower.wx,
            lower.wy + 0.6,
            lower.wz,
            0.82,
            0.75,
            0.82,
          );
          if (boxesOverlap(pillarBox, lowerClearance)) {
            findings.push({
              levelNumber: level.levelNumber,
              levelName: level.name,
              objectName: `${upper.node.id} pillar -> ${lower.node.id}`,
              worldPosition: [lower.wx, lower.wy, lower.wz],
              problemType: 'Pillar Intersects Walkable Tile',
              severity: 'critical',
              details: `Supporting pillar under ${upper.node.id} passes through walkable tile ${lower.node.id}.`,
            });
          }
        }
      }

      // C. Prop / Crystal / Crank obstacles intersecting walkable tile centers
      for (const entry of activeEntries) {
        const playerCenterBox = makeBox(
          `playerCorridor:${entry.node.id}`,
          entry.wx,
          entry.wy + 0.72,
          entry.wz,
          0.36,
          0.68,
          0.36,
        );
        for (const obs of staticObstacles) {
          if (boxesOverlap(obs, playerCenterBox)) {
            findings.push({
              levelNumber: level.levelNumber,
              levelName: level.name,
              objectName: `${obs.label} -> ${entry.node.id}`,
              worldPosition: [entry.wx, entry.wy, entry.wz],
              problemType: 'Obstacle Blocks Walkable Tile',
              severity: 'critical',
              details: `Collider ${obs.label} intersects player corridor on walkable tile ${entry.node.id}.`,
            });
          }
        }
      }

      // D. Corridor transition checks between all connected cardinal neighbor tiles
      for (const [aId, neighbors] of graph.entries()) {
        const a = evalNodes.get(aId);
        if (!a) continue;
        for (const bId of neighbors) {
          if (aId >= bId) continue;
          const b = evalNodes.get(bId);
          if (!b) continue;
          const seam = computeOpticalSeamEdges(
            a.wx,
            a.wy,
            a.wz,
            b.wx,
            b.wy,
            b.wz,
            cur.cam,
          );
          if (seam.isOptical) continue; // Optical links teleport along camera view ray, no physical wall between
          const edgeKey = `${mechKey}:${aId}:${bId}`;
          if (checkedEdgeSet.has(edgeKey)) continue;
          checkedEdgeSet.add(edgeKey);

          const midX = (a.wx + b.wx) * 0.5;
          const midY = Math.max(a.wy, b.wy) + 0.72;
          const midZ = (a.wz + b.wz) * 0.5;
          const transitionBox = makeBox(
            `edge:${aId}->${bId}`,
            midX,
            midY,
            midZ,
            0.34,
            0.65,
            0.34,
          );
          for (const obs of staticObstacles) {
            if (boxesOverlap(obs, transitionBox)) {
              findings.push({
                levelNumber: level.levelNumber,
                levelName: level.name,
                objectName: `${obs.label} blocks ${aId} <-> ${bId}`,
                worldPosition: [midX, midY, midZ],
                problemType: 'Obstacle Blocks Pathway Edge',
                severity: 'critical',
                details: `Obstacle ${obs.label} obstructs movement between ${aId} and ${bId}.`,
              });
            }
          }
        }
      }
    }

    // BFS transitions:
    // 1) Walk to adjacent nodes (and press pressure plates upon arrival)
    for (const nxtId of graph.get(cur.nodeId) ?? []) {
      visitedNodes.add(nxtId);
      const nxtNode = level.tiles.find((t) => t.id === nxtId);
      let nextMechs = cur.mechs;
      if (nxtNode?.kind === 'plate' && nxtNode.plateTriggers?.length) {
        // Plate activation in state exploration
        nextMechs = applyMechToggle(cur.mechs, nxtNode.plateTriggers, 1);
      }
      const key = encodeState(nxtId, nextMechs, cur.cam);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({nodeId: nxtId, mechs: nextMechs, cam: cur.cam});
      }
      // Also allow staying without re-toggling if plate wasn't toggled or toggleable
      if (nxtNode?.kind === 'plate' && nxtNode.plateToggle) {
        const keyUntoggled = encodeState(nxtId, cur.mechs, cur.cam);
        if (!visited.has(keyUntoggled)) {
          visited.add(keyUntoggled);
          queue.push({nodeId: nxtId, mechs: cur.mechs, cam: cur.cam});
        }
      }
    }

    // 2) Activate nearby directly interactable mechanisms (rotary, crystal, elevator)
    const currW = evalNodes.get(cur.nodeId);
    if (currW) {
      for (const m of level.mechanisms) {
        if (!m.directInteract) continue;
        const standingOnGroup = currW.node.groupId === m.id;
        const anchor = m.crankPos ?? m.pivot;
        const maxRange = m.type === 'rotary' ? 4.4 : 2.9;
        const dist = Math.hypot(
          currW.wx - anchor[0],
          (currW.wy - anchor[1]) * 1.4,
          currW.wz - anchor[2],
        );
        if (standingOnGroup || dist < maxRange) {
          const nextMechs = applyMechToggle(cur.mechs, [m.id], 1);
          const key = encodeState(cur.nodeId, nextMechs, cur.cam);
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({nodeId: cur.nodeId, mechs: nextMechs, cam: cur.cam});
          }
        }
      }
    }

    // 3) Rotate camera to any of the 4 isometric angles
    for (let nextCam = 0; nextCam < 4; nextCam++) {
      if (nextCam === cur.cam) continue;
      const key = encodeState(cur.nodeId, cur.mechs, nextCam);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({nodeId: cur.nodeId, mechs: cur.mechs, cam: nextCam});
      }
    }
  }

  if (!goalReachable) {
    findings.push({
      levelNumber: level.levelNumber,
      levelName: level.name,
      objectName: level.goalNodeId,
      worldPosition: level.center,
      problemType: 'Unreachable Goal',
      severity: 'critical',
      details: `Goal tile ${level.goalNodeId} is not reachable from start ${level.startNodeId}.`,
    });
  }

  for (const r of level.relics) {
    if (!relicsFound.has(r.id)) {
      findings.push({
        levelNumber: level.levelNumber,
        levelName: level.name,
        objectName: r.id,
        worldPosition: level.center,
        problemType: 'Unreachable Relic',
        severity: 'warning',
        details: `Star Relic ${r.label} (${r.nodeId}) is not reachable from start.`,
      });
    }
  }

  const hasGeomFail = findings.some(
    (f) =>
      f.problemType === 'Overlapping Walkable Tiles' ||
      f.problemType === 'Pillar Intersects Walkable Tile' ||
      f.problemType === 'Screen-Space Optical Tile Overlap' ||
      f.problemType === 'Misaligned Optical Seam' ||
      f.problemType === 'Optical Seam Slab Overhang',
  );
  const hasCollisionFail = findings.some(
    (f) =>
      f.problemType === 'Obstacle Blocks Walkable Tile' ||
      f.problemType === 'Obstacle Blocks Pathway Edge',
  );
  const hasNavFail = !goalReachable || relicsFound.size < level.relics.length;

  const passed = !hasGeomFail && !hasCollisionFail && !hasNavFail;

  return {
    levelNumber: level.levelNumber,
    levelName: level.name,
    geometry: hasGeomFail ? 'Fail' : 'Pass',
    collision: hasCollisionFail ? 'Fail' : 'Pass',
    navigation: hasNavFail ? 'Fail' : 'Pass',
    playerMovement: passed ? 'Pass' : 'Fail',
    status: passed ? 'Pass' : 'Fail',
    goalReachable,
    relicsReachable: relicsFound.size,
    relicsTotal: level.relics.length,
    exploredStates: visited.size,
    findings,
  };
}

/** Audits all 10 levels and returns a structured QA report. */
export function runFullQaAudit(): FullQaReport {
  const levels = LEVELS.map((lvl) => auditLevel(lvl));
  const totalFindings = levels.reduce((sum, l) => sum + l.findings.length, 0);
  const allPassed = levels.every((l) => l.status === 'Pass');
  return {allPassed, levels, totalFindings};
}
