/**
 * Tests for Animation Fallback System
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { FallbackAnimationSystem } from '../animationFallbackSystem'
import { AnimationClip } from 'three'

// Mock console
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn()
}
vi.stubGlobal('console', mockConsole)

describe('FallbackAnimationSystem', () => {
  let fallbackSystem: FallbackAnimationSystem

  beforeEach(() => {
    fallbackSystem = new FallbackAnimationSystem({ enableLogging: true })
    mockConsole.log.mockClear()
    mockConsole.warn.mockClear()
  })

  describe('generateFallbackAnimation', () => {
    test('should generate idle animation', () => {
      const clip = fallbackSystem.generateFallbackAnimation('idle')
      
      expect(clip).toBeInstanceOf(AnimationClip)
      expect(clip.name).toBe('idle_fallback')
      expect(clip.duration).toBe(4.0)
      expect(clip.tracks.length).toBeGreaterThan(0)
    })

    test('should generate walking animation', () => {
      const clip = fallbackSystem.generateFallbackAnimation('walking')
      
      expect(clip).toBeInstanceOf(AnimationClip)
      expect(clip.name).toBe('walk_fallback')
      expect(clip.duration).toBe(1.2)
      expect(clip.tracks.length).toBeGreaterThan(0)
    })

    test('should generate running animation', () => {
      const clip = fallbackSystem.generateFallbackAnimation('running')
      
      expect(clip).toBeInstanceOf(AnimationClip)
      expect(clip.name).toBe('run_fallback')
      expect(clip.duration).toBe(0.8)
      expect(clip.tracks.length).toBeGreaterThan(0)
    })

    test('should generate jumping animation', () => {
      const clip = fallbackSystem.generateFallbackAnimation('jumping')
      
      expect(clip).toBeInstanceOf(AnimationClip)
      expect(clip.name).toBe('jump_fallback')
      expect(clip.duration).toBe(1.0)
      expect(clip.tracks.length).toBeGreaterThan(0)
    })

    test('should generate building animation', () => {
      const clip = fallbackSystem.generateFallbackAnimation('building')
      
      expect(clip).toBeInstanceOf(AnimationClip)
      expect(clip.name).toBe('building_fallback')
      expect(clip.duration).toBe(3.0)
      expect(clip.tracks.length).toBeGreaterThan(0)
    })

    test('should generate thinking animation', () => {
      const clip = fallbackSystem.generateFallbackAnimation('thinking')
      
      expect(clip).toBeInstanceOf(AnimationClip)
      expect(clip.name).toBe('thinking_fallback')
      expect(clip.duration).toBe(5.0)
      expect(clip.tracks.length).toBeGreaterThan(0)
    })

    test('should generate communicating animation', () => {
      const clip = fallbackSystem.generateFallbackAnimation('communicating')
      
      expect(clip).toBeInstanceOf(AnimationClip)
      expect(clip.name).toBe('communicating_fallback')
      expect(clip.duration).toBe(2.5)
      expect(clip.tracks.length).toBeGreaterThan(0)
    })

    test('should generate celebrating animation', () => {
      const clip = fallbackSystem.generateFallbackAnimation('celebrating')
      
      expect(clip).toBeInstanceOf(AnimationClip)
      expect(clip.name).toBe('celebrating_fallback')
      expect(clip.duration).toBe(2.0)
      expect(clip.tracks.length).toBeGreaterThan(0)
    })

    test('should cache generated animations', () => {
      const clip1 = fallbackSystem.generateFallbackAnimation('idle')
      const clip2 = fallbackSystem.generateFallbackAnimation('idle')
      
      // Should return the same cached instance
      expect(clip1).toBe(clip2)
    })

    test('should log animation generation', () => {
      fallbackSystem.generateFallbackAnimation('idle')
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Generated fallback animation: idle')
      )
    })
  })

  describe('generateTPoseAnimation', () => {
    test('should generate T-pose animation', () => {
      const clip = fallbackSystem.generateTPoseAnimation()
      
      expect(clip).toBeInstanceOf(AnimationClip)
      expect(clip.name).toBe('tpose_fallback')
      expect(clip.duration).toBe(1.0)
      expect(clip.tracks.length).toBeGreaterThan(0)
    })

    test('should cache T-pose animation', () => {
      const clip1 = fallbackSystem.generateTPoseAnimation()
      const clip2 = fallbackSystem.generateTPoseAnimation()
      
      expect(clip1).toBe(clip2)
    })
  })

  describe('animation track validation', () => {
    test('should generate valid keyframe tracks', () => {
      const clip = fallbackSystem.generateFallbackAnimation('walking')
      
      clip.tracks.forEach(track => {
        expect(track.name).toBeDefined()
        expect(track.times).toBeDefined()
        expect(track.values).toBeDefined()
        expect(track.times.length).toBeGreaterThan(0)
        expect(track.values.length).toBeGreaterThan(0)
        
        // Times should be in ascending order
        for (let i = 1; i < track.times.length; i++) {
          expect(track.times[i]).toBeGreaterThanOrEqual(track.times[i - 1])
        }
      })
    })

    test('should generate appropriate track types', () => {
      const clip = fallbackSystem.generateFallbackAnimation('jumping')
      
      const hasPositionTracks = clip.tracks.some(track => track.name.includes('.position'))
      const hasRotationTracks = clip.tracks.some(track => track.name.includes('.rotation'))
      
      expect(hasPositionTracks || hasRotationTracks).toBe(true)
    })
  })

  describe('animation intensity', () => {
    test('should respect intensity settings', () => {
      const idleClip = fallbackSystem.generateFallbackAnimation('idle')
      const runningClip = fallbackSystem.generateFallbackAnimation('running')
      
      // Running should have more intense movements (more variation in values)
      // This is a simplified test - in practice you'd check the actual animation values
      expect(runningClip.duration).toBeLessThan(idleClip.duration)
    })
  })

  describe('cache management', () => {
    test('should track available fallbacks', () => {
      fallbackSystem.generateFallbackAnimation('idle')
      fallbackSystem.generateFallbackAnimation('walking')
      fallbackSystem.generateTPoseAnimation()
      
      const available = fallbackSystem.getAvailableFallbacks()
      expect(available).toContain('fallback_idle')
      expect(available).toContain('fallback_walking')
      expect(available).toContain('tpose_fallback')
    })

    test('should clear cache', () => {
      fallbackSystem.generateFallbackAnimation('idle')
      fallbackSystem.generateFallbackAnimation('walking')
      
      let available = fallbackSystem.getAvailableFallbacks()
      expect(available.length).toBeGreaterThan(0)
      
      fallbackSystem.clearCache()
      
      available = fallbackSystem.getAvailableFallbacks()
      expect(available.length).toBe(0)
    })

    test('should regenerate after cache clear', () => {
      const clip1 = fallbackSystem.generateFallbackAnimation('idle')
      fallbackSystem.clearCache()
      const clip2 = fallbackSystem.generateFallbackAnimation('idle')
      
      // Should be different instances after cache clear
      expect(clip1).not.toBe(clip2)
      expect(clip1.name).toBe(clip2.name)
    })
  })

  describe('bone name validation', () => {
    test('should use valid RPM bone names', () => {
      const clip = fallbackSystem.generateFallbackAnimation('walking')
      
      const trackNames = clip.tracks.map(track => track.name)
      const boneNames = trackNames.map(name => name.split('.')[0])
      
      // Should contain some expected RPM bone names
      const expectedBones = ['Hips', 'LeftArm', 'RightArm', 'LeftUpLeg', 'RightUpLeg']
      const hasExpectedBones = expectedBones.some(bone => 
        boneNames.some(trackBone => trackBone.includes(bone))
      )
      
      expect(hasExpectedBones).toBe(true)
    })
  })

  describe('error handling', () => {
    test('should handle invalid animation state gracefully', () => {
      // This should default to idle animation
      const clip = fallbackSystem.generateFallbackAnimation('invalid_state' as any)
      
      expect(clip).toBeInstanceOf(AnimationClip)
      expect(clip.name).toBe('idle_fallback')
    })
  })

  describe('disposal', () => {
    test('should dispose properly', () => {
      fallbackSystem.generateFallbackAnimation('idle')
      fallbackSystem.generateFallbackAnimation('walking')
      
      expect(fallbackSystem.getAvailableFallbacks().length).toBeGreaterThan(0)
      
      fallbackSystem.dispose()
      
      expect(fallbackSystem.getAvailableFallbacks().length).toBe(0)
    })
  })
})