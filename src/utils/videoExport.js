/**
 * Video Export Utility
 *
 * Provides functions for capturing map animations to WebM video files
 * with optional transparency (alpha channel) support.
 *
 * Usage:
 *   import { VideoRecorder } from './utils/videoExport'
 *
 *   const recorder = new VideoRecorder(mapElement, {
 *     width: 1920,
 *     height: 1080,
 *     frameRate: 30,
 *     transparent: true
 *   })
 *
 *   await recorder.start()
 *   // ... run animation ...
 *   await recorder.captureFrame() // Call each animation frame
 *   const blob = await recorder.stop()
 *
 * @module utils/videoExport
 */

import html2canvas from 'html2canvas'

/**
 * Default recording options
 * @constant {Object}
 */
const DEFAULT_OPTIONS = {
  width: 1920,
  height: 1080,
  frameRate: 30,
  transparent: true,
  videoBitsPerSecond: 8000000 // 8 Mbps for good quality
}

/**
 * VideoRecorder class for capturing DOM animations to WebM
 */
export class VideoRecorder {
  /**
   * Create a new VideoRecorder
   *
   * @param {HTMLElement} element - DOM element to capture (e.g., map container)
   * @param {Object} [options={}] - Recording options
   * @param {number} [options.width=1920] - Output video width
   * @param {number} [options.height=1080] - Output video height
   * @param {number} [options.frameRate=30] - Target frame rate
   * @param {boolean} [options.transparent=true] - Enable alpha channel
   * @param {number} [options.videoBitsPerSecond=8000000] - Video bitrate
   */
  constructor(element, options = {}) {
    this.element = element
    this.options = { ...DEFAULT_OPTIONS, ...options }

    this.canvas = null
    this.ctx = null
    this.mediaRecorder = null
    this.chunks = []
    this.isRecording = false
    this.frameCount = 0
  }

  /**
   * Initialize the recorder and start capturing
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRecording) {
      console.warn('VideoRecorder: Already recording')
      return
    }

    // Create canvas for capturing frames
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.options.width
    this.canvas.height = this.options.height
    this.ctx = this.canvas.getContext('2d', { alpha: this.options.transparent })

    // Clear canvas (transparent if enabled)
    if (this.options.transparent) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    } else {
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    // Create media stream from canvas
    const stream = this.canvas.captureStream(this.options.frameRate)

    // Determine codec - VP9 supports alpha channel
    const mimeType = this.options.transparent
      ? 'video/webm;codecs=vp9'
      : 'video/webm;codecs=vp8'

    // Check if the browser supports the codec
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn(`VideoRecorder: ${mimeType} not supported, falling back to default`)
    }

    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
      videoBitsPerSecond: this.options.videoBitsPerSecond
    })

    this.chunks = []

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data)
      }
    }

    // Start recording
    this.mediaRecorder.start()
    this.isRecording = true
    this.frameCount = 0

    console.log('VideoRecorder: Started recording', {
      width: this.options.width,
      height: this.options.height,
      frameRate: this.options.frameRate,
      transparent: this.options.transparent
    })
  }

  /**
   * Capture the current frame from the DOM element
   * Call this method on each animation frame you want to capture
   *
   * @returns {Promise<void>}
   */
  async captureFrame() {
    if (!this.isRecording || !this.element) {
      return
    }

    try {
      // Capture DOM element to canvas
      const capturedCanvas = await html2canvas(this.element, {
        canvas: this.canvas,
        width: this.element.offsetWidth,
        height: this.element.offsetHeight,
        scale: this.options.width / this.element.offsetWidth,
        backgroundColor: this.options.transparent ? null : '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
      })

      this.frameCount++

      // Log progress periodically
      if (this.frameCount % 30 === 0) {
        console.log(`VideoRecorder: Captured ${this.frameCount} frames`)
      }
    } catch (error) {
      console.error('VideoRecorder: Frame capture failed', error)
    }
  }

  /**
   * Stop recording and return the video as a Blob
   *
   * @returns {Promise<Blob>} The recorded video as a WebM Blob
   */
  async stop() {
    if (!this.isRecording) {
      console.warn('VideoRecorder: Not recording')
      return null
    }

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' })
        console.log(`VideoRecorder: Stopped. Captured ${this.frameCount} frames, ${(blob.size / 1024 / 1024).toFixed(2)} MB`)

        // Cleanup
        this.isRecording = false
        this.chunks = []
        this.canvas = null
        this.ctx = null

        resolve(blob)
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * Check if currently recording
   * @returns {boolean}
   */
  get recording() {
    return this.isRecording
  }

  /**
   * Get the current frame count
   * @returns {number}
   */
  get frames() {
    return this.frameCount
  }
}

/**
 * Download a Blob as a file
 *
 * @param {Blob} blob - The blob to download
 * @param {string} [filename='recording.webm'] - The filename
 */
export function downloadBlob(blob, filename = 'recording.webm') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  console.log(`VideoExport: Downloaded ${filename}`)
}

/**
 * Generate a filename with timestamp
 *
 * @param {string} [prefix='run-animation'] - Filename prefix
 * @returns {string} Filename with timestamp
 */
export function generateFilename(prefix = 'run-animation') {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${prefix}-${timestamp}.webm`
}
