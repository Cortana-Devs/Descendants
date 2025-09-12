import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';

// Import types and utilities (these should work without React context)
import {
  AnimationState,
  PerspectiveMode,
  DEFAULT_MOVEMENT_CONFIG,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_CAMERA_OFFSET
} from '../components/PlayerMovement/types';

import {
  clamp,
  lerp,
  calculateMovementDirection,
  checkGrounded,
  degToRad,
  radToDeg,
  wrapAngle
} from '../components/PlayerMovement/movementHelpers';

describe('PlayerMovement - Types and Constants', () => {
  it('should export correct animation states', () => {
    expect(AnimationState.IDLE).toBe('idle');
    expect(AnimationState.WALK).toBe('walk');
    expect(AnimationState.RUN).toBe('run');
    expect(AnimationState.JUMP).toBe('jump');
    expect(AnimationState.CROUCH).toBe('crouch');
  });

  it('should export correct perspective modes', () => {
    expect(PerspectiveMode.FIRST_PERSON).toBe('first-person');
    expect(PerspectiveMode.THIRD_PERSON).toBe('third-person');
  });

  it('should have sensible default configs', () => {
    expect(DEFAULT_MOVEMENT_CONFIG.speed).toBeGreaterThan(0);
    expect(DEFAULT_MOVEMENT_CONFIG.runSpeedMultiplier).toBeGreaterThan(1);
    expect(DEFAULT_MOVEMENT_CONFIG.gravity).toBeLessThan(0);
    
    expect(DEFAULT_AVATAR_CONFIG.scale).toBe(1);
    expect(DEFAULT_AVATAR_CONFIG.animationBlendTime).toBeGreaterThan(0);
    
    expect(DEFAULT_CAMERA_OFFSET.distance).toBeGreaterThan(0);
    expect(DEFAULT_CAMERA_OFFSET.height).toBeGreaterThan(0);
  });
});

describe('PlayerMovement - Helper Functions', () => {
  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('should interpolate between values', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
    });
  });

  describe('calculateMovementDirection', () => {
    it('should calculate movement direction', () => {
      // Test basic functionality without camera rotation
      const direction = calculateMovementDirection(false, false, false, false, 0);
      expect(direction).toBeDefined();
      expect(direction.x).toBeDefined();
      expect(direction.y).toBeDefined();
      expect(direction.z).toBeDefined();
    });

    it('should handle no input', () => {
      const direction = calculateMovementDirection(false, false, false, false, 0);
      expect(direction.x).toBe(0);
      expect(direction.y).toBe(0); 
      expect(direction.z).toBe(0);
    });
  });

  describe('checkGrounded', () => {
    it('should detect grounded state', () => {
      const position = new Vector3(0, 0.05, 0);
      expect(checkGrounded(position, 0, 0.1)).toBe(true);
      
      const airbornePosition = new Vector3(0, 2, 0);
      expect(checkGrounded(airbornePosition, 0, 0.1)).toBe(false);
    });
  });

  describe('angle utilities', () => {
    it('should convert degrees to radians', () => {
      expect(degToRad(180)).toBeCloseTo(Math.PI, 5);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should convert radians to degrees', () => {
      expect(radToDeg(Math.PI)).toBeCloseTo(180, 5);
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 5);
    });

    it('should wrap angles correctly', () => {
      expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 5);
      expect(wrapAngle(-Math.PI * 3)).toBeCloseTo(-Math.PI, 5);
    });
  });
});

describe('PlayerMovement - Architecture Validation', () => {
  it('should be modular and importable', async () => {
    // Test that the main module can be imported
    const PlayerMovementModule = await import('../components/PlayerMovement');
    
    expect(PlayerMovementModule.default).toBeDefined();
    expect(PlayerMovementModule.PlayerMovementSystem).toBeDefined();
    expect(PlayerMovementModule.usePlayerMovement).toBeDefined();
    expect(PlayerMovementModule.PlayerAvatar).toBeDefined();
  });

  it('should export all required types', async () => {
    const types = await import('../components/PlayerMovement/types');
    
    expect(types.AnimationState).toBeDefined();
    expect(types.PerspectiveMode).toBeDefined();
    expect(types.DEFAULT_MOVEMENT_CONFIG).toBeDefined();
    expect(types.DEFAULT_AVATAR_CONFIG).toBeDefined();
    expect(types.DEFAULT_CAMERA_OFFSET).toBeDefined();
  });

  it('should export all helper functions', async () => {
    const helpers = await import('../components/PlayerMovement/movementHelpers');
    
    const expectedFunctions = [
      'clamp', 'lerp', 'lerpVector3', 'smoothDamp', 'smoothDampVector3',
      'applyFriction', 'applyAirResistance', 'calculateMovementDirection',
      'checkGrounded', 'calculateThirdPersonCameraPosition', 'degToRad',
      'radToDeg', 'wrapAngle', 'deltaAngle', 'lerpAngle'
    ];
    
    expectedFunctions.forEach(funcName => {
      expect(helpers[funcName]).toBeDefined();
      expect(typeof helpers[funcName]).toBe('function');
    });
  });
});

describe('PlayerMovement - API Contract', () => {
  it('should maintain stable API surface', async () => {
    // This test ensures that the public API doesn't break
    const expectedExports = [
      'AnimationState',
      'PerspectiveMode', 
      'DEFAULT_MOVEMENT_CONFIG',
      'DEFAULT_AVATAR_CONFIG',
      'DEFAULT_CAMERA_OFFSET'
    ];
    
    const types = await import('../components/PlayerMovement/types');
    
    expectedExports.forEach(exportName => {
      expect(types[exportName]).toBeDefined();
    });
  });

  it('should have proper TypeScript types', () => {
    // Basic type checking - if this compiles, types are working
    const config: typeof DEFAULT_MOVEMENT_CONFIG = {
      ...DEFAULT_MOVEMENT_CONFIG,
      speed: 10
    };
    
    expect(config.speed).toBe(10);
    expect(config.runSpeedMultiplier).toBe(DEFAULT_MOVEMENT_CONFIG.runSpeedMultiplier);
  });
});
