/**
 * Performance adaptation system for low-end devices
 * Automatically adjusts animation quality and features based on device capabilities
 */

import { Vector3 } from 'three'
import { PerformanceMonitor, QualityLevel, QUALITY_PRESETS, type PerformanceMetrics } from './performanceMonitor'
import { animationErrorHandler } from './animationErrorHandler'

/**
 * Device capability assessment
 */
export interface DeviceCapabilities {
  isLowEnd: boolean
  isMobile: boolean
  hasLimitedMemory: boolean
  supportsWebGL2: boolean
  maxTextureSize: number
  estimatedPerformanceScore: number // 0-100
}

/**
 * Adaptation strategy configuration
 */
export interface AdaptationStrategy {
  enableDynamicLOD: boolean
  enableAnimationCulling: boolean
  enableQualityScaling: boolean
  enableMemoryManagement: boolean
  enableFallbackAnimations: boolean
  aggressiveOptimization: boolean
}

/**
 * Performance adaptation settings
 */
export interface AdaptationSettings {
  targetFPS: number
  memoryThreshold: number
  cullingDistance: number
  lodUpdateFrequency: number
  qualityCheckInterval: number
  adaptationDelay: number
}

/**
 * Default adaptation settings for different device types
 */
export const ADAPTATION_PRESETS = {
  desktop: {
    targetFPS: 60,
    memoryThreshold: 500 * 1024 * 1024, // 500MB
    cullingDistance: 120,
    lodUpdateFrequency: 60,
    qualityCheckInterval: 2000,
    adaptationDelay: 1000
  },
  mobile: {
    targetFPS: 30,
    memoryThreshold: 200 * 1024 * 1024, // 200MB
    cullingDistance: 80,
    lodUpdateFrequency: 30,
    qualityCheckInterval: 1000,
    adaptationDelay: 500
  },
  lowEnd: {
    targetFPS: 20,
    memoryThreshold: 100 * 1024 * 1024, // 100MB
    cullingDistance: 50,
    lodUpdateFrequency: 15,
    qualityCheckInterval: 500,
    adaptationDelay: 250
  }
} as const

/**
 * Performance Adapter class
 */
export class AnimationPerformanceAdapter {
  private deviceCapabilities: DeviceCapabilities
  private adaptationStrategy: AdaptationStrategy
  private adaptationSettings: AdaptationSettings
  private performanceMonitor: PerformanceMonitor
  private currentQuality: QualityLevel
  private adaptationTimer: number = 0
  private lastAdaptationTime: number = 0
  private enableLogging: boolean
  private onQualityChange?: (quality: QualityLevel) => void
  private onAdaptation?: (adaptation: AdaptationResult) => void

  constructor(
    options: {
      enableLogging?: boolean
      onQualityChange?: (quality: QualityLevel) => void
      onAdaptation?: (adaptation: AdaptationResult) => void
    } = {}
  ) {
    this.enableLogging = options.enableLogging || false
    this.onQualityChange = options.onQualityChange
    this.onAdaptation = options.onAdaptation

    // Assess device capabilities
    this.deviceCapabilities = this.assessDeviceCapabilities()
    
    // Set adaptation strategy based on device
    this.adaptationStrategy = this.determineAdaptationStrategy()
    
    // Set adaptation settings based on device type
    this.adaptationSettings = this.determineAdaptationSettings()
    
    // Initialize performance monitor
    const initialQuality = this.deviceCapabilities.isLowEnd ? 'low' : 
                          this.deviceCapabilities.isMobile ? 'medium' : 'high'
    
    this.performanceMonitor = new PerformanceMonitor(
      initialQuality,
      {
        targetFPS: this.adaptationSettings.targetFPS,
        maxMemoryUsage: this.adaptationSettings.memoryThreshold,
        adaptationDelay: this.adaptationSettings.adaptationDelay
      },
      {
        enableLogging: this.enableLogging,
        onQualityChange: (quality) => {
          this.currentQuality = quality
          if (this.onQualityChange) {
            this.onQualityChange(quality)
          }
        }
      }
    )

    this.currentQuality = QUALITY_PRESETS[initialQuality]

    if (this.enableLogging) {
      console.log('🎯 AnimationPerformanceAdapter initialized:', {
        device: this.getDeviceType(),
        quality: initialQuality,
        strategy: this.adaptationStrategy
      })
    }
  }

  /**
   * Update performance metrics and trigger adaptation if needed
   */
  update(deltaTime: number): AdaptationResult | null {
    // Update performance monitor
    this.performanceMonitor.update(deltaTime)
    
    const now = Date.now()
    
    // Check if it's time for adaptation
    if (now - this.lastAdaptationTime < this.adaptationSettings.qualityCheckInterval) {
      return null
    }

    const metrics = this.performanceMonitor.getMetrics()
    const adaptationResult = this.evaluateAdaptationNeeds(metrics)

    if (adaptationResult.needsAdaptation) {
      this.executeAdaptation(adaptationResult)
      this.lastAdaptationTime = now

      if (this.onAdaptation) {
        this.onAdaptation(adaptationResult)
      }

      return adaptationResult
    }

    return null
  }

  /**
   * Force immediate performance adaptation
   */
  forceAdaptation(): AdaptationResult {
    const metrics = this.performanceMonitor.getMetrics()
    const adaptationResult = this.evaluateAdaptationNeeds(metrics, true)
    
    this.executeAdaptation(adaptationResult)
    
    if (this.onAdaptation) {
      this.onAdaptation(adaptationResult)
    }

    return adaptationResult
  }

  /**
   * Get current device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.deviceCapabilities }
  }

  /**
   * Get current adaptation strategy
   */
  getAdaptationStrategy(): AdaptationStrategy {
    return { ...this.adaptationStrategy }
  }

  /**
   * Get performance recommendations for current device
   */
  getPerformanceRecommendations(): {
    maxAnimatedSimulants: number
    recommendedQuality: 'high' | 'medium' | 'low'
    enableParticles: boolean
    enableShadows: boolean
    cullingDistance: number
    updateFrequency: number
  } {
    const deviceType = this.getDeviceType()
    const quality = this.currentQuality

    return {
      maxAnimatedSimulants: quality.maxAnimatedSimulants,
      recommendedQuality: quality.name,
      enableParticles: quality.enableParticles,
      enableShadows: quality.shadowQuality !== 'off',
      cullingDistance: quality.cullingDistance,
      updateFrequency: quality.animationUpdateRate
    }
  }

  /**
   * Check if specific feature should be enabled
   */
  shouldEnableFeature(feature: 'particles' | 'shadows' | 'blending' | 'lod'): boolean {
    switch (feature) {
      case 'particles':
        return this.currentQuality.enableParticles && !this.deviceCapabilities.isLowEnd
      case 'shadows':
        return this.currentQuality.shadowQuality !== 'off'
      case 'blending':
        return this.currentQuality.enableBlending
      case 'lod':
        return this.adaptationStrategy.enableDynamicLOD
      default:
        return true
    }
  }

  /**
   * Get LOD level for a position
   */
  getLODLevel(position: Vector3, cameraPosition: Vector3): 'high' | 'medium' | 'low' | 'culled' {
    if (!this.adaptationStrategy.enableDynamicLOD) {
      return 'high'
    }

    const distance = position.distanceTo(cameraPosition)
    const { lodDistances } = this.currentQuality

    if (distance > lodDistances.cull) return 'culled'
    if (distance > lodDistances.low) return 'low'
    if (distance > lodDistances.medium) return 'medium'
    return 'high'
  }

  /**
   * Check if simulant should be culled
   */
  shouldCullSimulant(position: Vector3, cameraPosition: Vector3): boolean {
    if (!this.adaptationStrategy.enableAnimationCulling) {
      return false
    }

    const distance = position.distanceTo(cameraPosition)
    return distance > this.adaptationSettings.cullingDistance
  }

  /**
   * Get animation update frequency for a simulant
   */
  getAnimationUpdateFrequency(position: Vector3, cameraPosition: Vector3): number {
    const lodLevel = this.getLODLevel(position, cameraPosition)
    const baseFrequency = this.currentQuality.animationUpdateRate

    switch (lodLevel) {
      case 'high': return baseFrequency
      case 'medium': return Math.max(15, baseFrequency * 0.6)
      case 'low': return Math.max(10, baseFrequency * 0.3)
      case 'culled': return 0
      default: return baseFrequency
    }
  }

  /**
   * Private methods
   */
  private assessDeviceCapabilities(): DeviceCapabilities {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    
    // Basic device detection
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isLowEnd = this.detectLowEndDevice()
    
    // Memory estimation
    const hasLimitedMemory = this.estimateAvailableMemory() < 2048 // Less than 2GB
    
    // WebGL capabilities
    const supportsWebGL2 = !!canvas.getContext('webgl2')
    const maxTextureSize = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 1024
    
    // Performance score estimation (0-100)
    let performanceScore = 100
    if (isMobile) performanceScore -= 30
    if (isLowEnd) performanceScore -= 40
    if (hasLimitedMemory) performanceScore -= 20
    if (!supportsWebGL2) performanceScore -= 10
    if (maxTextureSize < 2048) performanceScore -= 10
    
    performanceScore = Math.max(0, performanceScore)

    return {
      isLowEnd,
      isMobile,
      hasLimitedMemory,
      supportsWebGL2,
      maxTextureSize,
      estimatedPerformanceScore: performanceScore
    }
  }

  private detectLowEndDevice(): boolean {
    // Check for low-end device indicators
    const userAgent = navigator.userAgent.toLowerCase()
    
    // Low-end mobile devices
    const lowEndPatterns = [
      'android 4', 'android 5', 'android 6',
      'iphone 5', 'iphone 6', 'ipad 2', 'ipad 3',
      'samsung-gt', 'samsung-sm-g3', 'samsung-sm-j',
      'lg-', 'htc', 'motorola', 'nokia'
    ]
    
    if (lowEndPatterns.some(pattern => userAgent.includes(pattern))) {
      return true
    }

    // Check hardware concurrency (CPU cores)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
      return true
    }

    // Check memory (if available)
    if ('memory' in performance && (performance as any).memory && (performance as any).memory.jsHeapSizeLimit < 1024 * 1024 * 1024) {
      return true // Less than 1GB heap
    }

    return false
  }

  private estimateAvailableMemory(): number {
    // Try to get actual memory info (Chrome only)
    if ('memory' in performance && (performance as any).memory) {
      return (performance as any).memory.jsHeapSizeLimit / (1024 * 1024) // MB
    }

    // Fallback estimation based on device type
    if (this.deviceCapabilities?.isMobile) {
      return 1024 // Assume 1GB for mobile
    }

    return 4096 // Assume 4GB for desktop
  }

  private determineAdaptationStrategy(): AdaptationStrategy {
    const { isLowEnd, isMobile, hasLimitedMemory, estimatedPerformanceScore } = this.deviceCapabilities

    if (isLowEnd || estimatedPerformanceScore < 30) {
      return {
        enableDynamicLOD: true,
        enableAnimationCulling: true,
        enableQualityScaling: true,
        enableMemoryManagement: true,
        enableFallbackAnimations: true,
        aggressiveOptimization: true
      }
    } else if (isMobile || hasLimitedMemory || estimatedPerformanceScore < 60) {
      return {
        enableDynamicLOD: true,
        enableAnimationCulling: true,
        enableQualityScaling: true,
        enableMemoryManagement: true,
        enableFallbackAnimations: false,
        aggressiveOptimization: false
      }
    } else {
      return {
        enableDynamicLOD: true,
        enableAnimationCulling: false,
        enableQualityScaling: true,
        enableMemoryManagement: false,
        enableFallbackAnimations: false,
        aggressiveOptimization: false
      }
    }
  }

  private determineAdaptationSettings(): AdaptationSettings {
    const { isLowEnd, isMobile } = this.deviceCapabilities

    if (isLowEnd) {
      return ADAPTATION_PRESETS.lowEnd
    } else if (isMobile) {
      return ADAPTATION_PRESETS.mobile
    } else {
      return ADAPTATION_PRESETS.desktop
    }
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'lowEnd' {
    if (this.deviceCapabilities.isLowEnd) return 'lowEnd'
    if (this.deviceCapabilities.isMobile) return 'mobile'
    return 'desktop'
  }

  private evaluateAdaptationNeeds(
    metrics: PerformanceMetrics,
    force: boolean = false
  ): AdaptationResult {
    const needsAdaptation = force || 
      metrics.averageFrameRate < this.adaptationSettings.targetFPS * 0.8 ||
      metrics.memoryUsage > this.adaptationSettings.memoryThreshold * 0.9

    const adaptations: AdaptationAction[] = []

    if (needsAdaptation) {
      // Performance-based adaptations
      if (metrics.averageFrameRate < this.adaptationSettings.targetFPS * 0.6) {
        adaptations.push({
          type: 'quality',
          action: 'reduce',
          severity: 'high',
          description: 'Reduce animation quality due to low FPS'
        })
      }

      // Memory-based adaptations
      if (metrics.memoryUsage > this.adaptationSettings.memoryThreshold * 0.9) {
        adaptations.push({
          type: 'memory',
          action: 'clear_cache',
          severity: 'medium',
          description: 'Clear animation cache due to memory pressure'
        })
      }

      // Culling adaptations
      if (this.adaptationStrategy.enableAnimationCulling) {
        adaptations.push({
          type: 'culling',
          action: 'increase',
          severity: 'low',
          description: 'Increase culling distance to improve performance'
        })
      }
    }

    return {
      needsAdaptation,
      adaptations,
      currentMetrics: metrics,
      recommendedQuality: this.determineRecommendedQuality(metrics),
      timestamp: Date.now()
    }
  }

  private executeAdaptation(result: AdaptationResult): void {
    result.adaptations.forEach(adaptation => {
      switch (adaptation.type) {
        case 'quality':
          if (adaptation.action === 'reduce') {
            this.reduceQuality()
          }
          break
        case 'memory':
          if (adaptation.action === 'clear_cache') {
            this.clearMemory()
          }
          break
        case 'culling':
          if (adaptation.action === 'increase') {
            this.increaseCulling()
          }
          break
      }
    })

    if (this.enableLogging) {
      console.log('🎯 Performance adaptation executed:', {
        adaptations: result.adaptations.length,
        quality: this.currentQuality.name,
        fps: result.currentMetrics.averageFrameRate.toFixed(1)
      })
    }
  }

  private determineRecommendedQuality(metrics: PerformanceMetrics): 'high' | 'medium' | 'low' {
    if (metrics.averageFrameRate < 20 || metrics.memoryUsage > this.adaptationSettings.memoryThreshold) {
      return 'low'
    } else if (metrics.averageFrameRate < 40 || metrics.memoryUsage > this.adaptationSettings.memoryThreshold * 0.7) {
      return 'medium'
    }
    return 'high'
  }

  private reduceQuality(): void {
    const currentName = this.currentQuality.name
    let newQuality: 'high' | 'medium' | 'low'

    if (currentName === 'high') {
      newQuality = 'medium'
    } else if (currentName === 'medium') {
      newQuality = 'low'
    } else {
      return // Already at lowest quality
    }

    this.performanceMonitor.setQuality(newQuality)
  }

  private clearMemory(): void {
    // Trigger memory cleanup through error handler
    animationErrorHandler.handleMemoryPressure(
      this.performanceMonitor.getMetrics().memoryUsage,
      this.adaptationSettings.memoryThreshold
    )
  }

  private increaseCulling(): void {
    // Reduce culling distance for more aggressive culling
    this.adaptationSettings.cullingDistance = Math.max(30, this.adaptationSettings.cullingDistance * 0.8)
  }

  /**
   * Dispose of the adapter
   */
  dispose(): void {
    this.performanceMonitor.dispose()
    this.onQualityChange = undefined
    this.onAdaptation = undefined

    if (this.enableLogging) {
      console.log('🗑️ AnimationPerformanceAdapter disposed')
    }
  }
}

/**
 * Adaptation result interface
 */
export interface AdaptationResult {
  needsAdaptation: boolean
  adaptations: AdaptationAction[]
  currentMetrics: PerformanceMetrics
  recommendedQuality: 'high' | 'medium' | 'low'
  timestamp: number
}

/**
 * Adaptation action interface
 */
export interface AdaptationAction {
  type: 'quality' | 'memory' | 'culling' | 'features'
  action: 'reduce' | 'increase' | 'clear_cache' | 'disable' | 'enable'
  severity: 'low' | 'medium' | 'high'
  description: string
}

// Export singleton instance
export const animationPerformanceAdapter = new AnimationPerformanceAdapter()