import { Vector3 } from 'three';
import { CollisionResult } from './types';

/**
 * Clamps a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Linear interpolation between two Vector3s
 */
export function lerpVector3(start: Vector3, end: Vector3, factor: number): Vector3 {
  return new Vector3(
    lerp(start.x, end.x, factor),
    lerp(start.y, end.y, factor),
    lerp(start.z, end.z, factor)
  );
}

/**
 * Smoothly damp a value towards a target (similar to Unity's SmoothDamp)
 */
export function smoothDamp(
  current: number,
  target: number,
  velocity: { current: number },
  smoothTime: number,
  maxSpeed: number = Infinity,
  deltaTime: number
): number {
  // Based on Game Programming Gems 4 Chapter 1.10
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  
  let change = current - target;
  const originalTo = target;
  
  // Clamp maximum speed
  const maxChange = maxSpeed * smoothTime;
  change = clamp(change, -maxChange, maxChange);
  target = current - change;
  
  const temp = (velocity.current + omega * change) * deltaTime;
  velocity.current = (velocity.current - omega * temp) * exp;
  let output = target + (change + temp) * exp;
  
  // Prevent overshooting
  if (originalTo - current > 0 === output > originalTo) {
    output = originalTo;
    velocity.current = (output - originalTo) / deltaTime;
  }
  
  return output;
}

/**
 * Smoothly damp a Vector3 towards a target
 */
export function smoothDampVector3(
  current: Vector3,
  target: Vector3,
  velocity: Vector3,
  smoothTime: number,
  maxSpeed: number = Infinity,
  deltaTime: number
): Vector3 {
  const velocityRef = { current: 0 };
  
  velocityRef.current = velocity.x;
  const x = smoothDamp(current.x, target.x, velocityRef, smoothTime, maxSpeed, deltaTime);
  velocity.x = velocityRef.current;
  
  velocityRef.current = velocity.y;
  const y = smoothDamp(current.y, target.y, velocityRef, smoothTime, maxSpeed, deltaTime);
  velocity.y = velocityRef.current;
  
  velocityRef.current = velocity.z;
  const z = smoothDamp(current.z, target.z, velocityRef, smoothTime, maxSpeed, deltaTime);
  velocity.z = velocityRef.current;
  
  return new Vector3(x, y, z);
}

/**
 * Apply friction to a velocity vector
 */
export function applyFriction(velocity: Vector3, friction: number, deltaTime: number): Vector3 {
  const frictionForce = 1 - Math.pow(friction, deltaTime);
  return velocity.clone().multiplyScalar(1 - frictionForce);
}

/**
 * Apply air resistance to a velocity vector
 */
export function applyAirResistance(velocity: Vector3, resistance: number, deltaTime: number): Vector3 {
  const resistanceForce = 1 - Math.pow(resistance, deltaTime);
  return velocity.clone().multiplyScalar(1 - resistanceForce);
}

/**
 * Calculate movement direction from input
 */
export function calculateMovementDirection(
  forward: boolean,
  backward: boolean,
  left: boolean,
  right: boolean,
  cameraRotation: number
): Vector3 {
  const direction = new Vector3();
  
  if (forward) direction.z -= 1;
  if (backward) direction.z += 1;
  if (left) direction.x -= 1;
  if (right) direction.x += 1;
  
  // Normalize diagonal movement
  if (direction.length() > 0) {
    direction.normalize();
  }
  
  // Apply camera rotation
  if (direction.length() > 0) {
    const rotatedDirection = direction.clone();
    rotatedDirection.applyAxisAngle(new Vector3(0, 1, 0), cameraRotation);
    return rotatedDirection;
  }
  
  return direction;
}

/**
 * Check if a point is grounded (simplified ground detection)
 */
export function checkGrounded(
  position: Vector3,
  groundLevel: number = 0,
  tolerance: number = 0.1
): boolean {
  return position.y <= groundLevel + tolerance;
}

/**
 * Perform a simple collision check against a bounding box
 */
export function checkCollision(
  position: Vector3,
  velocity: Vector3,
  boundingBox: { min: Vector3; max: Vector3 }
): CollisionResult {
  const newPosition = position.clone().add(velocity);
  
  const hasCollision = 
    newPosition.x >= boundingBox.min.x && newPosition.x <= boundingBox.max.x &&
    newPosition.y >= boundingBox.min.y && newPosition.y <= boundingBox.max.y &&
    newPosition.z >= boundingBox.min.z && newPosition.z <= boundingBox.max.z;
  
  if (!hasCollision) {
    return {
      hasCollision: false,
      normal: new Vector3(),
      point: new Vector3(),
      distance: 0
    };
  }
  
  // Calculate collision normal (simplified - assumes box collision)
  const center = boundingBox.min.clone().add(boundingBox.max).multiplyScalar(0.5);
  const normal = newPosition.clone().sub(center).normalize();
  
  return {
    hasCollision: true,
    normal,
    point: newPosition.clone(),
    distance: position.distanceTo(newPosition)
  };
}

/**
 * Clamp position to world bounds
 */
export function clampToWorldBounds(
  position: Vector3,
  worldBounds: { min: Vector3; max: Vector3 }
): Vector3 {
  return new Vector3(
    clamp(position.x, worldBounds.min.x, worldBounds.max.x),
    clamp(position.y, worldBounds.min.y, worldBounds.max.y),
    clamp(position.z, worldBounds.min.z, worldBounds.max.z)
  );
}

/**
 * Calculate camera position for third-person view (2025 implementation)
 */
export function calculateThirdPersonCameraPosition(
  playerPosition: Vector3,
  playerRotation: { x: number; y: number; z: number },
  distance: number,
  height: number,
  sideOffset: number = 0
): Vector3 {
  const cameraPosition = playerPosition.clone();
  
  // Calculate offset based on player rotation (improved for Euler)
  const rotationY = playerRotation.y;
  const offsetX = Math.sin(rotationY) * distance + Math.cos(rotationY) * sideOffset;
  const offsetZ = Math.cos(rotationY) * distance - Math.sin(rotationY) * sideOffset;
  
  cameraPosition.x += offsetX;
  cameraPosition.y += height;
  cameraPosition.z += offsetZ;
  
  return cameraPosition;
}

/**
 * Advanced third-person camera controller with spring damping (2025)
 */
export interface ThirdPersonCameraState {
  position: Vector3;
  targetPosition: Vector3;
  lookAt: Vector3;
  targetLookAt: Vector3;
  positionVelocity: Vector3;
  lookAtVelocity: Vector3;
  distance: number;
  targetDistance: number;
  distanceVelocity: { current: number };
  pitch: number;
  targetPitch: number;
  pitchVelocity: { current: number };
  yaw: number;
  targetYaw: number;
  yawVelocity: { current: number };
}

/**
 * Create initial third-person camera state
 */
export function createThirdPersonCameraState(
  initialPosition: Vector3,
  initialDistance: number = 8
): ThirdPersonCameraState {
  return {
    position: initialPosition.clone(),
    targetPosition: initialPosition.clone(),
    lookAt: initialPosition.clone(),
    targetLookAt: initialPosition.clone(),
    positionVelocity: new Vector3(),
    lookAtVelocity: new Vector3(),
    distance: initialDistance,
    targetDistance: initialDistance,
    distanceVelocity: { current: 0 },
    pitch: 0,
    targetPitch: 0,
    pitchVelocity: { current: 0 },
    yaw: 0,
    targetYaw: 0,
    yawVelocity: { current: 0 }
  };
}

/**
 * Update third-person camera with spring damping and collision detection
 */
export function updateThirdPersonCamera(
  cameraState: ThirdPersonCameraState,
  playerPosition: Vector3,
  playerRotation: { x: number; y: number; z: number },
  config: {
    distance: number;
    height: number;
    sideOffset: number;
    followSpeed: number;
    lookSpeed: number;
    pitchMin: number;
    pitchMax: number;
    smoothTime: number;
    maxSpeed: number;
    autoRotateSpeed: number;
  },
  delta: number,
  mouseInput?: { deltaX: number; deltaY: number; sensitivity: number },
  worldBounds?: { min: Vector3; max: Vector3 }
): Vector3 {
  // Handle mouse input for manual camera control
  if (mouseInput) {
    cameraState.targetYaw += mouseInput.deltaX * mouseInput.sensitivity;
    cameraState.targetPitch += mouseInput.deltaY * mouseInput.sensitivity;
    
    // Clamp pitch to prevent over-rotation
    cameraState.targetPitch = clamp(
      cameraState.targetPitch,
      config.pitchMin,
      config.pitchMax
    );
  } else {
    // Auto-rotate camera behind player when no input
    const playerYaw = playerRotation.y;
    const yawDifference = deltaAngle(cameraState.targetYaw, playerYaw);
    
    if (Math.abs(yawDifference) > 0.1) {
      cameraState.targetYaw = lerpAngle(
        cameraState.targetYaw,
        playerYaw,
        config.autoRotateSpeed * delta
      );
    }
  }
  
  // Update distance (for zoom functionality)
  cameraState.targetDistance = config.distance;
  cameraState.distance = smoothDamp(
    cameraState.distance,
    cameraState.targetDistance,
    cameraState.distanceVelocity,
    config.smoothTime * 0.5,
    config.maxSpeed,
    delta
  );
  
  // Smooth camera rotation
  cameraState.pitch = smoothDamp(
    cameraState.pitch,
    cameraState.targetPitch,
    cameraState.pitchVelocity,
    config.smoothTime * 0.3,
    config.maxSpeed,
    delta
  );
  
  cameraState.yaw = smoothDamp(
    cameraState.yaw,
    cameraState.targetYaw,
    cameraState.yawVelocity,
    config.smoothTime * 0.3,
    config.maxSpeed,
    delta
  );
  
  // Calculate ideal camera position with rotation
  const cameraDistance = cameraState.distance;
  const cameraYaw = cameraState.yaw;
  const cameraPitch = cameraState.pitch;
  
  // Calculate spherical coordinates
  const x = Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDistance;
  const y = Math.sin(cameraPitch) * cameraDistance + config.height;
  const z = Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDistance;
  
  // Apply side offset
  const sideX = Math.cos(cameraYaw) * config.sideOffset;
  const sideZ = -Math.sin(cameraYaw) * config.sideOffset;
  
  cameraState.targetPosition.set(
    playerPosition.x + x + sideX,
    playerPosition.y + y,
    playerPosition.z + z + sideZ
  );
  
  // Collision detection and adjustment
  if (worldBounds) {
    // Clamp camera to world bounds
    cameraState.targetPosition.clamp(worldBounds.min, worldBounds.max);
    
    // TODO: Add ray-casting collision detection for obstacles
  }
  
  // Smooth camera position
  cameraState.position = smoothDampVector3(
    cameraState.position,
    cameraState.targetPosition,
    cameraState.positionVelocity,
    config.smoothTime,
    config.maxSpeed,
    delta
  );
  
  // Calculate look-at target
  cameraState.targetLookAt.set(
    playerPosition.x,
    playerPosition.y + config.height * 0.8, // Look at upper torso/head
    playerPosition.z
  );
  
  // Smooth look-at
  cameraState.lookAt = smoothDampVector3(
    cameraState.lookAt,
    cameraState.targetLookAt,
    cameraState.lookAtVelocity,
    config.smoothTime * 0.5,
    config.maxSpeed,
    delta
  );
  
  return cameraState.position;
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Wrap angle to be within -π to π range
 */
export function wrapAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Calculate the shortest angle between two angles
 */
export function deltaAngle(current: number, target: number): number {
  let delta = target - current;
  delta = wrapAngle(delta);
  return delta;
}

/**
 * Smooth angle interpolation that handles wrapping
 */
export function lerpAngle(current: number, target: number, factor: number): number {
  const delta = deltaAngle(current, target);
  return current + delta * factor;
}
