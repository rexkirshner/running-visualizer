<template>
  <div class="location-filter">
    <div class="filter-header">
      <h3>Filter by Location</h3>
      <button @click="resetFilters" class="reset-btn">Reset</button>
    </div>

    <div class="filter-inputs">
      <!-- City Filter -->
      <div class="input-group">
        <label for="city-filter">City:</label>
        <select
          id="city-filter"
          :value="selectedCity"
          @change="handleCityChange"
        >
          <option value="">All Cities ({{ cities.length }})</option>
          <option v-for="city in cities" :key="city" :value="city">
            {{ city }}
          </option>
        </select>
      </div>

      <!-- State Filter -->
      <div class="input-group">
        <label for="state-filter">State:</label>
        <select
          id="state-filter"
          :value="selectedState"
          @change="handleStateChange"
        >
          <option value="">All States ({{ states.length }})</option>
          <option v-for="state in states" :key="state" :value="state">
            {{ state }}
          </option>
        </select>
      </div>

      <!-- Country Filter -->
      <div class="input-group">
        <label for="country-filter">Country:</label>
        <select
          id="country-filter"
          :value="selectedCountry"
          @change="handleCountryChange"
        >
          <option value="">All Countries ({{ countries.length }})</option>
          <option v-for="country in countries" :key="country" :value="country">
            {{ country }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * LocationFilter Component
 *
 * Provides dropdown filters for city, state, and country
 * Extracts unique values from the runs data
 * Emits events when filters change
 */

const props = defineProps({
  // Array of all available cities from the runs data
  cities: {
    type: Array,
    required: true
  },
  // Array of all available states from the runs data
  states: {
    type: Array,
    required: true
  },
  // Array of all available countries from the runs data
  countries: {
    type: Array,
    required: true
  },
  // Currently selected city filter value
  selectedCity: {
    type: String,
    default: ''
  },
  // Currently selected state filter value
  selectedState: {
    type: String,
    default: ''
  },
  // Currently selected country filter value
  selectedCountry: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'update:selectedCity',
  'update:selectedState',
  'update:selectedCountry',
  'reset'
])

function handleCityChange(event) {
  emit('update:selectedCity', event.target.value)
}

function handleStateChange(event) {
  emit('update:selectedState', event.target.value)
}

function handleCountryChange(event) {
  emit('update:selectedCountry', event.target.value)
}

function resetFilters() {
  emit('reset')
}
</script>

<style scoped>
.location-filter {
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
  max-width: 320px;
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

.input-group select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: system-ui, -apple-system, sans-serif;
  cursor: pointer;
  background: white;
}

.input-group select:hover {
  border-color: #3388ff;
}

.input-group select:focus {
  outline: none;
  border-color: #3388ff;
  box-shadow: 0 0 0 2px rgba(51, 136, 255, 0.1);
}
</style>
