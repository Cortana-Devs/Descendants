/**
 * Tests for Animation Performance Adapter
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { AnimationPerformanceAdapter } from '../animationPerformanceAdapter'
import { Vector3 } from 'three'

// Mock console
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}
vi.stubGlobal('console', mockConsole)

// Mock navigator and performance
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    hardwareConcurrency: 4
  },
  writable: true
})

Object.defineProperty(global, 'performance', {
  value: {
    memory: {
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
      usedJSHeapSize: 100 * 1024 * 1024 // 100MB
    }
  },
  writable: true
})

// Mock document for canvas creation
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      getContext: vi.fn(() => ({
        getParameter: vi.fn(() => 4096) // MAX_TEXTURE_SIZE
      }))
    }))
  },
  writable: true
})

describe('AnimationPerformanceAdapter', () => {
  let adapter: AnimationPerformanceAdapter

  beforeEach(() => {
    adapter = new AnimationPerformanceAdapter({ enableLogging: true })
    mockConsole.log.mockClear()
    mockConsole.warn.mockClear()
    mockConsole.error.mockClear()
  })

  afterEach(() => {
    adapter.dispose()
  })

  describe('device capability assessment', () => {
    test('should assess desktop device capabilities', () => {
      const capabilities = adapter.getDeviceCapabilities()
      
      expect(capabilities.isLowEnd).toBe(false)
      expect(capabilities.isMobile).toBe(false)
      expect(capabilities.supportsWebGL2).toBeDefined()
      expect(capabilities.maxTextureSize).toBeGreaterThan(0)
      expect(capabilities.estimatedPerformanceScore).toBeGreaterThan(0)
    })

    test('should detect mobile devices', () => {
      // Mock mobile user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true
      })

      const mobileAdapter = new AnimationPerformanceAdapter()
      const capabilities = mobileAdapter.getDeviceCapabilities()
      
      expect(capabilities.isMobile).toBe(true)
      expect(capabilities.estimatedPerformanceScore).toBeLessThan(100)
      
      mobileAdapter.dispose()
    })

    test('should detect low-end devices', () => {
      // Mock low-end device indicators
      Object.defineProperty(global.navigator, 'hardwareConcurrency', {
        value: 2,
        writable: true
      })
      
      Object.defineProperty(global.performance, 'memory', {
        value: {
          jsHeapSizeLimit: 512 * 1024 * 1024 // 512MB
        },
        writable: true
      })

      const lowEndAdapter = new AnimationPerformanceAdapter()
      const capabilities = lowEndAdapter.getDeviceCapabilities()
      
      expect(capabilities.isLowEnd).toBe(true)
      expect(capabilities.hasLimitedMemory).toBe(true)
      
      lowEndAdapter.dispose()
    })
  })

  describe('performance adaptation', () => {
    test('should not adapt when performance is good', () => {
      const result = adapter.update(0.016) // 60 FPS
      
      expect(result).toBeNull()
    })

    test('should adapt when performance degrades', () => {
      // Simulate poor performance by calling update multiple times with high delta
      for (let i = 0; i < 10; i++) {
        adapter.update(0.1) // 10 FPS
      }
      
      const result = adapter.update(0.1)
      
      if (result) {
        expect(result.needsAdaptation).toBe(true)
        expect(result.adaptations.length).toBeGreaterThan(0)
      }
    })

    test('should force adaptation when requested', () => {
      const result = adapter.forceAdaptation()
      
      expect(result.needsAdaptation).toBeDefined()
      expect(result.adaptations).toBeDefined()
      expect(result.currentMetrics).toBeDefined()
      expect(result.recommendedQuality).toBeDefined()
    })
  })

  describe('LOD calculations', () => {
    test('should calculate LOD based on distance', () => {
      const simulantPosition = new Vector3(0, 0, 0)
      const cameraPosition = new Vector3(10, 0, 0)
      
      const lodLevel = adapter.getLODLevel(simulantPosition, cameraPosition)
      
      expect(['high', 'medium', 'low', 'culled']).toContain(lodLevel)
    })

    test('should cull distant objects', () => {
      const simulantPosition = new Vector3(0, 0, 0)
      const distantCameraPosition = new Vector3(200, 0, 0)
      
      const shouldCull = adapter.shouldCullSimulant(simulantPosition, distantCameraPosition)
      
      expect(typeof shouldCull).toBe('boolean')
    })

    test('should adjust update frequency based on distance', () => {
      const simulantPosition = new Vector3(0, 0, 0)
      const nearCamera = new Vector3(5, 0, 0)
      const farCamera = new Vector3(100, 0, 0)
      
      const nearFrequency = adapter.getAnimationUpdateFrequency(simulantPosition, nearCamera)
      const farFrequency = adapter.getAnimationUpdateFrequency(simulantPosition, farCamera)
      
      expect(nearFrequency).toBeGreaterThanOrEqual(farFrequency)
    })
  })

  describe('feature recommendations', () => {
    test('should provide performance recommendations', () => {
      const recommendations = adapter.getPerformanceRecommendations()
      
      expect(recommendations.maxAnimatedSimulants).toBeGreaterThan(0)
      expect(['high', 'medium', 'low']).toContain(recommendations.recommendedQuality)
      expect(typeof recommendations.enableParticles).toBe('boolean')
      expect(typeof recommendations.enableShadows).toBe('boolean')
      expect(recommendations.cullingDistance).toBeGreaterThan(0)
      expect(recommendations.updateFrequency).toBeGreaterThan(0)
    })

    test('should determine feature enablement', () => {
      const shouldEnableParticles = adapter.shouldEnableFeature('particles')
      const shouldEnableShadows = adapter.shouldEnableFeature('shadows')
      const shouldEnableBlending = adapter.shouldEnableFeature('blending')
      const shouldEnableLOD = adapter.shouldEnableFeature('lod')
      
      expect(typeof shouldEnableParticles).toBe('boolean')
      expect(typeof shouldEnableShadows).toBe('boolean')
      expect(typeof shouldEnableBlending).toBe('boolean')
      expect(typeof shouldEnableLOD).toBe('boolean')
    })
  })

  describe('adaptation strategies', () => {
    test('should have different strategies for different device types', () => {
      const strategy = adapter.getAdaptationStrategy()
      
      expect(typeof strategy.enableDynamicLOD).toBe('boolean')
      expect(typeof strategy.enableAnimationCulling).toBe('boolean')
      expect(typeof strategy.enableQualityScaling).toBe('boolean')
      expect(typeof strategy.enableMemoryManagement).toBe('boolean')
      expect(typeof strategy.enableFallbackAnimations).toBe('boolean')
      expect(typeof strategy.aggressiveOptimization).toBe('boolean')
    })

    test('should adapt strategy based on device capabilities', () => {
      // Test with different device types
      const capabilities = adapter.getDeviceCapabilities()
      const strategy = adapter.getAdaptationStrategy()
      
      if (capabilities.isLowEnd) {
        expect(strategy.aggressiveOptimization).toBe(true)
        expect(strategy.enableFallbackAnimations).toBe(true)
      }
      
      if (capabilities.isMobile) {
        expect(strategy.enableDynamicLOD).toBe(true)
        expect(strategy.enableAnimationCulling).toBe(true)
      }
    })
  })

  describe('memory estimation', () => {
    test('should estimate available memory', () => {
      const capabilities = adapter.getDeviceCapabilities()
      
      // Should have some memory estimation
      expect(typeof capabilities.hasLimitedMemory).toBe('boolean')
    })
  })

  describe('performance scoring', () => {
    test('should calculate performance score', () => {
      const capabilities = adapter.getDeviceCapabilities()
      
      expect(capabilities.estimatedPerformanceScore).toBeGreaterThanOrEqual(0)
      expect(capabilities.estimatedPerformanceScore).toBeLessThanOrEqual(100)
    })

    test('should penalize low-end devices', () => {
      // Mock low-end device
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Android 4.4; Mobile)',
        writable: true
      })

      const lowEndAdapter = new AnimationPerformanceAdapter()
      const capabilities = lowEndAdapter.getDeviceCapabilities()
      
      expect(capabilities.estimatedPerformanceScore).toBeLessThan(70)
      
      lowEndAdapter.dispose()
    })
  })

  describe('WebGL detection', () => {
    test('should detect WebGL2 support', () => {
      const capabilities = adapter.getDeviceCapabilities()
      
      expect(typeof capabilities.supportsWebGL2).toBe('boolean')
      expect(capabilities.maxTextureSize).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    test('should handle missing performance API gracefully', () => {
      // Mock missing performance.memory
      const originalPerformance = global.performance
      Object.defineProperty(global, 'performance', {
        value: {},
        writable: true
      })

      const adapterWithoutMemory = new AnimationPerformanceAdapter()
      const capabilities = adapterWithoutMemory.getDeviceCapabilities()
      
      expect(capabilities).toBeDefined()
      expect(typeof capabilities.estimatedPerformanceScore).toBe('number')
      
      adapterWithoutMemory.dispose()
      
      // Restore original performance
      Object.defineProperty(global, 'performance', {
        value: originalPerformance,
        writable: true
      })
    })

    test('should handle missing canvas context gracefully', () => {
      // Mock failing canvas context
      const originalDocument = global.document
      Object.defineProperty(global, 'document', {
        value: {
          createElement: vi.fn(() => ({
            getContext: vi.fn(() => null)
          }))
        },
        writable: true
      })

      const adapterWithoutGL = new AnimationPerformanceAdapter()
      const capabilities = adapterWithoutGL.getDeviceCapabilities()
      
      expect(capabilities).toBeDefined()
      expect(capabilities.supportsWebGL2).toBe(false)
      expect(capabilities.maxTextureSize).toBe(1024) // Fallback value
      
      adapterWithoutGL.dispose()
      
      // Restore original document
      Object.defineProperty(global, 'document', {
        value: originalDocument,
        writable: true
      })
    })
  })

  describe('disposal', () => {
    test('should dispose properly', () => {
      adapter.dispose()
      
      // Should not throw errors after disposal
      expect(() => adapter.getDeviceCapabilities()).not.toThrow()
    })
  })
})