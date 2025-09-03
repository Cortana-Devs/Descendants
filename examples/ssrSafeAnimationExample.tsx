/**
 * SSR-Safe Animation System Example
 * Demonstrates how to use the animation system with Next.js SSR compatibility
 */

"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import SSRSafeReadyPlayerMeSimulant from "../components/simulants/SSRSafeReadyPlayerMeSimulant";
import SSRSafeAnimationTestControls from "../components/simulants/SSRSafeAnimationTestControls";
import { ThreeJSErrorBoundary } from "../utils/dynamicThreeImports";
import { useWorldStore } from "../store/worldStore";
import type { AISimulant } from "../types";

// Example simulant data
const exampleSimulants: AISimulant[] = [
  {
    id: "simulant-1",
    name: "Alice",
    position: { x: 0, y: 0, z: 0 },
    status: "active",
    lastAction: "Standing peacefully",
    personality: "curious",
    goals: ["explore", "learn"],
    memories: [],
    relationships: new Map(),
    createdAt: new Date(),
    lastActiveAt: new Date()
  },
  {
    id: "simulant-2", 
    name: "Bob",
    position: { x: 3, y: 0, z: 0 },
    status: "idle",
    lastAction: "Walking around the world",
    personality: "friendly",
    goals: ["socialize", "build"],
    memories: [],
    relationships: new Map(),
    createdAt: new Date(),
    lastActiveAt: new Date()
  }
];

/**
 * 3D Scene Component with SSR Safety
 */
function AnimationScene() {
  return (
    <Canvas
      camera={{ position: [5, 5, 5], fov: 60 }}
      style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2a2a3e" />
      </mesh>

      {/* Grid helper */}
      <gridHelper args={[20, 20, '#444', '#333']} />

      {/* SSR-Safe Simulants */}
      {exampleSimulants.map((simulant) => (
        <SSRSafeReadyPlayerMeSimulant
          key={simulant.id}
          simulant={simulant}
          performanceMode="balanced"
          onAnimationChange={(animation) => {
            console.log(`Animation changed for ${simulant.name}: ${animation}`);
          }}
          onLoadComplete={() => {
            console.log(`Animations loaded for ${simulant.name}`);
          }}
          onLoadError={(error) => {
            console.error(`Animation load error for ${simulant.name}:`, error);
          }}
        />
      ))}

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={20}
      />
    </Canvas>
  );
}

/**
 * Loading fallback for the 3D scene
 */
function SceneLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div className="text-white">
          <h3 className="text-lg font-semibold">Loading 3D Scene</h3>
          <p className="text-sm text-gray-300 mt-1">
            Initializing animation system...
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Error fallback for the 3D scene
 */
function SceneError({ error }: { error: Error }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-red-900 to-red-800">
      <div className="text-center space-y-4 p-8">
        <div className="text-red-200">
          <h3 className="text-lg font-semibold">3D Scene Error</h3>
          <p className="text-sm mt-2">
            Failed to load the animation system. This might be due to:
          </p>
          <ul className="text-xs mt-2 space-y-1 text-left">
            <li>• WebGL not supported in your browser</li>
            <li>• Network issues loading 3D assets</li>
            <li>• Browser compatibility issues</li>
          </ul>
        </div>
        <details className="text-xs text-red-300 text-left">
          <summary className="cursor-pointer">Technical Details</summary>
          <pre className="mt-2 p-2 bg-red-950 rounded text-xs overflow-auto">
            {error.message}
          </pre>
        </details>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

/**
 * Main SSR-Safe Animation Example Component
 */
export default function SSRSafeAnimationExample() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              SSR-Safe Animation System
            </h1>
            <p className="text-sm text-gray-300">
              Next.js compatible RPM animation demo
            </p>
          </div>
          <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-lg px-4 py-2">
            <div className="text-xs text-gray-300">
              Server-side rendering compatible • Dynamic imports • Error boundaries
            </div>
          </div>
        </div>
      </header>

      {/* Main 3D Scene */}
      <main className="h-screen">
        <ThreeJSErrorBoundary fallback={SceneError}>
          <Suspense fallback={<SceneLoading />}>
            <AnimationScene />
          </Suspense>
        </ThreeJSErrorBoundary>
      </main>

      {/* SSR-Safe Animation Controls */}
      <SSRSafeAnimationTestControls
        showAdvanced={true}
        showPerformancePanel={process.env.NODE_ENV === 'development'}
        onAnimationChange={(simulantId, animation) => {
          console.log(`Animation test: ${simulantId} -> ${animation}`);
        }}
        onError={(error) => {
          console.error('Animation control error:', error);
        }}
      />

      {/* Instructions */}
      <div className="absolute bottom-6 right-6 z-10">
        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-lg p-4 text-white max-w-sm">
          <h3 className="font-semibold text-sm mb-2">SSR Features</h3>
          <ul className="text-xs space-y-1 text-gray-300">
            <li>• ✅ Server-side rendering compatible</li>
            <li>• ✅ Dynamic Three.js imports</li>
            <li>• ✅ Graceful fallbacks</li>
            <li>• ✅ Error boundaries</li>
            <li>• ✅ Loading states</li>
            <li>• ✅ Hydration safe</li>
          </ul>
          <div className="mt-3 pt-2 border-t border-white/10">
            <p className="text-xs text-gray-400">
              This page works with SSR disabled and will hydrate properly on the client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Export metadata for Next.js
 */
export const metadata = {
  title: 'SSR-Safe Animation System Demo',
  description: 'Demonstration of Next.js compatible RPM animation system with SSR safety',
};