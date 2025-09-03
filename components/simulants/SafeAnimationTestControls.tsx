"use client";

import React from "react";
import { useIsClient } from "../../utils/useSSRSafeAnimations";
import AnimationTestControls, { AnimationTestControlsProps } from "./AnimationTestControls";

/**
 * SSR-Safe wrapper for AnimationTestControls
 * This component ensures hooks are called consistently
 */
export default function SafeAnimationTestControls(props: AnimationTestControlsProps) {
  const isClient = useIsClient();

  // Always render the component, but with different behavior for SSR
  if (!isClient) {
    return (
      <div className={`fixed bottom-6 left-6 z-50 ${props.className || ""}`}>
        <div className="bg-black/20 backdrop-blur-md border border-white/10 text-white min-w-[300px] rounded-lg p-4">
          <div className="flex items-center gap-2 text-white/60">
            <span className="text-sm">Loading animation controls...</span>
          </div>
        </div>
      </div>
    );
  }

  return <AnimationTestControls {...props} />;
}