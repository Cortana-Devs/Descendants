import { AnimationClip, Group } from 'three'
import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import React from 'react'

/**
 * Validation result for loaded GLTF assets
 */
export interface ValidationResult {
  isValid: boolean
  hasAnimations: boolean
  hasSkeleton: boolean
  boneCount: number
  errors: string[]
  warnings: string[]
}

/**
 * Metadata for animation clips with categorization
 */
export interface AnimationClipData {
  name: string
  clip: AnimationClip
  duration: number
  looping: boolean
  category: 'locomotion' | 'idle' | 'action' | 'expression'
  tags: string[]
}

/**
 * Asset metadata for cache management
 */
export interface AssetMetadata {
  path: string
  size: number
  loadTime: number
  lastAccessed: number
  referenceCount: number
  isValid: boolean
  errors: string[]
}

/**
 * Animation asset cache structure
 */
export interface AnimationAssetCache {
  avatars: Map<string, GLTF>
  clips: Map<string, AnimationClip>
  metadata: Map<string, AssetMetadata>
  loadingPromises: Map<string, Promise<GLTF>>
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  maxCacheSize: number // in bytes
  maxAge: number // in milliseconds
  cleanupInterval: number // in milliseconds
}

/**
 * Animation loader configuration
 */
export interface AnimationLoaderConfig {
  cache: CacheConfig
  enableValidation: boolean
  enableLogging: boolean
  retryAttempts: number
  retryDelay: number
}

/**
 * Error types for animation loading
 */
export enum AnimationLoadError {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_FORMAT = 'INVALID_FORMAT',
  CORRUPTED_FILE = 'CORRUPTED_FILE',
  NO_ANIMATIONS = 'NO_ANIMATIONS',
  NO_SKELETON = 'NO_SKELETON',
  CACHE_FULL = 'CACHE_FULL',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

/**
 * Animation loading error with context
 */
export interface AnimationError extends Error {
  type: AnimationLoadError
  path: string
  details?: Record<string, unknown>
}

/**
 * Re-export types from animation hooks
 */
export type {
  UseRPMAnimationsOptions,
  AnimationManager,
  AnimationState as RPMAnimationState,
  PlayOptions,
  TransitionOptions
} from '../utils/useRPMAnimations'

export type {
  AnimationState,
  AnimationControllerInterface,
  UseAnimationControllerOptions
} from '../utils/useAnimationController'

export type {
  AnimationMapping,
  TransitionConfig,
  BlendAnimation,
  StateTransition
} from '../utils/animationController'

/**
 * Performance metrics interface for monitoring system performance
 */
export interface PerformanceMetrics {
  frameRate: number
  averageFrameRate: number
  memoryUsage: number
  animationLoad: number
  activeAnimations: number
  droppedFrames: number
  renderTime: number
  lastUpdateTime: number
}

/**
 * Quality level configuration for performance adaptation
 */
export interface QualityLevel {
  name: 'high' | 'medium' | 'low'
  maxAnimatedSimulants: number
  animationUpdateRate: number
  crossFadeDuration: number
  enableBlending: boolean
  lodDistances: {
    high: number
    medium: number
    low: number
    cull: number
  }
  cullingDistance: number
  enableParticles: boolean
  shadowQuality: 'high' | 'medium' | 'low' | 'off'
}

/**
 * Animation event callback types
 */
export type AnimationEventCallback = (event: {
  type: 'started' | 'finished' | 'loop' | 'error'
  animationName: string
  simulantId?: string
  timestamp: number
}) => void

export type PerformanceChangeCallback = (metrics: PerformanceMetrics) => void

export type QualityChangeCallback = (quality: QualityLevel) => void

export type ErrorCallback = (error: AnimationError) => void

/**
 * Loading component props for dynamic imports
 */
export interface LoadingProps {
  /** Loading state */
  loaded?: boolean
  /** Loading progress (0-1) */
  progress?: number
  /** Optional loading message */
  message?: string
  /** Error if loading failed */
  error?: Error
}

/**
 * WebGL context capabilities
 */
export interface WebGLContextType {
  maxTextureSize: number
  maxVertexAttribs: number
  maxVaryingVectors: number
  maxFragmentUniforms: number
  maxVertexUniforms: number
  renderer: string
  vendor: string
  version: string
  shadingLanguageVersion: string
}

/**
 * Animation mixer interface
 */
export interface AnimationMixerInterface {
  mixer: THREE.AnimationMixer
  actions: Map<string, THREE.AnimationAction>
  activeAction?: THREE.AnimationAction
  update: (deltaTime: number) => void
  play: (animationName: string, options?: PlayOptions) => void
  stop: () => void
  dispose: () => void
}

/**
 * Hook options for various animation hooks
 */
export interface HookOptions {
  /** Enable logging for debugging */
  enableLogging?: boolean
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean
  /** Custom error handler */
  onError?: ErrorCallback
  /** Custom animation event handler */
  onAnimationEvent?: AnimationEventCallback
  /** Animation start callback */
  onAnimationStart?: (name: string) => void
  /** Animation end callback */
  onAnimationEnd?: (name: string) => void
  /** Animation loop callback */
  onAnimationLoop?: (name: string) => void
  /** Transition complete callback */
  onTransitionComplete?: (from: string, to: string) => void
  /** State change callback */
  onStateChange?: (state: string) => void
  /** Transition start callback */
  onTransitionStart?: (from: string, to: string) => void
  /** Quality change callback */
  onQualityChange?: QualityChangeCallback
  /** Performance warning callback */
  onPerformanceWarning?: (warning: string) => void
}

/**
 * GLTF asset with proper typing for scene
 */
export interface TypedGLTF extends Omit<GLTF, 'scene'> {
  scene: Group
}