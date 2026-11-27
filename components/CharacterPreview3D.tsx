import {Canvas, useFrame} from '@react-three/fiber';
import React, {useRef} from 'react';
import * as THREE from 'three';
import {TravelerCosmetic} from '../types';
import {TravelerPip} from './WorldVisuals';

function SpinningPreviewPip({cosmetic}: {cosmetic: TravelerCosmetic}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({clock}) => {
    if (ref.current) {
      ref.current.rotation.y =
        Math.PI + Math.sin(clock.getElapsedTime() * 0.8) * 0.65;
    }
  });
  return (
    <group ref={ref} position={[0, -0.82, 0]}>
      <TravelerPip
        walking={false}
        celebrating={false}
        tunicColor={cosmetic.tunicColor}
        scarfColor={cosmetic.scarfColor}
        capColor={cosmetic.capColor}
        enablePointLight={false}
      />
    </group>
  );
}

const PREVIEW_CAM = {
  fov: 32,
  position: [0, 0.32, 3.2] as [number, number, number],
};

export default function CharacterPreview3D({
  cosmetic,
}: {
  cosmetic: TravelerCosmetic;
}) {
  return (
    <Canvas camera={PREVIEW_CAM} dpr={[1, 1.5]}>
      <ambientLight intensity={1.8} color="#f6e7f2" />
      <directionalLight
        position={[2, 4, 3]}
        intensity={2.5}
        color="#fff7e8"
      />
      <SpinningPreviewPip cosmetic={cosmetic} />
    </Canvas>
  );
}
