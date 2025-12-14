/**
 * Export Frame Utility
 *
 * Handles export frame dimension calculations and state management.
 * This module solves the problem where the export frame overlay is hidden
 * during recording, making DOM queries unreliable.
 *
 * The solution: calculate and store frame dimensions BEFORE recording starts,
 * then use the stored dimensions during capture.
 *
 * @module utils/exportFrame
 */

import { EXPORT_FRAME_OVERLAY } from './constants.js'

/**
 * @typedef {Object} ExportFrameRect
 * @property {number} left - Left position in pixels (relative to viewport)
 * @property {number} top - Top position in pixels (relative to viewport)
 * @property {number} width - Width in pixels
 * @property {number} height - Height in pixels
 * @property {number} aspectRatio - Width / height ratio
 */

/**
 * @typedef {Object} CropRegion
 * @property {number} cropX - X offset within the source element
 * @property {number} cropY - Y offset within the source element
 * @property {number} width - Width to crop
 * @property {number} height - Height to crop
 */

/**
 * Calculate export frame dimensions based on viewport and aspect ratio
 *
 * The frame is centered in the viewport at 90% of the smaller dimension
 * while maintaining the target aspect ratio.
 *
 * @param {number} aspectRatio - Target aspect ratio (width / height)
 * @param {number} [viewportWidth=window.innerWidth] - Viewport width
 * @param {number} [viewportHeight=window.innerHeight] - Viewport height
 * @returns {ExportFrameRect} Calculated frame dimensions
 *
 * @example
 * // For 16:9 aspect ratio
 * const frame = calculateExportFrame(16/9)
 * // Returns: { left: 100, top: 50, width: 1600, height: 900, aspectRatio: 1.78 }
 */
export function calculateExportFrame(aspectRatio, viewportWidth = window.innerWidth, viewportHeight = window.innerHeight) {
  // Use 90% of viewport, with some padding for UI elements
  const padding = EXPORT_FRAME_OVERLAY.viewportPadding
  const vw90 = viewportWidth * padding
  const vh90_minus_100 = (viewportHeight * padding) - 100 // Account for controls

  // Calculate frame size maintaining aspect ratio
  let frameWidth, frameHeight

  // Try width-constrained first
  frameWidth = vw90
  frameHeight = frameWidth / aspectRatio

  // If height exceeds available space, use height-constrained
  if (frameHeight > vh90_minus_100) {
    frameHeight = vh90_minus_100
    frameWidth = frameHeight * aspectRatio
  }

  // Center in viewport
  const frameLeft = (viewportWidth - frameWidth) / 2
  const frameTop = (viewportHeight - frameHeight) / 2

  return {
    left: frameLeft,
    top: frameTop,
    width: frameWidth,
    height: frameHeight,
    aspectRatio
  }
}

/**
 * Get export frame dimensions from the overlay element if visible,
 * otherwise calculate from aspect ratio
 *
 * @param {string} [selector='.export-frame-overlay'] - CSS selector for overlay
 * @param {number} aspectRatio - Fallback aspect ratio if element not found
 * @returns {ExportFrameRect} Frame dimensions
 */
export function getExportFrameFromDOM(selector = '.export-frame-overlay', aspectRatio = 16/9) {
  const overlay = document.querySelector(selector)

  if (overlay) {
    const rect = overlay.getBoundingClientRect()
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      aspectRatio: rect.width / rect.height
    }
  }

  // Fallback to calculated dimensions
  return calculateExportFrame(aspectRatio)
}

/**
 * Calculate the crop region for capturing a specific area within an element
 *
 * This is used to determine what portion of a captured canvas should be
 * extracted to match the export frame.
 *
 * @param {ExportFrameRect} exportFrame - The export frame dimensions
 * @param {DOMRect} elementRect - The bounding rect of the element being captured
 * @returns {CropRegion} The crop region within the element
 *
 * @example
 * const frame = { left: 100, top: 50, width: 800, height: 450 }
 * const mapRect = mapElement.getBoundingClientRect()
 * const crop = calculateCropRegion(frame, mapRect)
 * // Use crop.cropX, crop.cropY, crop.width, crop.height with canvas drawImage
 */
export function calculateCropRegion(exportFrame, elementRect) {
  return {
    cropX: exportFrame.left - elementRect.left,
    cropY: exportFrame.top - elementRect.top,
    width: exportFrame.width,
    height: exportFrame.height
  }
}

/**
 * Validate that an export frame is within reasonable bounds
 *
 * @param {ExportFrameRect} frame - The frame to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateExportFrame(frame) {
  const errors = []

  if (!frame) {
    return { valid: false, errors: ['Frame is null or undefined'] }
  }

  if (frame.width <= 0 || frame.height <= 0) {
    errors.push(`Invalid dimensions: ${frame.width}x${frame.height}`)
  }

  if (frame.left < 0 || frame.top < 0) {
    errors.push(`Frame positioned outside viewport: left=${frame.left}, top=${frame.top}`)
  }

  if (frame.width > 10000 || frame.height > 10000) {
    errors.push(`Frame too large: ${frame.width}x${frame.height}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Create a CSS style object for the export frame overlay
 *
 * @param {number} aspectRatio - Target aspect ratio
 * @returns {Object} CSS style properties
 */
export function createExportFrameStyle(aspectRatio) {
  return {
    '--aspect-ratio': aspectRatio
  }
}

/**
 * ExportFrameManager class for managing export frame state
 *
 * This class captures and stores frame dimensions before recording starts,
 * ensuring consistent dimensions throughout the recording process.
 *
 * @example
 * const manager = new ExportFrameManager()
 * manager.captureCurrentFrame('.export-frame-overlay', 16/9)
 * // Later, during recording:
 * const frame = manager.getStoredFrame()
 * const crop = manager.getCropRegion(mapElement.getBoundingClientRect())
 */
export class ExportFrameManager {
  constructor() {
    this._storedFrame = null
  }

  /**
   * Capture and store the current export frame dimensions
   *
   * Call this BEFORE hiding the overlay or starting recording
   *
   * @param {string} [selector='.export-frame-overlay'] - CSS selector
   * @param {number} aspectRatio - Aspect ratio for calculation fallback
   * @returns {ExportFrameRect} The captured frame
   */
  captureCurrentFrame(selector = '.export-frame-overlay', aspectRatio = 16/9) {
    this._storedFrame = getExportFrameFromDOM(selector, aspectRatio)
    return this._storedFrame
  }

  /**
   * Calculate and store frame dimensions (without querying DOM)
   *
   * @param {number} aspectRatio - Target aspect ratio
   * @returns {ExportFrameRect} The calculated frame
   */
  calculateAndStore(aspectRatio) {
    this._storedFrame = calculateExportFrame(aspectRatio)
    return this._storedFrame
  }

  /**
   * Get the stored frame dimensions
   *
   * @returns {ExportFrameRect|null} Stored frame or null if not captured
   */
  getStoredFrame() {
    return this._storedFrame
  }

  /**
   * Check if a frame has been stored
   *
   * @returns {boolean} True if frame is stored
   */
  hasStoredFrame() {
    return this._storedFrame !== null
  }

  /**
   * Get the crop region for an element using stored frame
   *
   * @param {DOMRect} elementRect - The element's bounding rect
   * @returns {CropRegion|null} Crop region or null if no frame stored
   */
  getCropRegion(elementRect) {
    if (!this._storedFrame) {
      return null
    }
    return calculateCropRegion(this._storedFrame, elementRect)
  }

  /**
   * Clear the stored frame
   */
  clear() {
    this._storedFrame = null
  }
}

/**
 * Singleton instance for global use
 */
export const exportFrameManager = new ExportFrameManager()
