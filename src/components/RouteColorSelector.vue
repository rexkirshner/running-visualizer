<template>
  <div class="route-color-selector">
    <div class="selector-row">
      <label for="color-mode">Colors:</label>
      <select id="color-mode" :value="colorMode" @change="handleModeChange">
        <option value="single">Single Color</option>
        <option value="multiple">Multiple Colors</option>
      </select>
    </div>
    <div v-if="colorMode === 'single'" class="selector-row">
      <label for="color-picker">Color:</label>
      <input
        id="color-picker"
        type="color"
        :value="singleColor"
        @change="handleColorChange"
        class="color-picker"
      />
      <span class="color-hex">{{ singleColor }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  colorMode: {
    type: String,
    default: 'multiple'
  },
  singleColor: {
    type: String,
    default: '#3388ff'
  }
})

const emit = defineEmits(['update:colorMode', 'update:singleColor'])

function handleModeChange(event) {
  emit('update:colorMode', event.target.value)
}

function handleColorChange(event) {
  emit('update:singleColor', event.target.value)
}
</script>

<style scoped>
.route-color-selector {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 8px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: var(--z-index-ui-controls);
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selector-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.route-color-selector label {
  font-size: 13px;
  font-weight: 500;
  color: #555;
  min-width: 45px;
}

.route-color-selector select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  background: white;
  font-family: system-ui, -apple-system, sans-serif;
}

.route-color-selector select:hover {
  border-color: #3388ff;
}

.route-color-selector select:focus {
  outline: none;
  border-color: #3388ff;
  box-shadow: 0 0 0 2px rgba(51, 136, 255, 0.1);
}

.color-picker {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: none;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}

.color-hex {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}
</style>
