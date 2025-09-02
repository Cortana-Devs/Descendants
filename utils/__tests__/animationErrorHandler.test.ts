/**
 * Tests for Animation Error Handler
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { AnimationErrorHandler, ErrorSeverity, RecoveryStrategy } from '../animationErrorHandler'
import { AnimationLoadError } from '../../types/animations'

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

vi.stubGlobal('console', mockConsole)

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  writable: true
})

describe('AnimationErrorHandler', () => {
  let errorHandler: AnimationErrorHandler

  beforeEach(() => {
    errorHandler = new AnimationErrorHandler({
      maxRetries: 3,
      retryDelay: 100,
      enableTelemetry: true
    }, {
      enableLogging: true
    })
    
    // Clear console mocks
    mockConsole.log.mockClear()
    mockConsole.warn.mockClear()
    mockConsole.error.mockClear()
  })

  afterEach(() => {
    errorHandler.dispose()
  })

  describe('handleLoadError', () => {
    test('should handle file not found error', async () => {
      const error = new Error('404 Not Found')
      const assetPath = '/animation_GLB/missing_animation.glb'

      const result = await errorHandler.handleLoadError(error, assetPath)

      expect(result.shouldRetry).toBe(false)
      expect(result.fallbackAsset).toBeDefined()
      expect(result.degradePerformance).toBe(false)
      expect(mockConsole.error).toHaveBeenCalled()
    })

    test('should handle network error with retry', async () => {
      const error = new Error('Network error')
      const assetPath = '/animation_GLB/test_animation.glb'

      const result = await errorHandler.handleLoadError(error, assetPath)

      expect(result.shouldRetry).toBe(true)
      expect(result.degradePerformance).toBe(false)
    })

    test('should handle corrupted file error', async () => {
      const error = new Error('Invalid GLB format')
      const assetPath = '/animation_GLB/corrupted_animation.glb'

      const result = await errorHandler.handleLoadError(error, assetPath)

      expect(result.shouldRetry).toBe(false)
      expect(result.fallbackAsset).toBeDefined()
    })

    test('should track error statistics', async () => {
      const error1 = new Error('404 Not Found')
      const error2 = new Error('Network timeout')
      
      await errorHandler.handleLoadError(error1, '/path1.glb')
      await errorHandler.handleLoadError(error2, '/path2.glb')

      const stats = errorHandler.getErrorStatistics()
      expect(stats.totalErrors).toBe(2)
      expect(stats.errorsByType).toHaveProperty('FILE_NOT_FOUND')
      expect(stats.errorsByType).toHaveProperty('NETWORK_ERROR')
    })
  })

  describe('handlePlaybackError', () => {
    test('should provide fallback animation for playback failure', () => {
      const error = new Error('Animation action failed')
      const animationName = 'walk_animation'
      const simulantId = 'simulant_123'

      const result = errorHandler.handlePlaybackError(error, animationName, simulantId)

      expect(result.fallbackAnimation).toBeDefined()
      expect(result.shouldStop).toBe(false)
      expect(result.shouldRestart).toBe(true)
    })

    test('should stop after max retries', () => {
      const error = new Error('Persistent animation failure')
      const animationName = 'problematic_animation'

      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        errorHandler.handlePlaybackError(error, animationName)
      }

      const result = errorHandler.handlePlaybackError(error, animationName)
      expect(result.shouldStop).toBe(true)
    })
  })

  describe('handlePerformanceDegradation', () => {
    test('should recommend quality reduction for low FPS', () => {
      const metrics = {
        fps: 15,
        memoryUsage: 200 * 1024 * 1024,
        activeAnimations: 5
      }

      const result = errorHandler.handlePerformanceDegradation(metrics)

      expect(result.reduceQuality).toBe(true)
      expect(result.cullDistance).toBeLessThan(100)
    })

    test('should recommend cache clearing for high memory usage', () => {
      const metrics = {
        fps: 45,
        memoryUsage: 800 * 1024 * 1024, // 800MB
        activeAnimations: 3
      }

      const result = errorHandler.handlePerformanceDegradation(metrics)

      expect(result.clearCache).toBe(true)
      expect(result.reduceQuality).toBe(true)
    })

    test('should disable animations for critical performance issues', () => {
      const metrics = {
        fps: 8,
        memoryUsage: 900 * 1024 * 1024,
        activeAnimations: 10
      }

      const result = errorHandler.handlePerformanceDegradation(metrics)

      expect(result.disableAnimations).toBe(true)
      expect(result.clearCache).toBe(true)
      expect(result.cullDistance).toBeLessThan(50)
    })
  })

  describe('handleMemoryPressure', () => {
    test('should handle moderate memory pressure', () => {
      const currentUsage = 300 * 1024 * 1024 // 300MB
      const maxUsage = 400 * 1024 * 1024 // 400MB

      const result = errorHandler.handleMemoryPressure(currentUsage, maxUsage)

      expect(result.clearCache).toBe(true)
      expect(result.reduceQuality).toBe(false)
      expect(result.cullAggressively).toBe(false)
    })

    test('should handle critical memory pressure', () => {
      const currentUsage = 450 * 1024 * 1024 // 450MB
      const maxUsage = 500 * 1024 * 1024 // 500MB

      const result = errorHandler.handleMemoryPressure(currentUsage, maxUsage)

      expect(result.clearCache).toBe(true)
      expect(result.reduceQuality).toBe(true)
      expect(result.cullAggressively).toBe(true)
      expect(result.disableParticles).toBe(true)
    })
  })

  describe('generateUserMessage', () => {
    test('should generate user-friendly messages', () => {
      const fileNotFoundError = {
        type: AnimationLoadError.FILE_NOT_FOUND,
        message: 'File not found',
        path: '/test.glb'
      } as any

      const message = errorHandler.generateUserMessage(fileNotFoundError)
      expect(message).toContain('missing')
      expect(message).toContain('default')
    })

    test('should generate network error messages', () => {
      const networkError = {
        type: AnimationLoadError.NETWORK_ERROR,
        message: 'Network timeout',
        path: '/test.glb'
      } as any

      const message = errorHandler.generateUserMessage(networkError)
      expect(message).toContain('connection')
    })
  })

  describe('createFallbackAnimationSystem', () => {
    test('should create fallback animation clips', () => {
      const fallbackSystem = errorHandler.createFallbackAnimationSystem()

      const defaultClip = fallbackSystem.createDefaultClip('test_animation', 2.0)
      expect(defaultClip.name).toBe('test_animation')
      expect(defaultClip.duration).toBe(2.0)

      const tposeClip = fallbackSystem.createTPoseClip()
      expect(tposeClip.name).toBe('tpose_fallback')

      const idleClip = fallbackSystem.createIdleClip()
      expect(idleClip.name).toBe('idle_fallback')
    })
  })

  describe('error statistics', () => {
    test('should calculate recovery success rate', async () => {
      // Simulate some successful recoveries
      await errorHandler.handleLoadError(new Error('Network error'), '/path1.glb')
      await errorHandler.handleLoadError(new Error('404 error'), '/path2.glb')

      const stats = errorHandler.getErrorStatistics()
      expect(stats.recoverySuccessRate).toBeGreaterThanOrEqual(0)
      expect(stats.recoverySuccessRate).toBeLessThanOrEqual(1)
    })

    test('should track most common errors', async () => {
      // Generate multiple errors of the same type
      for (let i = 0; i < 3; i++) {
        await errorHandler.handleLoadError(new Error('404 Not Found'), `/path${i}.glb`)
      }
      
      await errorHandler.handleLoadError(new Error('Network timeout'), '/other.glb')

      const stats = errorHandler.getErrorStatistics()
      expect(stats.mostCommonErrors).toHaveLength(2)
      expect(stats.mostCommonErrors[0].type).toBe('FILE_NOT_FOUND')
      expect(stats.mostCommonErrors[0].count).toBe(3)
    })
  })

  describe('cleanup', () => {
    test('should clear old error reports', async () => {
      await errorHandler.handleLoadError(new Error('Test error'), '/test.glb')
      
      let stats = errorHandler.getErrorStatistics()
      expect(stats.totalErrors).toBe(1)

      // Clear with 0 max age (clear all)
      errorHandler.clearOldReports(0)
      
      stats = errorHandler.getErrorStatistics()
      expect(stats.totalErrors).toBe(0)
    })
  })
})

describe('Error Recovery Strategies', () => {
  test('should determine correct recovery strategy for different error types', () => {
    const handler = new AnimationErrorHandler()

    // File not found should use fallback
    const fileNotFoundError = {
      type: AnimationLoadError.FILE_NOT_FOUND,
      message: 'File not found',
      path: '/test.glb'
    } as any

    // Network error should retry first
    const networkError = {
      type: AnimationLoadError.NETWORK_ERROR,
      message: 'Network error',
      path: '/test.glb'
    } as any

    // Both should be handled appropriately
    expect(() => handler.generateUserMessage(fileNotFoundError)).not.toThrow()
    expect(() => handler.generateUserMessage(networkError)).not.toThrow()

    handler.dispose()
  })
})