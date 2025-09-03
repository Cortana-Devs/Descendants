/**
 * SSR-Safe animation hooks that handle server-side rendering gracefully
 * These hooks provide fallback behavior when Three.js is not available
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { AnimationClip } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { HookOptions, TypedGLTF } from '../types/animations'
import type { AISimulant } from '../types/index'
import type { AnimationManager } from './useRPMAnimations'

// Re-export types from the main hooks
export type {
  PlayOptions,
  TransitionOptions,
  AnimationState,
  AnimationManager,
  UseRPMAnimationsOptions
} from './useRPMAnimations'

// Note: UseExternalAnimationsOptions is defined inline in useExternalAnimations
// We'll define a compatible interface here for SSR safety
export interface UseExternalAnimationsOptions {
  enableCaching?: boolean
  enableConcurrentLoading?: boolean
  maxConcurrentLoads?: number
  enableLogging?: boolean
  enableRetry?: boolean
  retryAttempts?: number
  retryDelay?: number
}

/**
 * SSR-safe external animations hook
 * Returns empty state during SSR and loads animations on client-side
 */
export function useSSRSafeExternalAnimations(
  animationPaths: string[] = [],
  options: UseExternalAnimationsOptions = {}
) {
  const [isClient, setIsClient] = useState(false)
  const [dynamicHook, setDynamicHook] = useState<typeof import('./useExternalAnimations').useExternalAnimations | null>(null)

  // Detect client-side environment
  useEffect(() => {
    setIsClient(true)
    
    // Dynamically import the real hook only on client-side
    import('./useExternalAnimations').then((module) => {
      setDynamicHook(() => module.useExternalAnimations)
    })
  }, [])

  // SSR fallback state
  const ssrFallbackState = useMemo(() => ({
    clips: new Map<string, AnimationClip>(),
    loading: false,
    error: null,
    loadedCount: 0,
    totalCount: animationPaths.length,
    progress: 0,
    fallbacksUsed: 0,
    errorCount: 0
  }), [animationPaths.length])

  // Use real hook on client, fallback on server
  if (!isClient || !dynamicHook) {
    return ssrFallbackState
  }

  // This will only run on client-side
  return dynamicHook(animationPaths, options)
}

/**
 * SSR-safe RPM animations hook
 * Returns minimal state during SSR and full functionality on client-side
 */
export function useSSRSafeRPMAnimations(
  gltf: TypedGLTF | GLTF,
  externalClips: Map<string, AnimationClip> = new Map(),
  options: HookOptions = {}
) {
  const [isClient, setIsClient] = useState(false)
  const [dynamicHook, setDynamicHook] = useState<typeof import('./useRPMAnimations').useRPMAnimations | null>(null)

  // Detect client-side environment
  useEffect(() => {
    setIsClient(true)
    
    // Dynamically import the real hook only on client-side
    import('./useRPMAnimations').then((module) => {
      setDynamicHook(() => module.useRPMAnimations)
    })
  }, [])

  // SSR fallback animation manager
  const ssrFallbackManager = useMemo(() => ({
    // Core animation control (no-ops during SSR)
    playAnimation: () => {},
    stopAnimation: () => {},
    pauseAnimation: () => {},
    resumeAnimation: () => {},
    crossFadeToAnimation: () => {},
    
    // State management
    state: {
      currentAnimation: null,
      previousAnimation: null,
      isPlaying: false,
      isPaused: false,
      transitionProgress: 0,
      playbackTime: 0,
      duration: 0,
      weight: 1
    },
    availableAnimations: [],
    
    // Animation actions and mixer (null during SSR)
    actions: {},
    mixer: null,
    
    // Performance optimization (no-ops during SSR)
    setLODLevel: () => {},
    pauseAllAnimations: () => {},
    resumeAllAnimations: () => {},
    
    // Event callbacks
    onAnimationStart: options.onAnimationStart,
    onAnimationEnd: options.onAnimationEnd,
    onAnimationLoop: options.onAnimationLoop,
    onTransitionComplete: options.onTransitionComplete
  }), [options])

  // Use real hook on client, fallback on server
  if (!isClient || !dynamicHook) {
    return ssrFallbackManager
  }

  // This will only run on client-side
  return dynamicHook(gltf, externalClips, options)
}

/**
 * SSR-safe animation controller hook
 * Returns minimal state during SSR and full functionality on client-side
 */
export function useSSRSafeAnimationController(
  animationManager: AnimationManager,
  simulant: AISimulant,
  options: HookOptions = {}
) {
  const [isClient, setIsClient] = useState(false)
  const [dynamicHook, setDynamicHook] = useState<typeof import('./useAnimationController').useAnimationController | null>(null)

  // Detect client-side environment
  useEffect(() => {
    setIsClient(true)
    
    // Dynamically import the real hook only on client-side
    import('./useAnimationController').then((module) => {
      setDynamicHook(() => module.useAnimationController)
    })
  }, [])

  // SSR fallback controller
  const ssrFallbackController = useMemo(() => ({
    state: {
      currentState: 'idle' as const,
      previousState: null,
      transitionProgress: 0,
      isTransitioning: false,
      lastTransitionTime: 0,
      error: null
    },
    
    // Control methods (no-ops during SSR)
    transitionTo: () => {},
    canTransitionTo: () => true,
    mapActionToAnimation: () => 'idle',
    getAnimationForState: () => 'idle',
    
    // Event callbacks
    onStateChange: options.onStateChange,
    onTransitionStart: options.onTransitionStart,
    onTransitionComplete: options.onTransitionComplete,
    onError: options.onError
  }), [options])

  // Use real hook on client, fallback on server
  if (!isClient || !dynamicHook) {
    return ssrFallbackController
  }

  // This will only run on client-side
  return dynamicHook(animationManager, simulant, options)
}

/**
 * Utility function to check if we're in a client-side environment
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}

/**
 * Utility function to safely access Three.js objects
 * Returns null during SSR to prevent errors
 */
export function useThreeJSSafe<T>(factory: () => T): T | null {
  const [threeObject, setThreeObject] = useState<T | null>(null)
  const isClient = useIsClient()

  useEffect(() => {
    if (isClient) {
      try {
        const obj = factory()
        setThreeObject(obj)
      } catch (error) {
        console.warn('Failed to create Three.js object:', error)
        setThreeObject(null)
      }
    }
  }, [isClient, factory])

  return threeObject
}

/**
 * SSR-safe performance optimization hook
 */
export function useSSRSafePerformanceOptimization(
  simulants: AISimulant[] = [],
  options: HookOptions = {}
) {
  const [isClient, setIsClient] = useState(false)
  
  // Always call useState and useEffect - these are safe
  useEffect(() => {
    setIsClient(true)
  }, [])

  // SSR fallback performance optimization
  const ssrFallbackOptimization = useMemo(() => ({
    // Performance metrics (default values during SSR)
    metrics: {
      frameRate: 60,
      memoryUsage: 0,
      activeAnimations: 0,
      droppedFrames: 0,
      renderTime: 0
    },
    
    // Quality settings
    currentQuality: { name: 'high', level: 3 },
    
    // Control methods (no-ops during SSR)
    calculateLOD: () => 'high' as const,
    isSimulantVisible: () => true,
    getUpdateFrequency: () => 60,
    getRenderScale: () => 1,
    updateQuality: () => {},
    
    // Event callbacks
    onQualityChange: options.onQualityChange,
    onPerformanceWarning: options.onPerformanceWarning
  }), [options])

  // For client-side, directly use the real hook (not dynamically imported)
  // This ensures hooks are called in consistent order
  if (isClient) {
    try {
      // Import the real implementation - this should be done at build time
      const { usePerformanceOptimization } = require('./usePerformanceOptimization')
      return usePerformanceOptimization(simulants, options)
    } catch (error) {
      console.warn('Failed to load performance optimization:', error)
      return ssrFallbackOptimization
    }
  }

  // Use fallback during SSR
  return ssrFallbackOptimization
}

/**
 * Higher-order component for SSR-safe Three.js components
 */
export function withSSRSafe<P extends object>(
  Component: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType<P>
) {
  return function SSRSafeComponent(props: P) {
    const isClient = useIsClient()
    
    if (!isClient) {
      return FallbackComponent ? React.createElement(FallbackComponent, props) : null
    }
    
    return React.createElement(Component, props)
  }
}

/**
 * Hook to safely import Three.js modules only on client-side
 */
export function useThreeJSModule<T>(
  importFn: () => Promise<T>
): { module: T | null; loading: boolean; error: Error | null } {
  const [module, setModule] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const isClient = useIsClient()

  useEffect(() => {
    if (!isClient) return

    setLoading(true)
    setError(null)

    importFn()
      .then((mod) => {
        setModule(mod)
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }, [isClient, importFn])

  return { module, loading, error }
}