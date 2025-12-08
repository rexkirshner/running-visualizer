<template>
  <div class="date-range-filter">
    <div class="filter-header">
      <h3>Filter by Date</h3>
      <button @click="resetDates" class="reset-btn">Reset</button>
    </div>
    <div class="filter-inputs">
      <div class="input-group">
        <label for="start-date">From:</label>
        <input
          id="start-date"
          type="date"
          :value="startDate"
          @change="updateStartDate"
          :max="endDate"
        />
      </div>
      <div class="input-group">
        <label for="end-date">To:</label>
        <input
          id="end-date"
          type="date"
          :value="endDate"
          @change="updateEndDate"
          :min="startDate"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  startDate: String,
  endDate: String
})

const emit = defineEmits(['update:startDate', 'update:endDate', 'reset'])

function updateStartDate(event) {
  emit('update:startDate', event.target.value)
}

function updateEndDate(event) {
  emit('update:endDate', event.target.value)
}

function resetDates() {
  emit('reset')
}
</script>

<style scoped>
.date-range-filter {
  position: absolute;
  top: 20px;
  right: 20px;
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  font-family: system-ui, -apple-system, sans-serif;
  min-width: 280px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.filter-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.reset-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #f5f5f5;
  border-color: #bbb;
}

.filter-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.input-group input[type="date"] {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: system-ui, -apple-system, sans-serif;
  cursor: pointer;
}

.input-group input[type="date"]:hover {
  border-color: #3388ff;
}

.input-group input[type="date"]:focus {
  outline: none;
  border-color: #3388ff;
  box-shadow: 0 0 0 2px rgba(51, 136, 255, 0.1);
}
</style>
