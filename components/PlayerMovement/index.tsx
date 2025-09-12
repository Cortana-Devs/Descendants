import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { usePlayerMovement } from './usePlayerMovement';
import { PlayerAvatar } from './PlayerAvatar';
import { useWorldStore } from '../../store/worldStore';
import {
  PlayerMovementConfig,
  PlayerAvatarConfig,
  PerspectiveMode,
  AnimationState,
  CameraOffset,
  AdvancedCameraConfig,
  DEFAULT_MOVEMENT_CONFIG,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_CAMERA_OFFSET,
  DEFAULT_ADVANCED_CAMERA_CONFIG
} from './types';
import {
  createThirdPersonCameraState,
  updateThirdPersonCamera,
  ThirdPersonCameraState,
  calculateThirdPersonCameraPosition
} from './movementHelpers';

interface PlayerMovementSystemProps {
  /** Movement configuration */
  movementConfig?: Partial<PlayerMovementConfig>;
  /** Avatar configuration */
  avatarConfig?: Partial<PlayerAvatarConfig>;
  /** Camera perspective mode */
  perspectiveMode?: PerspectiveMode;
  /** Camera offset for third-person mode (Legacy - simple) */
  cameraOffset?: Partial<CameraOffset>;
  /** Advanced camera configuration (2025 - recommended) */
  advancedCameraConfig?: Partial<AdvancedCameraConfig>;
  /** Use advanced camera system instead of legacy */
  useAdvancedCamera?: boolean;
  /** Whether the system is enabled */
  enabled?: boolean;
  /** Initial spawn position */
  spawnPosition?: Vector3;
  /** Whether to sync with world store */
  syncWithStore?: boolean;
  /** Callback when player moves */
  onMove?: (position: Vector3, velocity: Vector3) => void;
  /** Callback when animation state changes */
  onAnimationChange?: (state: AnimationState) => void;
}

/**
 * Main PlayerMovementSystem component that integrates movement, avatar, and camera
 */
export default function PlayerMovementSystem({
  movementConfig = {},
  avatarConfig = {},
  perspectiveMode = PerspectiveMode.THIRD_PERSON,
  cameraOffset: userCameraOffset = {},
  advancedCameraConfig: userAdvancedCameraConfig = {},
  useAdvancedCamera = true, // Default to new system
  enabled = true,
  spawnPosition = new Vector3(0, 0, 0),
  syncWithStore = true,
  onMove,
  onAnimationChange
}: PlayerMovementSystemProps) {
  const { camera } = useThree();
  
  // World store integration
  const {
    playerAvatar,
    setPlayerAvatar,
    updateAvatarPosition,
    updateAvatarAnimation,
    updateAvatarState
  } = useWorldStore();
  
  // Merge configurations with defaults
  const finalMovementConfig = useMemo(() => ({
    ...DEFAULT_MOVEMENT_CONFIG,
    ...movementConfig
  }), [movementConfig]);
  
  const finalAvatarConfig = useMemo(() => ({
    ...DEFAULT_AVATAR_CONFIG,
    modelUrl: '/models/player_ReadyPlayerMe.glb', // Use available RPM model
    animationMap: {
      // For now, use simple fallback since external animation GLBs need different loading
      [AnimationState.IDLE]: 'idle',
      [AnimationState.WALK]: 'walk', 
      [AnimationState.RUN]: 'run',
      [AnimationState.JUMP]: 'jump',
      [AnimationState.CROUCH]: 'crouch',
      [AnimationState.FALL]: 'fall',
      [AnimationState.LAND]: 'land'
    },
    ...avatarConfig
  }), [avatarConfig]);
  
  const cameraOffset = useMemo(() => ({
    ...DEFAULT_CAMERA_OFFSET,
    ...userCameraOffset
  }), [userCameraOffset]);

  const advancedCameraConfig = useMemo(() => ({
    ...DEFAULT_ADVANCED_CAMERA_CONFIG,
    ...userAdvancedCameraConfig
  }), [userAdvancedCameraConfig]);

  // Advanced camera state (only used when useAdvancedCamera is true)
  const advancedCameraState = useRef<ThirdPersonCameraState | null>(null);
  const mouseInput = useRef<{ deltaX: number; deltaY: number } | null>(null);
  
  // Initialize player movement hook
  const {
    movementState,
    inputState,
    updateConfig,
    reset,
    getDirection,
    isMoving,
    getCurrentSpeed,
    teleport
  } = usePlayerMovement(finalMovementConfig);
  
  // Initialize player avatar in world store
  useEffect(() => {
    if (!syncWithStore || !enabled) return;
    
    if (!playerAvatar) {
      setPlayerAvatar({
        id: 'player',
        modelUrl: finalAvatarConfig.modelUrl,
        position: spawnPosition.clone(),
        rotation: new Vector3(0, 0, 0),
        scale: new Vector3(1, 1, 1),
        currentAnimation: AnimationState.IDLE,
        animationSpeed: 1,
        isVisible: true,
        lastUpdateTime: performance.now()
      });
      
      // Set initial position
      teleport(spawnPosition);
    }
  }, [
    playerAvatar,
    setPlayerAvatar,
    syncWithStore,
    enabled,
    spawnPosition,
    finalAvatarConfig.modelUrl,
    teleport
  ]);
  
  // Update world store with movement state (optimized to reduce re-renders)
  const lastSyncTime = useRef(0);
  const syncThrottle = 1000 / 30; // 30 FPS sync rate to reduce overhead
  
  useFrame(() => {
    if (!syncWithStore || !enabled) return;
    
    const now = performance.now();
    if (now - lastSyncTime.current < syncThrottle) return;
    lastSyncTime.current = now;
    
    const { position, animationState, velocity } = movementState;
    
    // Direct store updates (avoid useEffect for performance)
    updateAvatarPosition(position);
    updateAvatarAnimation(animationState);
    
    // Trigger callbacks (throttled)
    if (onMove) {
      onMove(position, velocity);
    }
    
    if (onAnimationChange) {
      onAnimationChange(animationState);
    }
  });
  
  // Camera management for different perspective modes
  useEffect(() => {
    if (!enabled) return;
    
    // Disable camera lock in movement hook for third-person mode
    if (perspectiveMode === PerspectiveMode.THIRD_PERSON) {
      updateConfig({ cameraLock: false });
    } else {
      updateConfig({ cameraLock: true });
    }
  }, [perspectiveMode, enabled, updateConfig]);
  
  // Initialize advanced camera state
  useEffect(() => {
    if (useAdvancedCamera && !advancedCameraState.current) {
      advancedCameraState.current = createThirdPersonCameraState(
        movementState.position,
        advancedCameraConfig.distance
      );
    }
  }, [useAdvancedCamera, advancedCameraConfig.distance, movementState.position]);

  // Mouse input handling for advanced camera (when enabled)
  useEffect(() => {
    if (!useAdvancedCamera || !enabled || !advancedCameraConfig.enableMouseControl) return;

    const handleMouseMove = (event: MouseEvent) => {
      // Only handle if pointer is locked and we're in third-person mode
      if (document.pointerLockElement && perspectiveMode === PerspectiveMode.THIRD_PERSON) {
        mouseInput.current = {
          deltaX: event.movementX,
          deltaY: event.movementY
        };
      }
    };

    const handleWheel = (event: WheelEvent) => {
      // Zoom functionality
      if (advancedCameraState.current && perspectiveMode === PerspectiveMode.THIRD_PERSON) {
        const zoomDelta = event.deltaY * 0.001 * advancedCameraConfig.zoomSpeed;
        const newDistance = Math.max(
          advancedCameraConfig.zoomMin,
          Math.min(
            advancedCameraConfig.zoomMax,
            advancedCameraState.current.targetDistance + zoomDelta
          )
        );
        advancedCameraState.current.targetDistance = newDistance;
        event.preventDefault();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [useAdvancedCamera, enabled, advancedCameraConfig, perspectiveMode]);

  // Third-person camera update (2025 advanced system)
  useFrame((state, delta) => {
    if (!enabled || perspectiveMode !== PerspectiveMode.THIRD_PERSON) return;
    
    const { position, rotation } = movementState;
    
    if (useAdvancedCamera && advancedCameraState.current) {
      // Use advanced camera system with spring damping
      const newCameraPosition = updateThirdPersonCamera(
        advancedCameraState.current,
        position,
        { x: rotation.x, y: rotation.y, z: rotation.z },
        advancedCameraConfig,
        delta,
        mouseInput.current || undefined
      );
      
      // Update camera position and look-at
      camera.position.copy(newCameraPosition);
      camera.lookAt(advancedCameraState.current.lookAt);
      camera.rotation.order = 'YXZ';
      
      // Reset mouse input after use
      mouseInput.current = null;
    } else {
      // Legacy camera system (fallback)
      const cameraPosition = calculateThirdPersonCameraPosition(
        position,
        { x: rotation.x, y: rotation.y, z: rotation.z },
        cameraOffset.distance,
        cameraOffset.height,
        cameraOffset.sideOffset
      );
      
      // Frame-rate independent smooth camera following
      const lerpFactor = 1 - Math.pow(1 - cameraOffset.followSpeed, delta * 60);
      camera.position.lerp(cameraPosition, lerpFactor);
      
      // Look at player with smooth interpolation
      const lookTarget = position.clone();
      lookTarget.y += 1.5; // Look at head height
      camera.lookAt(lookTarget);
      
      // Set proper rotation order to prevent gimbal lock
      camera.rotation.order = 'YXZ';
    }
  });
  
  // Public API methods (can be exposed via ref if needed)
  const api = useMemo(() => ({
    // Movement controls
    reset,
    teleport,
    getDirection,
    isMoving,
    getCurrentSpeed,
    updateMovementConfig: updateConfig,
    
    // State getters
    getPosition: () => movementState.position.clone(),
    getRotation: () => movementState.rotation.clone(),
    getVelocity: () => movementState.velocity.clone(),
    getAnimationState: () => movementState.animationState,
    
    // Perspective controls
    setPerspectiveMode: (mode: PerspectiveMode) => {
      // This would need to be handled by parent component
      console.log('Perspective mode change requested:', mode);
    }
  }), [
    reset,
    teleport,
    getDirection,
    isMoving,
    getCurrentSpeed,
    updateConfig,
    movementState
  ]);
  
  // Debug info (can be removed in production)
  const debugInfo = useMemo(() => ({
    position: movementState.position,
    velocity: movementState.velocity,
    isGrounded: movementState.isGrounded,
    isMoving: isMoving(),
    currentSpeed: getCurrentSpeed(),
    animationState: movementState.animationState,
    inputState
  }), [movementState, inputState, isMoving, getCurrentSpeed]);
  
  // Don't render if disabled
  if (!enabled) {
    return null;
  }
  
  return (
    <>
      {/* Player Avatar */}
      <PlayerAvatar
        position={movementState.position}
        rotation={movementState.rotation}
        animationState={movementState.animationState}
        config={finalAvatarConfig}
        perspectiveMode={perspectiveMode}
        visible={true}
        onLoad={() => console.log('Player avatar loaded successfully')}
        onError={(error) => console.error('Player avatar loading error:', error)}
      />
      
      {/* Debug Panel disabled to prevent R3F namespace errors */}
      {/* TODO: Implement debug panel outside of Canvas context */}
    </>
  );
}

// Debug panel temporarily removed to prevent R3F namespace conflicts
// TODO: Implement debug panel in a separate component outside Canvas context

// Export the main component and utilities
export { PlayerMovementSystem };
export * from './types';
export * from './movementHelpers';
export { usePlayerMovement } from './usePlayerMovement';
export { PlayerAvatar } from './PlayerAvatar';
