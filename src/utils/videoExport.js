/**
 * Video Export Utility
 *
 * Provides functions for capturing map animations to WebM video files
 * and converting them to Final Cut Pro compatible formats (MOV/MP4).
 *
 * @module utils/videoExport
 */

import html2canvas from 'html2canvas'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import JSZip from 'jszip'
import { createLogger } from './logger.js'
import { calculateExportFrame, calculateCropRegion } from './exportFrame.js'
import { PROGRESS_LOG_INTERVAL, validateExportSettings } from './constants.js'

const log = createLogger('VideoExport')

// Singleton FFmpeg instance (lazy loaded)
let ffmpegInstance = null
let ffmpegLoading = false
let ffmpegLoadPromise = null

/**
 * Get or create the FFmpeg instance
 * Lazy loads on first use
 * @returns {Promise<FFmpeg>}
 */
async function getFFmpeg() {
  if (ffmpegInstance) {
    return ffmpegInstance
  }

  if (ffmpegLoading) {
    return ffmpegLoadPromise
  }

  ffmpegLoading = true
  ffmpegLoadPromise = (async () => {
    console.log('Loading FFmpeg...')
    const ffmpeg = new FFmpeg()

    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg:', message)
    })

    ffmpeg.on('progress', ({ progress }) => {
      console.log(`FFmpeg progress: ${(progress * 100).toFixed(0)}%`)
    })

    // Use unpkg CDN for single-threaded ESM version (works without SharedArrayBuffer)
    // toBlobURL fetches files and creates blob URLs to avoid CORS/import issues
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    console.log('FFmpeg loading from:', baseURL)

    try {
      console.log('Creating blob URLs for ffmpeg-core files...')
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript')
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      console.log('Blob URLs created, loading ffmpeg...')

      await ffmpeg.load({
        coreURL,
        wasmURL
      })
      console.log('FFmpeg loaded successfully')
      ffmpegInstance = ffmpeg
      ffmpegLoading = false
      return ffmpeg
    } catch (error) {
      console.error('FFmpeg load error:', error)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      ffmpegLoading = false
      throw error
    }
  })()

  return ffmpegLoadPromise
}

/**
 * Preload FFmpeg in the background
 * Call this early (e.g., on setup page) to have ffmpeg ready when needed
 * @returns {Promise<boolean>} True if loaded successfully
 */
export async function preloadFFmpeg() {
  try {
    console.log('Preloading FFmpeg...')
    await getFFmpeg()
    console.log('FFmpeg preloaded and ready')
    return true
  } catch (error) {
    console.error('FFmpeg preload failed:', error)
    return false
  }
}

/**
 * Check if FFmpeg is loaded and ready
 * @returns {boolean}
 */
export function isFFmpegReady() {
  return ffmpegInstance !== null
}

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
 * PNGSequenceRecorder class for capturing DOM animations as PNG image sequences
 * Exports a ZIP file containing numbered PNG frames with transparency support
 *
 * IMPORTANT: Export frame dimensions must be captured BEFORE recording starts.
 * Pass the exportFrame option to ensure consistent capture regardless of
 * whether the export frame overlay is visible during recording.
 */
export class PNGSequenceRecorder {
  /**
   * Create a new PNGSequenceRecorder
   *
   * @param {HTMLElement} element - DOM element to capture (e.g., map container)
   * @param {Object} [options={}] - Recording options
   * @param {number} [options.width=1920] - Output image width
   * @param {number} [options.height=1080] - Output image height
   * @param {number} [options.frameRate=30] - Target frame rate (frames per second of final video)
   * @param {number} [options.targetDuration=10] - Target duration in seconds
   * @param {Object} [options.exportFrame] - Pre-captured export frame dimensions
   * @param {number} options.exportFrame.left - Left position in viewport pixels
   * @param {number} options.exportFrame.top - Top position in viewport pixels
   * @param {number} options.exportFrame.width - Frame width in pixels
   * @param {number} options.exportFrame.height - Frame height in pixels
   */
  constructor(element, options = {}) {
    this.element = element

    // Build options with defaults
    const resolvedOptions = {
      width: options.width || 1920,
      height: options.height || 1080,
      frameRate: options.frameRate || 30,
      targetDuration: options.targetDuration || 10
    }

    // Validate export settings
    const validation = validateExportSettings(resolvedOptions)
    if (!validation.valid) {
      const errorMsg = `Invalid export settings: ${validation.errors.join(', ')}`
      log.error(errorMsg)
      throw new Error(errorMsg)
    }

    this.options = resolvedOptions

    // Store pre-captured export frame dimensions
    // This is critical: frame must be captured BEFORE recording starts
    // because the overlay may be hidden during recording
    this.exportFrame = options.exportFrame || null

    this.frames = []
    this.isRecording = false
    this.frameCount = 0
    this.startTime = null
    this.stopRequested = false
  }

  /**
   * Request recording to stop
   * This sets a flag that can be checked in the animation loop
   * to stop recording even while a frame is being captured
   */
  requestStop() {
    this.stopRequested = true
  }

  /**
   * Initialize the recorder and start capturing
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRecording) {
      log.warn('Already recording')
      return
    }

    // Validate export frame is provided
    if (!this.exportFrame) {
      log.warn('No export frame provided - using fallback calculation')
      // Calculate based on aspect ratio as fallback
      const aspectRatio = this.options.width / this.options.height
      this.exportFrame = calculateExportFrame(aspectRatio)
    }

    this.frames = []
    this.frameCount = 0
    this.isRecording = true
    this.stopRequested = false
    this.startTime = performance.now()

    // Note: We don't add recording-mode class anymore
    // html2canvas ignoreElements handles excluding controls
    // Adding CSS classes can cause layout shifts that move the map view

    log.info('Started recording', {
      outputWidth: this.options.width,
      outputHeight: this.options.height,
      frameRate: this.options.frameRate,
      targetDuration: this.options.targetDuration,
      expectedFrames: this.options.frameRate * this.options.targetDuration,
      exportFrame: this.exportFrame
    })
  }

  /**
   * Capture the current frame from the DOM element as PNG
   * Call this method on each animation frame you want to capture
   *
   * Uses the pre-captured export frame dimensions (from constructor options)
   * to ensure consistent capture even when the overlay is hidden.
   *
   * @returns {Promise<void>}
   */
  async captureFrame() {
    if (!this.isRecording || !this.element) {
      return
    }

    try {
      // Use pre-captured export frame dimensions (stored at construction time)
      // This is the key fix: we don't query DOM for .export-frame-overlay
      // because it may be hidden during recording
      const { left: frameLeft, top: frameTop, width: frameWidth, height: frameHeight } = this.exportFrame

      // Get the map element position
      const mapRect = this.element.getBoundingClientRect()

      // Calculate crop region using the utility function
      const crop = calculateCropRegion(this.exportFrame, mapRect)

      // Log coordinates for debugging (first frame only)
      if (this.frameCount === 0) {
        log.debug('Export frame (pre-captured):', this.exportFrame)
        log.debug('Map element rect:', {
          left: mapRect.left,
          top: mapRect.top,
          width: mapRect.width,
          height: mapRect.height
        })
        log.debug('Crop region:', crop)
      }

      // APPROACH: Capture the full map element, then manually crop
      // This avoids html2canvas issues with scrollX/scrollY and CSS transforms

      // Step 1: Capture the entire map element at its natural size
      const fullCanvas = await html2canvas(this.element, {
        backgroundColor: null,
        logging: false,
        useCORS: true,
        allowTaint: true,
        scale: 1,
        ignoreElements: (element) => {
          if (!element.classList) return false
          return (
            element.classList.contains('leaflet-control-container') ||
            element.classList.contains('export-frame-overlay')
          )
        }
      })

      if (this.frameCount === 0) {
        log.debug('Full canvas size:', { width: fullCanvas.width, height: fullCanvas.height })
      }

      // Step 2: Create a cropped canvas at the export frame dimensions
      const croppedCanvas = document.createElement('canvas')
      croppedCanvas.width = frameWidth
      croppedCanvas.height = frameHeight
      const croppedCtx = croppedCanvas.getContext('2d')

      // Clear to transparent
      croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height)

      // Draw the cropped region from the full canvas
      // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      croppedCtx.drawImage(
        fullCanvas,
        crop.cropX, crop.cropY, crop.width, crop.height,  // Source region (crop from full canvas)
        0, 0, frameWidth, frameHeight                      // Destination (fill cropped canvas)
      )

      // Step 3: Scale to output resolution
      const outputCanvas = document.createElement('canvas')
      outputCanvas.width = this.options.width
      outputCanvas.height = this.options.height
      const ctx = outputCanvas.getContext('2d')

      // Keep transparent (don't fill background)
      ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height)

      // Scale the cropped image to fill the output canvas
      ctx.drawImage(croppedCanvas, 0, 0, outputCanvas.width, outputCanvas.height)

      // Convert to PNG blob
      const blob = await new Promise(resolve => outputCanvas.toBlob(resolve, 'image/png'))
      this.frames.push(blob)
      this.frameCount++

      // Log progress periodically
      if (this.frameCount % PROGRESS_LOG_INTERVAL === 0) {
        log.info(`Captured ${this.frameCount} frames`)
      }
    } catch (error) {
      log.error('Frame capture failed', error)
    }
  }

  /**
   * Stop recording and return a ZIP file containing all PNG frames
   *
   * @returns {Promise<{blob: Blob, frameCount: number, frameRate: number}>}
   */
  async stop() {
    if (!this.isRecording) {
      log.warn('Not recording')
      return null
    }

    const actualDuration = (performance.now() - this.startTime) / 1000

    log.info('Stopped recording', {
      frames: this.frameCount,
      actualDuration: `${actualDuration.toFixed(1)}s`,
      targetDuration: `${this.options.targetDuration}s`,
      frameRate: `${this.options.frameRate}fps`
    })

    // Create ZIP file
    log.info('Creating ZIP file...')
    const zip = new JSZip()
    const folder = zip.folder('frames')

    // Add frames with zero-padded numbering
    const padLength = String(this.frames.length).length
    for (let i = 0; i < this.frames.length; i++) {
      const frameNum = String(i + 1).padStart(Math.max(padLength, 4), '0')
      folder.file(`frame_${frameNum}.png`, this.frames[i])
    }

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 1 } // Fast compression (PNGs are already compressed)
    }, (metadata) => {
      if (metadata.percent % 10 === 0) {
        log.debug(`ZIP progress ${metadata.percent.toFixed(0)}%`)
      }
    })

    log.info(`ZIP created (${(zipBlob.size / 1024 / 1024).toFixed(2)} MB)`)
    log.info(`FCP import: Unzip, File > Import > Media, select 'frames', set ${this.options.frameRate}fps`)

    // Cleanup
    this.isRecording = false
    const result = {
      blob: zipBlob,
      frameCount: this.frameCount,
      frameRate: this.options.frameRate
    }
    this.frames = []
    this.startTime = null
    this.exportFrame = null  // Clear stored frame

    return result
  }

  /**
   * Check if currently recording
   * @returns {boolean}
   */
  get recording() {
    return this.isRecording
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
 * @param {string} [extension='webm'] - File extension
 * @returns {string} Filename with timestamp
 */
export function generateFilename(prefix = 'run-animation', extension = 'webm') {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${prefix}-${timestamp}.${extension}`
}

/**
 * Convert WebM blob to MP4 with corrected duration
 * Uses ffmpeg.wasm for in-browser conversion
 *
 * @param {Blob} webmBlob - The WebM video blob
 * @param {number} speedupFactor - Factor to speed up the video
 * @param {string} [format='mp4'] - Output format ('mp4' or 'mov')
 * @returns {Promise<Blob>} The converted video blob
 */
export async function convertVideo(webmBlob, speedupFactor, format = 'mp4') {
  console.log(`Converting video to ${format.toUpperCase()} with ${speedupFactor.toFixed(2)}x speedup...`)

  const ffmpeg = await getFFmpeg()

  // Write input file
  const inputData = await fetchFile(webmBlob)
  await ffmpeg.writeFile('input.webm', inputData)

  // Build ffmpeg command based on format
  const outputFile = `output.${format}`
  let args

  // Use setpts to adjust speed, then fps filter to set proper frame rate
  // The -r 30 ensures output metadata is correct
  const filterChain = `setpts=PTS/${speedupFactor.toFixed(4)},fps=30`

  args = [
    '-i', 'input.webm',
    '-filter:v', filterChain,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-r', '30',  // Output frame rate
    '-an',
    outputFile
  ]

  console.log('FFmpeg args:', args.join(' '))
  await ffmpeg.exec(args)

  // Read output file
  const data = await ffmpeg.readFile(outputFile)

  // Clean up
  await ffmpeg.deleteFile('input.webm')
  await ffmpeg.deleteFile(outputFile)

  const mimeType = format === 'mov' ? 'video/quicktime' : 'video/mp4'
  const outputBlob = new Blob([data.buffer], { type: mimeType })

  console.log(`Conversion complete: ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB`)
  return outputBlob
}
