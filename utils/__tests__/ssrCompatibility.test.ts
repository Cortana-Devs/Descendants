/**
 * SSR Compatibility Tests
 * Tests to ensure animation system works correctly with Next.js SSR
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useSSRSafeExternalAnimations,
  useSSRSafeRPMAnimations,
  useSSRSafeAnimationController,
  useIsClient,
  useThreeJSSafe,
  useSSRSafePerformanceOptimization
} from '../useSSRSafeAnimations'

// Mock window object for SSR simulation
const mockWindow = vi.fn()
const originalWindow = global.window

describe('SSR Compatibility', () => {
  beforeEach(() => {
    // Reset window mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original window
    global.window = originalWindow
  })

  describe('useIsClient', () => {
    it('should return false during SSR', () => {
      // Simulate SSR environment
      delete (global as any).window

      const { result } = renderHook(() => useIsClient())
      expect(result.current).toBe(false)
    })

    it('should return true on client-side', async () => {
      // Simulate client environment
      global.window = originalWindow

      const { result, rerender } = renderHook(() => useIsClient())
      
      // Initially false
      expect(result.current).toBe(false)
      
      // After effect runs, should be true
      rerender()
      expect(result.current).toBe(true)
    })
  })

  describe('useSSRSafeExternalAnimations', () => {
    it('should return empty state during SSR', () => {
      // Simulate SSR environment
      delete (global as any).window

      const { result } = renderHook(() => 
        useSSRSafeExternalAnimations(['/test.glb'])
      )

      expect(result.current).toEqual({
        clips: new Map(),
        loading: false,
        error: null,
        loadedCount: 0,
        totalCount: 1,
        progress: 0,
        fallbacksUsed: 0,
        errorCount: 0
      })
    })

    it('should handle empty animation paths', () => {
      delete (global as any).window

      const { result } = renderHook(() => 
        useSSRSafeExternalAnimations([])
      )

      expect(result.current.totalCount).toBe(0)
    })
  })

  describe('useSSRSafeRPMAnimations', () => {
    it('should return fallback manager during SSR', () => {
      delete (global as any).window

      const mockGLTF = { scene: {}, animations: [] }
      const mockClips = new Map()

      const { result } = renderHook(() => 
        useSSRSafeRPMAnimations(mockGLTF, mockClips)
      )

      expect(result.current).toMatchObject({
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
        actions: {},
        mixer: null
      })

      // Test that methods are no-ops
      expect(() => result.current.playAnimation('test')).not.toThrow()
      expect(() => result.current.stopAnimation('test')).not.toThrow()
      expect(() => result.current.setLODLevel('low')).not.toThrow()
    })
  })

  describe('useSSRSafeAnimationController', () => {
    it('should return fallback controller during SSR', () => {
      delete (global as any).window

      const mockAnimationManager = {}
      const mockSimulant = { id: 'test', position: { x: 0, y: 0, z: 0 } }

      const { result } = renderHook(() => 
        useSSRSafeAnimationController(mockAnimationManager, mockSimulant)
      )

      expect(result.current).toMatchObject({
        state: {
          currentState: 'idle',
          previousState: null,
          transitionProgress: 0,
          isTransitioning: false,
          lastTransitionTime: 0,
          error: null
        }
      })

      // Test that methods are no-ops
      expect(() => result.current.transitionTo('walking')).not.toThrow()
      expect(result.current.canTransitionTo('running')).toBe(true)
      expect(result.current.mapActionToAnimation('test')).toBe('idle')
    })
  })

  describe('useSSRSafePerformanceOptimization', () => {
    it('should return fallback optimization during SSR', () => {
      delete (global as any).window

      const mockSimulants = [
        { id: 'test1', position: { x: 0, y: 0, z: 0 } },
        { id: 'test2', position: { x: 5, y: 0, z: 5 } }
      ]

      const { result } = renderHook(() => 
        useSSRSafePerformanceOptimization(mockSimulants)
      )

      expect(result.current).toMatchObject({
        metrics: {
          frameRate: 60,
          memoryUsage: 0,
          activeAnimations: 0,
          droppedFrames: 0,
          renderTime: 0
        },
        currentQuality: { name: 'high', level: 3 }
      })

      // Test that methods return sensible defaults
      expect(result.current.calculateLOD()).toBe('high')
      expect(result.current.isSimulantVisible()).toBe(true)
      expect(result.current.getUpdateFrequency()).toBe(60)
      expect(result.current.getRenderScale()).toBe(1)
    })
  })

  describe('useThreeJSSafe', () => {
    it('should return null during SSR', () => {
      delete (global as any).window

      const mockFactory = vi.fn(() => ({ test: 'object' }))

      const { result } = renderHook(() => 
        useThreeJSSafe(mockFactory)
      )

      expect(result.current).toBeNull()
      expect(mockFactory).not.toHaveBeenCalled()
    })

    it('should call factory on client-side', async () => {
      global.window = originalWindow

      const mockObject = { test: 'object' }
      const mockFactory = vi.fn(() => mockObject)

      const { result, rerender } = renderHook(() => 
        useThreeJSSafe(mockFactory)
      )

      // Initially null
      expect(result.current).toBeNull()

      // After effect runs
      rerender()
      expect(mockFactory).toHaveBeenCalled()
      expect(result.current).toBe(mockObject)
    })

    it('should handle factory errors gracefully', async () => {
      global.window = originalWindow

      const mockFactory = vi.fn(() => {
        throw new Error('Factory error')
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { result, rerender } = renderHook(() => 
        useThreeJSSafe(mockFactory)
      )

      rerender()
      
      expect(result.current).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create Three.js object:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Dynamic Import Behavior', () => {
    it('should handle missing modules gracefully', async () => {
      delete (global as any).window

      // Mock a hook that would normally import a module
      const { result } = renderHook(() => {
        const [module, setModule] = useState(null)
        const isClient = useIsClient()

        useEffect(() => {
          if (isClient) {
            // This would normally be a dynamic import
            setModule({ loaded: true })
          }
        }, [isClient])

        return module
      })

      expect(result.current).toBeNull()
    })
  })

  describe('Error Boundaries', () => {
    it('should not throw errors during SSR', () => {
      delete (global as any).window

      expect(() => {
        renderHook(() => useSSRSafeExternalAnimations(['/test.glb']))
      }).not.toThrow()

      expect(() => {
        renderHook(() => useSSRSafeRPMAnimations({}, new Map()))
      }).not.toThrow()

      expect(() => {
        renderHook(() => useSSRSafeAnimationController({}, {}))
      }).not.toThrow()
    })
  })

  describe('Hydration Safety', () => {
    it('should maintain consistent state between SSR and client', () => {
      // Test SSR state
      delete (global as any).window
      
      const { result: ssrResult } = renderHook(() => 
        useSSRSafeExternalAnimations(['/test.glb'])
      )

      const ssrState = ssrResult.current

      // Test client state (before dynamic import loads)
      global.window = originalWindow
      
      const { result: clientResult } = renderHook(() => 
        useSSRSafeExternalAnimations(['/test.glb'])
      )

      // Should be the same initially to prevent hydration mismatch
      expect(clientResult.current).toEqual(ssrState)
    })
  })
})

// Helper to simulate useState in tests
function useState<T>(initialValue: T): [T, (value: T) => void] {
  let value = initialValue
  const setValue = (newValue: T) => {
    value = newValue
  }
  return [value, setValue]
}

// Helper to simulate useEffect in tests
function useEffect(effect: () => void | (() => void), deps?: any[]) {
  // In tests, effects run immediately
  const cleanup = effect()
  return cleanup
}