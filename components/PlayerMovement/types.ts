import { Vector3, Euler } from 'three';

/**
 * Animation states for the player avatar
 */
export enum AnimationState {
  IDLE = 'idle',
  WALK = 'walk',
  RUN = 'run',
  JUMP = 'jump',
  CROUCH = 'crouch',
  FALL = 'fall',
  LAND = 'land'
}

/**
 * Camera perspective modes
 */
export enum PerspectiveMode {
  FIRST_PERSON = 'first-person',
  THIRD_PERSON = 'third-person'
}

/**
 * Movement input state
 */
export interface MovementInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  run: boolean;
}

/**
 * Player movement configuration
 */
export interface PlayerMovementConfig {
  /** Base movement speed in units per second */
  speed: number;
  /** Running speed multiplier */
  runSpeedMultiplier: number;
  /** Crouching speed multiplier */
  crouchSpeedMultiplier: number;
  /** Jump force/velocity */
  jumpForce: number;
  /** Whether camera should lock to movement direction */
  cameraLock: boolean;
  /** Mouse sensitivity for look controls */
  mouseSensitivity: number;
  /** Whether to use physics-based movement */
  usePhysics: boolean;
  /** Gravity force when using physics */
  gravity: number;
  /** Ground friction coefficient */
  friction: number;
  /** Air resistance coefficient */
  airResistance: number;
}

/**
 * Player movement state
 */
export interface PlayerMovementState {
  /** Current position in world space */
  position: Vector3;
  /** Current rotation (euler angles) */
  rotation: Euler;
  /** Current velocity vector */
  velocity: Vector3;
  /** Whether player is on ground */
  isGrounded: boolean;
  /** Whether player is jumping */
  isJumping: boolean;
  /** Whether player is crouching */
  isCrouching: boolean;
  /** Whether player is running */
  isRunning: boolean;
  /** Current animation state */
  animationState: AnimationState;
  /** Time of last movement update */
  lastUpdateTime: number;
}

/**
 * Player avatar configuration
 */
export interface PlayerAvatarConfig {
  /** URL to the GLB/GLTF model file */
  modelUrl: string;
  /** Scale factor for the model */
  scale: number;
  /** Y-offset for model positioning */
  yOffset: number;
  /** Whether to show the avatar in first-person mode */
  showInFirstPerson: boolean;
  /** Whether to show hands/arms in first-person */
  showHandsInFirstPerson: boolean;
  /** Animation blending time in seconds */
  animationBlendTime: number;
  /** Available animation names mapped to states */
  animationMap: Partial<Record<AnimationState, string>>;
}

/**
 * Physics collision result
 */
export interface CollisionResult {
  /** Whether a collision occurred */
  hasCollision: boolean;
  /** Collision normal vector */
  normal: Vector3;
  /** Collision point */
  point: Vector3;
  /** Distance to collision */
  distance: number;
}

/**
 * Camera offset configuration for third-person mode (Legacy - simple)
 */
export interface CameraOffset {
  /** Distance behind the player */
  distance: number;
  /** Height above the player */
  height: number;
  /** Side offset (for over-shoulder cameras) */
  sideOffset: number;
  /** How smoothly the camera follows (0-1) */
  followSpeed: number;
  /** How smoothly the camera looks (0-1) */
  lookSpeed: number;
}

/**
 * Advanced third-person camera configuration (2025)
 */
export interface AdvancedCameraConfig {
  /** Distance behind the player */
  distance: number;
  /** Height above the player */
  height: number;
  /** Side offset (for over-shoulder cameras) */
  sideOffset: number;
  /** How smoothly the camera follows (0-1) */
  followSpeed: number;
  /** How smoothly the camera looks (0-1) */
  lookSpeed: number;
  /** Minimum pitch angle (radians) */
  pitchMin: number;
  /** Maximum pitch angle (radians) */
  pitchMax: number;
  /** Smooth damping time for spring interpolation */
  smoothTime: number;
  /** Maximum speed for smooth damping */
  maxSpeed: number;
  /** Auto-rotate speed when returning camera behind player */
  autoRotateSpeed: number;
  /** Mouse sensitivity for camera control */
  mouseSensitivity: number;
  /** Enable mouse control for camera */
  enableMouseControl: boolean;
  /** Enable collision detection */
  enableCollision: boolean;
  /** Collision radius for camera */
  collisionRadius: number;
  /** Minimum zoom distance */
  zoomMin: number;
  /** Maximum zoom distance */
  zoomMax: number;
  /** Zoom speed */
  zoomSpeed: number;
}

/**
 * Player movement hook return type
 */
export interface UsePlayerMovementReturn {
  /** Current movement state */
  movementState: PlayerMovementState;
  /** Current input state */
  inputState: MovementInput;
  /** Update movement configuration */
  updateConfig: (config: Partial<PlayerMovementConfig>) => void;
  /** Reset player position and state */
  reset: () => void;
  /** Get movement direction vector */
  getDirection: () => Vector3;
  /** Check if player is moving */
  isMoving: () => boolean;
  /** Get current speed */
  getCurrentSpeed: () => number;
  /** Teleport player to position */
  teleport: (position: Vector3) => void;
}

/**
 * Default configurations
 */
export const DEFAULT_MOVEMENT_CONFIG: PlayerMovementConfig = {
  speed: 6, // Slightly faster for better responsiveness
  runSpeedMultiplier: 1.8, // More realistic run speed
  crouchSpeedMultiplier: 0.4, // Slower crouch for stealth
  jumpForce: 12, // Higher jump for better gameplay
  cameraLock: true,
  mouseSensitivity: 0.0015, // Lower sensitivity for better control
  usePhysics: true,
  gravity: -25, // Stronger gravity for snappier movement
  friction: 0.85, // Better stopping power
  airResistance: 0.98 // Minimal air resistance
};

export const DEFAULT_AVATAR_CONFIG: PlayerAvatarConfig = {
  modelUrl: '/models/default-avatar.glb',
  scale: 1,
  yOffset: 0,
  showInFirstPerson: false,
  showHandsInFirstPerson: true,
  animationBlendTime: 0.2,
  animationMap: {
    [AnimationState.IDLE]: 'Idle',
    [AnimationState.WALK]: 'Walk',
    [AnimationState.RUN]: 'Run',
    [AnimationState.JUMP]: 'Jump',
    [AnimationState.CROUCH]: 'Crouch',
    [AnimationState.FALL]: 'Fall',
    [AnimationState.LAND]: 'Land'
  }
};

export const DEFAULT_CAMERA_OFFSET: CameraOffset = {
  distance: 8, // Further back for better view
  height: 3, // Higher for better perspective
  sideOffset: 0.5, // Slight offset for cinematic feel
  followSpeed: 0.15, // Faster following for responsiveness
  lookSpeed: 0.1
};

export const DEFAULT_ADVANCED_CAMERA_CONFIG: AdvancedCameraConfig = {
  distance: 8,
  height: 3,
  sideOffset: 0.5,
  followSpeed: 0.15,
  lookSpeed: 0.1,
  pitchMin: -Math.PI / 3, // -60 degrees
  pitchMax: Math.PI / 3,  // +60 degrees
  smoothTime: 0.2, // Responsive spring damping
  maxSpeed: 50, // Fast camera movement
  autoRotateSpeed: 2, // 2 radians per second auto-rotation
  mouseSensitivity: 0.005, // Precise mouse control
  enableMouseControl: true,
  enableCollision: true,
  collisionRadius: 0.5,
  zoomMin: 3,
  zoomMax: 15,
  zoomSpeed: 2
};
