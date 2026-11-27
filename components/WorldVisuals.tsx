import {useFrame} from '@react-three/fiber';
import {CuboidCollider, RigidBody} from '@react-three/rapier';
import React, {forwardRef, useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {THEME} from '../constants';
import {ArchPropDef, LevelPalette, TileKind} from '../types';

// =========================================================================
// PROCEDURAL CANVAS TEXTURES (NO EXTERNAL IMAGES)
// =========================================================================

export function useStoneTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f5eee3';
      ctx.fillRect(0, 0, size, size);

      // Subtle mineral & terrazzo flecks
      for (let i = 0; i < 420; i++) {
        const x = (i * 73) % size;
        const y = (i * 137) % size;
        const r = 1 + (i % 3);
        ctx.fillStyle =
          i % 3 === 0
            ? 'rgba(164, 152, 204, 0.13)'
            : i % 3 === 1
              ? 'rgba(224, 145, 122, 0.14)'
              : 'rgba(126, 189, 182, 0.13)';
        ctx.fillRect(x, y, r, r);
      }

      // Carved inner architectural border & delicate corner motifs
      ctx.strokeStyle = 'rgba(160, 145, 138, 0.35)';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, size - 8, size - 8);

      ctx.strokeStyle = 'rgba(242, 211, 136, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(18, 18, size - 36, size - 36);

      // Subtle compass diamond in tile center
      ctx.beginPath();
      ctx.moveTo(size / 2, 40);
      ctx.lineTo(size - 40, size / 2);
      ctx.lineTo(size / 2, size - 40);
      ctx.lineTo(40, size / 2);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(118, 106, 160, 0.14)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

export function useSkyGradientTexture(
  skyTop = THEME.skyTop,
  skyMid = THEME.skyMid,
  skyBottom = THEME.skyBottom,
) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, skyTop);
      grad.addColorStop(0.5, skyMid);
      grad.addColorStop(1, skyBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 256);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [skyTop, skyMid, skyBottom]);
}

// =========================================================================
// TRAVELER CHARACTER: PIP (Authored facing -Z, feet at Y = 0)
// =========================================================================

export interface TravelerProps {
  walking: boolean;
  celebrating?: boolean;
  interacting?: boolean;
  idleEmote?: boolean;
  tunicColor?: string;
  scarfColor?: string;
  capColor?: string;
  enablePointLight?: boolean;
}

export const TravelerPip = forwardRef<THREE.Group, TravelerProps>(
  function TravelerPip(
    {
      walking,
      celebrating = false,
      interacting = false,
      idleEmote = false,
      tunicColor = THEME.turquoise,
      scarfColor = THEME.dustyRose,
      capColor = THEME.lavenderArch,
      enablePointLight = true,
    },
    ref,
  ) {
    const bodyGroup = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Group>(null);
    const leftLeg = useRef<THREE.Group>(null);
    const rightLeg = useRef<THREE.Group>(null);
    const leftArm = useRef<THREE.Group>(null);
    const rightArm = useRef<THREE.Group>(null);
    const scarfRef = useRef<THREE.Mesh>(null);
    const lanternRef = useRef<THREE.Group>(null);
    const lanternMatRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame(({clock}, delta) => {
      const t = clock.getElapsedTime();
      const lerpAlpha = Math.min(1, delta * 8.5);
      const strideSpeed = walking ? 11.5 : 2.1;
      const strideAmp = walking ? 0.52 : 0.02;
      const emoting = idleEmote && !walking && !celebrating && !interacting;

      if (leftLeg.current && rightLeg.current) {
        const legTargetL = emoting
          ? Math.sin(t * 1.4) * 0.06
          : Math.sin(t * strideSpeed) * strideAmp;
        const legTargetR = emoting
          ? -Math.sin(t * 1.4) * 0.06
          : -Math.sin(t * strideSpeed) * strideAmp;
        leftLeg.current.rotation.x = THREE.MathUtils.lerp(
          leftLeg.current.rotation.x,
          legTargetL,
          lerpAlpha,
        );
        rightLeg.current.rotation.x = THREE.MathUtils.lerp(
          rightLeg.current.rotation.x,
          legTargetR,
          lerpAlpha,
        );
      }

      if (leftArm.current && rightArm.current) {
        if (interacting) {
          rightArm.current.rotation.x = -1.1;
          rightArm.current.rotation.z = 0;
          leftArm.current.rotation.x = 0.25;
          leftArm.current.rotation.z = 0;
        } else if (emoting) {
          // Raise lantern arm gently and sway while scouting next mechanism
          rightArm.current.rotation.x = THREE.MathUtils.lerp(
            rightArm.current.rotation.x,
            -0.98 + Math.sin(t * 2.4) * 0.22,
            lerpAlpha,
          );
          rightArm.current.rotation.z = THREE.MathUtils.lerp(
            rightArm.current.rotation.z,
            -0.22 + Math.cos(t * 1.8) * 0.1,
            lerpAlpha,
          );
          leftArm.current.rotation.x = THREE.MathUtils.lerp(
            leftArm.current.rotation.x,
            0.22 + Math.sin(t * 2.4) * 0.16,
            lerpAlpha,
          );
          leftArm.current.rotation.z = THREE.MathUtils.lerp(
            leftArm.current.rotation.z,
            0.16,
            lerpAlpha,
          );
        } else {
          leftArm.current.rotation.x = THREE.MathUtils.lerp(
            leftArm.current.rotation.x,
            -Math.sin(t * strideSpeed) * (strideAmp * 0.7),
            lerpAlpha,
          );
          leftArm.current.rotation.z = THREE.MathUtils.lerp(
            leftArm.current.rotation.z,
            0,
            lerpAlpha,
          );
          rightArm.current.rotation.x = THREE.MathUtils.lerp(
            rightArm.current.rotation.x,
            Math.sin(t * strideSpeed) * (strideAmp * 0.5) - 0.15,
            lerpAlpha,
          );
          rightArm.current.rotation.z = THREE.MathUtils.lerp(
            rightArm.current.rotation.z,
            0,
            lerpAlpha,
          );
        }
      }

      if (headRef.current) {
        const targetHeadY = emoting ? Math.sin(t * 1.35) * 0.48 : 0;
        const targetHeadZ = emoting ? Math.sin(t * 0.9) * 0.12 : 0;
        const targetHeadX = emoting ? -0.07 + Math.sin(t * 2.2) * 0.07 : 0;
        headRef.current.rotation.y = THREE.MathUtils.lerp(
          headRef.current.rotation.y,
          targetHeadY,
          lerpAlpha,
        );
        headRef.current.rotation.z = THREE.MathUtils.lerp(
          headRef.current.rotation.z,
          targetHeadZ,
          lerpAlpha,
        );
        headRef.current.rotation.x = THREE.MathUtils.lerp(
          headRef.current.rotation.x,
          targetHeadX,
          lerpAlpha,
        );
      }

      if (bodyGroup.current) {
        const bob = celebrating
          ? Math.abs(Math.sin(t * 6)) * 0.26
          : walking
            ? Math.abs(Math.sin(t * strideSpeed)) * 0.085
            : emoting
              ? Math.abs(Math.sin(t * 2.6)) * 0.065
              : Math.sin(t * 2.2) * 0.028;
        bodyGroup.current.position.y = THREE.MathUtils.lerp(
          bodyGroup.current.position.y,
          bob,
          lerpAlpha,
        );
        const tiltZ = walking
          ? Math.sin(t * strideSpeed) * 0.04
          : emoting
            ? Math.sin(t * 1.35) * 0.065
            : 0;
        bodyGroup.current.rotation.z = THREE.MathUtils.lerp(
          bodyGroup.current.rotation.z,
          tiltZ,
          lerpAlpha,
        );
      }

      if (scarfRef.current) {
        scarfRef.current.rotation.x =
          0.28 +
          (walking ? 0.42 : emoting ? 0.22 : 0.1) +
          Math.sin(t * (emoting ? 6.2 : 5.2)) * (emoting ? 0.16 : 0.11);
      }

      if (lanternRef.current) {
        const targetLanternY = emoting
          ? 1.24 + Math.sin(t * 2.6) * 0.13
          : 0.96 + Math.sin(t * 3.1) * 0.075;
        const targetLanternZ = emoting
          ? -0.28 + Math.sin(t * 1.8) * 0.07
          : -0.18;
        lanternRef.current.position.y = THREE.MathUtils.lerp(
          lanternRef.current.position.y,
          targetLanternY,
          lerpAlpha,
        );
        lanternRef.current.position.z = THREE.MathUtils.lerp(
          lanternRef.current.position.z,
          targetLanternZ,
          lerpAlpha,
        );
        lanternRef.current.rotation.y = t * (emoting ? 2.1 : 0.95);
      }

      if (lanternMatRef.current) {
        lanternMatRef.current.emissiveIntensity = emoting
          ? 2.2 + Math.sin(t * 4.5) * 0.45
          : 1.65;
      }
    });

    return (
      <group ref={ref} scale={[1.08, 1.08, 1.08]}>
        <group ref={bodyGroup}>
          {/* Left & Right articulated legs + traveler boots resting strictly at Y = 0 */}
          <group ref={leftLeg} position={[-0.1, 0.44, 0]}>
            <mesh position={[0, -0.18, 0]} castShadow>
              <cylinderGeometry args={[0.046, 0.042, 0.36, 8]} />
              <meshStandardMaterial color={THEME.deepIndigo} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.39, -0.04]} castShadow>
              <boxGeometry args={[0.095, 0.1, 0.16]} />
              <meshStandardMaterial color="#433c63" roughness={0.75} />
            </mesh>
          </group>

          <group ref={rightLeg} position={[0.1, 0.44, 0]}>
            <mesh position={[0, -0.18, 0]} castShadow>
              <cylinderGeometry args={[0.046, 0.042, 0.36, 8]} />
              <meshStandardMaterial color={THEME.deepIndigo} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.39, -0.04]} castShadow>
              <boxGeometry args={[0.095, 0.1, 0.16]} />
              <meshStandardMaterial color="#433c63" roughness={0.75} />
            </mesh>
          </group>

          {/* Layered pleated woven tunic + golden trim band */}
          <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.35, 0.72, 16]} />
            <meshStandardMaterial color={tunicColor} roughness={0.72} />
          </mesh>
          <mesh position={[0, 0.37, 0]} castShadow>
            <cylinderGeometry args={[0.34, 0.355, 0.06, 16]} />
            <meshStandardMaterial color={THEME.beaconGold} roughness={0.45} />
          </mesh>

          {/* Warm ivory capelet collar */}
          <mesh position={[0, 1.0, 0]} castShadow>
            <torusGeometry args={[0.19, 0.05, 8, 16]} />
            <meshStandardMaterial color={THEME.stoneCream} roughness={0.68} />
          </mesh>

          {/* Articulated Sleeves / Arms */}
          <group ref={leftArm} position={[-0.23, 0.94, 0]}>
            <mesh position={[0, -0.16, 0]} rotation={[0, 0, 0.18]} castShadow>
              <capsuleGeometry args={[0.05, 0.24, 6, 8]} />
              <meshStandardMaterial color={tunicColor} roughness={0.75} />
            </mesh>
          </group>
          <group ref={rightArm} position={[0.23, 0.94, 0]}>
            <mesh position={[0, -0.16, 0]} rotation={[0, 0, -0.18]} castShadow>
              <capsuleGeometry args={[0.05, 0.24, 6, 8]} />
              <meshStandardMaterial color={tunicColor} roughness={0.75} />
            </mesh>
          </group>

          {/* Coral & brass cartographer satchel on back (+Z) */}
          <mesh position={[0, 0.74, 0.23]} rotation={[0.18, 0, 0]} castShadow>
            <boxGeometry args={[0.26, 0.23, 0.15]} />
            <meshStandardMaterial color={THEME.mutedCoral} roughness={0.65} />
          </mesh>
          <mesh position={[0, 0.78, 0.31]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.08, 0.06, 0.03]} />
            <meshStandardMaterial color={THEME.beaconGold} roughness={0.35} />
          </mesh>

          {/* Head + Hood pivoted naturally around the neck [0, 1.06, 0] */}
          <group ref={headRef} position={[0, 1.06, 0]}>
            <mesh position={[0, 0.18, 0]} castShadow>
              <sphereGeometry args={[0.195, 16, 16]} />
              <meshStandardMaterial color="#fff8f0" roughness={0.55} />
            </mesh>
            {/* Dark indigo starry visor facing -Z */}
            <mesh position={[0, 0.18, -0.145]}>
              <sphereGeometry args={[0.115, 12, 12]} />
              <meshStandardMaterial color={THEME.deepIndigo} roughness={0.35} />
            </mesh>
            {/* Luminous eyes facing -Z */}
            <mesh position={[-0.045, 0.19, -0.238]}>
              <sphereGeometry args={[0.023, 8, 8]} />
              <meshBasicMaterial color="#ffe9ad" />
            </mesh>
            <mesh position={[0.045, 0.19, -0.238]}>
              <sphereGeometry args={[0.023, 8, 8]} />
              <meshBasicMaterial color="#ffe9ad" />
            </mesh>

            {/* Pointed celestial hood + golden circlet */}
            <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2 - 0.15, 0, 0]}>
              <torusGeometry args={[0.185, 0.022, 8, 20]} />
              <meshStandardMaterial color={THEME.beaconGold} roughness={0.35} metalness={0.3} />
            </mesh>
            <mesh position={[0, 0.44, 0.03]} rotation={[-0.22, 0, 0]} castShadow>
              <coneGeometry args={[0.215, 0.45, 14]} />
              <meshStandardMaterial color={capColor} roughness={0.68} />
            </mesh>
          </group>

          {/* Flowing trailing scarf toward +Z */}
          <mesh
            ref={scarfRef}
            position={[0, 1.04, 0.2]}
            rotation={[0.35, 0, 0]}
            castShadow>
            <boxGeometry args={[0.16, 0.04, 0.54]} />
            <meshStandardMaterial color={scarfColor} roughness={0.68} />
          </mesh>

          {/* Sculpted floating amber lantern orb in brass ring */}
          <group ref={lanternRef} position={[0.4, 0.96, -0.18]}>
            <mesh>
              <octahedronGeometry args={[0.105, 0]} />
              <meshStandardMaterial
                ref={lanternMatRef}
                color={THEME.lanternAmber}
                emissive={THEME.lanternAmber}
                emissiveIntensity={1.65}
                roughness={0.2}
              />
            </mesh>
            <mesh rotation={[Math.PI / 4, 0, 0]}>
              <torusGeometry args={[0.15, 0.015, 6, 16]} />
              <meshStandardMaterial color={THEME.beaconGold} roughness={0.3} metalness={0.4} />
            </mesh>
            {enablePointLight && (
              <pointLight
                color={THEME.lanternAmber}
                intensity={9.5}
                distance={6.5}
                decay={1.4}
                castShadow={false}
              />
            )}
          </group>
        </group>
      </group>
    );
  },
);

// =========================================================================
// SCULPTED ARCHITECTURAL TILE BLOCK
// =========================================================================

const TILE_COLOR_MAP: Record<TileKind, string> = {
  stone: THEME.stoneCream,
  mint: THEME.sageGreen,
  lavender: THEME.lavenderArch,
  stair: THEME.stoneCream,
  plate: THEME.turquoise,
  rotary: THEME.lavenderArch,
  elevator: THEME.mutedCoral,
  hidden: THEME.dustyRose,
  goal: THEME.beaconGold,
};

export interface TileMeshProps {
  id: string;
  position: [number, number, number];
  kind: TileKind;
  facingY?: number;
  pillarHeight?: number;
  isHiddenTile?: boolean;
  isGateActive?: boolean;
  isPressed?: boolean;
  isTargetHighlight?: boolean;
  isHovered?: boolean;
  isReachable?: boolean;
  isBlockedPulse?: boolean;
  stoneTexture: THREE.Texture;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  key?: React.Key;
}

export function TileBlock({
  id,
  position,
  kind,
  facingY = 0,
  pillarHeight = 0,
  isHiddenTile = false,
  isGateActive = true,
  isPressed = false,
  isTargetHighlight = false,
  isHovered = false,
  isReachable = true,
  isBlockedPulse = false,
  stoneTexture,
  onSelect,
  onHover,
}: TileMeshProps) {
  const baseColor = TILE_COLOR_MAP[kind] ?? THEME.stoneCream;
  const animGroupRef = useRef<THREE.Group>(null);
  const currentRiseOffset = useRef(isHiddenTile && !isGateActive ? -2.6 : 0);

  useFrame((_, delta) => {
    if (!animGroupRef.current) return;
    const targetY = isHiddenTile && !isGateActive ? -2.6 : 0;
    currentRiseOffset.current = THREE.MathUtils.lerp(
      currentRiseOffset.current,
      targetY,
      Math.min(1, delta * 6.5),
    );
    animGroupRef.current.position.y = currentRiseOffset.current;
  });

  const tileActive = !isHiddenTile || isGateActive;

  return (
    <group position={position}>
      {/* Faint etched outline when hidden bridge is retracted */}
      {isHiddenTile && !isGateActive && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.85, 4]} />
          <meshBasicMaterial
            color={THEME.dustyRose}
            transparent
            opacity={0.42}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <group ref={animGroupRef}>
        {tileActive && kind !== 'stair' && (
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[0.98, 0.3, 0.98]} position={[0, -0.3, 0]} />
          </RigidBody>
        )}
        {tileActive && kind === 'stair' && (
          <RigidBody type="fixed" colliders={false} rotation={[0, facingY, 0]}>
            {[0, 1, 2, 3].map((stepIdx) => {
              const stepTop = -0.75 + stepIdx * 0.25;
              const stepHeight = stepTop + 0.85;
              const stepZ = 0.75 - stepIdx * 0.5;
              return (
                <CuboidCollider
                  key={stepIdx}
                  args={[0.96, stepHeight / 2, 0.25]}
                  position={[0, stepTop - stepHeight / 2, stepZ]}
                />
              );
            })}
          </RigidBody>
        )}

        {kind !== 'stair' ? (
          <group>
            {/* Top carved architectural cap slab (top surface strictly at Y = 0) */}
            <mesh
              position={[0, -0.1, 0]}
              castShadow
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                if (tileActive) onSelect(id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                if (tileActive) {
                  onHover(id);
                  document.body.style.cursor = 'pointer';
                }
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                onHover(null);
                document.body.style.cursor = 'default';
              }}>
              <boxGeometry args={[1.995, 0.2, 1.995]} />
              <meshStandardMaterial
                map={stoneTexture}
                color={baseColor}
                roughness={0.74}
                metalness={0.04}
                transparent={!tileActive}
                opacity={tileActive ? 1 : 0.38}
              />
            </mesh>

            {/* Recessed stone frieze band */}
            <mesh position={[0, -0.34, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.88, 0.28, 1.88]} />
              <meshStandardMaterial
                color={THEME.stoneShadow}
                roughness={0.82}
                transparent={!tileActive}
                opacity={tileActive ? 1 : 0.38}
              />
            </mesh>

            {/* Chamfered underside plinth */}
            <mesh position={[0, -0.58, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.66, 0.2, 1.66]} />
              <meshStandardMaterial
                color={THEME.lavenderDeep}
                roughness={0.84}
                transparent={!tileActive}
                opacity={tileActive ? 1 : 0.35}
              />
            </mesh>

            {/* Subtle compass engraving on Rotary pivot tiles */}
            {kind === 'rotary' && (
              <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.62, 0.72, 16]} />
                <meshStandardMaterial
                  color={THEME.beaconGold}
                  emissive={THEME.beaconGold}
                  emissiveIntensity={0.45}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* Elevator brass corner guide rails */}
            {kind === 'elevator' && (
              <group>
                {[
                  [-0.84, -0.84],
                  [0.84, -0.84],
                  [-0.84, 0.84],
                  [0.84, 0.84],
                ].map(([gx, gz], idx) => (
                  <mesh key={idx} position={[gx, 0.12, gz]} castShadow>
                    <cylinderGeometry args={[0.06, 0.075, 0.24, 6]} />
                    <meshStandardMaterial color={THEME.beaconGold} roughness={0.4} metalness={0.35} />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        ) : (
          /* Sculpted 4-step Staircase with side balustrades & newel caps */
          <group
            rotation={[0, facingY, 0]}
            onClick={(e) => {
              e.stopPropagation();
              if (tileActive) onSelect(id);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              if (tileActive) {
                onHover(id);
                document.body.style.cursor = 'pointer';
              }
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              onHover(null);
              document.body.style.cursor = 'default';
            }}>
            {/* Structural under-beam */}
            <mesh position={[0, -1.08, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.995, 0.44, 1.995]} />
              <meshStandardMaterial
                map={stoneTexture}
                color={THEME.lavenderDeep}
                roughness={0.85}
              />
            </mesh>
            {[0, 1, 2, 3].map((stepIdx) => {
              const stepTop = -0.75 + stepIdx * 0.25;
              const stepHeight = stepTop + 0.85;
              const stepZ = 0.75 - stepIdx * 0.5;
              return (
                <group key={stepIdx}>
                  <mesh
                    position={[0, stepTop - stepHeight / 2, stepZ]}
                    castShadow
                    receiveShadow>
                    <boxGeometry args={[1.96, stepHeight, 0.52]} />
                    <meshStandardMaterial
                      map={stoneTexture}
                      color={
                        stepIdx % 2 === 0 ? THEME.stoneCream : THEME.stoneShadow
                      }
                      roughness={0.76}
                    />
                  </mesh>
                  {/* Delicate gold-ivory step nosing accent */}
                  <mesh position={[0, stepTop - 0.02, stepZ + 0.24]}>
                    <boxGeometry args={[1.72, 0.04, 0.04]} />
                    <meshStandardMaterial color={THEME.turquoise} roughness={0.6} />
                  </mesh>
                </group>
              );
            })}
            {/* Sloped carved balustrades */}
            {[-0.92, 0.92].map((sx, idx) => (
              <group key={idx}>
                <mesh
                  position={[sx, -0.34, 0]}
                  rotation={[-Math.atan2(1, 2), 0, 0]}
                  castShadow>
                  <boxGeometry args={[0.14, 0.24, 2.24]} />
                  <meshStandardMaterial
                    color={THEME.lavenderArch}
                    roughness={0.72}
                  />
                </mesh>
                {/* Lower newel post cap */}
                <mesh position={[sx, -0.72, 0.88]} castShadow>
                  <boxGeometry args={[0.2, 0.34, 0.2]} />
                  <meshStandardMaterial color={THEME.stoneCream} roughness={0.7} />
                </mesh>
              </group>
            ))}
          </group>
        )}

        {/* Pressure Plate Rune Pad (recessed bezel + depressible glowing glyph) */}
        {kind === 'plate' && (
          <group position={[0, 0, 0]}>
            {/* Stone recessed frame */}
            <mesh position={[0, 0.02, 0]} receiveShadow>
              <cylinderGeometry args={[0.72, 0.76, 0.05, 8]} />
              <meshStandardMaterial color={THEME.stoneShadow} roughness={0.8} />
            </mesh>
            {/* Depressible Rune Pad */}
            <group position={[0, isPressed ? 0.02 : 0.085, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.56, 0.62, 0.11, 8]} />
                <meshStandardMaterial
                  color={isPressed ? THEME.beaconGold : THEME.turquoise}
                  emissive={isPressed ? THEME.beaconGold : THEME.turquoise}
                  emissiveIntensity={isPressed ? 1.35 : 0.85}
                  roughness={0.35}
                />
              </mesh>
              <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.26, 0.42, 8]} />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.8}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          </group>
        )}

        {/* Sanctuary Goal Shrine Pad */}
        {kind === 'goal' && (
          <group position={[0, 0.04, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.45, 0.72, 8]} />
              <meshStandardMaterial
                color="#fff2c2"
                emissive={THEME.beaconGold}
                emissiveIntensity={1.5}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.26, 16]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive={THEME.beaconGold}
                emissiveIntensity={1.75}
              />
            </mesh>
          </group>
        )}

        {/* Sculpted Stepped Supporting Pillar */}
        {pillarHeight > 0 && (
          <group>
            {/* Capital flare */}
            <mesh position={[0, -0.76, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.4, 0.18, 1.4]} />
              <meshStandardMaterial color={THEME.stoneShadow} roughness={0.82} />
            </mesh>
            {/* Main fluted shaft */}
            <mesh
              position={[0, -0.85 - pillarHeight / 2, 0]}
              castShadow
              receiveShadow>
              <boxGeometry args={[1.16, pillarHeight, 1.16]} />
              <meshStandardMaterial
                map={stoneTexture}
                color={THEME.indigoShadow}
                roughness={0.86}
              />
            </mesh>
            {/* Tapered spire bottom tip */}
            <mesh position={[0, -0.85 - pillarHeight - 0.55, 0]}>
              <coneGeometry args={[0.8, 1.1, 4]} />
              <meshStandardMaterial color={THEME.deepIndigo} roughness={0.88} />
            </mesh>
          </group>
        )}

        {/* Path Breadcrumb Marker */}
        {isTargetHighlight && tileActive && (
          <mesh position={[0, 0.08, 0]}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshBasicMaterial color={THEME.beaconGold} />
          </mesh>
        )}

        {/* Hover / Blocked Ring */}
        {((isHovered && tileActive) || isBlockedPulse) && (
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.58, 0.76, 24]} />
            <meshBasicMaterial
              color={
                isBlockedPulse
                  ? '#ef859a'
                  : isReachable
                    ? THEME.turquoise
                    : THEME.mutedCoral
              }
              transparent
              opacity={0.88}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

// =========================================================================
// ROTARY ASTROLABE CRANK / CRYSTAL SWITCH / ELEVATOR PRISM
// =========================================================================

export interface CrankControlProps {
  id: string;
  position: [number, number, number];
  type: 'rotary' | 'elevator' | 'gate' | 'crystal';
  stateVal: number;
  nearby: boolean;
  dragDeltaRad?: number;
  onActivate: (id: string) => void;
  onBeginDrag?: (
    id: string,
    clientX: number,
    clientY: number,
    pointerId: number,
  ) => void;
  key?: React.Key;
}

export function CrankControl({
  id,
  position,
  type,
  stateVal,
  nearby,
  dragDeltaRad = 0,
  onActivate,
  onBeginDrag,
}: CrankControlProps) {
  const wheelRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const targetRot = useRef(0);

  useEffect(() => {
    targetRot.current = stateVal * (Math.PI / 2);
  }, [stateVal]);

  useFrame(({clock}, delta) => {
    const t = clock.getElapsedTime();
    if (wheelRef.current) {
      if (type === 'rotary') {
        const desired = targetRot.current + dragDeltaRad;
        wheelRef.current.rotation.z = THREE.MathUtils.lerp(
          wheelRef.current.rotation.z,
          desired,
          Math.min(1, delta * 10),
        );
      } else {
        wheelRef.current.rotation.y += delta * (nearby ? 2.4 : 0.95);
        wheelRef.current.position.y = Math.sin(t * 2.8) * 0.09;
      }
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.9;
      ringRef.current.rotation.x = Math.sin(t * 1.4) * 0.35;
    }
  });

  const isActivated = stateVal % 2 === 1;

  return (
    <group
      position={position}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (type === 'rotary' && onBeginDrag) {
          onBeginDrag(id, e.clientX, e.clientY, e.pointerId);
        } else {
          onActivate(id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = type === 'rotary' ? 'grab' : 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'default';
      }}>
      {type === 'rotary' ? (
        <group position={[0.92, -1.95, 0]} rotation={[0, Math.PI / 2, 0]}>
          {/* Carved Brass Axle Mount protruding from supporting pillar below deck */}
          <mesh position={[0, 0, -0.14]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.15, 0.78, 10]} />
            <meshStandardMaterial color={THEME.lavenderArch} roughness={0.55} />
          </mesh>
          <group ref={wheelRef} position={[0, 0, 0.26]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.22, 0.035, 8, 20]} />
              <meshStandardMaterial color={THEME.beaconGold} roughness={0.35} metalness={0.3} />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[0.76, 0.11, 0.11]} />
              <meshStandardMaterial color={THEME.lavenderArch} roughness={0.5} />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[0.11, 0.76, 0.11]} />
              <meshStandardMaterial color={THEME.lavenderArch} roughness={0.5} />
            </mesh>
            {[
              [0.38, 0, 0],
              [-0.38, 0, 0],
              [0, 0.38, 0],
              [0, -0.38, 0],
            ].map((p, idx) => (
              <mesh key={idx} position={p as [number, number, number]} castShadow>
                <sphereGeometry args={[0.11, 10, 10]} />
                <meshStandardMaterial
                  color={THEME.mutedCoral}
                  emissive={THEME.mutedCoral}
                  emissiveIntensity={nearby ? 0.95 : 0.35}
                  roughness={0.32}
                />
              </mesh>
            ))}
          </group>
        </group>
      ) : type === 'crystal' ? (
        /* Dedicated Harmonic Crystal Switch on Grounded Side Pedestal */
        <group position={[0, -0.75, 0]}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[0.36, 0.7, 0.36]} position={[0, 0.6, 0]} />
          </RigidBody>
          {/* Pedestal Plinth + Supporting Spire */}
          <mesh position={[0, -0.32, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.64, 0.92]} />
            <meshStandardMaterial color={THEME.lavenderDeep} roughness={0.82} />
          </mesh>
          <mesh position={[0, -1.4, 0]}>
            <coneGeometry args={[0.56, 1.55, 4]} />
            <meshStandardMaterial color={THEME.deepIndigo} roughness={0.88} />
          </mesh>
          {/* Carved Cradle Base */}
          <mesh position={[0, 0.14, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.42, 0.28, 8]} />
            <meshStandardMaterial color={THEME.stoneShadow} roughness={0.75} />
          </mesh>
          <group ref={wheelRef} position={[0, 0.85, 0]}>
            <mesh castShadow>
              <octahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial
                color={isActivated ? THEME.beaconGold : THEME.turquoise}
                emissive={isActivated ? THEME.beaconGold : THEME.turquoise}
                emissiveIntensity={nearby ? 1.5 : 0.95}
                roughness={0.18}
              />
            </mesh>
            <mesh ref={ringRef}>
              <torusGeometry args={[0.45, 0.03, 8, 24]} />
              <meshStandardMaterial
                color={THEME.beaconGold}
                emissive={THEME.beaconGold}
                emissiveIntensity={0.65}
              />
            </mesh>
          </group>
        </group>
      ) : (
        /* Elevator Lift Crystal perched on front-right brass rail post */
        <group position={[0.84, 0.48, 0.84]}>
          <group ref={wheelRef}>
            <mesh castShadow>
              <octahedronGeometry args={[0.22, 0]} />
              <meshStandardMaterial
                color={isActivated ? THEME.beaconGold : THEME.mutedCoral}
                emissive={isActivated ? THEME.beaconGold : THEME.mutedCoral}
                emissiveIntensity={nearby ? 1.4 : 0.65}
                roughness={0.25}
              />
            </mesh>
          </group>
        </group>
      )}

      {/* Pulsing aura ring when player is within E / ACT range */}
      {nearby && (
        <mesh position={[0, -0.66, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.88, 24]} />
          <meshBasicMaterial
            color={THEME.beaconGold}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// =========================================================================
// IDLE GUIDANCE PARTICLES (Illuminates Next Functional Mechanism on Idle)
// =========================================================================

const GUIDE_MOTE_PHASES = Array.from({length: 12}, (_, i) => ({
  angleOffset: (i / 12) * Math.PI * 2,
  phase: i / 12,
  radius: 0.42 + (i % 3) * 0.16,
  isGold: i % 2 === 0,
}));

export function MechanismGuideParticles({
  position,
  kind,
}: {
  position: [number, number, number];
  kind: 'plate' | 'mechanism' | 'perspective' | 'goal';
}) {
  const motesRef = useRef<(THREE.Mesh | null)[]>([]);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  const primaryColor =
    kind === 'plate' || kind === 'perspective'
      ? THEME.turquoise
      : THEME.beaconGold;
  const secondaryColor =
    kind === 'plate' || kind === 'perspective'
      ? THEME.beaconGold
      : THEME.turquoise;

  useFrame(({clock}) => {
    const t = clock.getElapsedTime();

    for (let i = 0; i < GUIDE_MOTE_PHASES.length; i++) {
      const m = motesRef.current[i];
      if (!m) continue;
      const cfg = GUIDE_MOTE_PHASES[i];
      const prog = (t * 0.62 + cfg.phase) % 1;
      const angle = cfg.angleOffset + t * 2.1;
      const spread = cfg.radius * (1 - prog * 0.35);
      m.position.set(
        Math.cos(angle) * spread,
        0.12 + prog * 2.15,
        Math.sin(angle) * spread,
      );
      const fadeScale = Math.sin(prog * Math.PI) * 1.15;
      m.scale.setScalar(Math.max(0.01, fadeScale));
      m.rotation.y = t * 2.4 + i;
      m.rotation.x = t * 1.6;
    }

    if (outerRingRef.current) {
      const pulse = 1 + Math.sin(t * 3.4) * 0.16;
      outerRingRef.current.scale.set(pulse, pulse, 1);
      outerRingRef.current.rotation.z = t * 0.9;
    }

    if (innerRingRef.current) {
      const pulse2 = 1 + Math.cos(t * 4.2) * 0.12;
      innerRingRef.current.scale.set(pulse2, pulse2, 1);
    }

    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.14 + Math.sin(t * 3.2) * 0.06;
    }
  });

  return (
    <group position={position}>
      {/* Soft shimmering vertical spire beacon */}
      <mesh ref={beamRef} position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.18, 0.56, 2.2, 12, 1, true]} />
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.18}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dual pulsing guide rings */}
      <mesh
        ref={outerRingRef}
        position={[0, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.92, 24]} />
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.85}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        ref={innerRingRef}
        position={[0, 0.08, 0]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.48, 20]} />
        <meshBasicMaterial
          color={secondaryColor}
          transparent
          opacity={0.9}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rising spiraling starlight motes */}
      {GUIDE_MOTE_PHASES.map((cfg, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            motesRef.current[idx] = el;
          }}>
          <octahedronGeometry args={[0.095, 0]} />
          <meshStandardMaterial
            color={cfg.isGold ? THEME.beaconGold : THEME.turquoise}
            emissive={cfg.isGold ? THEME.beaconGold : THEME.turquoise}
            emissiveIntensity={2.2}
            roughness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

// =========================================================================
// STAR RELIC COLLECTIBLE
// =========================================================================

export function StarRelicMesh({
  position,
  collected,
  key,
}: {
  position: [number, number, number];
  collected: boolean;
  key?: React.Key;
}) {
  const starRef = useRef<THREE.Group>(null);
  useFrame(({clock}) => {
    if (!starRef.current || collected) return;
    const t = clock.getElapsedTime();
    starRef.current.rotation.y = t * 1.4;
    starRef.current.position.y = 0.88 + Math.sin(t * 2.5) * 0.14;
  });

  if (collected) return null;

  return (
    <group position={position}>
      <group ref={starRef} position={[0, 0.88, 0]}>
        <mesh castShadow>
          <octahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial
            color="#fff3bc"
            emissive={THEME.beaconGold}
            emissiveIntensity={1.65}
            roughness={0.18}
          />
        </mesh>
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <torusGeometry args={[0.42, 0.028, 8, 24]} />
          <meshStandardMaterial
            color={THEME.dustyRose}
            emissive={THEME.dustyRose}
            emissiveIntensity={0.95}
          />
        </mesh>
      </group>
    </group>
  );
}

// =========================================================================
// ARCHITECTURAL PROPS (Shrine Domes, Arches, Waterfalls, Sundials, Ruins)
// =========================================================================

export function ArchProp({
  prop,
  celebrating = false,
  key,
}: {
  prop: ArchPropDef;
  celebrating?: boolean;
  key?: React.Key;
}) {
  const flagRef = useRef<THREE.Mesh>(null);
  const wispRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const waterStreamRef = useRef<THREE.Mesh>(null);

  useFrame(({clock}) => {
    const t = clock.getElapsedTime();
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(t * 3.2) * 0.22;
    }
    if (haloRef.current) {
      haloRef.current.rotation.z = t * 0.65;
    }
    if (wispRef.current) {
      wispRef.current.rotation.y = t * (celebrating ? 3.2 : 0.85);
      wispRef.current.position.y =
        1.15 +
        (celebrating ? Math.min(3.2, (t % 3) * 1.3) : Math.sin(t * 2) * 0.15);
    }
    if (waterStreamRef.current) {
      waterStreamRef.current.scale.x = 1 + Math.sin(t * 5) * 0.06;
    }
  });

  const s = prop.scale ?? 1;
  const rotY = prop.rotationY ?? 0;

  return (
    <group position={prop.position} rotation={[0, rotY, 0]} scale={[s, s, s]}>
      {prop.kind === 'dome' && (
        <group>
          <RigidBody type="fixed" colliders={false}>
            {[
              [-0.74, -0.74],
              [0.74, -0.74],
              [-0.74, 0.74],
              [0.74, 0.74],
            ].map(([cx, cz], i) => (
              <CuboidCollider
                key={i}
                args={[0.13, 1.3, 0.13]}
                position={[cx, 1.3, cz]}
              />
            ))}
          </RigidBody>
          {/* Four fluted corner columns */}
          {[
            [-0.74, -0.74],
            [0.74, -0.74],
            [-0.74, 0.74],
            [0.74, 0.74],
          ].map(([cx, cz], i) => (
            <group key={i} position={[cx, 0, cz]}>
              <mesh position={[0, 0.12, 0]} castShadow>
                <boxGeometry args={[0.26, 0.24, 0.26]} />
                <meshStandardMaterial color={THEME.stoneCream} roughness={0.75} />
              </mesh>
              <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.09, 0.115, 2.35, 10]} />
                <meshStandardMaterial color={THEME.lavenderArch} roughness={0.68} />
              </mesh>
              <mesh position={[0, 2.52, 0]} castShadow>
                <boxGeometry args={[0.26, 0.14, 0.26]} />
                <meshStandardMaterial color={THEME.stoneCream} roughness={0.72} />
              </mesh>
            </group>
          ))}
          {/* Cornice */}
          <mesh position={[0, 2.68, 0]} castShadow>
            <boxGeometry args={[1.82, 0.24, 1.82]} />
            <meshStandardMaterial color={THEME.stoneCream} roughness={0.7} />
          </mesh>
          {/* Celestial Cupola Dome + Astrolabe Halo */}
          <mesh position={[0, 3.28, 0]} castShadow>
            <sphereGeometry args={[0.8, 16, 12]} />
            <meshStandardMaterial color={THEME.lavenderArch} roughness={0.55} />
          </mesh>
          <mesh ref={haloRef} position={[0, 3.35, 0]} rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[1.04, 0.035, 8, 28]} />
            <meshStandardMaterial
              color={THEME.beaconGold}
              emissive={THEME.beaconGold}
              emissiveIntensity={0.6}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 4.02, 0]} castShadow>
            <coneGeometry args={[0.42, 0.92, 12]} />
            <meshStandardMaterial color="#b4a8dc" roughness={0.5} />
          </mesh>
          <mesh position={[0, 4.6, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />
            <meshStandardMaterial color={THEME.beaconGold} roughness={0.35} />
          </mesh>
          <mesh ref={flagRef} position={[0.48, 4.82, 0]} castShadow>
            <boxGeometry args={[0.92, 0.28, 0.04]} />
            <meshStandardMaterial color={THEME.dustyRose} roughness={0.62} />
          </mesh>
          {/* Orbiting Sanctuary Wisps */}
          <group ref={wispRef} position={[0, 1.15, 0]}>
            {[0, 1, 2].map((w) => (
              <mesh
                key={w}
                position={[
                  Math.cos((w * Math.PI * 2) / 3) * 0.65,
                  Math.sin(w * 2) * 0.2,
                  Math.sin((w * Math.PI * 2) / 3) * 0.65,
                ]}>
                <octahedronGeometry args={[0.12, 0]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive={w === 0 ? THEME.turquoise : THEME.beaconGold}
                  emissiveIntensity={1.45}
                />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {prop.kind === 'archway' && (
        <group>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[0.12, 1.1, 0.16]} position={[-0.86, 1.1, 0]} />
            <CuboidCollider args={[0.12, 1.1, 0.16]} position={[0.86, 1.1, 0]} />
          </RigidBody>
          <mesh position={[-0.86, 1.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.24, 2.2, 0.32]} />
            <meshStandardMaterial color={THEME.lavenderArch} roughness={0.74} />
          </mesh>
          <mesh position={[0.86, 1.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.24, 2.2, 0.32]} />
            <meshStandardMaterial color={THEME.lavenderArch} roughness={0.74} />
          </mesh>
          <mesh position={[0, 2.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.06, 0.28, 0.38]} />
            <meshStandardMaterial color={THEME.stoneCream} roughness={0.7} />
          </mesh>
          <mesh position={[0, 2.54, 0]} castShadow>
            <boxGeometry args={[1.45, 0.24, 0.3]} />
            <meshStandardMaterial color={THEME.mutedCoral} roughness={0.62} />
          </mesh>
          <mesh position={[0, 2.8, 0]}>
            <octahedronGeometry args={[0.14, 0]} />
            <meshStandardMaterial
              color={THEME.beaconGold}
              emissive={THEME.beaconGold}
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      )}

      {prop.kind === 'colonnade' && (
        <group>
          <RigidBody type="fixed" colliders={false}>
            {[-1.55, 0, 1.55].map((offset, idx) => (
              <CuboidCollider
                key={idx}
                args={[0.16, 1.4, 0.16]}
                position={[offset, 1.4, 0]}
              />
            ))}
          </RigidBody>
          {[-1.55, 0, 1.55].map((offset, idx) => (
            <group key={idx} position={[offset, 0, 0]}>
              <mesh position={[0, 0.14, 0]} castShadow>
                <boxGeometry args={[0.32, 0.28, 0.32]} />
                <meshStandardMaterial color={THEME.stoneShadow} roughness={0.8} />
              </mesh>
              <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.11, 0.13, 2.6, 10]} />
                <meshStandardMaterial color={THEME.lavenderArch} roughness={0.74} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 2.95, 0]} castShadow>
            <boxGeometry args={[3.7, 0.28, 0.44]} />
            <meshStandardMaterial color={THEME.stoneCream} roughness={0.74} />
          </mesh>
        </group>
      )}

      {prop.kind === 'planter' && (
        <group>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[0.36, 0.55, 0.36]} position={[0, 0.55, 0]} />
          </RigidBody>
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.4, 0.32, 0.36, 8]} />
            <meshStandardMaterial color={THEME.stoneShadow} roughness={0.84} />
          </mesh>
          <mesh position={[0, 0.72, 0]} castShadow>
            <coneGeometry args={[0.34, 1.0, 8]} />
            <meshStandardMaterial color={THEME.sageDeep} roughness={0.76} />
          </mesh>
          <mesh position={[0.22, 0.52, 0.1]} castShadow>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial color={THEME.sageGreen} roughness={0.8} />
          </mesh>
        </group>
      )}

      {prop.kind === 'obelisk' && (
        <group>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[0.38, 1.4, 0.38]} position={[0, 1.4, 0]} />
          </RigidBody>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.76, 0.8, 0.76]} />
            <meshStandardMaterial color={THEME.stoneShadow} roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.65, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.3, 1.9, 4]} />
            <meshStandardMaterial color={THEME.indigoShadow} roughness={0.68} />
          </mesh>
          <mesh position={[0, 2.8, 0]}>
            <octahedronGeometry args={[0.18, 0]} />
            <meshStandardMaterial
              color={THEME.beaconGold}
              emissive={THEME.beaconGold}
              emissiveIntensity={1.1}
            />
          </mesh>
        </group>
      )}

      {prop.kind === 'ruinPillar' && (
        <group>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[0.45, 0.9, 0.45]} position={[0, 0.9, 0]} />
          </RigidBody>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.9, 0.5, 0.9]} />
            <meshStandardMaterial color={THEME.stoneShadow} roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.15, 0]} rotation={[0.06, 0.2, -0.05]} castShadow>
            <cylinderGeometry args={[0.24, 0.28, 1.4, 8]} />
            <meshStandardMaterial color={THEME.lavenderDeep} roughness={0.8} />
          </mesh>
        </group>
      )}

      {prop.kind === 'sundial' && (
        <group>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[0.46, 0.45, 0.46]} position={[0, 0.45, 0]} />
          </RigidBody>
          {/* Floating Stone Plinth Anchor */}
          <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.0, 0.6, 1.0]} />
            <meshStandardMaterial color={THEME.lavenderDeep} roughness={0.84} />
          </mesh>
          <mesh position={[0, -1.2, 0]}>
            <coneGeometry args={[0.62, 1.3, 4]} />
            <meshStandardMaterial color={THEME.deepIndigo} roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.52, 0.32, 12]} />
            <meshStandardMaterial color={THEME.stoneCream} roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.58, 0]} rotation={[0.35, 0.4, 0]}>
            <torusGeometry args={[0.34, 0.035, 8, 24]} />
            <meshStandardMaterial color={THEME.beaconGold} roughness={0.35} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.58, 0]}>
            <octahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial
              color={THEME.turquoise}
              emissive={THEME.turquoise}
              emissiveIntensity={1.1}
            />
          </mesh>
        </group>
      )}

      {prop.kind === 'waterfall' && (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[1.4, 0.6, 1.2]} />
            <meshStandardMaterial color={THEME.stoneShadow} roughness={0.82} />
          </mesh>
          <mesh ref={waterStreamRef} position={[0, -1.2, 0.48]}>
            <boxGeometry args={[0.85, 3.0, 0.14]} />
            <meshStandardMaterial
              color={THEME.waterHighlight}
              emissive={THEME.turquoise}
              emissiveIntensity={0.35}
              transparent
              opacity={0.78}
            />
          </mesh>
        </group>
      )}

      {prop.kind === 'tower' && (
        <group>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[0.85, 1.5, 0.85]} position={[0, 1.5, 0]} />
          </RigidBody>
          <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.75, 0.92, 2.8, 8]} />
            <meshStandardMaterial color={THEME.indigoShadow} roughness={0.76} />
          </mesh>
          <mesh position={[0, 3.3, 0]} castShadow>
            <coneGeometry args={[0.94, 1.25, 8]} />
            <meshStandardMaterial color={THEME.dustyRose} roughness={0.65} />
          </mesh>
        </group>
      )}

      {prop.kind === 'lanternPedestal' && (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.42, 0.92]} />
            <meshStandardMaterial color={THEME.indigoShadow} roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.64, 0]}>
            <boxGeometry args={[0.5, 0.48, 0.5]} />
            <meshStandardMaterial
              color="#fff0bc"
              emissive={THEME.lanternAmber}
              emissiveIntensity={1.35}
            />
          </mesh>
          <mesh position={[0, 1.02, 0]} castShadow>
            <coneGeometry args={[0.54, 0.36, 4]} />
            <meshStandardMaterial color={THEME.mutedCoral} roughness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// =========================================================================
// PERSPECTIVE SEAM INDICATOR (Luminous Optical Bridge Link)
// =========================================================================

export function PerspectiveSeam({
  posA,
  posB,
  aligned,
  key,
}: {
  posA: [number, number, number];
  posB: [number, number, number];
  aligned: boolean;
  key?: React.Key;
}) {
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);

  useFrame(({clock}) => {
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 3.5) * 0.14;
    if (ringARef.current) ringARef.current.scale.set(pulse, pulse, 1);
    if (ringBRef.current) ringBRef.current.scale.set(pulse, pulse, 1);
  });

  const color = aligned ? THEME.beaconGold : '#c6afe0';

  return (
    <group>
      <mesh
        ref={ringARef}
        position={[posA[0], posA[1] + 0.05, posA[2]]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.34, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={aligned ? 1.5 : 0.35}
          transparent
          opacity={aligned ? 0.9 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        ref={ringBRef}
        position={[posB[0], posB[1] + 0.05, posB[2]]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.34, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={aligned ? 1.5 : 0.35}
          transparent
          opacity={aligned ? 0.9 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// =========================================================================
// LIVING CELESTIAL DREAMSCAPE SURROUNDINGS (Depth Composition)
// =========================================================================

const TEMP_DUMMY = new THREE.Object3D();

export function PastelEnvironment({
  enableParticles,
  palette,
}: {
  enableParticles: boolean;
  palette: LevelPalette;
}) {
  const waterRef = useRef<THREE.Mesh>(null);
  const motesRef = useRef<THREE.InstancedMesh>(null);

  const moteSeeds = useMemo(() => {
    const arr: {x: number; y: number; z: number; speed: number; phase: number}[] = [];
    for (let i = 0; i < 38; i++) {
      arr.push({
        x: Math.sin(i * 1.9) * 14,
        y: 0.6 + (i % 7) * 1.15,
        z: Math.cos(i * 2.3) * 14,
        speed: 0.38 + (i % 5) * 0.14,
        phase: i * 0.7,
      });
    }
    return arr;
  }, []);

  useFrame(({clock}) => {
    const t = clock.getElapsedTime();
    if (waterRef.current) {
      waterRef.current.position.y = -2.8 + Math.sin(t * 0.85) * 0.06;
    }
    if (enableParticles && motesRef.current) {
      for (let i = 0; i < moteSeeds.length; i++) {
        const m = moteSeeds[i];
        TEMP_DUMMY.position.set(
          m.x + Math.sin(t * 0.5 + m.phase) * 0.6,
          m.y + Math.sin(t * m.speed + m.phase) * 0.5,
          m.z + Math.cos(t * 0.4 + m.phase) * 0.6,
        );
        const sc = 0.055 + Math.sin(t * 2 + m.phase) * 0.022;
        TEMP_DUMMY.scale.set(sc, sc, sc);
        TEMP_DUMMY.rotation.set(t * 0.5, t * 0.7, 0);
        TEMP_DUMMY.updateMatrix();
        motesRef.current.setMatrixAt(i, TEMP_DUMMY.matrix);
      }
      motesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Calm reflecting water plane */}
      <mesh
        ref={waterRef}
        position={[0, -2.8, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow>
        <circleGeometry args={[105, 48]} />
        <meshStandardMaterial
          color={palette.waterColor}
          roughness={0.28}
          metalness={0.18}
        />
      </mesh>

      {/* Floating luminous motes */}
      {enableParticles && (
        <instancedMesh
          ref={motesRef}
          args={[undefined, undefined, moteSeeds.length]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#fff3c4" transparent opacity={0.82} />
        </instancedMesh>
      )}
    </group>
  );
}
