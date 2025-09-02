/**
 * Comprehensive error handling and recovery system for RPM animations
 * Provides fallback strategies, error recovery, and graceful degradation
 */

import { AnimationClip, AnimationMixer, AnimationAction } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { AnimationLoadError, type AnimationError } from '../types/animations'

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error recovery strategies
 */
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  SKIP = 'skip',
  DEGRADE = 'degrade',
  RESTART = 'restart'
}

/**
 * Error context information
 */
export interface ErrorContext {
  simulantId?: string
  animationName?: string
  assetPath?: string
  timestamp: number
  userAgent: string
  memoryUsage?: number
  performanceMetrics?: {
    fps: number
    memoryPressure: boolean
    activeAnimations: number
  }
}

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  maxRetries: number
  retryDelay: number
  fallbackAnimations: string[]
  enableFallbackAvatar: boolean
  enablePerformanceDegradation: boolean
  enableUserNotifications: boolean
  enableTelemetry: boolean
}

/**
 * Error report for debugging and telemetry
 */
export interface ErrorReport {
  id: string
  type: AnimationLoadError
  severity: ErrorSeverity
  message: string
  context: ErrorContext
  recoveryAttempts: number
  recoveryStrategy: RecoveryStrategy
  resolved: boolean
  timestamp: number
}

/**
 * Fallback animation definitions
 */
export const FALLBACK_ANIMATIONS = {
  idle: ['Masculine_TPose', 'default_idle'],
  walk: ['default_walk', 'Masculine_TPose'],
  run: ['default_run', 'default_walk', 'Masculine_TPose'],
  jump: ['default_jump', 'default_walk', 'Masculine_TPose'],
  building: ['Masculine_TPose', 'default_idle'],
  communicating: ['Masculine_TPose', 'default_idle'],
  celebrating: ['Masculine_TPose', 'default_idle'],
  thinking: ['Masculine_TPose', 'default_idle']
} as const

/**
 * Default error recovery configuration
 */
export const DEFAULT_ERROR_CONFIG: ErrorRecoveryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  fallbackAnimations: ['Masculine_TPose', 'default_idle'],
  enableFallbackAvatar: true,
  enablePerformanceDegradation: true,
  enableUserNotifications: false, // Don't spam users with technical errors
  enableTelemetry: true
}

/**
 * Animation Error Handler class
 */
export class AnimationErrorHandler {
  private errorReports: Map<string, ErrorReport> = new Map()
  private retryAttempts: Map<string, number> = new Map()
  private config: ErrorRecoveryConfig
  private onError?: (report: ErrorReport) => void
  private onRecovery?: (report: ErrorReport) => void
  private enableLogging: boolean

  constructor(
    config: Partial<ErrorRecoveryConfig> = {},
    options: {
      enableLogging?: boolean
      onError?: (report: ErrorReport) => void
      onRecovery?: (report: ErrorReport) => void
    } = {}
  ) {
    this.config = { ...DEFAULT_ERROR_CONFIG, ...config }
    this.enableLogging = options.enableLogging || false
    this.onError = options.onError
    this.onRecovery = options.onRecovery

    if (this.enableLogging) {
      console.log('🛡️ AnimationErrorHandler initialized')
    }
  }

  /**
   * Handle animation loading errors
   */
  async handleLoadError(
    error: Error | AnimationError,
    assetPath: string,
    context: Partial<ErrorContext> = {}
  ): Promise<{
    shouldRetry: boolean
    fallbackAsset?: string
    degradePerformance: boolean
  }> {
    const animationError = this.normalizeError(error, assetPath)
    const errorId = this.generateErrorId(animationError, assetPath)
    
    // Create error context
    const fullContext: ErrorContext = {
      assetPath,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      memoryUsage: this.getMemoryUsage(),
      ...context
    }

    // Determine error severity
    const severity = this.determineSeverity(animationError)
    
    // Create error report
    const report: ErrorReport = {
      id: errorId,
      type: animationError.type,
      severity,
      message: animationError.message,
      context: fullContext,
      recoveryAttempts: this.retryAttempts.get(errorId) || 0,
      recoveryStrategy: this.determineRecoveryStrategy(animationError, severity),
      resolved: false,
      timestamp: Date.now()
    }

    // Store error report
    this.errorReports.set(errorId, report)

    // Call error callback
    if (this.onError) {
      this.onError(report)
    }

    // Log error if enabled
    if (this.enableLogging) {
      console.error(`🚨 Animation error [${severity}]:`, {
        type: animationError.type,
        path: assetPath,
        message: animationError.message,
        attempts: report.recoveryAttempts
      })
    }

    // Execute recovery strategy
    return this.executeRecoveryStrategy(report)
  }

  /**
   * Handle animation playback errors
   */
  handlePlaybackError(
    error: Error,
    animationName: string,
    simulantId?: string
  ): {
    fallbackAnimation?: string
    shouldStop: boolean
    shouldRestart: boolean
  } {
    const errorId = this.generateErrorId(error, animationName)
    const attempts = this.retryAttempts.get(errorId) || 0
    
    // Increment retry attempts
    this.retryAttempts.set(errorId, attempts + 1)

    const context: ErrorContext = {
      simulantId,
      animationName,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      memoryUsage: this.getMemoryUsage()
    }

    const report: ErrorReport = {
      id: errorId,
      type: AnimationLoadError.NETWORK_ERROR, // Generic for playback errors
      severity: ErrorSeverity.MEDIUM,
      message: `Animation playback failed: ${error.message}`,
      context,
      recoveryAttempts: attempts + 1,
      recoveryStrategy: RecoveryStrategy.FALLBACK,
      resolved: false,
      timestamp: Date.now()
    }

    this.errorReports.set(errorId, report)

    if (this.enableLogging) {
      console.warn(`⚠️ Animation playback error:`, {
        animation: animationName,
        simulant: simulantId,
        error: error.message,
        attempts: attempts + 1
      })
    }

    // Find fallback animation
    const fallbackAnimation = this.findFallbackAnimation(animationName)

    return {
      fallbackAnimation,
      shouldStop: (attempts + 1) > this.config.maxRetries,
      shouldRestart: (attempts + 1) <= 1 // Only restart on first failure
    }
  }

  /**
   * Handle performance degradation
   */
  handlePerformanceDegradation(
    metrics: {
      fps: number
      memoryUsage: number
      activeAnimations: number
    }
  ): {
    reduceQuality: boolean
    disableAnimations: boolean
    clearCache: boolean
    cullDistance: number
  } {
    const severity = this.determinePerformanceSeverity(metrics)
    
    const context: ErrorContext = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      memoryUsage: metrics.memoryUsage,
      performanceMetrics: {
        fps: metrics.fps,
        memoryPressure: metrics.memoryUsage > 500 * 1024 * 1024, // 500MB
        activeAnimations: metrics.activeAnimations
      }
    }

    const report: ErrorReport = {
      id: `perf_${Date.now()}`,
      type: AnimationLoadError.NETWORK_ERROR, // Generic
      severity,
      message: `Performance degradation detected: ${metrics.fps.toFixed(1)} FPS`,
      context,
      recoveryAttempts: 0,
      recoveryStrategy: RecoveryStrategy.DEGRADE,
      resolved: false,
      timestamp: Date.now()
    }

    this.errorReports.set(report.id, report)

    if (this.enableLogging) {
      console.warn(`📉 Performance degradation [${severity}]:`, metrics)
    }

    // Return degradation strategy based on severity
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return {
          reduceQuality: true,
          disableAnimations: true,
          clearCache: true,
          cullDistance: 30
        }
      case ErrorSeverity.HIGH:
        return {
          reduceQuality: true,
          disableAnimations: false,
          clearCache: true,
          cullDistance: 50
        }
      case ErrorSeverity.MEDIUM:
        return {
          reduceQuality: true,
          disableAnimations: false,
          clearCache: false,
          cullDistance: 80
        }
      default:
        return {
          reduceQuality: false,
          disableAnimations: false,
          clearCache: false,
          cullDistance: 120
        }
    }
  }

  /**
   * Handle memory pressure
   */
  handleMemoryPressure(
    currentUsage: number,
    maxUsage: number
  ): {
    clearCache: boolean
    reduceQuality: boolean
    cullAggressively: boolean
    disableParticles: boolean
  } {
    const pressureRatio = currentUsage / maxUsage
    const severity = pressureRatio > 0.9 ? ErrorSeverity.CRITICAL :
                    pressureRatio > 0.8 ? ErrorSeverity.HIGH :
                    pressureRatio > 0.7 ? ErrorSeverity.MEDIUM :
                    ErrorSeverity.LOW

    if (this.enableLogging) {
      console.warn(`🧠 Memory pressure [${severity}]:`, {
        current: `${(currentUsage / 1024 / 1024).toFixed(1)}MB`,
        max: `${(maxUsage / 1024 / 1024).toFixed(1)}MB`,
        ratio: `${(pressureRatio * 100).toFixed(1)}%`
      })
    }

    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return {
          clearCache: true,
          reduceQuality: true,
          cullAggressively: true,
          disableParticles: true
        }
      case ErrorSeverity.HIGH:
        return {
          clearCache: true,
          reduceQuality: true,
          cullAggressively: true,
          disableParticles: true // Changed to true for high severity
        }
      case ErrorSeverity.MEDIUM:
        return {
          clearCache: true,
          reduceQuality: false,
          cullAggressively: false,
          disableParticles: false
        }
      default:
        return {
          clearCache: false,
          reduceQuality: false,
          cullAggressively: false,
          disableParticles: false
        }
    }
  }

  /**
   * Create fallback animation system
   */
  createFallbackAnimationSystem(): {
    createDefaultClip: (name: string, duration?: number) => AnimationClip
    createTPoseClip: () => AnimationClip
    createIdleClip: () => AnimationClip
  } {
    return {
      createDefaultClip: (name: string, duration: number = 1.0) => {
        // Create a minimal animation clip for fallback
        const clip = new AnimationClip(name, duration, [])
        return clip
      },

      createTPoseClip: () => {
        // Create a T-pose animation (static pose)
        const clip = new AnimationClip('tpose_fallback', 1.0, [])
        return clip
      },

      createIdleClip: () => {
        // Create a basic idle animation
        const clip = new AnimationClip('idle_fallback', 2.0, [])
        return clip
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number
    errorsByType: Record<string, number>
    errorsBySeverity: Record<string, number>
    recoverySuccessRate: number
    mostCommonErrors: Array<{ type: string; count: number }>
  } {
    const reports = Array.from(this.errorReports.values())
    const totalErrors = reports.length
    
    const errorsByType: Record<string, number> = {}
    const errorsBySeverity: Record<string, number> = {}
    let resolvedCount = 0

    reports.forEach(report => {
      errorsByType[report.type] = (errorsByType[report.type] || 0) + 1
      errorsBySeverity[report.severity] = (errorsBySeverity[report.severity] || 0) + 1
      if (report.resolved) resolvedCount++
    })

    const mostCommonErrors = Object.entries(errorsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      recoverySuccessRate: totalErrors > 0 ? resolvedCount / totalErrors : 1,
      mostCommonErrors
    }
  }

  /**
   * Generate user-friendly error messages
   */
  generateUserMessage(error: AnimationError): string {
    switch (error.type) {
      case AnimationLoadError.FILE_NOT_FOUND:
        return "Some animation files are missing. Using default animations instead."
      case AnimationLoadError.NETWORK_ERROR:
        return "Having trouble loading animations. Please check your connection."
      case AnimationLoadError.CORRUPTED_FILE:
        return "Some animation files are damaged. Using backup animations."
      case AnimationLoadError.NO_ANIMATIONS:
        return "Animation file doesn't contain valid animations. Using defaults."
      case AnimationLoadError.CACHE_FULL:
        return "Animation cache is full. Clearing old animations to make room."
      default:
        return "Animation system encountered an issue. Attempting to recover automatically."
    }
  }

  /**
   * Clear old error reports
   */
  clearOldReports(maxAge: number = 5 * 60 * 1000): void {
    const now = Date.now()
    const toDelete: string[] = []

    this.errorReports.forEach((report, id) => {
      if (now - report.timestamp > maxAge) {
        toDelete.push(id)
      }
    })

    toDelete.forEach(id => {
      this.errorReports.delete(id)
      this.retryAttempts.delete(id)
    })

    if (this.enableLogging && toDelete.length > 0) {
      console.log(`🧹 Cleared ${toDelete.length} old error reports`)
    }
  }

  /**
   * Private helper methods
   */
  private normalizeError(error: Error | AnimationError, path: string): AnimationError {
    if ('type' in error && error.type) {
      return error as AnimationError
    }

    // Determine error type from error message
    const message = error.message.toLowerCase()
    let type: AnimationLoadError

    if (message.includes('404') || message.includes('not found')) {
      type = AnimationLoadError.FILE_NOT_FOUND
    } else if (message.includes('network') || message.includes('fetch')) {
      type = AnimationLoadError.NETWORK_ERROR
    } else if (message.includes('corrupt') || message.includes('invalid')) {
      type = AnimationLoadError.CORRUPTED_FILE
    } else {
      type = AnimationLoadError.NETWORK_ERROR
    }

    const animationError = error as AnimationError
    animationError.type = type
    animationError.path = path
    return animationError
  }

  private generateErrorId(error: Error, identifier: string): string {
    return `${error.constructor.name}_${identifier}_${Date.now()}`
  }

  private determineSeverity(error: AnimationError): ErrorSeverity {
    switch (error.type) {
      case AnimationLoadError.CORRUPTED_FILE:
      case AnimationLoadError.CACHE_FULL:
        return ErrorSeverity.HIGH
      case AnimationLoadError.FILE_NOT_FOUND:
      case AnimationLoadError.NO_ANIMATIONS:
        return ErrorSeverity.MEDIUM
      case AnimationLoadError.NETWORK_ERROR:
        return ErrorSeverity.LOW
      default:
        return ErrorSeverity.MEDIUM
    }
  }

  private determinePerformanceSeverity(metrics: {
    fps: number
    memoryUsage: number
    activeAnimations: number
  }): ErrorSeverity {
    if (metrics.fps < 15 || metrics.memoryUsage > 800 * 1024 * 1024) {
      return ErrorSeverity.CRITICAL
    } else if (metrics.fps < 30 || metrics.memoryUsage > 600 * 1024 * 1024) {
      return ErrorSeverity.HIGH
    } else if (metrics.fps < 45 || metrics.memoryUsage > 400 * 1024 * 1024) {
      return ErrorSeverity.MEDIUM
    }
    return ErrorSeverity.LOW
  }

  private determineRecoveryStrategy(error: AnimationError, severity: ErrorSeverity): RecoveryStrategy {
    switch (error.type) {
      case AnimationLoadError.FILE_NOT_FOUND:
        return RecoveryStrategy.FALLBACK
      case AnimationLoadError.NETWORK_ERROR:
        return severity === ErrorSeverity.HIGH ? RecoveryStrategy.FALLBACK : RecoveryStrategy.RETRY
      case AnimationLoadError.CORRUPTED_FILE:
        return RecoveryStrategy.FALLBACK
      case AnimationLoadError.CACHE_FULL:
        return RecoveryStrategy.DEGRADE
      default:
        return RecoveryStrategy.RETRY
    }
  }

  private async executeRecoveryStrategy(report: ErrorReport): Promise<{
    shouldRetry: boolean
    fallbackAsset?: string
    degradePerformance: boolean
  }> {
    const attempts = this.retryAttempts.get(report.id) || 0
    this.retryAttempts.set(report.id, attempts + 1)

    switch (report.recoveryStrategy) {
      case RecoveryStrategy.RETRY:
        if (attempts < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
          return { shouldRetry: true, degradePerformance: false }
        }
        // Fall through to fallback if max retries exceeded
        
      case RecoveryStrategy.FALLBACK:
        const fallbackAsset = this.findFallbackAsset(report.context.assetPath)
        return { shouldRetry: false, fallbackAsset, degradePerformance: false }

      case RecoveryStrategy.DEGRADE:
        return { shouldRetry: false, degradePerformance: true }

      case RecoveryStrategy.SKIP:
        return { shouldRetry: false, degradePerformance: false }

      default:
        return { shouldRetry: false, degradePerformance: false }
    }
  }

  private findFallbackAsset(assetPath?: string): string | undefined {
    if (!assetPath) return undefined

    // Extract animation type from path
    const filename = assetPath.split('/').pop()?.toLowerCase() || ''
    
    if (filename.includes('idle')) {
      return '/animation_GLB/Masculine_TPose.glb'
    } else if (filename.includes('walk')) {
      return '/animation_GLB/M_Walk_001.glb'
    } else if (filename.includes('run')) {
      return '/animation_GLB/M_Walk_001.glb'
    } else if (filename.includes('jump')) {
      return '/animation_GLB/M_Walk_001.glb'
    }

    return '/animation_GLB/Masculine_TPose.glb'
  }

  private findFallbackAnimation(animationName: string): string | undefined {
    const lowerName = animationName.toLowerCase()
    
    if (lowerName.includes('idle')) {
      return FALLBACK_ANIMATIONS.idle[0]
    } else if (lowerName.includes('walk')) {
      return FALLBACK_ANIMATIONS.walk[0]
    } else if (lowerName.includes('run')) {
      return FALLBACK_ANIMATIONS.run[0]
    } else if (lowerName.includes('jump')) {
      return FALLBACK_ANIMATIONS.jump[0]
    }

    return FALLBACK_ANIMATIONS.idle[0]
  }

  private getMemoryUsage(): number {
    if ('memory' in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  /**
   * Dispose of the error handler
   */
  dispose(): void {
    this.errorReports.clear()
    this.retryAttempts.clear()
    this.onError = undefined
    this.onRecovery = undefined

    if (this.enableLogging) {
      console.log('🗑️ AnimationErrorHandler disposed')
    }
  }
}

// Export singleton instance
export const animationErrorHandler = new AnimationErrorHandler()