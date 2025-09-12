'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Vector3 } from 'three';
import PlayerMovementSystem, { PerspectiveMode } from '../../components/PlayerMovement';

/**
 * Minimal test page to isolate the R3F H4 error
 */
export default function MinimalTestPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} />
        
        {/* Just a simple mesh to test */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        
        {/* Test PlayerMovementSystem with minimal config */}
        <PlayerMovementSystem
          perspectiveMode={PerspectiveMode.THIRD_PERSON}
          enabled={true}
          spawnPosition={new Vector3(0, 0, 0)}
          syncWithStore={false}
        />
      </Canvas>
    </div>
  );
}
