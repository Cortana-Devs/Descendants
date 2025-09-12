import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Euler } from 'three';
import {
  PlayerMovementConfig,
  PlayerMovementState,
  MovementInput,
  AnimationState,
  UsePlayerMovementReturn,
  DEFAULT_MOVEMENT_CONFIG
} from './types';
import {
  calculateMovementDirection,
  applyFriction,
  applyAirResistance,
  checkGrounded,
  clampToWorldBounds,
  smoothDampVector3,
  lerpAngle
} from './movementHelpers';

/**
 * Custom hook for player movement with WASD controls, physics, and camera integration
 */
export function usePlayerMovement(
  initialConfig: Partial<PlayerMovementConfig> = {}
): UsePlayerMovementReturn {
  const { camera, gl } = useThree();
  
  // Merge config with defaults
  const config = useRef<PlayerMovementConfig>({
    ...DEFAULT_MOVEMENT_CONFIG,
    ...initialConfig
  });
  
  // Movement state
  const movementState = useRef<PlayerMovementState>({
    position: new Vector3(0, 0, 0),
    rotation: new Euler(0, 0, 0),
    velocity: new Vector3(0, 0, 0),
    isGrounded: true,
    isJumping: false,
    isCrouching: false,
    isRunning: false,
    animationState: AnimationState.IDLE,
    lastUpdateTime: performance.now()
  });
  
  // Input state
  const inputState = useRef<MovementInput>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    crouch: false,
    run: false
  });
  
  // Mouse look state
  const mouseState = useRef({
    isLocked: false,
    pitch: 0,
    yaw: 0,
    sensitivity: config.current.mouseSensitivity
  });
  
  // Velocity damping for smooth movement
  const velocityDamping = useRef(new Vector3());
  
  // World bounds (can be customized)
  const worldBounds = useRef({
    min: new Vector3(-100, -10, -100),
    max: new Vector3(100, 50, 100)
  });
  
  /**
   * Handle keyboard input
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        inputState.current.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        inputState.current.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        inputState.current.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        inputState.current.right = true;
        break;
      case 'Space':
        event.preventDefault();
        inputState.current.jump = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        inputState.current.run = true;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        inputState.current.crouch = true;
        break;
    }
  }, []);
  
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        inputState.current.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        inputState.current.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        inputState.current.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        inputState.current.right = false;
        break;
      case 'Space':
        inputState.current.jump = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        inputState.current.run = false;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        inputState.current.crouch = false;
        break;
    }
  }, []);
  
  /**
   * Handle mouse movement for look controls - optimized
   */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!mouseState.current.isLocked) return;
    
    const { movementX, movementY } = event;
    const sensitivity = mouseState.current.sensitivity;
    
    // Direct mutation for performance (no state updates)
    mouseState.current.yaw -= movementX * sensitivity;
    mouseState.current.pitch -= movementY * sensitivity;
    
    // Clamp pitch to prevent over-rotation (more precise values)
    mouseState.current.pitch = Math.max(
      -Math.PI / 2 + 0.1, // Slight offset to prevent gimbal lock
      Math.min(Math.PI / 2 - 0.1, mouseState.current.pitch)
    );
  }, []);
  
  /**
   * Handle pointer lock changes - improved error handling
   */
  const handlePointerLockChange = useCallback(() => {
    mouseState.current.isLocked = document.pointerLockElement === gl.domElement;
    
    // Reset mouse state when unlocking to prevent jumps
    if (!mouseState.current.isLocked) {
      mouseState.current.pitch = 0;
      mouseState.current.yaw = 0;
    }
  }, [gl.domElement]);
  
  /**
   * Request pointer lock for mouse look - with error handling
   */
  const requestPointerLock = useCallback(async () => {
    try {
      await gl.domElement.requestPointerLock();
    } catch (error) {
      console.warn('Pointer lock request failed:', error);
    }
  }, [gl.domElement]);
  
  /**
   * Setup event listeners - optimized to prevent memory leaks
   */
  useEffect(() => {
    const canvas = gl.domElement;
    
    // Use passive listeners where possible for better performance
    const keydownOptions = { passive: false }; // Need to prevent default for some keys
    const mousemoveOptions = { passive: true }; // Mouse move can be passive
    
    // Keyboard events
    window.addEventListener('keydown', handleKeyDown, keydownOptions);
    window.addEventListener('keyup', handleKeyUp, keydownOptions);
    
    // Mouse events - with better error handling
    canvas.addEventListener('mousemove', handleMouseMove, mousemoveOptions);
    canvas.addEventListener('click', requestPointerLock, { passive: true });
    document.addEventListener('pointerlockchange', handlePointerLockChange, { passive: true });
    
    // Cleanup function with error handling
    return () => {
      try {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', requestPointerLock);
        document.removeEventListener('pointerlockchange', handlePointerLockChange);
      } catch (error) {
        console.warn('Error cleaning up event listeners:', error);
      }
    };
  }, [handleKeyDown, handleKeyUp, handleMouseMove, requestPointerLock, handlePointerLockChange, gl.domElement]);
  
  /**
   * Update movement state based on input and physics
   */
  const updateMovement = useCallback((deltaTime: number) => {
    const state = movementState.current;
    const input = inputState.current;
    const conf = config.current;
    
    // Calculate movement direction based on camera rotation
    const cameraRotation = config.current.cameraLock ? mouseState.current.yaw : 0;
    const movementDir = calculateMovementDirection(
      input.forward,
      input.backward,
      input.left,
      input.right,
      cameraRotation
    );
    
    // Determine movement speed based on state
    let speed = conf.speed;
    if (input.run && !input.crouch) {
      speed *= conf.runSpeedMultiplier;
      state.isRunning = true;
    } else {
      state.isRunning = false;
    }
    
    if (input.crouch) {
      speed *= conf.crouchSpeedMultiplier;
      state.isCrouching = true;
    } else {
      state.isCrouching = false;
    }
    
    // Apply movement to velocity (frame-rate independent)
    if (movementDir.length() > 0) {
      const targetVelocity = movementDir.multiplyScalar(speed);
      
      if (conf.usePhysics) {
        // Smooth velocity changes for more realistic movement
        state.velocity = smoothDampVector3(
          state.velocity,
          new Vector3(targetVelocity.x, state.velocity.y, targetVelocity.z),
          velocityDamping.current,
          0.1,
          Infinity,
          deltaTime
        );
      } else {
        // Direct velocity assignment for responsive controls (frame-rate independent)
        const acceleration = 20; // units per second squared
        const maxSpeed = speed;
        
        // Accelerate towards target velocity
        const velocityChange = targetVelocity.clone().sub(
          new Vector3(state.velocity.x, 0, state.velocity.z)
        ).multiplyScalar(acceleration * deltaTime);
        
        state.velocity.x += velocityChange.x;
        state.velocity.z += velocityChange.z;
        
        // Clamp to max speed
        const horizontalSpeed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
        if (horizontalSpeed > maxSpeed) {
          const scale = maxSpeed / horizontalSpeed;
          state.velocity.x *= scale;
          state.velocity.z *= scale;
        }
      }
    } else {
      // Apply friction when not moving (frame-rate independent)
      if (conf.usePhysics) {
        state.velocity = applyFriction(state.velocity, conf.friction, deltaTime);
      } else {
        // Exponential decay for smooth stopping
        const friction = 0.1; // friction coefficient  
        const frictionForce = 1 - Math.pow(friction, deltaTime);
        state.velocity.x *= frictionForce;
        state.velocity.z *= frictionForce;
      }
    }
    
    // Handle jumping
    if (input.jump && state.isGrounded && !state.isJumping) {
      state.velocity.y = conf.jumpForce;
      state.isJumping = true;
      state.isGrounded = false;
    }
    
    // Apply gravity
    if (conf.usePhysics && !state.isGrounded) {
      state.velocity.y += conf.gravity * deltaTime;
      
      // Apply air resistance
      state.velocity = applyAirResistance(state.velocity, conf.airResistance, deltaTime);
    }
    
    // Update position
    const deltaPosition = state.velocity.clone().multiplyScalar(deltaTime);
    state.position.add(deltaPosition);
    
    // Ground check and collision
    state.isGrounded = checkGrounded(state.position);
    if (state.isGrounded && state.velocity.y <= 0) {
      state.position.y = Math.max(0, state.position.y); // Simple ground constraint
      state.velocity.y = 0;
      if (state.isJumping) {
        state.isJumping = false;
      }
    }
    
    // Clamp to world bounds
    state.position = clampToWorldBounds(state.position, worldBounds.current);
    
    // Update rotation for look controls
    if (config.current.cameraLock) {
      state.rotation.y = lerpAngle(state.rotation.y, mouseState.current.yaw, 0.1);
    }
    
    // Determine animation state
    const isMoving = Math.abs(state.velocity.x) > 0.1 || Math.abs(state.velocity.z) > 0.1;
    
    if (!state.isGrounded) {
      if (state.velocity.y > 0) {
        state.animationState = AnimationState.JUMP;
      } else {
        state.animationState = AnimationState.FALL;
      }
    } else if (state.isCrouching) {
      state.animationState = AnimationState.CROUCH;
    } else if (isMoving) {
      state.animationState = state.isRunning ? AnimationState.RUN : AnimationState.WALK;
    } else {
      state.animationState = AnimationState.IDLE;
    }
    
    state.lastUpdateTime = performance.now();
  }, []);
  
  /**
   * Frame update loop - optimized for performance
   */
  useFrame((state, delta) => {
    // Use proper delta time for frame-rate independence
    updateMovement(delta);
    
    // Update camera position based on movement (direct mutation for performance)
    if (config.current.cameraLock) {
      const pos = movementState.current.position;
      camera.position.set(pos.x, pos.y + 1.7, pos.z); // Direct assignment
      
      // Apply look rotation with proper Euler order
      camera.rotation.order = 'YXZ'; // Prevent gimbal lock
      camera.rotation.x = mouseState.current.pitch;
      camera.rotation.y = mouseState.current.yaw;
      camera.rotation.z = 0;
    }
  });
  
  /**
   * Public API methods
   */
  const updateConfig = useCallback((newConfig: Partial<PlayerMovementConfig>) => {
    config.current = { ...config.current, ...newConfig };
    mouseState.current.sensitivity = config.current.mouseSensitivity;
  }, []);
  
  const reset = useCallback(() => {
    movementState.current = {
      position: new Vector3(0, 0, 0),
      rotation: new Euler(0, 0, 0),
      velocity: new Vector3(0, 0, 0),
      isGrounded: true,
      isJumping: false,
      isCrouching: false,
      isRunning: false,
      animationState: AnimationState.IDLE,
      lastUpdateTime: performance.now()
    };
    
    mouseState.current.pitch = 0;
    mouseState.current.yaw = 0;
  }, []);
  
  const getDirection = useCallback((): Vector3 => {
    return calculateMovementDirection(
      inputState.current.forward,
      inputState.current.backward,
      inputState.current.left,
      inputState.current.right,
      mouseState.current.yaw
    );
  }, []);
  
  const isMoving = useCallback((): boolean => {
    const state = movementState.current;
    return Math.abs(state.velocity.x) > 0.1 || Math.abs(state.velocity.z) > 0.1;
  }, []);
  
  const getCurrentSpeed = useCallback((): number => {
    const velocity = movementState.current.velocity;
    return Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
  }, []);
  
  const teleport = useCallback((position: Vector3) => {
    movementState.current.position.copy(position);
    movementState.current.velocity.x = 0;
    movementState.current.velocity.y = 0;
    movementState.current.velocity.z = 0;
  }, []);
  
  return {
    movementState: movementState.current,
    inputState: inputState.current,
    updateConfig,
    reset,
    getDirection,
    isMoving,
    getCurrentSpeed,
    teleport
  };
}
