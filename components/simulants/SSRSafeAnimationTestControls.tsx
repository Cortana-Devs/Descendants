"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Activity, User } from "lucide-react";

/**
 * Animation test controls interface props
 */
export interface AnimationTestControlsProps {
  simulantId?: string;
  className?: string;
  showAdvanced?: boolean;
  showPerformancePanel?: boolean;
  onAnimationChange?: (simulantId: string, animation: string) => void;
  onError?: (error: string) => void;
}

// Fallback component for SSR
function AnimationTestControlsFallback({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`fixed bottom-6 left-6 z-50 ${className}`}>
      <Card className="bg-black/20 backdrop-blur-md border-white/10 text-white min-w-[300px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity size={18} />
            Animation Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center gap-2 text-white/60">
            <User size={16} />
            <span className="text-sm">Loading animation controls...</span>
          </div>

          {/* Placeholder buttons */}
          <div className="grid grid-cols-2 gap-2">
            {["Idle", "Walk", "Run", "Jump"].map((label) => (
              <div
                key={label}
                className="bg-white/10 rounded-md h-10 flex items-center justify-center text-sm text-white/40"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="text-xs text-white/40 pt-2 border-t border-white/10">
            Animation controls will be available after client-side hydration
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading component
function AnimationTestControlsLoading({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`fixed bottom-6 left-6 z-50 ${className}`}>
      <Card className="bg-black/20 backdrop-blur-md border-white/10 text-white min-w-[300px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity size={18} />
            Animation Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center gap-2 text-white/60">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm">Initializing animation system...</span>
          </div>

          {/* Loading skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded animate-pulse" />
            <div className="h-8 bg-white/10 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/10 rounded-md h-10 animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Dynamically import the full AnimationTestControls component
const DynamicAnimationTestControls = dynamic(
  () => import("./AnimationTestControls"),
  {
    ssr: false,
    loading: () => <AnimationTestControlsLoading />,
  },
);

/**
 * SSR-Safe Animation Test Controls Component
 *
 * This component provides a safe wrapper around the full AnimationTestControls
 * that handles SSR compatibility by:
 * 1. Using dynamic imports to prevent server-side execution of Three.js dependent code
 * 2. Providing fallback rendering for server-side rendering
 * 3. Showing loading states during client-side hydration
 * 4. Graceful handling of animation system initialization
 */
export default function SSRSafeAnimationTestControls(
  props: AnimationTestControlsProps,
) {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== "undefined";

  // During SSR, show fallback
  if (!isBrowser) {
    return <AnimationTestControlsFallback className={props.className} />;
  }

  // In browser, use dynamic component with Suspense
  return (
    <Suspense
      fallback={<AnimationTestControlsLoading className={props.className} />}
    >
      <DynamicAnimationTestControls {...props} />
    </Suspense>
  );
}

// Re-export types for use in other components
export type { AnimationTestControlsProps as SSRSafeAnimationTestControlsProps };
