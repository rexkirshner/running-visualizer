/**
 * Application Constants
 *
 * Centralized configuration values to avoid magic numbers throughout the codebase.
 * All constants are documented with their purpose and units.
 *
 * @module utils/constants
 */

// =============================================================================
// Map Configuration
// =============================================================================

/**
 * Map fit bounds padding in pixels [horizontal, vertical]
 * Used when auto-fitting the map view to contain all routes
 */
export const MAP_FIT_BOUNDS_PADDING = [50, 50]

/**
 * Default map center coordinates [lat, lng]
 * Southern California
 */
export const DEFAULT_MAP_CENTER = [34.0, -118.4]

/**
 * Default map zoom level
 */
export const DEFAULT_MAP_ZOOM = 11

/**
 * Leaflet zoom configuration for smooth zooming
 */
export const MAP_ZOOM_CONFIG = {
  zoomSnap: 0.1,           // Allow fractional zoom levels
  zoomDelta: 0.5,          // Smaller zoom steps when using +/- buttons
  wheelPxPerZoomLevel: 120 // Smoother scroll wheel zooming
}

// =============================================================================
// Animation Configuration
// =============================================================================

/**
 * Animation duration range in seconds
 */
export const ANIMATION_DURATION = {
  min: 1,
  max: 60,
  default: 10
}

/**
 * Runner dot size range in pixels
 */
export const RUNNER_DOT_SIZE = {
  min: 1,
  max: 15,
  default: 1
}

// =============================================================================
// Export Configuration
// =============================================================================

/**
 * Available export resolutions
 * Format: { value: 'WIDTHxHEIGHT', label: 'display name', width, height }
 */
export const EXPORT_RESOLUTIONS = [
  { value: '1280x720', label: '720p (1280x720)', width: 1280, height: 720 },
  { value: '1920x1080', label: '1080p (1920x1080)', width: 1920, height: 1080 },
  { value: '2560x1440', label: '1440p (2560x1440)', width: 2560, height: 1440 },
  { value: '3840x2160', label: '4K (3840x2160)', width: 3840, height: 2160 }
]

/**
 * Available export frame rates in fps
 */
export const EXPORT_FRAME_RATES = [24, 30, 60]

/**
 * Default export settings
 */
export const EXPORT_DEFAULTS = {
  resolution: '1920x1080',
  frameRate: 30
}

/**
 * Export validation bounds
 * Used to validate export settings before recording
 */
export const EXPORT_VALIDATION = {
  width: { min: 100, max: 8000 },
  height: { min: 100, max: 8000 },
  frameRate: { min: 1, max: 120 },
  duration: { min: 1, max: 3600 }  // Max 1 hour
}

/**
 * Validate export settings
 * @param {Object} options - Export options to validate
 * @param {number} options.width - Output width
 * @param {number} options.height - Output height
 * @param {number} options.frameRate - Frame rate
 * @param {number} [options.targetDuration] - Target duration
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateExportSettings(options) {
  const errors = []
  const v = EXPORT_VALIDATION

  // Width validation
  if (typeof options.width !== 'number' || !Number.isFinite(options.width)) {
    errors.push('Width must be a valid number')
  } else if (options.width < v.width.min || options.width > v.width.max) {
    errors.push(`Width must be between ${v.width.min} and ${v.width.max}`)
  }

  // Height validation
  if (typeof options.height !== 'number' || !Number.isFinite(options.height)) {
    errors.push('Height must be a valid number')
  } else if (options.height < v.height.min || options.height > v.height.max) {
    errors.push(`Height must be between ${v.height.min} and ${v.height.max}`)
  }

  // Frame rate validation
  if (typeof options.frameRate !== 'number' || !Number.isFinite(options.frameRate)) {
    errors.push('Frame rate must be a valid number')
  } else if (options.frameRate < v.frameRate.min || options.frameRate > v.frameRate.max) {
    errors.push(`Frame rate must be between ${v.frameRate.min} and ${v.frameRate.max}`)
  }

  // Duration validation (if provided)
  if (options.targetDuration !== undefined) {
    if (typeof options.targetDuration !== 'number' || !Number.isFinite(options.targetDuration)) {
      errors.push('Duration must be a valid number')
    } else if (options.targetDuration < v.duration.min || options.targetDuration > v.duration.max) {
      errors.push(`Duration must be between ${v.duration.min} and ${v.duration.max} seconds`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Export frame overlay styling
 */
export const EXPORT_FRAME_OVERLAY = {
  borderColor: '#ff6b6b',
  borderWidth: 3,
  borderStyle: 'dashed',
  labelBackground: '#ff6b6b',
  overlayOpacity: 0.15,
  viewportPadding: 0.9  // 90% of viewport
}

// =============================================================================
// Data Loading Configuration
// =============================================================================

/**
 * Batch size for loading GPX files
 * Limits concurrent requests to avoid overwhelming the browser
 */
export const GPX_BATCH_SIZE = 50

/**
 * Interval for logging progress during batch operations (every N items)
 */
export const PROGRESS_LOG_INTERVAL = 30

// =============================================================================
// Route Styling
// =============================================================================

/**
 * Default polyline styling for routes
 */
export const ROUTE_STYLE = {
  weight: 2,
  opacity: 0.6,
  animatedOpacity: 0.7,
  animatedWeight: 3
}

/**
 * Color palette for multi-color mode
 */
export const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899'  // pink
]

/**
 * Default single color for routes
 */
export const DEFAULT_ROUTE_COLOR = '#3388ff'

// =============================================================================
// UI Z-Index Scale
// =============================================================================

/**
 * Z-index values for UI layering
 * Use these instead of hardcoded values for consistent layering
 */
export const Z_INDEX = {
  map: 1,
  exportFrameOverlay: 999,
  uiControls: 1000,
  loading: 1001,
  modal: 1100
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse a resolution string (e.g., '1920x1080') into width and height
 * @param {string} resolutionStr - Resolution in 'WIDTHxHEIGHT' format
 * @returns {{ width: number, height: number }} Parsed dimensions
 */
export function parseResolution(resolutionStr) {
  const [width, height] = resolutionStr.split('x').map(Number)
  return { width, height }
}

/**
 * Get the aspect ratio from a resolution string
 * @param {string} resolutionStr - Resolution in 'WIDTHxHEIGHT' format
 * @returns {number} Aspect ratio (width / height)
 */
export function getAspectRatio(resolutionStr) {
  const { width, height } = parseResolution(resolutionStr)
  return width / height
}
