import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeOpticalSeamEdges,
  evaluateLevelNodes,
  findNextHintTarget,
  LEVELS,
  resolveMechanismTrigger,
} from '../levels';
import {runFullQaAudit} from './geometryValidator';

test('all 10 levels pass full geometry, collision, and navigation QA audit', () => {
  const report = runFullQaAudit();
  assert.equal(report.levels.length, 10);
  assert.equal(
    report.allPassed,
    true,
    `QA audit failed: ${JSON.stringify(report.levels.filter((l) => l.status !== 'Pass'))}`,
  );
  assert.equal(report.totalFindings, 0);
});

test('no level defines mountain or cloud architectural props', () => {
  for (const level of LEVELS) {
    for (const prop of level.props) {
      assert.doesNotMatch(
        String(prop.kind),
        /mountain|cloud|islet/i,
        `Unexpected prop kind ${prop.kind} on level ${level.levelNumber}`,
      );
    }
  }
});

test('PastelEnvironment excludes mountain/islet and cloud 3D groups across all levels', () => {
  const visualsPath = path.resolve(process.cwd(), 'components/WorldVisuals.tsx');
  const source = fs.readFileSync(visualsPath, 'utf8');
  const envIdx = source.indexOf('export function PastelEnvironment');
  assert.ok(envIdx >= 0, 'PastelEnvironment export not found');
  const envBlock = source.slice(envIdx);

  assert.doesNotMatch(envBlock, /isletsRef/i, 'isletsRef should be removed');
  assert.doesNotMatch(envBlock, /cloudsRef/i, 'cloudsRef should be removed');
  assert.doesNotMatch(
    envBlock,
    /sphereGeometry|coneGeometry|cylinderGeometry|boxGeometry/,
    'PastelEnvironment should not render cloud spheres or mountain/islet cones',
  );
  assert.match(
    envBlock,
    /circleGeometry/,
    'PastelEnvironment should preserve the reflecting water plane',
  );
});

test('Level 10 first optical path connects edge-to-edge without upper-tile overlap or overhang', () => {
  const level10 = LEVELS.find((l) => l.levelNumber === 10);
  assert.ok(level10, 'Level 10 not found');

  const plink1 = level10.perspectiveLinks.find((p) => p.id === 'l10_plink_1');
  assert.ok(plink1, 'l10_plink_1 not found');
  assert.deepEqual(plink1.alignedAngles, [1]);

  const allActiveMechs: Record<string, number> = {
    l10_gate_entry: 1,
    l10_rot_main: 2,
    l10_crys_west: 1,
    l10_gate_relic1: 1,
    l10_gate_east: 1,
    l10_gate_stairs: 1,
    l10_elev: 1,
    l10_gate_upper: 1,
  };
  const nodesMap = evaluateLevelNodes(level10, allActiveMechs);
  const nodeA = nodesMap.get(plink1.nodeA);
  const nodeB = nodesMap.get(plink1.nodeB);
  assert.ok(nodeA && nodeB && nodeA.active && nodeB.active);

  // 1) Seam edges must project to the exact same screen coordinates at Angle 1 (sx=+1, sz=-1)
  const seam = computeOpticalSeamEdges(
    nodeA.wx,
    nodeA.wy,
    nodeA.wz,
    nodeB.wx,
    nodeB.wy,
    nodeB.wz,
    1,
  );
  assert.equal(seam.isOptical, true);
  const projA = [seam.edgeA[0] - seam.edgeA[1], seam.edgeA[2] + seam.edgeA[1]];
  const projB = [seam.edgeB[0] - seam.edgeB[1], seam.edgeB[2] + seam.edgeB[1]];
  assert.ok(Math.abs(projA[0] - projB[0]) < 1e-6);
  assert.ok(Math.abs(projA[1] - projB[1]) < 1e-6);

  // 2) No higher tile may sit directly overhead of nodeA or overhang nodeA's top face at Angle 1
  const projBounds = (
    x: number,
    y: number,
    z: number,
    yMin: number,
    yMax: number,
  ) => {
    let minPx = Infinity;
    let maxPx = -Infinity;
    let minPz = Infinity;
    let maxPz = -Infinity;
    for (const xx of [x - 0.99, x + 0.99]) {
      for (const yy of [y + yMin, y + yMax]) {
        for (const zz of [z - 0.99, z + 0.99]) {
          const px = xx - yy;
          const pz = zz + yy;
          minPx = Math.min(minPx, px);
          maxPx = Math.max(maxPx, px);
          minPz = Math.min(minPz, pz);
          maxPz = Math.max(maxPz, pz);
        }
      }
    }
    return {minPx, maxPx, minPz, maxPz};
  };

  const loBox = projBounds(nodeA.wx, nodeA.wy, nodeA.wz, 0, 0);
  for (const entry of nodesMap.values()) {
    if (!entry.active || entry.wy <= nodeA.wy + 0.5) continue;
    // No 3D overhead collision within Pip's height
    if (
      Math.abs(entry.wx - nodeA.wx) < 1.8 &&
      Math.abs(entry.wz - nodeA.wz) < 1.8
    ) {
      assert.ok(
        entry.wy - nodeA.wy > 2.4,
        `Upper tile ${entry.node.id} sits directly over ${nodeA.node.id}`,
      );
    }
    // No screen-space slab skirt overhang onto nodeA at Angle 1
    const hiBox = projBounds(entry.wx, entry.wy, entry.wz, -0.68, 0);
    const ox = Math.min(hiBox.maxPx, loBox.maxPx) - Math.max(hiBox.minPx, loBox.minPx);
    const oz = Math.min(hiBox.maxPz, loBox.maxPz) - Math.max(hiBox.minPz, loBox.minPz);
    assert.ok(
      !(ox > 0.05 && oz > 0.05),
      `Upper tile ${entry.node.id} overhangs ${nodeA.node.id} at Angle 1 by (${ox.toFixed(2)}, ${oz.toFixed(2)})`,
    );
  }
});

test('no crystal or elevator across all 10 levels can retract a summoned platform while Pip occupies it', () => {
  let checkedMechanisms = 0;
  let checkedTiles = 0;

  for (const level of LEVELS) {
    const baseStates: Record<string, number> = {};
    for (const m of level.mechanisms) {
      baseStates[m.id] = m.initialState;
    }

    for (const mech of level.mechanisms) {
      if (!mech.directInteract) continue;

      // Raise mechanism once (activates any coupled gates)
      const raised = resolveMechanismTrigger(level, baseStates, [mech.id], 1, [
        level.startNodeId,
      ]);
      assert.equal(raised.allowed, true);

      // Find any tiles that became active because of raising this mechanism
      const beforeNodes = evaluateLevelNodes(level, baseStates);
      const raisedNodes = evaluateLevelNodes(level, raised.nextStates);
      const summonedTiles = Array.from(raisedNodes.values()).filter(
        (n) => n.active && !beforeNodes.get(n.node.id)?.active,
      );
      if (summonedTiles.length === 0) continue;

      checkedMechanisms++;
      for (const tile of summonedTiles) {
        checkedTiles++;

        // 1) Standing on the summoned platform -> toggling off MUST be blocked
        const blockedStanding = resolveMechanismTrigger(
          level,
          raised.nextStates,
          [mech.id],
          1,
          [tile.node.id],
        );
        assert.equal(
          blockedStanding.allowed,
          false,
          `Level ${level.levelNumber} ${mech.id} retracted ${tile.node.id} while standing on it`,
        );
        assert.equal(blockedStanding.blockedNodeId, tile.node.id);
        assert.equal(
          evaluateLevelNodes(level, blockedStanding.nextStates).get(tile.node.id)
            ?.active,
          true,
        );

        // 2) Walking onto the summoned platform -> toggling off MUST also be blocked
        const blockedMidStep = resolveMechanismTrigger(
          level,
          raised.nextStates,
          [mech.id],
          1,
          [level.startNodeId, tile.node.id],
        );
        assert.equal(
          blockedMidStep.allowed,
          false,
          `Level ${level.levelNumber} ${mech.id} retracted ${tile.node.id} mid-step`,
        );

        // 3) Once Pip steps off onto a safe tile -> toggling works normally
        const allowedOff = resolveMechanismTrigger(
          level,
          raised.nextStates,
          [mech.id],
          1,
          [level.startNodeId],
        );
        assert.equal(allowedOff.allowed, true);
      }
    }
  }

  // Must cover Level 5 (l5_crys_b), Level 8 (l8_crys_mid), Level 10 (l10_crys_west & l10_elev)
  assert.ok(checkedMechanisms >= 4, `Expected >=4 mechanisms, got ${checkedMechanisms}`);
  assert.ok(checkedTiles >= 11, `Expected >=11 summoned tiles, got ${checkedTiles}`);
});

test('every stair across all 10 levels connects flush to its bottom and top landings without vertical gaps', () => {
  let stairCount = 0;

  for (const level of LEVELS) {
    const allGatesOpen: Record<string, number> = {};
    for (const m of level.mechanisms) {
      allGatesOpen[m.id] = m.type === 'gate' ? 1 : m.initialState;
    }
    const nodes = evaluateLevelNodes(level, allGatesOpen);
    const entries = Array.from(nodes.values()).filter((n) => n.active);

    for (const stair of entries) {
      if (stair.node.kind !== 'stair') continue;
      stairCount++;
      const f = stair.node.facingY ?? 0;
      const topDirX = -Math.sin(f);
      const topDirZ = -Math.cos(f);

      let foundTop = false;
      let foundBottom = false;

      for (const nbr of entries) {
        if (nbr.node.id === stair.node.id) continue;
        const dx = nbr.wx - stair.wx;
        const dz = nbr.wz - stair.wz;
        const isCardinal =
          (Math.abs(dx) < 0.1 && Math.abs(Math.abs(dz) - 2) < 0.1) ||
          (Math.abs(dz) < 0.1 && Math.abs(Math.abs(dx) - 2) < 0.1);
        if (!isCardinal) continue;

        const dotTop = (dx * topDirX + dz * topDirZ) / 2;
        if (dotTop > 0.5) {
          foundTop = true;
          const expectedTopY =
            nbr.node.kind === 'stair' ? stair.wy + 1 : stair.wy;
          assert.ok(
            Math.abs(nbr.wy - expectedTopY) < 0.05,
            `Level ${level.levelNumber} stair ${stair.node.id} (y=${stair.wy}) has top gap to ${nbr.node.id} (y=${nbr.wy}, expected ${expectedTopY})`,
          );
        } else if (dotTop < -0.5) {
          foundBottom = true;
          const expectedBottomY = stair.wy - 1;
          assert.ok(
            Math.abs(nbr.wy - expectedBottomY) < 0.05,
            `Level ${level.levelNumber} stair ${stair.node.id} (y=${stair.wy}) has bottom gap to ${nbr.node.id} (y=${nbr.wy}, expected ${expectedBottomY})`,
          );
        }
      }

      assert.equal(
        foundTop,
        true,
        `Level ${level.levelNumber} stair ${stair.node.id} missing top landing`,
      );
      assert.equal(
        foundBottom,
        true,
        `Level ${level.levelNumber} stair ${stair.node.id} missing bottom landing`,
      );
    }
  }

  assert.ok(stairCount >= 9, `Expected >=9 stairs audited, got ${stairCount}`);
});

test('idle guidance solver resolves a valid next functional target across all 10 levels', () => {
  for (const level of LEVELS) {
    const initStates: Record<string, number> = {};
    for (const m of level.mechanisms) {
      initStates[m.id] = m.initialState;
    }

    const hint = findNextHintTarget(
      level,
      level.startNodeId,
      initStates,
      level.defaultCamAngle,
    );
    assert.ok(hint, `Level ${level.levelNumber} did not produce a next hint target`);
    assert.equal(hint.position.length, 3);
    assert.ok(hint.label.length > 0);
    assert.ok(
      Number.isFinite(hint.position[0]) &&
        Number.isFinite(hint.position[1]) &&
        Number.isFinite(hint.position[2]),
      `Invalid particle coordinates on Level ${level.levelNumber}`,
    );
  }

  // Also verify Level 1 recommends Awakening Plate initially, then Sanctuary Beacon once triggered
  const lvl1 = LEVELS[0];
  const lvl1Hint0 = findNextHintTarget(lvl1, lvl1.startNodeId, {l1_gate_bridge: 0, l1_gate_relic: 0}, lvl1.defaultCamAngle, []);
  assert.equal(lvl1Hint0?.kind, 'plate');
  const lvl1Hint1 = findNextHintTarget(lvl1, 'l1_plate', {l1_gate_bridge: 1, l1_gate_relic: 1}, lvl1.defaultCamAngle, ['l1_plate']);
  assert.equal(lvl1Hint1?.kind, 'goal');
});
