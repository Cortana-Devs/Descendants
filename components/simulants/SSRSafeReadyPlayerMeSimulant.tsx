"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { AISimulant } from "../../types";

// Enhanced Ready Player Me simulant configuration
interface ReadyPlayerMeSimulantProps {
  simulant: AISimulant;
  modelPath?: string;
  animationPaths?: string[];
  scale?: number;
  enableGridSnap?: boolean;
  performanceMode?: "quality" | "balanced" | "performance";
  onAnimationChange?: (animation: string) => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
}

// Fallback component for SSR and loading states
function ReadyPlayerMeSimulantFallback({ simulant }: { simulant: AISimulant }) {
  return (
    <group
      position={[simulant.position.x, simulant.position.y, simulant.position.z]}
    >
      {/* Simple geometric fallback for SSR */}
      <mesh>
        <boxGeometry args={[0.6, 1.8, 0.3]} />
        <meshBasicMaterial
          color="#00D4FF"
          transparent
          opacity={0.6}
          wireframe
        />
      </mesh>

      {/* Activity indicator */}
      {simulant.status === "active" && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.0, 8]} />
          <meshBasicMaterial
            color="#00D4FF"
            transparent
            opacity={0.3}
            side={2} // DoubleSide
          />
        </mesh>
      )}

      {/* Status indicator */}
      <mesh position={[0.6, 1.8, 0]}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial
          color="#00D4FF"
          transparent
          opacity={simulant.status === "active" ? 0.8 : 0.5}
        />
      </mesh>
    </group>
  );
}

// Loading component
function ReadyPlayerMeSimulantLoading({ simulant }: { simulant: AISimulant }) {
  return (
    <group
      position={[simulant.position.x, simulant.position.y, simulant.position.z]}
    >
      {/* Loading placeholder */}
      <mesh>
        <boxGeometry args={[0.6, 1.8, 0.3]} />
        <meshBasicMaterial
          color="#00D4FF"
          transparent
          opacity={0.4}
          wireframe
        />
      </mesh>

      {/* Loading indicator */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial color="#00D4FF" transparent opacity={0.8} />
      </mesh>

      {/* Pulsing animation effect */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.8, 16]} />
        <meshBasicMaterial color="#00D4FF" transparent opacity={0.2} side={2} />
      </mesh>
    </group>
  );
}

// Dynamically import the full ReadyPlayerMeSimulant component
const DynamicReadyPlayerMeSimulant = dynamic(
  () => import("./ReadyPlayerMeSimulant"),
  {
    ssr: false,
    loading: () => <ReadyPlayerMeSimulantLoading simulant={{} as AISimulant} />,
  },
);

/**
 * SSR-Safe Ready Player Me Simulant Component
 *
 * This component provides a safe wrapper around the full ReadyPlayerMeSimulant
 * that handles SSR compatibility by:
 * 1. Using dynamic imports to prevent server-side Three.js execution
 * 2. Providing fallback rendering for server-side rendering
 * 3. Showing loading states during client-side hydration
 * 4. Graceful error handling for animation loading failures
 */
export default function SSRSafeReadyPlayerMeSimulant(
  props: ReadyPlayerMeSimulantProps,
) {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== "undefined";

  // During SSR or before hydration, show fallback
  if (!isBrowser) {
    return <ReadyPlayerMeSimulantFallback simulant={props.simulant} />;
  }

  // In browser, use dynamic component with Suspense
  return (
    <Suspense
      fallback={<ReadyPlayerMeSimulantLoading simulant={props.simulant} />}
    >
      <DynamicReadyPlayerMeSimulant {...props} />
    </Suspense>
  );
}

// Export types for use in other components
export type { ReadyPlayerMeSimulantProps };
