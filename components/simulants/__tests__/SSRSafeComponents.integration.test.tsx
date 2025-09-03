"use client";

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Canvas } from "@react-three/fiber";
import SSRSafeAnimationTestControls from "../SSRSafeAnimationTestControls";
import SSRSafeReadyPlayerMeSimulant from "../SSRSafeReadyPlayerMeSimulant";
import { AISimulant } from "../../../types";

// Mock the world store
const mockSimulant: AISimulant = {
  id: "test-simulant-1",
  name: "Test Simulant",
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  status: "active",
  lastAction: "Standing peacefully",
  state: "idle",
};

// Mock useWorldStore
jest.mock("../../../store/worldStore", () => ({
  useWorldStore: () => ({
    simulants: new Map([["test-simulant-1", mockSimulant]]),
    updateSimulant: jest.fn(),
    gridConfig: {
      snapToGrid: true,
      cellSize: 1,
    },
  }),
}));

// Mock useIsClient to simulate different environments
const mockUseIsClient = jest.fn();
jest.mock("../../../utils/useSSRSafeAnimations", () => ({
  useIsClient: () => mockUseIsClient(),
  useSSRSafePerformanceOptimization: () => ({
    metrics: {
      frameRate: 60,
      memoryUsage: 50,
      activeAnimations: 1,
      droppedFrames: 0,
      renderTime: 16,
    },
    currentQuality: { name: "high", level: 3 },
    calculateLOD: () => "high",
    isSimulantVisible: () => true,
    getUpdateFrequency: () => 60,
    getRenderScale: () => 1,
    setQuality: jest.fn(),
    getCurrentQuality: () => ({ name: "high", level: 3 }),
    getSimulantLOD: () => "high",
    state: {
      isEnabled: true,
      currentQuality: "high",
      simulantCount: 1,
      enabledFeatures: {
        autoQualityAdjustment: true,
        memoryManagement: true,
        culling: true,
        lod: true,
      },
    },
    enable: jest.fn(),
    disable: jest.fn(),
    updateSettings: jest.fn(),
    getMetrics: jest.fn(),
    resetMetrics: jest.fn(),
    onQualityChange: jest.fn(),
    onPerformanceWarning: jest.fn(),
  }),
  useSSRSafeExternalAnimations: () => ({
    clips: new Map(),
    loading: false,
    error: null,
    progress: 100,
  }),
  useSSRSafeRPMAnimations: () => ({
    mixer: null,
    actions: new Map(),
    currentAnimation: null,
    isPlaying: false,
    setLODLevel: jest.fn(),
  }),
  useSSRSafeAnimationController: () => ({
    state: {
      currentState: "idle",
      previousState: null,
      transitionProgress: 0,
      isTransitioning: false,
      lastTransitionTime: 0,
      error: null,
    },
    transitionTo: jest.fn(),
    getCurrentState: () => "idle",
    isTransitioning: () => false,
    getTransitionProgress: () => 0,
    onStateChange: jest.fn(),
    onTransitionComplete: jest.fn(),
    onError: jest.fn(),
  }),
}));

// Mock useGLTF
jest.mock("@react-three/drei", () => ({
  useGLTF: () => ({
    scene: {
      clone: () => ({ children: [] }),
    },
    animations: [],
  }),
}));

// Mock useFrame
jest.mock("@react-three/fiber", () => ({
  ...jest.requireActual("@react-three/fiber"),
  useFrame: jest.fn(),
}));

describe("SSR-Safe Components Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("SSRSafeAnimationTestControls", () => {
    it("should render fallback during SSR", () => {
      // Mock SSR environment
      mockUseIsClient.mockReturnValue(false);

      render(<SSRSafeAnimationTestControls simulantId="test-simulant-1" />);

      expect(screen.getByText("Animation Controls")).toBeInTheDocument();
      expect(screen.getByText("Loading animation controls...")).toBeInTheDocument();
    });

    it("should render loading component during client-side hydration", async () => {
      // Mock client environment with loading state
      mockUseIsClient.mockReturnValue(true);

      render(<SSRSafeAnimationTestControls simulantId="test-simulant-1" />);

      // Should show loading state initially
      expect(screen.getByText("Initializing animation system...")).toBeInTheDocument();
    });

    it("should handle simulant selection correctly", () => {
      mockUseIsClient.mockReturnValue(false);

      const { rerender } = render(
        <SSRSafeAnimationTestControls simulantId="test-simulant-1" />
      );

      expect(screen.getByText("Animation Controls")).toBeInTheDocument();

      // Rerender without simulantId
      rerender(<SSRSafeAnimationTestControls />);

      expect(screen.getByText("Animation Controls")).toBeInTheDocument();
    });

    it("should handle error callbacks gracefully", () => {
      mockUseIsClient.mockReturnValue(false);
      const mockOnError = jest.fn();

      render(
        <SSRSafeAnimationTestControls
          simulantId="test-simulant-1"
          onError={mockOnError}
        />
      );

      expect(screen.getByText("Animation Controls")).toBeInTheDocument();
    });
  });

  describe("SSRSafeReadyPlayerMeSimulant", () => {
    it("should render fallback during SSR", () => {
      // Mock SSR environment
      mockUseIsClient.mockReturnValue(false);

      render(
        <Canvas>
          <SSRSafeReadyPlayerMeSimulant simulant={mockSimulant} />
        </Canvas>
      );

      // Component should render without errors in SSR
      expect(document.querySelector("canvas")).toBeInTheDocument();
    });

    it("should render loading component during client-side hydration", () => {
      mockUseIsClient.mockReturnValue(true);

      render(
        <Canvas>
          <SSRSafeReadyPlayerMeSimulant simulant={mockSimulant} />
        </Canvas>
      );

      // Should render canvas without errors
      expect(document.querySelector("canvas")).toBeInTheDocument();
    });

    it("should handle different performance modes", () => {
      mockUseIsClient.mockReturnValue(false);

      const performanceModes: Array<"quality" | "balanced" | "performance"> = [
        "quality",
        "balanced",
        "performance",
      ];

      performanceModes.forEach((mode) => {
        render(
          <Canvas key={mode}>
            <SSRSafeReadyPlayerMeSimulant
              simulant={mockSimulant}
              performanceMode={mode}
            />
          </Canvas>
        );

        expect(document.querySelector("canvas")).toBeInTheDocument();
      });
    });

    it("should handle animation callbacks", () => {
      mockUseIsClient.mockReturnValue(false);
      const mockOnAnimationChange = jest.fn();
      const mockOnLoadComplete = jest.fn();
      const mockOnLoadError = jest.fn();

      render(
        <Canvas>
          <SSRSafeReadyPlayerMeSimulant
            simulant={mockSimulant}
            onAnimationChange={mockOnAnimationChange}
            onLoadComplete={mockOnLoadComplete}
            onLoadError={mockOnLoadError}
          />
        </Canvas>
      );

      expect(document.querySelector("canvas")).toBeInTheDocument();
    });

    it("should handle grid snapping options", () => {
      mockUseIsClient.mockReturnValue(false);

      render(
        <Canvas>
          <SSRSafeReadyPlayerMeSimulant
            simulant={mockSimulant}
            enableGridSnap={true}
            scale={1.2}
          />
        </Canvas>
      );

      expect(document.querySelector("canvas")).toBeInTheDocument();
    });
  });

  describe("Cross-component Integration", () => {
    it("should work together in the same scene", () => {
      mockUseIsClient.mockReturnValue(false);

      render(
        <div>
          <Canvas>
            <SSRSafeReadyPlayerMeSimulant simulant={mockSimulant} />
          </Canvas>
          <SSRSafeAnimationTestControls simulantId="test-simulant-1" />
        </div>
      );

      expect(screen.getByText("Animation Controls")).toBeInTheDocument();
      expect(document.querySelector("canvas")).toBeInTheDocument();
    });

    it("should handle client-side hydration transition", async () => {
      // Start with SSR
      mockUseIsClient.mockReturnValue(false);

      const { rerender } = render(
        <div>
          <Canvas>
            <SSRSafeReadyPlayerMeSimulant simulant={mockSimulant} />
          </Canvas>
          <SSRSafeAnimationTestControls simulantId="test-simulant-1" />
        </div>
      );

      expect(screen.getByText("Loading animation controls...")).toBeInTheDocument();

      // Simulate client-side hydration
      mockUseIsClient.mockReturnValue(true);

      rerender(
        <div>
          <Canvas>
            <SSRSafeReadyPlayerMeSimulant simulant={mockSimulant} />
          </Canvas>
          <SSRSafeAnimationTestControls simulantId="test-simulant-1" />
        </div>
      );

      // Should transition to loading state
      await waitFor(() => {
        expect(screen.getByText("Initializing animation system...")).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing simulant gracefully", () => {
      mockUseIsClient.mockReturnValue(false);

      render(<SSRSafeAnimationTestControls simulantId="non-existent" />);

      expect(screen.getByText("Animation Controls")).toBeInTheDocument();
    });

    it("should handle simulant updates", () => {
      mockUseIsClient.mockReturnValue(false);

      const updatedSimulant = {
        ...mockSimulant,
        lastAction: "Running with excitement",
        status: "moving" as const,
      };

      const { rerender } = render(
        <Canvas>
          <SSRSafeReadyPlayerMeSimulant simulant={mockSimulant} />
        </Canvas>
      );

      expect(document.querySelector("canvas")).toBeInTheDocument();

      rerender(
        <Canvas>
          <SSRSafeReadyPlayerMeSimulant simulant={updatedSimulant} />
        </Canvas>
      );

      expect(document.querySelector("canvas")).toBeInTheDocument();
    });

    it("should handle rapid environment changes", () => {
      // Simulate rapid SSR/client switches
      mockUseIsClient.mockReturnValue(false);

      const { rerender } = render(
        <SSRSafeAnimationTestControls simulantId="test-simulant-1" />
      );

      expect(screen.getByText("Loading animation controls...")).toBeInTheDocument();

      mockUseIsClient.mockReturnValue(true);
      rerender(<SSRSafeAnimationTestControls simulantId="test-simulant-1" />);

      mockUseIsClient.mockReturnValue(false);
      rerender(<SSRSafeAnimationTestControls simulantId="test-simulant-1" />);

      expect(screen.getByText("Loading animation controls...")).toBeInTheDocument();
    });
  });

  describe("Performance Considerations", () => {
    it("should not cause memory leaks during component unmounting", () => {
      mockUseIsClient.mockReturnValue(false);

      const { unmount } = render(
        <div>
          <Canvas>
            <SSRSafeReadyPlayerMeSimulant simulant={mockSimulant} />
          </Canvas>
          <SSRSafeAnimationTestControls simulantId="test-simulant-1" />
        </div>
      );

      expect(() => unmount()).not.toThrow();
    });

    it("should handle multiple simulants efficiently", () => {
      mockUseIsClient.mockReturnValue(false);

      const simulants = Array.from({ length: 5 }, (_, i) => ({
        ...mockSimulant,
        id: `test-simulant-${i}`,
        name: `Test Simulant ${i}`,
        position: { x: i, y: 0, z: i },
      }));

      render(
        <Canvas>
          {simulants.map((sim) => (
            <SSRSafeReadyPlayerMeSimulant key={sim.id} simulant={sim} />
          ))}
        </Canvas>
      );

      expect(document.querySelector("canvas")).toBeInTheDocument();
    });
  });
});
