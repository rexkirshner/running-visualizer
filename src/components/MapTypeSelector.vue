<template>
  <div class="map-type-selector">
    <label for="map-type">Map:</label>
    <select id="map-type" :value="selectedType" @change="handleChange">
      <option v-for="option in mapTypes" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup>
const mapTypes = [
  { value: 'streets', label: 'Streets' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'none', label: 'No Background' }
]

defineProps({
  selectedType: {
    type: String,
    default: 'streets'
  }
})

const emit = defineEmits(['update:selectedType'])

function handleChange(event) {
  emit('update:selectedType', event.target.value)
}
</script>

<style scoped>
.map-type-selector {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 8px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: var(--z-index-ui-controls);
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
}

.map-type-selector label {
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.map-type-selector select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  background: white;
  font-family: system-ui, -apple-system, sans-serif;
}

.map-type-selector select:hover {
  border-color: #3388ff;
}

.map-type-selector select:focus {
  outline: none;
  border-color: #3388ff;
  box-shadow: 0 0 0 2px rgba(51, 136, 255, 0.1);
}
</style>
