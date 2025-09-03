"use client";

import React, { useEffect } from "react";
import { useWorldStore } from "../../store/worldStore";
import { AISimulant } from "../../types";

/**
 * Simple test component to verify animation system functionality
 * This component automatically creates test simulants for animation testing
 */
export default function AnimationSystemTest() {
  const { simulants, addSimulant, updateSimulant } = useWorldStore();

  // Create test simulants on mount
  useEffect(() => {
    if (simulants.size === 0) {
      // Create a few test simulants with different positions
      const testSimulants: AISimulant[] = [
        {
          id: "test-simulant-1",
          name: "Animation Tester 1",
          position: { x: 0, y: 0, z: 0 },
          status: "active",
          lastAction: "Standing peacefully",
          conversationHistory: [],
          geminiSessionId: "test-session-1",
        },
        {
          id: "test-simulant-2",
          name: "Animation Tester 2",
          position: { x: 3, y: 0, z: 0 },
          status: "active",
          lastAction: "Walking around the world",
          conversationHistory: [],
          geminiSessionId: "test-session-2",
        },
        {
          id: "test-simulant-3",
          name: "Animation Tester 3",
          position: { x: -3, y: 0, z: 0 },
          status: "active",
          lastAction: "Running with excitement",
          conversationHistory: [],
          geminiSessionId: "test-session-3",
        },
      ];

      testSimulants.forEach((simulant) => {
        addSimulant(simulant);
      });

      console.log("🎭 Animation System Test: Created test simulants");

      // Test animation changes after a delay
      setTimeout(() => {
        updateSimulant("test-simulant-1", { lastAction: "Jumping with joy" });
        updateSimulant("test-simulant-2", { lastAction: "Building structures" });
        updateSimulant("test-simulant-3", { lastAction: "Dancing to celebrate" });
        console.log("🎭 Animation System Test: Updated simulant actions");
      }, 3000);

      // Test more animation changes
      setTimeout(() => {
        updateSimulant("test-simulant-1", { lastAction: "Thinking deeply" });
        updateSimulant("test-simulant-2", { lastAction: "Talking to friends" });
        updateSimulant("test-simulant-3", { lastAction: "Standing peacefully" });
        console.log("🎭 Animation System Test: Second animation update");
      }, 6000);
    }
  }, [simulants.size, addSimulant, updateSimulant]);

  // This component doesn't render anything visible
  return null;
}