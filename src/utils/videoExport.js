/**
 * Video Export Utility
 *
 * Provides functions for capturing map animations to WebM video files.
 * Uses frame-by-frame capture for accurate timing.
 *
 * @module utils/videoExport
 */

import html2canvas from 'html2canvas'

/**
 * Default recording options
 * @constant {Object}
 */
const DEFAULT_OPTIONS = {
  width: 1280,  // Lower resolution for faster capture
  height: 720,
  frameRate: 30,
  videoBitsPerSecond: 5000000,
  targetDuration: 10 // Target video duration in seconds
}

/**
 * VideoRecorder class for capturing DOM animations to WebM
 * Uses manual frame capture for accurate timing control
 */
export class VideoRecorder {
  /**
   * Create a new VideoRecorder
   *
   * @param {HTMLElement} element - DOM element to capture (e.g., map container)
   * @param {Object} [options={}] - Recording options
   * @param {number} [options.width=1920] - Output video width
   * @param {number} [options.height=1080] - Output video height
   * @param {number} [options.frameRate=30] - Target frame rate for output video
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
    this.stream = null
    this.startTime = null
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
    this.ctx = this.canvas.getContext('2d')

    // Fill with black initially
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Create media stream - use fixed framerate for proper encoding
    // We'll draw frames at our own pace; stream will capture what's on canvas
    this.stream = this.canvas.captureStream(this.options.frameRate)

    // Determine codec
    const mimeType = 'video/webm;codecs=vp9'

    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
      videoBitsPerSecond: this.options.videoBitsPerSecond
    })

    this.chunks = []

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data)
      }
    }

    // Start recording - collect data every 100ms
    this.mediaRecorder.start(100)
    this.isRecording = true
    this.frameCount = 0

    // Add CSS class to hide UI elements during recording
    this.element.classList.add('recording-mode')

    // Track start time for duration calculation
    this.startTime = performance.now()

    console.log('VideoRecorder: Started recording', {
      width: this.options.width,
      height: this.options.height,
      frameRate: this.options.frameRate,
      targetDuration: this.options.targetDuration
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
      // Capture the full element (controls hidden via CSS .recording-mode class)
      const capturedCanvas = await html2canvas(this.element, {
        backgroundColor: '#000000',
        logging: false,
        useCORS: true,
        allowTaint: true,
        scale: 1,
        width: this.element.offsetWidth,
        height: this.element.offsetHeight,
        ignoreElements: (element) => {
          // Ignore Leaflet controls
          return element.classList && element.classList.contains('leaflet-control-container')
        }
      })

      // Clear our recording canvas and draw the captured frame
      this.ctx.fillStyle = '#000000'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

      // Calculate scaling to fit captured content in output dimensions
      const scaleX = this.canvas.width / capturedCanvas.width
      const scaleY = this.canvas.height / capturedCanvas.height
      const scale = Math.min(scaleX, scaleY)

      const destWidth = capturedCanvas.width * scale
      const destHeight = capturedCanvas.height * scale
      const destX = (this.canvas.width - destWidth) / 2
      const destY = (this.canvas.height - destHeight) / 2

      this.ctx.drawImage(capturedCanvas, destX, destY, destWidth, destHeight)

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

    // Remove recording mode CSS class
    this.element.classList.remove('recording-mode')

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' })
        const actualDuration = (performance.now() - this.startTime) / 1000
        const targetDuration = this.options.targetDuration
        const speedupFactor = actualDuration / targetDuration

        console.log(`VideoRecorder: Stopped.`)
        console.log(`  Frames: ${this.frameCount}`)
        console.log(`  Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`)
        console.log(`  Actual duration: ${actualDuration.toFixed(1)}s`)
        console.log(`  Target duration: ${targetDuration}s`)
        console.log(`  Speedup needed: ${speedupFactor.toFixed(2)}x`)
        console.log(``)
        console.log(`To fix duration and convert for Final Cut Pro:`)
        console.log(`  ffmpeg -i INPUT.webm -filter:v "setpts=PTS/${speedupFactor.toFixed(2)}" -c:v prores_ks -profile:v 3 -pix_fmt yuva444p10le OUTPUT.mov`)
        console.log(``)
        console.log(`Or for smaller file (H.264 MP4):`)
        console.log(`  ffmpeg -i INPUT.webm -filter:v "setpts=PTS/${speedupFactor.toFixed(2)}" -c:v libx264 -crf 18 OUTPUT.mp4`)

        // Cleanup
        this.isRecording = false
        this.chunks = []
        this.canvas = null
        this.ctx = null
        this.stream = null
        this.startTime = null

        resolve({ blob, speedupFactor, actualDuration, targetDuration })
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
