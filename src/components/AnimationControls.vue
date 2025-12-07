<template>
  <div class="animation-controls">
    <div class="controls-header">
      <h3>Route Animation</h3>
      <button @click="toggleExpanded" class="toggle-btn">
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
          min="5"
          max="60"
          step="5"
          :value="duration"
          @input="handleDurationChange"
          :disabled="isAnimating"
        />
      </div>

      <!-- Play/Pause Button -->
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

import { ref } from 'vue'

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
  /** Whether animation is currently playing */
  isAnimating: {
    type: Boolean,
    default: false
  },
  /** Animation progress percentage (0-100) */
  progress: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits([
  'update:selectedRunId',
  'update:duration',
  'play',
  'pause',
  'reset'
])

const isExpanded = ref(true)

function toggleExpanded() {
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
  z-index: 1000;
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
</style>
