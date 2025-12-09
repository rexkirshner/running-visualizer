/**
 * Runner Dot Utility
 *
 * Provides functions for creating and managing animated runner dot markers
 * that follow the "head" of drawing routes during animation.
 *
 * Usage:
 *   import { createRunnerDot, updateRunnerDotPosition, removeRunnerDot } from './utils/runnerDot'
 *
 *   // Create a dot
 *   const dot = createRunnerDot(map, [34.0, -118.4], '#ef4444')
 *
 *   // Update position during animation
 *   updateRunnerDotPosition(dot, [34.1, -118.5])
 *
 *   // Remove when done
 *   removeRunnerDot(map, dot)
 *
 * @module utils/runnerDot
 */

import L from 'leaflet'

/**
 * Default styling options for runner dots
 * @constant {Object}
 */
const DEFAULT_OPTIONS = {
  radius: 6,
  fillOpacity: 1,
  opacity: 1,
  weight: 2,
  className: 'runner-dot'
}

/**
 * Create a runner dot marker at the specified position
 *
 * @param {L.Map} map - Leaflet map instance
 * @param {Array<number>} position - [lat, lng] position for the dot
 * @param {string} color - Dot color (hex string, e.g., '#ef4444')
 * @param {Object} [options={}] - Optional overrides for marker styling
 * @param {number} [options.radius] - Dot radius in pixels (default: 6)
 * @param {number} [options.fillOpacity] - Fill opacity 0-1 (default: 1)
 * @param {number} [options.weight] - Border weight in pixels (default: 2)
 * @returns {L.CircleMarker} The created Leaflet circle marker
 *
 * @example
 * const dot = createRunnerDot(map, [34.0, -118.4], '#3388ff')
 */
export function createRunnerDot(map, position, color, options = {}) {
  if (!map || !position || !color) {
    console.warn('createRunnerDot: Missing required parameters (map, position, or color)')
    return null
  }

  const markerOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    color: color,       // Border color
    fillColor: color    // Fill color
  }

  const marker = L.circleMarker(position, markerOptions)
  marker.addTo(map)

  return marker
}

/**
 * Update the position of an existing runner dot
 *
 * @param {L.CircleMarker} marker - The marker to update
 * @param {Array<number>} position - New [lat, lng] position
 * @returns {void}
 *
 * @example
 * updateRunnerDotPosition(dot, [34.1, -118.5])
 */
export function updateRunnerDotPosition(marker, position) {
  if (marker && position && position.length === 2) {
    marker.setLatLng(position)
  }
}

/**
 * Remove a single runner dot from the map
 *
 * @param {L.Map} map - Leaflet map instance
 * @param {L.CircleMarker} marker - The marker to remove
 * @returns {void}
 *
 * @example
 * removeRunnerDot(map, dot)
 */
export function removeRunnerDot(map, marker) {
  if (marker && map) {
    try {
      map.removeLayer(marker)
    } catch (e) {
      // Marker may already be removed, ignore
    }
  }
}

/**
 * Remove multiple runner dots from the map
 * Useful for cleaning up after multi-run animations
 *
 * @param {L.Map} map - Leaflet map instance
 * @param {Array<L.CircleMarker>} markers - Array of markers to remove
 * @returns {void}
 *
 * @example
 * removeAllRunnerDots(map, [dot1, dot2, dot3])
 */
export function removeAllRunnerDots(map, markers) {
  if (markers && Array.isArray(markers)) {
    markers.forEach(marker => removeRunnerDot(map, marker))
  }
}

/**
 * Get the current position from a route's coordinates based on animation progress
 *
 * @param {Array<Array<number>>} coordinates - Array of [lat, lng] coordinate pairs
 * @param {number} progress - Animation progress as percentage (0-100)
 * @returns {Array<number>|null} Current [lat, lng] position, or null if invalid
 *
 * @example
 * const position = getPositionAtProgress(route.coordinates, 50) // 50% through route
 */
export function getPositionAtProgress(coordinates, progress) {
  if (!coordinates || coordinates.length === 0) {
    return null
  }

  const totalPoints = coordinates.length
  const pointIndex = Math.min(
    Math.floor((progress / 100) * totalPoints),
    totalPoints - 1
  )

  return coordinates[pointIndex]
}
