<template>
  <div class="viewport-control">
    <div class="control-header">
      <h3>Viewport Lock</h3>
      <button
        class="lock-button"
        :class="{ locked: isLocked }"
        @click="handleToggleLock"
        :title="isLocked ? 'Unlock viewport' : 'Lock viewport'"
      >
        {{ isLocked ? '🔒' : '🔓' }}
      </button>
    </div>

    <div class="control-group">
      <button
        class="capture-button"
        @click="handleCapture"
        :disabled="isLocked"
      >
        Capture Current View
      </button>
    </div>

    <div class="coordinates-group">
      <div class="input-row">
        <label for="viewport-lat">Latitude:</label>
        <input
          id="viewport-lat"
          type="number"
          step="0.000001"
          :value="latitude"
          @input="handleLatChange"
          :disabled="!isLocked"
        />
      </div>

      <div class="input-row">
        <label for="viewport-lng">Longitude:</label>
        <input
          id="viewport-lng"
          type="number"
          step="0.000001"
          :value="longitude"
          @input="handleLngChange"
          :disabled="!isLocked"
        />
      </div>

      <div class="input-row">
        <label for="viewport-zoom">Zoom:</label>
        <input
          id="viewport-zoom"
          type="number"
          step="0.1"
          min="1"
          max="18"
          :value="zoom"
          @input="handleZoomChange"
          :disabled="!isLocked"
        />
      </div>
    </div>

    <div v-if="isLocked" class="lock-info">
      Viewport locked - map will not auto-fit
    </div>
  </div>
</template>

<script setup>
defineProps({
  isLocked: {
    type: Boolean,
    default: false
  },
  latitude: {
    type: Number,
    default: 0
  },
  longitude: {
    type: Number,
    default: 0
  },
  zoom: {
    type: Number,
    default: 11
  }
})

const emit = defineEmits([
  'toggle-lock',
  'capture-view',
  'update:latitude',
  'update:longitude',
  'update:zoom'
])

function handleToggleLock() {
  emit('toggle-lock')
}

function handleCapture() {
  emit('capture-view')
}

function handleLatChange(event) {
  emit('update:latitude', parseFloat(event.target.value))
}

function handleLngChange(event) {
  emit('update:longitude', parseFloat(event.target.value))
}

function handleZoomChange(event) {
  emit('update:zoom', parseFloat(event.target.value))
}
</script>

<style scoped>
.viewport-control {
  position: absolute;
  top: 10px;
  right: 10px;
  background: white;
  padding: 12px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: var(--z-index-ui-controls);
  font-family: system-ui, -apple-system, sans-serif;
  min-width: 250px;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.control-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.lock-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.lock-button:hover {
  background: #f0f0f0;
}

.lock-button.locked {
  background: #e8f5e9;
}

.control-group {
  margin-bottom: 12px;
}

.capture-button {
  width: 100%;
  padding: 8px 12px;
  background: #3388ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.capture-button:hover:not(:disabled) {
  background: #2277ee;
}

.capture-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.coordinates-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-row label {
  font-size: 12px;
  font-weight: 500;
  color: #555;
  min-width: 70px;
}

.input-row input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.input-row input:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.input-row input:focus:not(:disabled) {
  outline: none;
  border-color: #3388ff;
  box-shadow: 0 0 0 2px rgba(51, 136, 255, 0.1);
}

.lock-info {
  font-size: 11px;
  color: #4caf50;
  font-weight: 500;
  text-align: center;
  padding: 6px;
  background: #e8f5e9;
  border-radius: 4px;
}
</style>
