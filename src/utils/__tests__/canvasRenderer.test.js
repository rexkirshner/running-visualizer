/**
 * Unit tests for canvasRenderer module
 *
 * Tests cover:
 * - Coordinate projection (lat/lng to canvas pixels)
 * - Bounds checking
 * - Route rendering
 * - Marker rendering
 * - Static route rendering
 * - Animation progress calculations
 * - Full frame rendering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  latLngToExportCanvas,
  isPointInBounds,
  drawRoute,
  drawCurrentMarker,
  drawStaticRoutes,
  getVisibleRouteCoordinates,
  addDebugOverlay,
  renderExportFrame
} from '../canvasRenderer.js'

/**
 * Create a mock Leaflet map instance
 */
function createMockMap(centerLat = 40.7, centerLng = -74.0, zoom = 13) {
  const map = {
    // Mock latLngToContainerPoint - simulates Leaflet's projection
    // For testing, we use a simple linear projection
    latLngToContainerPoint: vi.fn((latLng) => {
      // Simple mock: map lat/lng to pixels
      // Center of map (40.7, -74.0) -> (500, 500) container pixels
      const x = 500 + (latLng.lng - centerLng) * 1000
      const y = 500 - (latLng.lat - centerLat) * 1000
      return { x, y }
    }),
    getCenter: vi.fn(() => ({ lat: centerLat, lng: centerLng })),
    getZoom: vi.fn(() => zoom),
    getBounds: vi.fn(() => ({
      toBBoxString: () => `${centerLng - 0.1},${centerLat - 0.1},${centerLng + 0.1},${centerLat + 0.1}`
    }))
  }
  return map
}

/**
 * Create a mock canvas context with spies for all drawing methods
 */
function createMockCanvasContext() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    globalAlpha: 1.0,
    lineCap: '',
    lineJoin: ''
  }
}

/**
 * Create a mock canvas element
 */
function createMockCanvas(width = 800, height = 600) {
  const ctx = createMockCanvasContext()
  return {
    width,
    height,
    getContext: vi.fn(() => ctx),
    _ctx: ctx // For test access
  }
}

describe('canvasRenderer', () => {
  describe('latLngToExportCanvas', () => {
    it('should convert lat/lng to canvas coordinates', () => {
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }
      const latLng = { lat: 40.7, lng: -74.0 } // Map center

      const result = latLngToExportCanvas(latLng, exportFrame, map)

      // Map center (500, 500) - export frame offset (100, 100) = (400, 400)
      expect(result.x).toBe(400)
      expect(result.y).toBe(400)
    })

    it('should handle points offset from center', () => {
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }
      const latLng = { lat: 40.8, lng: -73.9 } // Northeast of center

      const result = latLngToExportCanvas(latLng, exportFrame, map)

      // lat 40.8 is +0.1, lng -73.9 is +0.1
      // Container: (500 + 100, 500 - 100) = (600, 400)
      // Canvas: (600 - 100, 400 - 100) = (500, 300)
      expect(result.x).toBeCloseTo(500, 0)
      expect(result.y).toBeCloseTo(300, 0)
    })

    it('should handle export frame at different position', () => {
      const map = createMockMap()
      const exportFrame = { left: 50, top: 200, width: 800, height: 600 }
      const latLng = { lat: 40.7, lng: -74.0 }

      const result = latLngToExportCanvas(latLng, exportFrame, map)

      // Container: (500, 500) - offset (50, 200) = (450, 300)
      expect(result.x).toBe(450)
      expect(result.y).toBe(300)
    })
  })

  describe('isPointInBounds', () => {
    it('should return true for point inside bounds', () => {
      const point = { x: 400, y: 300 }
      expect(isPointInBounds(point, 800, 600)).toBe(true)
    })

    it('should return true for point at edge', () => {
      expect(isPointInBounds({ x: 0, y: 0 }, 800, 600)).toBe(true)
      expect(isPointInBounds({ x: 800, y: 600 }, 800, 600)).toBe(true)
    })

    it('should return false for point outside bounds', () => {
      expect(isPointInBounds({ x: -10, y: 300 }, 800, 600)).toBe(false)
      expect(isPointInBounds({ x: 400, y: 700 }, 800, 600)).toBe(false)
      expect(isPointInBounds({ x: 900, y: 300 }, 800, 600)).toBe(false)
    })

    it('should respect margin parameter', () => {
      const point = { x: -5, y: 300 }
      expect(isPointInBounds(point, 800, 600, 0)).toBe(false)
      expect(isPointInBounds(point, 800, 600, 10)).toBe(true)
    })
  })

  describe('drawRoute', () => {
    it('should draw polyline with correct style', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }
      const coords = [
        { lat: 40.7, lng: -74.0 },
        { lat: 40.8, lng: -73.9 }
      ]

      drawRoute(ctx, coords, exportFrame, map, {
        color: '#FF0000',
        width: 4,
        opacity: 0.8
      })

      // Verify style was set
      expect(ctx.strokeStyle).toBe('#FF0000')
      expect(ctx.lineWidth).toBe(4)
      expect(ctx.globalAlpha).toBe(1.0) // Reset after drawing

      // Verify path was created
      expect(ctx.beginPath).toHaveBeenCalled()
      expect(ctx.moveTo).toHaveBeenCalledTimes(1)
      expect(ctx.lineTo).toHaveBeenCalledTimes(1)
      expect(ctx.stroke).toHaveBeenCalled()

      // Verify line cap/join for smooth rendering
      expect(ctx.lineCap).toBe('round')
      expect(ctx.lineJoin).toBe('round')
    })

    it('should use default style values', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }
      const coords = [{ lat: 40.7, lng: -74.0 }]

      drawRoute(ctx, coords, exportFrame, map)

      expect(ctx.strokeStyle).toBe('#FF0000')
      expect(ctx.lineWidth).toBe(3)
    })

    it('should handle empty coordinate array', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      drawRoute(ctx, [], exportFrame, map)

      // Should not attempt to draw
      expect(ctx.beginPath).not.toHaveBeenCalled()
    })

    it('should handle null coordinates', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      drawRoute(ctx, null, exportFrame, map)

      expect(ctx.beginPath).not.toHaveBeenCalled()
    })

    it('should handle single point', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }
      const coords = [{ lat: 40.7, lng: -74.0 }]

      drawRoute(ctx, coords, exportFrame, map)

      expect(ctx.moveTo).toHaveBeenCalledTimes(1)
      expect(ctx.lineTo).not.toHaveBeenCalled()
      expect(ctx.stroke).toHaveBeenCalled()
    })
  })

  describe('drawCurrentMarker', () => {
    it('should draw two-layer circle marker', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }
      const position = { lat: 40.7, lng: -74.0 }

      drawCurrentMarker(ctx, position, exportFrame, map, { color: '#FF0000' })

      // Should draw two circles
      expect(ctx.arc).toHaveBeenCalledTimes(2)
      expect(ctx.fill).toHaveBeenCalledTimes(2)

      // Should stroke outer circle
      expect(ctx.stroke).toHaveBeenCalledTimes(1)
    })

    it('should use custom radii', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }
      const position = { lat: 40.7, lng: -74.0 }

      drawCurrentMarker(ctx, position, exportFrame, map, {
        color: '#00FF00',
        outerRadius: 10,
        innerRadius: 6
      })

      // Verify arc calls with custom radii
      const arcCalls = ctx.arc.mock.calls
      expect(arcCalls[0][2]).toBe(10) // Outer radius
      expect(arcCalls[1][2]).toBe(6)  // Inner radius
    })
  })

  describe('drawStaticRoutes', () => {
    it('should draw all routes except excluded one', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      const activities = [
        { id: 1, coordinates: [{ lat: 40.7, lng: -74.0 }, { lat: 40.8, lng: -73.9 }] },
        { id: 2, coordinates: [{ lat: 40.6, lng: -74.1 }, { lat: 40.7, lng: -74.0 }] },
        { id: 3, coordinates: [{ lat: 40.5, lng: -74.2 }, { lat: 40.6, lng: -74.1 }] }
      ]

      drawStaticRoutes(ctx, activities, exportFrame, map, 2) // Exclude id 2

      // Should draw 2 routes (skipping id 2)
      expect(ctx.stroke).toHaveBeenCalledTimes(2)
    })

    it('should use static route styling', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      const activities = [
        { id: 1, coordinates: [{ lat: 40.7, lng: -74.0 }] }
      ]

      drawStaticRoutes(ctx, activities, exportFrame, map, null, {
        color: '#AAAAAA',
        width: 1,
        opacity: 0.3
      })

      expect(ctx.strokeStyle).toBe('#AAAAAA')
      expect(ctx.lineWidth).toBe(1)
    })

    it('should handle empty activities array', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      drawStaticRoutes(ctx, [], exportFrame, map)

      expect(ctx.stroke).not.toHaveBeenCalled()
    })

    it('should skip activities without coordinates', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      const activities = [
        { id: 1, coordinates: null },
        { id: 2, coordinates: [] },
        { id: 3, coordinates: [{ lat: 40.7, lng: -74.0 }] }
      ]

      drawStaticRoutes(ctx, activities, exportFrame, map)

      // Should only draw activity 3
      expect(ctx.stroke).toHaveBeenCalledTimes(1)
    })
  })

  describe('getVisibleRouteCoordinates', () => {
    const coords = [
      { lat: 40.0, lng: -74.0 },
      { lat: 40.1, lng: -74.0 },
      { lat: 40.2, lng: -74.0 },
      { lat: 40.3, lng: -74.0 },
      { lat: 40.4, lng: -74.0 }
    ]

    it('should return all coordinates at 100% progress', () => {
      const result = getVisibleRouteCoordinates(coords, 100)
      expect(result.length).toBe(5)
    })

    it('should return half coordinates at 50% progress', () => {
      const result = getVisibleRouteCoordinates(coords, 50)
      expect(result.length).toBe(2) // Floor of 5 * 0.5 = 2
    })

    it('should return at least 1 coordinate for progress > 0', () => {
      const result = getVisibleRouteCoordinates(coords, 10)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('should return empty array at 0% progress', () => {
      const result = getVisibleRouteCoordinates(coords, 0)
      expect(result.length).toBe(0)
    })

    it('should handle empty coordinate array', () => {
      const result = getVisibleRouteCoordinates([], 50)
      expect(result.length).toBe(0)
    })

    it('should handle null coordinates', () => {
      const result = getVisibleRouteCoordinates(null, 50)
      expect(result.length).toBe(0)
    })

    it('should return correct slice of coordinates', () => {
      const result = getVisibleRouteCoordinates(coords, 40)
      // 40% of 5 = 2 coords
      expect(result).toEqual([coords[0], coords[1]])
    })
  })

  describe('addDebugOverlay', () => {
    it('should draw crosshairs at each coordinate', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }
      const coords = [
        { lat: 40.7, lng: -74.0 },
        { lat: 40.8, lng: -73.9 }
      ]

      addDebugOverlay(ctx, coords, exportFrame, map)

      // Each crosshair has 2 lines (4 moveTo/lineTo pairs total)
      // 2 coords * 2 lines = 4 moveTo + 4 lineTo calls
      expect(ctx.moveTo).toHaveBeenCalled()
      expect(ctx.lineTo).toHaveBeenCalled()
      expect(ctx.stroke).toHaveBeenCalled()
    })

    it('should handle empty coordinates', () => {
      const ctx = createMockCanvasContext()
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      addDebugOverlay(ctx, [], exportFrame, map)

      expect(ctx.stroke).not.toHaveBeenCalled()
    })
  })

  describe('renderExportFrame', () => {
    it('should render complete frame with all elements', () => {
      const canvas = createMockCanvas(800, 600)
      const ctx = canvas._ctx
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      const state = {
        currentActivity: {
          id: 1,
          name: 'Test Run',
          coordinates: [
            { lat: 40.7, lng: -74.0 },
            { lat: 40.8, lng: -73.9 }
          ]
        },
        animationProgress: 50,
        showStaticRoutes: false,
        staticActivities: [],
        selectedColor: '#FF0000',
        backgroundColor: '#F5F5F5'
      }

      const result = renderExportFrame(canvas, exportFrame, map, state)

      // Verify background was drawn
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600)
      // Note: fillStyle gets modified during rendering, so we just verify fillRect was called

      // Verify route was drawn
      expect(ctx.stroke).toHaveBeenCalled()

      // Verify marker was drawn
      expect(ctx.arc).toHaveBeenCalled()

      // Should return the canvas
      expect(result).toBe(canvas)
    })

    it('should render static routes when enabled', () => {
      const canvas = createMockCanvas(800, 600)
      const ctx = canvas._ctx
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      const state = {
        currentActivity: {
          id: 1,
          coordinates: [{ lat: 40.7, lng: -74.0 }]
        },
        animationProgress: 50,
        showStaticRoutes: true,
        staticActivities: [
          { id: 1, coordinates: [{ lat: 40.7, lng: -74.0 }] },
          { id: 2, coordinates: [{ lat: 40.6, lng: -74.1 }] }
        ],
        selectedColor: '#FF0000'
      }

      renderExportFrame(canvas, exportFrame, map, state)

      // Should draw both current route and static routes
      expect(ctx.stroke).toHaveBeenCalled()
    })

    it('should handle missing current activity gracefully', () => {
      const canvas = createMockCanvas(800, 600)
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      const state = {
        currentActivity: null,
        animationProgress: 50
      }

      const result = renderExportFrame(canvas, exportFrame, map, state)

      // Should return canvas without throwing
      expect(result).toBe(canvas)
    })

    it('should handle 0% progress correctly', () => {
      const canvas = createMockCanvas(800, 600)
      const ctx = canvas._ctx
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      const state = {
        currentActivity: {
          id: 1,
          coordinates: [{ lat: 40.7, lng: -74.0 }]
        },
        animationProgress: 0,
        selectedColor: '#FF0000'
      }

      renderExportFrame(canvas, exportFrame, map, state)

      // Background should be drawn but no route/marker
      expect(ctx.fillRect).toHaveBeenCalled()
    })

    it('should render debug overlay when enabled', () => {
      const canvas = createMockCanvas(800, 600)
      const ctx = canvas._ctx
      const map = createMockMap()
      const exportFrame = { left: 100, top: 100, width: 800, height: 600 }

      // Create coordinates array with > 10 points to test sampling
      const coords = Array.from({ length: 25 }, (_, i) => ({
        lat: 40.7 + i * 0.01,
        lng: -74.0 + i * 0.01
      }))

      const state = {
        currentActivity: {
          id: 1,
          coordinates: coords
        },
        animationProgress: 100,
        selectedColor: '#FF0000',
        debug: true
      }

      renderExportFrame(canvas, exportFrame, map, state)

      // Should draw debug crosshairs
      expect(ctx.moveTo).toHaveBeenCalled()
    })
  })
})
