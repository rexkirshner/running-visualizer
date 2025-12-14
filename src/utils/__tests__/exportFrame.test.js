/**
 * Tests for exportFrame.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateExportFrame,
  calculateCropRegion,
  validateExportFrame,
  createExportFrameStyle,
  ExportFrameManager,
  exportFrameManager
} from '../exportFrame.js'

describe('calculateExportFrame', () => {
  it('should calculate centered frame for 16:9 aspect ratio', () => {
    const frame = calculateExportFrame(16/9, 1920, 1080)

    // Frame should be centered
    expect(frame.left).toBeGreaterThan(0)
    expect(frame.top).toBeGreaterThan(0)

    // Frame should maintain aspect ratio
    expect(frame.width / frame.height).toBeCloseTo(16/9, 2)

    // Frame should have expected properties
    expect(frame).toHaveProperty('left')
    expect(frame).toHaveProperty('top')
    expect(frame).toHaveProperty('width')
    expect(frame).toHaveProperty('height')
    expect(frame).toHaveProperty('aspectRatio')
  })

  it('should constrain to width when aspect ratio is wide', () => {
    // Very wide viewport (2000 x 500)
    const frame = calculateExportFrame(16/9, 2000, 500)

    // Should be height-constrained (width would exceed viewport)
    expect(frame.height).toBeLessThanOrEqual(500 * 0.9)
    expect(frame.width / frame.height).toBeCloseTo(16/9, 2)
  })

  it('should constrain to height when aspect ratio is narrow', () => {
    // Very tall viewport (500 x 2000)
    const frame = calculateExportFrame(16/9, 500, 2000)

    // Should be width-constrained
    expect(frame.width).toBeLessThanOrEqual(500 * 0.9)
    expect(frame.width / frame.height).toBeCloseTo(16/9, 2)
  })

  it('should handle 1:1 aspect ratio', () => {
    const frame = calculateExportFrame(1, 1000, 1000)
    expect(frame.width).toBe(frame.height)
    expect(frame.aspectRatio).toBe(1)
  })

  it('should handle vertical aspect ratio (9:16)', () => {
    const frame = calculateExportFrame(9/16, 1920, 1080)
    expect(frame.width / frame.height).toBeCloseTo(9/16, 2)
  })
})

describe('calculateCropRegion', () => {
  it('should calculate correct crop region when frame is inside element', () => {
    const exportFrame = { left: 100, top: 50, width: 800, height: 450 }
    const elementRect = { left: 0, top: 0, width: 1920, height: 1080 }

    const crop = calculateCropRegion(exportFrame, elementRect)

    expect(crop.cropX).toBe(100)
    expect(crop.cropY).toBe(50)
    expect(crop.width).toBe(800)
    expect(crop.height).toBe(450)
  })

  it('should handle offset element positions', () => {
    const exportFrame = { left: 200, top: 150, width: 800, height: 450 }
    const elementRect = { left: 50, top: 100, width: 1920, height: 1080 }

    const crop = calculateCropRegion(exportFrame, elementRect)

    expect(crop.cropX).toBe(150) // 200 - 50
    expect(crop.cropY).toBe(50)  // 150 - 100
  })

  it('should handle when frame starts before element', () => {
    const exportFrame = { left: 0, top: 0, width: 800, height: 450 }
    const elementRect = { left: 100, top: 50, width: 1920, height: 1080 }

    const crop = calculateCropRegion(exportFrame, elementRect)

    expect(crop.cropX).toBe(-100) // Negative means outside element
    expect(crop.cropY).toBe(-50)
  })
})

describe('validateExportFrame', () => {
  it('should validate a correct frame', () => {
    const frame = { left: 100, top: 50, width: 800, height: 450 }
    const result = validateExportFrame(frame)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject null frame', () => {
    const result = validateExportFrame(null)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Frame is null or undefined')
  })

  it('should reject zero dimensions', () => {
    const frame = { left: 0, top: 0, width: 0, height: 450 }
    const result = validateExportFrame(frame)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Invalid dimensions'))).toBe(true)
  })

  it('should reject negative dimensions', () => {
    const frame = { left: 0, top: 0, width: -100, height: 450 }
    const result = validateExportFrame(frame)

    expect(result.valid).toBe(false)
  })

  it('should reject negative positions', () => {
    const frame = { left: -10, top: 0, width: 800, height: 450 }
    const result = validateExportFrame(frame)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('outside viewport'))).toBe(true)
  })

  it('should reject excessively large frames', () => {
    const frame = { left: 0, top: 0, width: 20000, height: 450 }
    const result = validateExportFrame(frame)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('too large'))).toBe(true)
  })
})

describe('createExportFrameStyle', () => {
  it('should create style object with aspect ratio', () => {
    const style = createExportFrameStyle(16/9)

    expect(style).toHaveProperty('--aspect-ratio')
    expect(style['--aspect-ratio']).toBeCloseTo(16/9, 5)
  })
})

describe('ExportFrameManager', () => {
  let manager

  beforeEach(() => {
    manager = new ExportFrameManager()
  })

  it('should start with no stored frame', () => {
    expect(manager.hasStoredFrame()).toBe(false)
    expect(manager.getStoredFrame()).toBeNull()
  })

  it('should calculate and store frame', () => {
    const frame = manager.calculateAndStore(16/9)

    expect(manager.hasStoredFrame()).toBe(true)
    expect(manager.getStoredFrame()).toBe(frame)
    expect(frame.aspectRatio).toBeCloseTo(16/9, 2)
  })

  it('should get crop region from stored frame', () => {
    manager.calculateAndStore(16/9)
    const elementRect = { left: 0, top: 0, width: 1920, height: 1080 }

    const crop = manager.getCropRegion(elementRect)

    expect(crop).not.toBeNull()
    expect(crop).toHaveProperty('cropX')
    expect(crop).toHaveProperty('cropY')
    expect(crop).toHaveProperty('width')
    expect(crop).toHaveProperty('height')
  })

  it('should return null crop region when no frame stored', () => {
    const elementRect = { left: 0, top: 0, width: 1920, height: 1080 }
    const crop = manager.getCropRegion(elementRect)

    expect(crop).toBeNull()
  })

  it('should clear stored frame', () => {
    manager.calculateAndStore(16/9)
    expect(manager.hasStoredFrame()).toBe(true)

    manager.clear()
    expect(manager.hasStoredFrame()).toBe(false)
  })
})

describe('exportFrameManager singleton', () => {
  it('should be an instance of ExportFrameManager', () => {
    expect(exportFrameManager).toBeInstanceOf(ExportFrameManager)
  })

  it('should persist state', () => {
    exportFrameManager.clear()
    expect(exportFrameManager.hasStoredFrame()).toBe(false)

    exportFrameManager.calculateAndStore(16/9)
    expect(exportFrameManager.hasStoredFrame()).toBe(true)

    // Clean up
    exportFrameManager.clear()
  })
})
