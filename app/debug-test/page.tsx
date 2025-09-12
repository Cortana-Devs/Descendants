'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Vector3 } from 'three';

/**
 * Ultra minimal test to identify the H4 error source
 */
export default function DebugTestPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <h1>Outside Canvas - This should work fine</h1>
      
      <Canvas>
        <ambientLight intensity={0.6} />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
        
        {/* Test individual components */}
        <TestGroup />
      </Canvas>
    </div>
  );
}

function TestGroup() {
  return (
    <group>
      <mesh position={[2, 0, 0]}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color="blue" />
      </mesh>
    </group>
  );
}
