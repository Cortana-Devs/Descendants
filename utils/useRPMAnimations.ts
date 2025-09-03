/**
 * Enhanced animation management hook for Ready Player Me avatars
 * Extends React Three Fiber's useAnimations with external clip support,
 * state management, and cross-fade transitions
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei'
import { AnimationClip, AnimationMixer, AnimationAction, Object3D, Event as ThreeEvent } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { animationErrorHandler } from './animationErrorHandler'
import { fallbackAnimationSystem } from './animationFallbackSystem'
import type { TypedGLTF } from '../types/animations'

/**
 * Animation playback options
 */
export interface PlayOptions {
  loop?: boolean
  crossFadeDuration?: number
  timeScale?: number
  startTime?: number
  weight?: number
  clampWhenFinished?: boolean
}

/**
 * Animation transition options
 */
export interface TransitionOptions {
  duration?: number
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  interrupt?: boolean
}

/**
 * Animation state information
 */
export interface AnimationState {
  currentAnimation: string | null
  previousAnimation: string | null
  isPlaying: boolean
  isPaused: boolean
  transitionProgress: number
  playbackTime: number
  duration: number
  weight: number
}

/**
 * Animation manager interface
 */
export interface AnimationManager {
  // Core animation control
  playAnimation: (name: string, options?: PlayOptions) => void
  stopAnimation: (name: string) => void
  pauseAnimation: (name: string) => void
  resumeAnimation: (name: string) => void
  crossFadeToAnimation: (name: string, duration?: number, options?: TransitionOptions) => void
  
  // State management
  state: AnimationState
  availableAnimations: string[]
  
  // Animation actions (from R3F useAnimations)
  actions: Record<string, AnimationAction | null>
  mixer: AnimationMixer | null
  
  // Performance optimization
  setLODLevel: (level: 'high' | 'medium' | 'low') => void
  pauseAllAnimations: () => void
  resumeAllAnimations: () => void
  
  // Event callbacks
  onAnimationStart?: (name: string) => void
  onAnimationEnd?: (name: string) => void
  onAnimationLoop?: (name: string) => void
  onTransitionComplete?: (from: string, to: string) => void
}

/**
 * Hook options
 */
export interface UseRPMAnimationsOptions {
  autoPlay?: string
  crossFadeDuration?: number
  enableLOD?: boolean
  performanceMode?: 'quality' | 'balanced' | 'performance'
  enableLogging?: boolean
  onAnimationStart?: (name: string) => void
  onAnimationEnd?: (name: string) => void
  onAnimationLoop?: (name: string) => void
  onTransitionComplete?: (from: string, to: string) => void
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<Omit<UseRPMAnimationsOptions, 'autoPlay' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationLoop' | 'onTransitionComplete'>> = {
  crossFadeDuration: 0.3,
  enableLOD: true,
  performanceMode: 'balanced',
  enableLogging: false
}

/**
 * Performance presets for different LOD levels
 */
const LOD_PRESETS = {
  high: {
    updateFrequency: 60,
    enableBlending: true,
    maxActiveAnimations: 10
  },
  medium: {
    updateFrequency: 30,
    enableBlending: true,
    maxActiveAnimations: 5
  },
  low: {
    updateFrequency: 15,
    enableBlending: false,
    maxActiveAnimations: 2
  }
} as const

/**
 * Enhanced animation management hook for Ready Player Me avatars
 * 
 * @param gltf - The loaded GLTF object containing the avatar
 * @param externalClips - Map of external animation clips to integrate
 * @param options - Configuration options
 * @returns Animation manager with enhanced functionality
 */
export function useRPMAnimations(
  gltf: TypedGLTF | GLTF, // Allow for both typed and standard GLTF
  externalClips: Map<string, AnimationClip> = new Map(),
  options: UseRPMAnimationsOptions = {}
): AnimationManager {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  // Combine built-in animations with external clips
  const allAnimations = useMemo(() => {
    const combined = [...(gltf.animations || [])]
    
    // Add external clips
    externalClips.forEach((clip, name) => {
      // Clone the clip to avoid modifying the original
      const clonedClip = clip.clone()
      clonedClip.name = name
      combined.push(clonedClip)
    })
    
    return combined
  }, [gltf.animations, externalClips])
  
  // Use React Three Fiber's useAnimations hook with combined animations
  const { actions, mixer } = useAnimations(allAnimations, gltf.scene)
  
  // Animation state
  const [state, setState] = useState<AnimationState>({
    currentAnimation: null,
    previousAnimation: null,
    isPlaying: false,
    isPaused: false,
    transitionProgress: 0,
    playbackTime: 0,
    duration: 0,
    weight: 1
  })
  
  // Internal state refs
  const currentActionRef = useRef<AnimationAction | null>(null)
  const previousActionRef = useRef<AnimationAction | null>(null)
  const transitionRef = useRef<{
    from: string
    to: string
    startTime: number
    duration: number
    onComplete?: () => void
  } | null>(null)
  const lodLevelRef = useRef<'high' | 'medium' | 'low'>('high')
  const updateFrequencyRef = useRef(60)
  const lastUpdateTimeRef = useRef(0)
  
  // Available animations list
  const availableAnimations = useMemo(() => {
    return Object.keys(actions).filter(name => actions[name] !== null)
  }, [actions])
  
  /**
   * Play an animation with options and error handling
   */
  const playAnimation = useCallback((name: string, playOptions: PlayOptions = {}) => {
    let action = actions[name]
    
    if (!action) {
      if (config.enableLogging) {
        console.warn(`Animation "${name}" not found, attempting fallback`)
      }
      
      // Try to find a fallback animation
      const fallbackResult = animationErrorHandler.handlePlaybackError(
        new Error(`Animation "${name}" not found`),
        name
      )
      
      if (fallbackResult.fallbackAnimation) {
        action = actions[fallbackResult.fallbackAnimation]
        if (config.enableLogging) {
          console.log(`🎭 Using fallback animation: ${fallbackResult.fallbackAnimation}`)
        }
      }
      
      if (!action) {
        // Generate procedural fallback as last resort
        const animationState = mapAnimationNameToState(name)
        if (animationState) {
          try {
            const fallbackClip = fallbackAnimationSystem.generateFallbackAnimation(animationState)
            // Note: In a real implementation, you'd need to add this clip to the mixer
            if (config.enableLogging) {
              console.log(`🎭 Generated procedural fallback for: ${name}`)
            }
          } catch (error) {
            if (config.enableLogging) {
              console.error(`❌ Failed to generate fallback for: ${name}`, error)
            }
          }
        }
        return
      }
    }
    
    const {
      loop = true,
      crossFadeDuration = config.crossFadeDuration,
      timeScale = 1,
      startTime = 0,
      weight = 1,
      clampWhenFinished = false
    } = playOptions
    
    // Stop current animation if different
    if (currentActionRef.current && currentActionRef.current !== action) {
      if (crossFadeDuration > 0) {
        currentActionRef.current.fadeOut(crossFadeDuration)
      } else {
        currentActionRef.current.stop()
      }
      previousActionRef.current = currentActionRef.current
    }
    
    // Configure and start new animation with error handling
    try {
      action.reset()
      action.setLoop(loop ? 2201 : 2200, loop ? Infinity : 1) // LoopRepeat : LoopOnce
      action.timeScale = timeScale
      action.time = startTime
      action.weight = weight
      action.clampWhenFinished = clampWhenFinished
      
      if (crossFadeDuration > 0) {
        action.fadeIn(crossFadeDuration)
      }
      
      action.play()
    } catch (error) {
      if (config.enableLogging) {
        console.error(`❌ Failed to play animation "${name}":`, error)
      }
      
      // Handle playback error
      const fallbackResult = animationErrorHandler.handlePlaybackError(
        error as Error,
        name
      )
      
      if (fallbackResult.shouldRestart && !fallbackResult.shouldStop) {
        // Try to restart the animation
        setTimeout(() => {
          try {
            action.reset()
            action.play()
          } catch (retryError) {
            if (config.enableLogging) {
              console.error(`❌ Animation restart failed for "${name}":`, retryError)
            }
          }
        }, 100)
      }
      
      return
    }
    
    // Update refs and state
    currentActionRef.current = action
    setState(prev => ({
      ...prev,
      currentAnimation: name,
      previousAnimation: prev.currentAnimation,
      isPlaying: true,
      isPaused: false,
      duration: action.getClip().duration,
      weight
    }))
    
    // Call event callback
    if (config.onAnimationStart) {
      config.onAnimationStart(name)
    }
    
    if (config.enableLogging) {
      console.log(`🎬 Playing animation: ${name}`)
    }
  }, [actions, config])
  
  /**
   * Stop an animation
   */
  const stopAnimation = useCallback((name: string) => {
    const action = actions[name]
    if (!action) return
    
    action.stop()
    
    if (currentActionRef.current === action) {
      currentActionRef.current = null
      setState(prev => ({
        ...prev,
        currentAnimation: null,
        isPlaying: false,
        playbackTime: 0
      }))
    }
    
    if (config.enableLogging) {
      console.log(`⏹️ Stopped animation: ${name}`)
    }
  }, [actions, config])
  
  /**
   * Pause an animation
   */
  const pauseAnimation = useCallback((name: string) => {
    const action = actions[name]
    if (!action) return
    
    action.paused = true
    
    if (currentActionRef.current === action) {
      setState(prev => ({
        ...prev,
        isPaused: true
      }))
    }
    
    if (config.enableLogging) {
      console.log(`⏸️ Paused animation: ${name}`)
    }
  }, [actions, config])
  
  /**
   * Resume a paused animation
   */
  const resumeAnimation = useCallback((name: string) => {
    const action = actions[name]
    if (!action) return
    
    action.paused = false
    
    if (currentActionRef.current === action) {
      setState(prev => ({
        ...prev,
        isPaused: false
      }))
    }
    
    if (config.enableLogging) {
      console.log(`▶️ Resumed animation: ${name}`)
    }
  }, [actions, config])
  
  /**
   * Cross-fade to a new animation
   */
  const crossFadeToAnimation = useCallback((
    name: string, 
    duration: number = config.crossFadeDuration,
    transitionOptions: TransitionOptions = {}
  ) => {
    const action = actions[name]
    if (!action) {
      if (config.enableLogging) {
        console.warn(`Animation "${name}" not found for cross-fade`)
      }
      return
    }
    
    const currentName = state.currentAnimation
    if (currentName === name) {
      return // Already playing this animation
    }
    
    // Set up transition tracking
    if (currentName) {
      transitionRef.current = {
        from: currentName,
        to: name,
        startTime: Date.now(),
        duration: duration * 1000, // Convert to milliseconds
        onComplete: () => {
          if (config.onTransitionComplete) {
            config.onTransitionComplete(currentName, name)
          }
        }
      }
    }
    
    // Play the new animation with cross-fade
    playAnimation(name, {
      crossFadeDuration: duration,
      ...transitionOptions
    })
    
    if (config.enableLogging) {
      console.log(`🔄 Cross-fading from "${currentName}" to "${name}" over ${duration}s`)
    }
  }, [actions, state.currentAnimation, config, playAnimation])
  
  /**
   * Set LOD level for performance optimization
   */
  const setLODLevel = useCallback((level: 'high' | 'medium' | 'low') => {
    lodLevelRef.current = level
    const preset = LOD_PRESETS[level]
    updateFrequencyRef.current = preset.updateFrequency
    
    if (config.enableLogging) {
      console.log(`🎯 Set LOD level to: ${level}`)
    }
  }, [config])
  
  /**
   * Pause all animations
   */
  const pauseAllAnimations = useCallback(() => {
    Object.values(actions).forEach(action => {
      if (action) {
        action.paused = true
      }
    })
    
    setState(prev => ({
      ...prev,
      isPaused: true
    }))
  }, [actions])
  
  /**
   * Resume all animations
   */
  const resumeAllAnimations = useCallback(() => {
    Object.values(actions).forEach(action => {
      if (action) {
        action.paused = false
      }
    })
    
    setState(prev => ({
      ...prev,
      isPaused: false
    }))
  }, [actions])
  
  // Auto-play animation on mount
  useEffect(() => {
    if (config.autoPlay && availableAnimations.includes(config.autoPlay)) {
      console.log(`🎬 Auto-playing animation: ${config.autoPlay}`)
      playAnimation(config.autoPlay)
    } else if (config.autoPlay && availableAnimations.length > 0) {
      // Fallback to first available animation if autoPlay animation not found
      const fallbackAnimation = availableAnimations[0]
      console.log(`🎬 Auto-play fallback to: ${fallbackAnimation}`)
      playAnimation(fallbackAnimation)
    }
  }, [config.autoPlay, availableAnimations, playAnimation])
  
  // Handle animation events
  useEffect(() => {
    if (!mixer) return
    
    const handleFinished = (event: ThreeEvent & { action?: AnimationAction }) => {
      const action = event.action as AnimationAction
      const animationName = action.getClip().name
      
      if (config.onAnimationEnd) {
        config.onAnimationEnd(animationName)
      }
      
      // Update state if this was the current animation
      if (currentActionRef.current === action) {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          playbackTime: 0
        }))
      }
      
      if (config.enableLogging) {
        console.log(`🏁 Animation finished: ${animationName}`)
      }
    }
    
    const handleLoop = (event: ThreeEvent & { action?: AnimationAction }) => {
      const action = event.action as AnimationAction
      const animationName = action.getClip().name
      
      if (config.onAnimationLoop) {
        config.onAnimationLoop(animationName)
      }
      
      if (config.enableLogging) {
        console.log(`🔄 Animation looped: ${animationName}`)
      }
    }
    
    mixer.addEventListener('finished', handleFinished)
    mixer.addEventListener('loop', handleLoop)
    
    return () => {
      mixer.removeEventListener('finished', handleFinished)
      mixer.removeEventListener('loop', handleLoop)
    }
  }, [mixer, config])
  
  // Update animation state and handle transitions
  useFrame((_, delta) => {
    const now = Date.now()
    
    // Throttle updates based on LOD level
    if (now - lastUpdateTimeRef.current < 1000 / updateFrequencyRef.current) {
      return
    }
    lastUpdateTimeRef.current = now
    
    // Update transition progress
    if (transitionRef.current) {
      const elapsed = now - transitionRef.current.startTime
      const progress = Math.min(elapsed / transitionRef.current.duration, 1)
      
      setState(prev => ({
        ...prev,
        transitionProgress: progress
      }))
      
      // Complete transition
      if (progress >= 1) {
        if (transitionRef.current.onComplete) {
          transitionRef.current.onComplete()
        }
        transitionRef.current = null
        
        setState(prev => ({
          ...prev,
          transitionProgress: 0
        }))
      }
    }
    
    // Update playback time for current animation
    if (currentActionRef.current && !currentActionRef.current.paused) {
      const action = currentActionRef.current
      setState(prev => ({
        ...prev,
        playbackTime: action.time,
        weight: action.weight
      }))
    }
  })
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mixer) {
        mixer.stopAllAction()
      }
    }
  }, [mixer])
  
  return {
    // Core animation control
    playAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    crossFadeToAnimation,
    
    // State management
    state,
    availableAnimations,
    
    // Animation actions and mixer
    actions,
    mixer,
    
    // Performance optimization
    setLODLevel,
    pauseAllAnimations,
    resumeAllAnimations,
    
    // Event callbacks (passed through from options)
    onAnimationStart: config.onAnimationStart,
    onAnimationEnd: config.onAnimationEnd,
    onAnimationLoop: config.onAnimationLoop,
    onTransitionComplete: config.onTransitionComplete
  }
}

/**
 * Map animation name to animation state for fallback generation
 */
function mapAnimationNameToState(animationName: string): 'idle' | 'walking' | 'running' | 'jumping' | 'building' | 'thinking' | 'communicating' | 'celebrating' | null {
  const lowerName = animationName.toLowerCase()
  
  if (lowerName.includes('idle') || lowerName.includes('tpose')) return 'idle'
  if (lowerName.includes('walk')) return 'walking'
  if (lowerName.includes('run')) return 'running'
  if (lowerName.includes('jump')) return 'jumping'
  if (lowerName.includes('build') || lowerName.includes('expression')) return 'building'
  if (lowerName.includes('talk') || lowerName.includes('communicate')) return 'communicating'
  if (lowerName.includes('dance') || lowerName.includes('celebrate')) return 'celebrating'
  if (lowerName.includes('think')) return 'thinking'
  
  return 'idle' // Default fallback
}

// Types are already exported inline above