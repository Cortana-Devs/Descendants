/**
 * Fallback animation system for when external clips fail to load
 * Provides procedural animations and fallback strategies
 */

import { 
  AnimationClip, 
  KeyframeTrack, 
  VectorKeyframeTrack, 
  QuaternionKeyframeTrack,
  NumberKeyframeTrack,
  InterpolateLinear,
  InterpolateSmooth
} from 'three'
import { AnimationState } from './animationController'

/**
 * Fallback animation configuration
 */
export interface FallbackAnimationConfig {
  duration: number
  loop: boolean
  easing: 'linear' | 'smooth'
  intensity: number // 0-1 scale for animation intensity
}

/**
 * Bone animation data for procedural animations
 */
export interface BoneAnimationData {
  boneName: string
  position?: number[]
  rotation?: number[]
  scale?: number[]
}

/**
 * Procedural animation definition
 */
export interface ProceduralAnimation {
  name: string
  duration: number
  bones: BoneAnimationData[]
  loop: boolean
}

/**
 * Default fallback animation configurations
 */
export const FALLBACK_CONFIGS: Record<AnimationState, FallbackAnimationConfig> = {
  idle: {
    duration: 4.0,
    loop: true,
    easing: 'smooth',
    intensity: 0.3
  },
  walking: {
    duration: 1.2,
    loop: true,
    easing: 'linear',
    intensity: 0.8
  },
  running: {
    duration: 0.8,
    loop: true,
    easing: 'linear',
    intensity: 1.0
  },
  jumping: {
    duration: 1.0,
    loop: false,
    easing: 'smooth',
    intensity: 1.0
  },
  building: {
    duration: 3.0,
    loop: true,
    easing: 'smooth',
    intensity: 0.6
  },
  thinking: {
    duration: 5.0,
    loop: true,
    easing: 'smooth',
    intensity: 0.4
  },
  communicating: {
    duration: 2.5,
    loop: true,
    easing: 'smooth',
    intensity: 0.7
  },
  celebrating: {
    duration: 2.0,
    loop: true,
    easing: 'smooth',
    intensity: 0.9
  }
}

/**
 * Ready Player Me bone names for procedural animation
 */
export const RPM_BONE_NAMES = {
  // Core bones
  hips: 'Hips',
  spine: 'Spine',
  spine1: 'Spine1',
  spine2: 'Spine2',
  neck: 'Neck',
  head: 'Head',
  
  // Left arm
  leftShoulder: 'LeftShoulder',
  leftArm: 'LeftArm',
  leftForeArm: 'LeftForeArm',
  leftHand: 'LeftHand',
  
  // Right arm
  rightShoulder: 'RightShoulder',
  rightArm: 'RightArm',
  rightForeArm: 'RightForeArm',
  rightHand: 'RightHand',
  
  // Left leg
  leftUpLeg: 'LeftUpLeg',
  leftLeg: 'LeftLeg',
  leftFoot: 'LeftFoot',
  
  // Right leg
  rightUpLeg: 'RightUpLeg',
  rightLeg: 'RightLeg',
  rightFoot: 'RightFoot'
} as const

/**
 * Fallback Animation System class
 */
export class FallbackAnimationSystem {
  private generatedClips: Map<string, AnimationClip> = new Map()
  private enableLogging: boolean

  constructor(options: { enableLogging?: boolean } = {}) {
    this.enableLogging = options.enableLogging || false

    if (this.enableLogging) {
      console.log('🎭 FallbackAnimationSystem initialized')
    }
  }

  /**
   * Generate fallback animation for a given state
   */
  generateFallbackAnimation(state: AnimationState): AnimationClip {
    const cacheKey = `fallback_${state}`
    
    // Check if already generated
    if (this.generatedClips.has(cacheKey)) {
      return this.generatedClips.get(cacheKey)!
    }

    const config = FALLBACK_CONFIGS[state]
    let clip: AnimationClip

    switch (state) {
      case 'idle':
        clip = this.generateIdleAnimation(config)
        break
      case 'walking':
        clip = this.generateWalkAnimation(config)
        break
      case 'running':
        clip = this.generateRunAnimation(config)
        break
      case 'jumping':
        clip = this.generateJumpAnimation(config)
        break
      case 'building':
        clip = this.generateBuildingAnimation(config)
        break
      case 'thinking':
        clip = this.generateThinkingAnimation(config)
        break
      case 'communicating':
        clip = this.generateCommunicatingAnimation(config)
        break
      case 'celebrating':
        clip = this.generateCelebratingAnimation(config)
        break
      default:
        // Use idle config for invalid states
        clip = this.generateIdleAnimation(FALLBACK_CONFIGS.idle)
    }

    // Cache the generated clip
    this.generatedClips.set(cacheKey, clip)

    if (this.enableLogging) {
      console.log(`🎭 Generated fallback animation: ${state} (${clip.duration}s)`)
    }

    return clip
  }

  /**
   * Generate a basic T-pose animation (static fallback)
   */
  generateTPoseAnimation(): AnimationClip {
    const cacheKey = 'tpose_fallback'
    
    if (this.generatedClips.has(cacheKey)) {
      return this.generatedClips.get(cacheKey)!
    }

    // Create a minimal static pose
    const tracks: KeyframeTrack[] = []
    const duration = 1.0

    // Add minimal tracks for core bones to ensure compatibility
    const coreBones = [
      RPM_BONE_NAMES.hips,
      RPM_BONE_NAMES.spine,
      RPM_BONE_NAMES.leftArm,
      RPM_BONE_NAMES.rightArm
    ]

    coreBones.forEach(boneName => {
      // Static position track
      tracks.push(new VectorKeyframeTrack(
        `${boneName}.position`,
        [0, duration],
        [0, 0, 0, 0, 0, 0]
      ))

      // Static rotation track (T-pose)
      tracks.push(new QuaternionKeyframeTrack(
        `${boneName}.rotation`,
        [0, duration],
        [0, 0, 0, 1, 0, 0, 0, 1]
      ))
    })

    const clip = new AnimationClip('tpose_fallback', duration, tracks)
    this.generatedClips.set(cacheKey, clip)

    return clip
  }

  /**
   * Generate idle animation with subtle breathing and swaying
   */
  private generateIdleAnimation(config: FallbackAnimationConfig): AnimationClip {
    const tracks: KeyframeTrack[] = []
    const { duration, intensity } = config

    // Breathing animation for spine
    const breathingTimes = this.generateTimeArray(duration, 30) // 30 keyframes
    const breathingValues = breathingTimes.map(time => {
      const breathCycle = Math.sin(time * Math.PI * 2 / duration) * intensity * 0.02
      return [0, breathCycle, 0]
    }).flat()

    tracks.push(new VectorKeyframeTrack(
      `${RPM_BONE_NAMES.spine}.position`,
      breathingTimes,
      breathingValues
    ))

    // Subtle head movement
    const headTimes = this.generateTimeArray(duration, 20)
    const headRotations = headTimes.map(time => {
      const headSway = Math.sin(time * Math.PI / duration) * intensity * 0.1
      return this.eulerToQuaternion(headSway, 0, 0)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.head}.rotation`,
      headTimes,
      headRotations
    ))

    return new AnimationClip('idle_fallback', duration, tracks)
  }

  /**
   * Generate walking animation with basic leg movement
   */
  private generateWalkAnimation(config: FallbackAnimationConfig): AnimationClip {
    const tracks: KeyframeTrack[] = []
    const { duration, intensity } = config

    // Hip movement for walking
    const hipTimes = this.generateTimeArray(duration, 24)
    const hipPositions = hipTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 2
      const bobbing = Math.sin(cycle * 2) * intensity * 0.05
      const swaying = Math.sin(cycle) * intensity * 0.02
      return [swaying, bobbing, 0]
    }).flat()

    tracks.push(new VectorKeyframeTrack(
      `${RPM_BONE_NAMES.hips}.position`,
      hipTimes,
      hipPositions
    ))

    // Leg movement
    const legTimes = this.generateTimeArray(duration, 16)
    
    // Left leg
    const leftLegRotations = legTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 2
      const legSwing = Math.sin(cycle) * intensity * 0.3
      return this.eulerToQuaternion(legSwing, 0, 0)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.leftUpLeg}.rotation`,
      legTimes,
      leftLegRotations
    ))

    // Right leg (opposite phase)
    const rightLegRotations = legTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 2
      const legSwing = Math.sin(cycle + Math.PI) * intensity * 0.3
      return this.eulerToQuaternion(legSwing, 0, 0)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.rightUpLeg}.rotation`,
      legTimes,
      rightLegRotations
    ))

    // Arm swinging
    const armTimes = this.generateTimeArray(duration, 16)
    
    // Left arm (opposite to right leg)
    const leftArmRotations = armTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 2
      const armSwing = Math.sin(cycle + Math.PI) * intensity * 0.2
      return this.eulerToQuaternion(armSwing, 0, 0)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.leftArm}.rotation`,
      armTimes,
      leftArmRotations
    ))

    // Right arm (opposite to left leg)
    const rightArmRotations = armTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 2
      const armSwing = Math.sin(cycle) * intensity * 0.2
      return this.eulerToQuaternion(armSwing, 0, 0)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.rightArm}.rotation`,
      armTimes,
      rightArmRotations
    ))

    return new AnimationClip('walk_fallback', duration, tracks)
  }

  /**
   * Generate running animation (faster walking with more intensity)
   */
  private generateRunAnimation(config: FallbackAnimationConfig): AnimationClip {
    // Generate walking animation with higher intensity
    const walkConfig = { ...config, intensity: config.intensity * 1.5 }
    const walkClip = this.generateWalkAnimation(walkConfig)
    
    // Clone and rename
    const runClip = walkClip.clone()
    runClip.name = 'run_fallback'
    
    return runClip
  }

  /**
   * Generate jumping animation
   */
  private generateJumpAnimation(config: FallbackAnimationConfig): AnimationClip {
    const tracks: KeyframeTrack[] = []
    const { duration, intensity } = config

    // Jump phases: crouch (0-0.2), jump (0.2-0.6), land (0.6-1.0)
    const jumpTimes = [0, 0.2, 0.6, 1.0]
    const jumpHeights = [0, -0.1 * intensity, 0.3 * intensity, 0]

    tracks.push(new NumberKeyframeTrack(
      `${RPM_BONE_NAMES.hips}.position[1]`, // Y position
      jumpTimes,
      jumpHeights
    ))

    // Leg compression and extension
    const legTimes = [0, 0.2, 0.4, 0.6, 1.0]
    const legRotations = legTimes.map(time => {
      if (time <= 0.2) {
        // Crouch phase
        return this.eulerToQuaternion(-0.5 * intensity, 0, 0)
      } else if (time <= 0.6) {
        // Jump phase
        return this.eulerToQuaternion(0.2 * intensity, 0, 0)
      } else {
        // Landing phase
        return this.eulerToQuaternion(-0.3 * intensity, 0, 0)
      }
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.leftUpLeg}.rotation`,
      legTimes,
      legRotations
    ))

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.rightUpLeg}.rotation`,
      legTimes,
      legRotations
    ))

    // Arm movement for balance
    const armRotations = legTimes.map(time => {
      if (time <= 0.2) {
        return this.eulerToQuaternion(-0.3 * intensity, 0, 0)
      } else if (time <= 0.6) {
        return this.eulerToQuaternion(0.5 * intensity, 0, 0)
      } else {
        return this.eulerToQuaternion(0, 0, 0)
      }
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.leftArm}.rotation`,
      legTimes,
      armRotations
    ))

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.rightArm}.rotation`,
      legTimes,
      armRotations
    ))

    return new AnimationClip('jump_fallback', duration, tracks)
  }

  /**
   * Generate building animation with arm movements
   */
  private generateBuildingAnimation(config: FallbackAnimationConfig): AnimationClip {
    const tracks: KeyframeTrack[] = []
    const { duration, intensity } = config

    // Alternating arm movements for building
    const armTimes = this.generateTimeArray(duration, 20)
    
    // Left arm building motion
    const leftArmRotations = armTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 4 // 4 building cycles
      const armLift = Math.abs(Math.sin(cycle)) * intensity * 0.8
      return this.eulerToQuaternion(-armLift, 0, 0.2 * intensity)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.leftArm}.rotation`,
      armTimes,
      leftArmRotations
    ))

    // Right arm building motion (offset phase)
    const rightArmRotations = armTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 4 + Math.PI / 2
      const armLift = Math.abs(Math.sin(cycle)) * intensity * 0.8
      return this.eulerToQuaternion(-armLift, 0, -0.2 * intensity)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.rightArm}.rotation`,
      armTimes,
      rightArmRotations
    ))

    // Slight spine movement for realism
    const spineTimes = this.generateTimeArray(duration, 15)
    const spineRotations = spineTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 2
      const spineMove = Math.sin(cycle) * intensity * 0.1
      return this.eulerToQuaternion(0, spineMove, 0)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.spine}.rotation`,
      spineTimes,
      spineRotations
    ))

    return new AnimationClip('building_fallback', duration, tracks)
  }

  /**
   * Generate thinking animation with head and hand gestures
   */
  private generateThinkingAnimation(config: FallbackAnimationConfig): AnimationClip {
    const tracks: KeyframeTrack[] = []
    const { duration, intensity } = config

    // Head nodding and tilting
    const headTimes = this.generateTimeArray(duration, 25)
    const headRotations = headTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 2
      const headNod = Math.sin(cycle * 0.5) * intensity * 0.15
      const headTilt = Math.sin(cycle * 0.3) * intensity * 0.1
      return this.eulerToQuaternion(headNod, headTilt, 0)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.head}.rotation`,
      headTimes,
      headRotations
    ))

    // Right hand to chin gesture
    const handTimes = this.generateTimeArray(duration, 15)
    const rightArmRotations = handTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 2
      const armRaise = (Math.sin(cycle * 0.2) + 1) * 0.5 * intensity * 0.6
      return this.eulerToQuaternion(-armRaise, 0, 0.3 * intensity)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.rightArm}.rotation`,
      handTimes,
      rightArmRotations
    ))

    return new AnimationClip('thinking_fallback', duration, tracks)
  }

  /**
   * Generate communicating animation with gestures
   */
  private generateCommunicatingAnimation(config: FallbackAnimationConfig): AnimationClip {
    const tracks: KeyframeTrack[] = []
    const { duration, intensity } = config

    // Alternating hand gestures
    const gestureTime = this.generateTimeArray(duration, 20)
    
    // Left arm gesturing
    const leftArmRotations = gestureTime.map(time => {
      const cycle = (time / duration) * Math.PI * 6 // Multiple gesture cycles
      const armMove = Math.sin(cycle) * intensity * 0.4
      return this.eulerToQuaternion(armMove, 0, 0.2 * intensity)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.leftArm}.rotation`,
      gestureTime,
      leftArmRotations
    ))

    // Right arm gesturing (different phase)
    const rightArmRotations = gestureTime.map(time => {
      const cycle = (time / duration) * Math.PI * 6 + Math.PI / 3
      const armMove = Math.sin(cycle) * intensity * 0.4
      return this.eulerToQuaternion(armMove, 0, -0.2 * intensity)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.rightArm}.rotation`,
      gestureTime,
      rightArmRotations
    ))

    // Head movement while talking
    const headTimes = this.generateTimeArray(duration, 18)
    const headRotations = headTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 8
      const headMove = Math.sin(cycle) * intensity * 0.1
      return this.eulerToQuaternion(0, headMove, 0)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.head}.rotation`,
      headTimes,
      headRotations
    ))

    return new AnimationClip('communicating_fallback', duration, tracks)
  }

  /**
   * Generate celebrating animation with raised arms
   */
  private generateCelebratingAnimation(config: FallbackAnimationConfig): AnimationClip {
    const tracks: KeyframeTrack[] = []
    const { duration, intensity } = config

    // Both arms raised and moving
    const celebrationTimes = this.generateTimeArray(duration, 16)
    
    // Left arm celebration
    const leftArmRotations = celebrationTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 4
      const armRaise = (Math.sin(cycle) * 0.3 + 0.7) * intensity * 0.8
      return this.eulerToQuaternion(-armRaise, 0, 0.5 * intensity)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.leftArm}.rotation`,
      celebrationTimes,
      leftArmRotations
    ))

    // Right arm celebration
    const rightArmRotations = celebrationTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 4 + Math.PI / 4
      const armRaise = (Math.sin(cycle) * 0.3 + 0.7) * intensity * 0.8
      return this.eulerToQuaternion(-armRaise, 0, -0.5 * intensity)
    }).flat()

    tracks.push(new QuaternionKeyframeTrack(
      `${RPM_BONE_NAMES.rightArm}.rotation`,
      celebrationTimes,
      rightArmRotations
    ))

    // Bouncing movement
    const bounceTimes = this.generateTimeArray(duration, 12)
    const bouncePositions = bounceTimes.map(time => {
      const cycle = (time / duration) * Math.PI * 8
      const bounce = Math.abs(Math.sin(cycle)) * intensity * 0.1
      return [0, bounce, 0]
    }).flat()

    tracks.push(new VectorKeyframeTrack(
      `${RPM_BONE_NAMES.hips}.position`,
      bounceTimes,
      bouncePositions
    ))

    return new AnimationClip('celebrating_fallback', duration, tracks)
  }

  /**
   * Helper method to generate time array
   */
  private generateTimeArray(duration: number, keyframes: number): number[] {
    const times: number[] = []
    for (let i = 0; i < keyframes; i++) {
      times.push((i / (keyframes - 1)) * duration)
    }
    return times
  }

  /**
   * Helper method to convert Euler angles to quaternion array
   */
  private eulerToQuaternion(x: number, y: number, z: number): number[] {
    // Simple Euler to quaternion conversion
    const c1 = Math.cos(x / 2)
    const c2 = Math.cos(y / 2)
    const c3 = Math.cos(z / 2)
    const s1 = Math.sin(x / 2)
    const s2 = Math.sin(y / 2)
    const s3 = Math.sin(z / 2)

    const qx = s1 * c2 * c3 + c1 * s2 * s3
    const qy = c1 * s2 * c3 - s1 * c2 * s3
    const qz = c1 * c2 * s3 + s1 * s2 * c3
    const qw = c1 * c2 * c3 - s1 * s2 * s3

    return [qx, qy, qz, qw]
  }

  /**
   * Get all available fallback animations
   */
  getAvailableFallbacks(): string[] {
    return Array.from(this.generatedClips.keys())
  }

  /**
   * Clear generated clips cache
   */
  clearCache(): void {
    this.generatedClips.clear()
    
    if (this.enableLogging) {
      console.log('🧹 Fallback animation cache cleared')
    }
  }

  /**
   * Dispose of the fallback system
   */
  dispose(): void {
    this.generatedClips.clear()
    
    if (this.enableLogging) {
      console.log('🗑️ FallbackAnimationSystem disposed')
    }
  }
}

// Export singleton instance
export const fallbackAnimationSystem = new FallbackAnimationSystem()