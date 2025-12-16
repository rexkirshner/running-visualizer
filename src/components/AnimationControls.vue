<template>
  <div class="animation-controls">
    <div class="controls-header">
      <h3>Route Animation</h3>
      <button @click="handleToggleExpanded" class="toggle-btn">
        {{ isExpanded ? '−' : '+' }}
      </button>
    </div>

    <div v-if="isExpanded" class="controls-body">
      <!-- Run Selector -->
      <div class="control-group">
        <label for="run-select">Select Run:</label>
        <select
          id="run-select"
          :value="selectedRunId"
          @change="handleRunChange"
          :disabled="isAnimating"
        >
          <option value="">Choose a run...</option>
          <option v-for="run in runs" :key="run.id" :value="run.id">
            {{ run.name }} - {{ run.date }}
          </option>
        </select>
      </div>

      <!-- Duration Slider -->
      <div class="control-group">
        <label for="duration-slider">
          Duration: {{ duration }}s
        </label>
        <input
          id="duration-slider"
          type="range"
          :min="durationMin"
          :max="durationMax"
          step="1"
          :value="duration"
          @input="handleDurationChange"
          :disabled="isAnimating"
        />
      </div>

      <!-- Recording Control -->
      <div class="control-group recording-control">
        <button
          @click="handleToggleRecording"
          class="record-btn"
          :class="{ recording: isRecording, initializing: isInitializingRecording }"
          :disabled="isInitializingRecording"
        >
          <span v-if="isInitializingRecording" class="record-spinner"></span>
          <span v-else class="record-indicator"></span>
          {{ isInitializingRecording ? 'Initializing...' : (isRecording ? 'Stop Recording' : 'Record') }}
        </button>
        <span v-if="isRecording" class="recording-status">Recording...</span>
      </div>

      <!-- Export Settings -->
      <div class="control-group export-settings">
        <div class="export-settings-header">Export Settings</div>
        <div class="export-row">
          <div class="export-field">
            <label for="export-resolution">Resolution:</label>
            <select
              id="export-resolution"
              :value="exportResolution"
              @change="handleResolutionChange"
              :disabled="isRecording"
            >
              <option value="1280x720">720p (1280×720)</option>
              <option value="1920x1080">1080p (1920×1080)</option>
              <option value="2560x1440">1440p (2560×1440)</option>
              <option value="3840x2160">4K (3840×2160)</option>
            </select>
          </div>
          <div class="export-field">
            <label for="export-framerate">Frame Rate:</label>
            <select
              id="export-framerate"
              :value="exportFrameRate"
              @change="handleFrameRateChange"
              :disabled="isRecording"
            >
              <option value="24">24 fps</option>
              <option value="30">30 fps</option>
              <option value="60">60 fps</option>
            </select>
          </div>
        </div>
        <div class="checkbox-row show-frame-row">
          <input
            id="show-export-frame"
            type="checkbox"
            :checked="showExportFrame"
            @change="handleShowExportFrameChange"
          />
          <label for="show-export-frame">Show export frame</label>
        </div>
      </div>

      <!-- Runner Dot Settings -->
      <div class="control-group runner-dot-settings">
        <div class="checkbox-row">
          <input
            id="show-runner-dots"
            type="checkbox"
            :checked="showRunnerDots"
            @change="handleShowRunnerDotsChange"
          />
          <label for="show-runner-dots">Show runner dots</label>
        </div>
        <div v-if="showRunnerDots" class="size-slider">
          <label for="dot-size-slider">
            Dot size: {{ runnerDotSize }}px
          </label>
          <input
            id="dot-size-slider"
            type="range"
            :min="dotSizeMin"
            :max="dotSizeMax"
            step="1"
            :value="runnerDotSize"
            @input="handleRunnerDotSizeChange"
          />
        </div>
      </div>

      <!-- Route Line Width Settings -->
      <div class="control-group route-line-width-settings">
        <div class="size-slider">
          <label for="line-width-slider">
            Line width: {{ routeLineWidth }}px
          </label>
          <input
            id="line-width-slider"
            type="range"
            :min="lineWidthMin"
            :max="lineWidthMax"
            step="1"
            :value="routeLineWidth"
            @input="handleRouteLineWidthChange"
          />
        </div>
      </div>

      <!-- Play All Filtered Button -->
      <div v-if="!selectedRunId && runs.length > 0" class="control-group">
        <button
          @click="handlePlayAll"
          class="play-all-btn"
          :disabled="isAnimatingAll"
        >
          {{ isAnimatingAll ? '⏸ Pause All' : '▶ Play All Filtered' }}
        </button>
        <button
          @click="handleResetAll"
          class="reset-btn"
          :disabled="!isAnimatingAll && progressAll === 0"
        >
          ↻ Reset
        </button>
        <div class="run-count">{{ runs.length }} runs</div>
      </div>

      <!-- Progress Bar for All Runs -->
      <div v-if="!selectedRunId && runs.length > 0 && (isAnimatingAll || progressAll > 0)" class="control-group">
        <label>Progress:</label>
        <div class="progress-container">
          <div class="progress-bar progress-bar-all" :style="{ width: `${progressAll}%` }"></div>
          <span class="progress-text">{{ Math.round(progressAll) }}%</span>
        </div>
      </div>

      <!-- Divider -->
      <div v-if="runs.length > 0" class="divider">
        <span>or select a single run</span>
      </div>

      <!-- Play/Pause Button for Single Run -->
      <div class="control-group">
        <button
          @click="handlePlayPause"
          class="play-btn"
          :disabled="!selectedRunId"
        >
          {{ isAnimating ? '⏸ Pause' : '▶ Play' }}
        </button>
        <button
          @click="handleReset"
          class="reset-btn"
          :disabled="!selectedRunId || progress === 0"
        >
          ↻ Reset
        </button>
      </div>

      <!-- Progress Bar -->
      <div v-if="selectedRunId" class="control-group">
        <label>Progress:</label>
        <div class="progress-container">
          <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
          <span class="progress-text">{{ Math.round(progress) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * AnimationControls Component
 *
 * Provides UI controls for animating individual running routes
 * - Run selection dropdown
 * - Animation duration slider (5-60 seconds)
 * - Play/Pause/Reset controls
 * - Progress indicator
 *
 * @emits update:selectedRunId - When a run is selected
 * @emits update:duration - When duration slider changes
 * @emits play - When play button is clicked
 * @emits pause - When pause button is clicked
 * @emits reset - When reset button is clicked
 */

import { ref, computed } from 'vue'
import { ANIMATION_DURATION, RUNNER_DOT_SIZE, ROUTE_LINE_WIDTH } from '../utils/constants'

// Expose constants for template binding
const durationMin = computed(() => ANIMATION_DURATION.min)
const durationMax = computed(() => ANIMATION_DURATION.max)
const dotSizeMin = computed(() => RUNNER_DOT_SIZE.min)
const dotSizeMax = computed(() => RUNNER_DOT_SIZE.max)
const lineWidthMin = computed(() => ROUTE_LINE_WIDTH.min)
const lineWidthMax = computed(() => ROUTE_LINE_WIDTH.max)

const props = defineProps({
  /** Array of available runs to animate */
  runs: {
    type: Array,
    required: true
  },
  /** Currently selected run ID */
  selectedRunId: {
    type: String,
    default: ''
  },
  /** Animation duration in seconds */
  duration: {
    type: Number,
    default: 10
  },
  /** Whether single-run animation is currently playing */
  isAnimating: {
    type: Boolean,
    default: false
  },
  /** Single-run animation progress percentage (0-100) */
  progress: {
    type: Number,
    default: 0
  },
  /** Whether all-runs animation is currently playing */
  isAnimatingAll: {
    type: Boolean,
    default: false
  },
  /** All-runs animation progress percentage (0-100) */
  progressAll: {
    type: Number,
    default: 0
  },
  /** Whether to show runner dots during animation */
  showRunnerDots: {
    type: Boolean,
    default: true
  },
  /** Size of runner dots in pixels */
  runnerDotSize: {
    type: Number,
    default: 6
  },
  /** Width of route lines in pixels */
  routeLineWidth: {
    type: Number,
    default: 4
  },
  /** Whether currently recording video */
  isRecording: {
    type: Boolean,
    default: false
  },
  /** Whether recording is initializing (preparing to start) */
  isInitializingRecording: {
    type: Boolean,
    default: false
  },
  /** Export resolution (e.g., '1920x1080') */
  exportResolution: {
    type: String,
    default: '1920x1080'
  },
  /** Export frame rate */
  exportFrameRate: {
    type: Number,
    default: 30
  },
  /** Whether to show export frame overlay */
  showExportFrame: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'update:selectedRunId',
  'update:duration',
  'update:showRunnerDots',
  'update:runnerDotSize',
  'update:exportResolution',
  'update:exportFrameRate',
  'update:showExportFrame',
  'play',
  'pause',
  'reset',
  'playAll',
  'pauseAll',
  'resetAll',
  'toggleRecording'
])

const isExpanded = ref(true)

function handleToggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function handleRunChange(event) {
  emit('update:selectedRunId', event.target.value)
}

function handleDurationChange(event) {
  emit('update:duration', parseInt(event.target.value))
}

function handlePlayPause() {
  if (props.isAnimating) {
    emit('pause')
  } else {
    emit('play')
  }
}

function handleReset() {
  emit('reset')
}

function handlePlayAll() {
  if (props.isAnimatingAll) {
    emit('pauseAll')
  } else {
    emit('playAll')
  }
}

function handleResetAll() {
  emit('resetAll')
}

function handleShowRunnerDotsChange(event) {
  emit('update:showRunnerDots', event.target.checked)
}

function handleRunnerDotSizeChange(event) {
  emit('update:runnerDotSize', parseInt(event.target.value))
}

function handleRouteLineWidthChange(event) {
  emit('update:routeLineWidth', parseInt(event.target.value))
}

function handleToggleRecording() {
  emit('toggleRecording')
}

function handleResolutionChange(event) {
  emit('update:exportResolution', event.target.value)
}

function handleFrameRateChange(event) {
  emit('update:exportFrameRate', parseInt(event.target.value))
}

function handleShowExportFrameChange(event) {
  emit('update:showExportFrame', event.target.checked)
}
</script>

<style scoped>
.animation-controls {
  position: absolute;
  bottom: 60px;
  left: 20px;
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: var(--z-index-ui-controls);
  font-family: system-ui, -apple-system, sans-serif;
  min-width: 300px;
  max-width: 350px;
}

.controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.controls-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.toggle-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
  line-height: 1;
}

.toggle-btn:hover {
  background: #f5f5f5;
  border-color: #bbb;
}

.controls-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-group label {
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.control-group select,
.control-group input[type="range"] {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: system-ui, -apple-system, sans-serif;
}

.control-group select {
  cursor: pointer;
  background: white;
}

.control-group select:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.control-group select:hover:not(:disabled) {
  border-color: #3388ff;
}

.control-group select:focus {
  outline: none;
  border-color: #3388ff;
  box-shadow: 0 0 0 2px rgba(51, 136, 255, 0.1);
}

input[type="range"] {
  width: 100%;
  cursor: pointer;
}

input[type="range"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-btn,
.reset-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.play-btn {
  background: #3388ff;
  color: white;
  flex: 1;
}

.play-btn:hover:not(:disabled) {
  background: #2563eb;
}

.play-btn:disabled {
  background: #ddd;
  cursor: not-allowed;
}

.reset-btn {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  margin-left: 8px;
}

.reset-btn:hover:not(:disabled) {
  background: #e5e5e5;
  border-color: #bbb;
}

.reset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-container {
  position: relative;
  width: 100%;
  height: 30px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #ddd;
}

.progress-bar {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #3388ff, #60a5fa);
  transition: width 0.1s linear;
}

.progress-text {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: 600;
  color: #333;
  z-index: 1;
}

.play-all-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: #10b981;
  color: white;
  flex: 1;
}

.play-all-btn:hover:not(:disabled) {
  background: #059669;
}

.play-all-btn:disabled {
  background: #ddd;
  cursor: not-allowed;
}

.run-count {
  font-size: 12px;
  color: #666;
  text-align: center;
  margin-top: 4px;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 8px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #ddd;
}

.divider span {
  padding: 0 10px;
  font-size: 12px;
  color: #999;
}

.progress-bar-all {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.runner-dot-settings {
  background: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #3388ff;
}

.checkbox-row label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  cursor: pointer;
}

.size-slider {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.size-slider label {
  font-size: 13px;
  color: #555;
}

.size-slider input[type="range"] {
  margin-top: 6px;
}

/* Recording Controls */
.recording-control {
  flex-direction: row !important;
  align-items: center;
  gap: 12px;
}

.record-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 2px solid #dc2626;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  color: #dc2626;
}

.record-btn:hover {
  background: #fef2f2;
}

.record-btn.recording {
  background: #dc2626;
  color: white;
}

.record-btn.recording:hover {
  background: #b91c1c;
}

.record-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #dc2626;
}

.record-btn.recording .record-indicator {
  background: white;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.recording-status {
  font-size: 13px;
  color: #dc2626;
  font-weight: 500;
}

/* Initializing state */
.record-btn.initializing {
  background: #fef3c7;
  color: #92400e;
  border-color: #f59e0b;
  cursor: wait;
}

.record-btn.initializing:disabled {
  opacity: 1;
}

.record-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #f59e0b;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Export Settings */
.export-settings {
  background: #f0f9ff;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #bae6fd;
}

.export-settings-header {
  font-size: 13px;
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 10px;
}

.export-row {
  display: flex;
  gap: 12px;
}

.export-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.export-field label {
  font-size: 12px;
  font-weight: 500;
  color: #555;
}

.export-field select {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  cursor: pointer;
}

.export-field select:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.export-field select:hover:not(:disabled) {
  border-color: #3388ff;
}

.show-frame-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e0f2fe;
}

.show-frame-row input[type="checkbox"] {
  accent-color: #0369a1;
}

.show-frame-row label {
  font-size: 13px;
  color: #0369a1;
}
</style>
