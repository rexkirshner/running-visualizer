/**
 * Tests for constants.js
 */
import { describe, it, expect } from 'vitest'
import {
  MAP_FIT_BOUNDS_PADDING,
  ANIMATION_DURATION,
  EXPORT_RESOLUTIONS,
  EXPORT_FRAME_RATES,
  EXPORT_VALIDATION,
  COLOR_PALETTE,
  Z_INDEX,
  parseResolution,
  getAspectRatio,
  validateExportSettings
} from '../constants.js'

describe('constants', () => {
  describe('MAP_FIT_BOUNDS_PADDING', () => {
    it('should be a 2-element array of positive numbers', () => {
      expect(MAP_FIT_BOUNDS_PADDING).toHaveLength(2)
      expect(MAP_FIT_BOUNDS_PADDING[0]).toBeGreaterThan(0)
      expect(MAP_FIT_BOUNDS_PADDING[1]).toBeGreaterThan(0)
    })
  })

  describe('ANIMATION_DURATION', () => {
    it('should have min, max, and default values', () => {
      expect(ANIMATION_DURATION.min).toBeDefined()
      expect(ANIMATION_DURATION.max).toBeDefined()
      expect(ANIMATION_DURATION.default).toBeDefined()
    })

    it('should have sensible range (min < default < max)', () => {
      expect(ANIMATION_DURATION.min).toBeLessThan(ANIMATION_DURATION.default)
      expect(ANIMATION_DURATION.default).toBeLessThan(ANIMATION_DURATION.max)
    })
  })

  describe('EXPORT_RESOLUTIONS', () => {
    it('should have standard video resolutions', () => {
      expect(EXPORT_RESOLUTIONS.length).toBeGreaterThan(0)

      const resolutionValues = EXPORT_RESOLUTIONS.map(r => r.value)
      expect(resolutionValues).toContain('1920x1080')
      expect(resolutionValues).toContain('3840x2160')
    })

    it('should have consistent format for all resolutions', () => {
      EXPORT_RESOLUTIONS.forEach(resolution => {
        expect(resolution).toHaveProperty('value')
        expect(resolution).toHaveProperty('label')
        expect(resolution).toHaveProperty('width')
        expect(resolution).toHaveProperty('height')

        // Value should match width x height
        const expectedValue = `${resolution.width}x${resolution.height}`
        expect(resolution.value).toBe(expectedValue)
      })
    })
  })

  describe('EXPORT_FRAME_RATES', () => {
    it('should include standard video frame rates', () => {
      expect(EXPORT_FRAME_RATES).toContain(24)
      expect(EXPORT_FRAME_RATES).toContain(30)
      expect(EXPORT_FRAME_RATES).toContain(60)
    })
  })

  describe('COLOR_PALETTE', () => {
    it('should be an array of hex color strings', () => {
      expect(COLOR_PALETTE.length).toBeGreaterThan(0)

      COLOR_PALETTE.forEach(color => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
      })
    })
  })

  describe('Z_INDEX', () => {
    it('should have properly ordered z-index values', () => {
      expect(Z_INDEX.map).toBeLessThan(Z_INDEX.exportFrameOverlay)
      expect(Z_INDEX.exportFrameOverlay).toBeLessThan(Z_INDEX.uiControls)
      expect(Z_INDEX.uiControls).toBeLessThan(Z_INDEX.loading)
      expect(Z_INDEX.loading).toBeLessThan(Z_INDEX.modal)
    })
  })
})

describe('parseResolution', () => {
  it('should parse standard resolution strings', () => {
    expect(parseResolution('1920x1080')).toEqual({ width: 1920, height: 1080 })
    expect(parseResolution('3840x2160')).toEqual({ width: 3840, height: 2160 })
    expect(parseResolution('1280x720')).toEqual({ width: 1280, height: 720 })
  })

  it('should handle arbitrary resolutions', () => {
    expect(parseResolution('100x200')).toEqual({ width: 100, height: 200 })
    expect(parseResolution('4096x2160')).toEqual({ width: 4096, height: 2160 })
  })
})

describe('getAspectRatio', () => {
  it('should calculate correct aspect ratios', () => {
    // 16:9
    expect(getAspectRatio('1920x1080')).toBeCloseTo(16/9, 5)
    expect(getAspectRatio('1280x720')).toBeCloseTo(16/9, 5)
    expect(getAspectRatio('3840x2160')).toBeCloseTo(16/9, 5)

    // 4:3
    expect(getAspectRatio('1024x768')).toBeCloseTo(4/3, 5)

    // 1:1
    expect(getAspectRatio('1000x1000')).toBe(1)
  })
})

describe('validateExportSettings', () => {
  it('should accept valid export settings', () => {
    const result = validateExportSettings({
      width: 1920,
      height: 1080,
      frameRate: 30
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should accept valid settings with duration', () => {
    const result = validateExportSettings({
      width: 3840,
      height: 2160,
      frameRate: 60,
      targetDuration: 30
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject width below minimum', () => {
    const result = validateExportSettings({
      width: 50,
      height: 1080,
      frameRate: 30
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Width'))).toBe(true)
  })

  it('should reject width above maximum', () => {
    const result = validateExportSettings({
      width: 10000,
      height: 1080,
      frameRate: 30
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Width'))).toBe(true)
  })

  it('should reject height below minimum', () => {
    const result = validateExportSettings({
      width: 1920,
      height: 50,
      frameRate: 30
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Height'))).toBe(true)
  })

  it('should reject frame rate below minimum', () => {
    const result = validateExportSettings({
      width: 1920,
      height: 1080,
      frameRate: 0
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Frame rate'))).toBe(true)
  })

  it('should reject frame rate above maximum', () => {
    const result = validateExportSettings({
      width: 1920,
      height: 1080,
      frameRate: 200
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Frame rate'))).toBe(true)
  })

  it('should reject duration above maximum', () => {
    const result = validateExportSettings({
      width: 1920,
      height: 1080,
      frameRate: 30,
      targetDuration: 5000
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Duration'))).toBe(true)
  })

  it('should reject non-numeric values', () => {
    const result = validateExportSettings({
      width: 'invalid',
      height: 1080,
      frameRate: 30
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Width'))).toBe(true)
  })

  it('should collect multiple errors', () => {
    const result = validateExportSettings({
      width: 50,
      height: 50,
      frameRate: 0
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})
