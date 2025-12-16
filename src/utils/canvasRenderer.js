/**
 * Direct canvas rendering utilities for route export
 *
 * This module replaces the html2canvas approach with direct coordinate-based
 * rendering using the Canvas 2D API. It provides precise control over how
 * routes are rendered to the export canvas, ensuring pixel-perfect alignment
 * with the export frame overlay.
 *
 * Key concepts:
 * - Export frame: The visible rectangle shown as red dashed border overlay
 * - Canvas coordinates: Pixel coordinates within the export canvas (0,0 = top-left)
 * - Container coordinates: Pixel coordinates within the Leaflet map container
 * - Geographic coordinates: Latitude/longitude pairs
 *
 * Coordinate flow:
 * lat/lng → container point (via Leaflet) → export canvas point (our math)
 */

import * as log from './logger.js'

/**
 * Convert a geographic coordinate (lat/lng) to export canvas pixel coordinates
 *
 * This is the core projection function that maps Leaflet's coordinate system
 * to our export canvas coordinate system.
 *
 * @param {Object} latLng - Geographic coordinate {lat: number, lng: number}
 * @param {Object} exportFrame - Export frame dimensions
 * @param {number} exportFrame.left - Left edge in container pixels
 * @param {number} exportFrame.top - Top edge in container pixels
 * @param {number} exportFrame.width - Frame width in pixels
 * @param {number} exportFrame.height - Frame height in pixels
 * @param {L.Map} map - Leaflet map instance
 * @returns {{x: number, y: number}} Canvas pixel coordinate (0,0 = top-left of canvas)
 */
export function latLngToExportCanvas(latLng, exportFrame, map) {
  // Step 1: Get container pixel coordinate from Leaflet
  // This gives us the pixel position relative to the map container's top-left
  const containerPoint = map.latLngToContainerPoint(latLng)

  // Step 2: Adjust relative to export frame origin
  // The export frame is positioned within the container, so we subtract
  // the frame's offset to get coordinates relative to the frame's top-left
  const canvasX = containerPoint.x - exportFrame.left
  const canvasY = containerPoint.y - exportFrame.top

  // Step 3: Return canvas coordinate
  return { x: canvasX, y: canvasY }
}

/**
 * Check if a canvas point is within the canvas bounds
 *
 * @param {{x: number, y: number}} point - Canvas coordinate
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} margin - Optional margin for "near bounds" check (default: 0)
 * @returns {boolean} True if point is within bounds (plus margin)
 */
export function isPointInBounds(point, width, height, margin = 0) {
  return (
    point.x >= -margin &&
    point.x <= width + margin &&
    point.y >= -margin &&
    point.y <= height + margin
  )
}

/**
 * Draw a route polyline on the canvas
 *
 * Renders a continuous line through all coordinate points with specified styling.
 * Automatically skips empty coordinate arrays.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {Array<{lat: number, lng: number}>} coordinates - Route coordinates
 * @param {Object} exportFrame - Export frame dimensions
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} style - Line style options
 * @param {string} style.color - Line color (CSS color string, default: '#FF0000')
 * @param {number} style.width - Line width in pixels (default: 3)
 * @param {number} style.opacity - Line opacity 0-1 (default: 1.0)
 */
export function drawRoute(ctx, coordinates, exportFrame, map, style = {}) {
  const {
    color = '#FF0000',
    width = 3,
    opacity = 1.0
  } = style

  // Skip empty routes
  if (!coordinates || coordinates.length === 0) {
    return
  }

  // Set line style
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.globalAlpha = opacity
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Begin path
  ctx.beginPath()

  // Track if we've started the path (first visible point)
  let pathStarted = false

  // Draw line segments
  for (let i = 0; i < coordinates.length; i++) {
    const point = latLngToExportCanvas(coordinates[i], exportFrame, map)

    // For the first point (or first visible point), move to it
    if (!pathStarted) {
      ctx.moveTo(point.x, point.y)
      pathStarted = true
    } else {
      ctx.lineTo(point.x, point.y)
    }
  }

  // Stroke the path if we started it
  if (pathStarted) {
    ctx.stroke()
  }

  // Reset alpha
  ctx.globalAlpha = 1.0
}

/**
 * Draw the current position marker (animated point on route)
 *
 * Renders a two-layer circle marker:
 * - Outer circle: White with black border
 * - Inner circle: Route color
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {{lat: number, lng: number}} position - Current position coordinate
 * @param {Object} exportFrame - Export frame dimensions
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} style - Marker style options
 * @param {string} style.color - Inner circle color (default: '#FF0000')
 * @param {number} style.outerRadius - Outer circle radius (default: 8)
 * @param {number} style.innerRadius - Inner circle radius (default: 5)
 */
export function drawCurrentMarker(ctx, position, exportFrame, map, style = {}) {
  const {
    color = '#FF0000',
    outerRadius = 8,
    innerRadius = 5
  } = style

  const point = latLngToExportCanvas(position, exportFrame, map)

  // Draw outer circle (white with black border)
  ctx.beginPath()
  ctx.arc(point.x, point.y, outerRadius, 0, 2 * Math.PI)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 2
  ctx.stroke()

  // Draw inner circle (route color)
  ctx.beginPath()
  ctx.arc(point.x, point.y, innerRadius, 0, 2 * Math.PI)
  ctx.fillStyle = color
  ctx.fill()
}

/**
 * Draw static routes (background routes not currently animating)
 *
 * Renders all routes except the one being animated, typically in a
 * muted gray color to provide context without overwhelming the main route.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {Array<Object>} activities - Array of activity objects
 * @param {Object} exportFrame - Export frame dimensions
 * @param {L.Map} map - Leaflet map instance
 * @param {string|number} excludeId - ID of activity to skip (usually current activity)
 * @param {Object} style - Style options for static routes
 * @param {string} style.color - Line color (default: '#CCCCCC')
 * @param {number} style.width - Line width (default: 2)
 * @param {number} style.opacity - Line opacity (default: 0.5)
 */
export function drawStaticRoutes(ctx, activities, exportFrame, map, excludeId = null, style = {}) {
  const {
    color = '#CCCCCC',
    width = 2,
    opacity = 0.5
  } = style

  if (!activities || activities.length === 0) {
    return
  }

  for (const activity of activities) {
    // Skip the current activity
    if (activity.id === excludeId) {
      continue
    }

    // Skip activities without coordinates
    if (!activity.coordinates || activity.coordinates.length === 0) {
      continue
    }

    // Draw this static route
    drawRoute(ctx, activity.coordinates, exportFrame, map, {
      color,
      width,
      opacity
    })
  }
}

/**
 * Get the visible portion of route coordinates based on animation progress
 *
 * @param {Array<{lat: number, lng: number}>} coordinates - Full route coordinates
 * @param {number} progressPercent - Animation progress 0-100
 * @returns {Array<{lat: number, lng: number}>} Visible coordinates (0 to progress point)
 */
export function getVisibleRouteCoordinates(coordinates, progressPercent) {
  if (!coordinates || coordinates.length === 0) {
    return []
  }

  // Calculate how many points to show based on progress
  const visibleCount = Math.floor((progressPercent / 100) * coordinates.length)

  // Always show at least 1 point if progress > 0
  const count = progressPercent > 0 ? Math.max(1, visibleCount) : 0

  return coordinates.slice(0, count)
}

/**
 * Add visual debug overlay to canvas
 *
 * Draws crosshairs at each coordinate point to verify projection accuracy.
 * Useful for debugging coordinate mapping issues.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {Array<{lat: number, lng: number}>} coordinates - Route coordinates
 * @param {Object} exportFrame - Export frame dimensions
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} style - Debug overlay style
 * @param {string} style.color - Crosshair color (default: '#00FF00')
 * @param {number} style.size - Crosshair size (default: 5)
 */
export function addDebugOverlay(ctx, coordinates, exportFrame, map, style = {}) {
  const {
    color = '#00FF00',
    size = 5
  } = style

  if (!coordinates || coordinates.length === 0) {
    return
  }

  ctx.strokeStyle = color
  ctx.lineWidth = 1

  for (const coord of coordinates) {
    const point = latLngToExportCanvas(coord, exportFrame, map)

    // Draw crosshair
    ctx.beginPath()
    ctx.moveTo(point.x - size, point.y)
    ctx.lineTo(point.x + size, point.y)
    ctx.moveTo(point.x, point.y - size)
    ctx.lineTo(point.x, point.y + size)
    ctx.stroke()
  }
}

/**
 * Main export frame rendering function
 *
 * This is the primary entry point for rendering a complete export frame.
 * It orchestrates all the drawing operations in the correct order:
 * 1. Clear canvas and draw background
 * 2. Draw static routes (if enabled)
 * 3. Draw current route (with progress)
 * 4. Draw current position marker
 * 5. Optionally add debug overlay
 *
 * @param {HTMLCanvasElement} canvas - Canvas element to render to
 * @param {Object} exportFrame - Export frame dimensions
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} state - Current animation state
 * @param {Object} state.currentActivity - Activity being animated
 * @param {number} state.animationProgress - Progress percentage 0-100
 * @param {boolean} state.showStaticRoutes - Whether to show background routes
 * @param {Array<Object>} state.staticActivities - All activities for static rendering
 * @param {string} state.selectedColor - Color for current route
 * @param {boolean} state.debug - Whether to add debug overlay (default: false)
 * @param {string} state.backgroundColor - Background color (default: '#F5F5F5')
 * @returns {HTMLCanvasElement} The rendered canvas
 */
export function renderExportFrame(canvas, exportFrame, map, state) {
  const ctx = canvas.getContext('2d')

  // Extract state
  const {
    currentActivity,
    animationProgress = 0,
    showStaticRoutes = false,
    staticActivities = [],
    selectedColor = '#FF0000',
    debug = false,
    backgroundColor = '#F5F5F5'
  } = state

  // Validate required parameters
  if (!currentActivity || !currentActivity.coordinates) {
    log.warn('renderExportFrame: No current activity or coordinates')
    return canvas
  }

  try {
    // Step 1: Clear canvas and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Step 2: Draw static routes (if enabled)
    if (showStaticRoutes && staticActivities.length > 0) {
      drawStaticRoutes(ctx, staticActivities, exportFrame, map, currentActivity.id, {
        color: '#CCCCCC',
        width: 2,
        opacity: 0.5
      })
    }

    // Step 3: Draw current route (with progress)
    const visibleCoords = getVisibleRouteCoordinates(
      currentActivity.coordinates,
      animationProgress
    )

    if (visibleCoords.length > 0) {
      drawRoute(ctx, visibleCoords, exportFrame, map, {
        color: selectedColor,
        width: 4,
        opacity: 1.0
      })

      // Step 4: Draw current position marker (at the last visible point)
      if (visibleCoords.length > 0) {
        const currentPos = visibleCoords[visibleCoords.length - 1]
        drawCurrentMarker(ctx, currentPos, exportFrame, map, {
          color: selectedColor
        })
      }
    }

    // Step 5: Optionally add debug overlay
    if (debug && currentActivity.coordinates.length > 0) {
      // Sample coordinates for debug (every 10th point to avoid clutter)
      const debugCoords = currentActivity.coordinates.filter((_, i) => i % 10 === 0)
      addDebugOverlay(ctx, debugCoords, exportFrame, map, {
        color: '#00FF00',
        size: 5
      })
    }

    return canvas
  } catch (error) {
    log.error('Error rendering export frame:', error)
    throw new Error(`Export frame rendering failed: ${error.message}`)
  }
}
