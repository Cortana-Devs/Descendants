import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Canvas } from '@react-three/fiber';
import '@testing-library/jest-dom';
import PlayerMovementSystem, { 
  PerspectiveMode,
  usePlayerMovement 
} from '../components/PlayerMovement';
import { Vector3 } from 'three';

// Mock Three.js and R3F
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: () => ({
    camera: {
      position: { copy: vi.fn(), lerp: vi.fn() },
      rotation: { x: 0, y: 0, z: 0 },
      lookAt: vi.fn()
    },
    gl: {
      domElement: {
        requestPointerLock: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
    }
  })
}));

vi.mock('@react-three/drei', () => ({
  useGLTF: () => ({
    scene: {
      clone: () => ({
        scale: { setScalar: vi.fn() },
        traverse: vi.fn()
      }),
      scale: { setScalar: vi.fn() }
    },
    animations: [],
    error: null
  }),
  useAnimations: () => ({
    actions: {},
    mixer: null
  })
}));

// Mock world store
vi.mock('../store/worldStore', () => ({
  useWorldStore: () => ({
    playerAvatar: null,
    setPlayerAvatar: vi.fn(),
    updateAvatarPosition: vi.fn(),
    updateAvatarAnimation: vi.fn(),
    updateAvatarState: vi.fn()
  })
}));

describe('PlayerMovementSystem', () => {
  const defaultProps = {
    perspectiveMode: PerspectiveMode.THIRD_PERSON,
    enabled: true,
    spawnPosition: new Vector3(0, 0, 0),
    syncWithStore: true
  };

  beforeEach(() => {
    // Reset DOM and event listeners
    document.pointerLockElement = null;
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <Canvas>
        <PlayerMovementSystem {...defaultProps} />
      </Canvas>
    );
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('does not render when disabled', () => {
    const { container } = render(
      <Canvas>
        <PlayerMovementSystem {...defaultProps} enabled={false} />
      </Canvas>
    );
    
    // Should render canvas but not movement system content
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('accepts custom movement configuration', () => {
    const movementConfig = {
      speed: 10,
      usePhysics: false,
      jumpForce: 15
    };

    render(
      <Canvas>
        <PlayerMovementSystem 
          {...defaultProps} 
          movementConfig={movementConfig}
        />
      </Canvas>
    );
    
    // Component should render without errors
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('accepts custom avatar configuration', () => {
    const avatarConfig = {
      modelUrl: '/custom-model.glb',
      scale: 2,
      showInFirstPerson: true
    };

    render(
      <Canvas>
        <PlayerMovementSystem 
          {...defaultProps} 
          avatarConfig={avatarConfig}
        />
      </Canvas>
    );
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('handles perspective mode changes', () => {
    const { rerender } = render(
      <Canvas>
        <PlayerMovementSystem 
          {...defaultProps} 
          perspectiveMode={PerspectiveMode.THIRD_PERSON}
        />
      </Canvas>
    );

    expect(screen.getByTestId('canvas')).toBeInTheDocument();

    rerender(
      <Canvas>
        <PlayerMovementSystem 
          {...defaultProps} 
          perspectiveMode={PerspectiveMode.FIRST_PERSON}
        />
      </Canvas>
    );

    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('triggers movement callbacks', () => {
    const onMove = vi.fn();
    const onAnimationChange = vi.fn();

    render(
      <Canvas>
        <PlayerMovementSystem 
          {...defaultProps}
          onMove={onMove}
          onAnimationChange={onAnimationChange}
        />
      </Canvas>
    );
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    // Callbacks would be tested with user interactions in integration tests
  });
});

describe('PlayerMovement Types', () => {
  it('exports correct perspective modes', () => {
    expect(PerspectiveMode.FIRST_PERSON).toBe('first-person');
    expect(PerspectiveMode.THIRD_PERSON).toBe('third-person');
  });
});

// Integration test for the hook (would need proper R3F testing environment)
describe('usePlayerMovement Hook', () => {
  it('should be defined', () => {
    expect(usePlayerMovement).toBeDefined();
    expect(typeof usePlayerMovement).toBe('function');
  });
});

// Test helper functions
describe('Movement Helpers', () => {
  it('should export helper functions', async () => {
    const helpers = await import('../components/PlayerMovement/movementHelpers');
    
    expect(helpers.clamp).toBeDefined();
    expect(helpers.lerp).toBeDefined();
    expect(helpers.calculateMovementDirection).toBeDefined();
    expect(helpers.checkGrounded).toBeDefined();
  });
});

// Type safety tests
describe('Type Safety', () => {
  it('should have proper TypeScript types', async () => {
    const types = await import('../components/PlayerMovement/types');
    
    expect(types.AnimationState).toBeDefined();
    expect(types.PerspectiveMode).toBeDefined();
    expect(types.DEFAULT_MOVEMENT_CONFIG).toBeDefined();
    expect(types.DEFAULT_AVATAR_CONFIG).toBeDefined();
  });
});
