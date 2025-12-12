<template>
  <div class="setup-page">
    <div class="setup-container">
      <h1>Running Visualizer</h1>
      <p class="subtitle">Select filters to load your runs</p>

      <div v-if="loadingMetadata" class="loading-metadata">
        <div class="spinner"></div>
        <p>Loading activity data...</p>
      </div>

      <div v-else class="filters-form">
        <!-- Presets -->
        <div class="filter-section presets-section">
          <h3>Quick Presets</h3>
          <div class="presets">
            <button @click="applyPreset2025MDR" class="preset-btn">
              2025 Home - MDR
            </button>
          </div>
        </div>

        <!-- Date Range -->
        <div class="filter-section">
          <h3>Date Range</h3>
          <div class="date-inputs">
            <div class="input-group">
              <label for="start-date">From:</label>
              <input
                id="start-date"
                type="date"
                v-model="startDate"
                @change="updateMatchCount"
              />
            </div>
            <div class="input-group">
              <label for="end-date">To:</label>
              <input
                id="end-date"
                type="date"
                v-model="endDate"
                @change="updateMatchCount"
              />
            </div>
          </div>
        </div>

        <!-- Location -->
        <div class="filter-section">
          <h3>Location</h3>
          <div class="location-inputs">
            <div class="input-group">
              <label for="state">State/Region:</label>
              <select id="state" v-model="selectedState" @change="updateMatchCount">
                <option value="">All</option>
                <option v-for="state in uniqueStates" :key="state" :value="state">
                  {{ state }}
                </option>
              </select>
            </div>
            <div class="input-group">
              <label for="city">City:</label>
              <select id="city" v-model="selectedCity" @change="updateMatchCount">
                <option value="">All</option>
                <option v-for="city in filteredCities" :key="city" :value="city">
                  {{ city }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Match Count -->
        <div class="match-count">
          <span class="count">{{ matchCount }}</span>
          <span class="label">runs match your filters</span>
          <span class="total">({{ totalCount }} total)</span>
        </div>

        <!-- Action Buttons -->
        <div class="actions">
          <button @click="resetFilters" class="reset-btn">Reset Filters</button>
          <button @click="loadRuns" class="load-btn" :disabled="matchCount === 0">
            Load {{ matchCount }} Runs
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { loadMetadataOnly, filterActivities } from '../utils/dataLoader'
import { preloadFFmpeg } from '../utils/videoExport'

const emit = defineEmits(['load'])

// Metadata state
const loadingMetadata = ref(true)
const allActivities = ref([])

// Filter state
const startDate = ref('')
const endDate = ref('')
const selectedCity = ref('')
const selectedState = ref('')

// Match count
const matchCount = ref(0)
const totalCount = ref(0)

// Computed unique values for dropdowns
const uniqueStates = computed(() => {
  const states = [...new Set(allActivities.value.map(a => a.state).filter(Boolean))]
  return states.sort()
})

const uniqueCities = computed(() => {
  const cities = [...new Set(allActivities.value.map(a => a.location).filter(Boolean))]
  return cities.sort()
})

// Filter cities based on selected state
const filteredCities = computed(() => {
  if (!selectedState.value) {
    return uniqueCities.value
  }
  const cities = [...new Set(
    allActivities.value
      .filter(a => a.state === selectedState.value)
      .map(a => a.location)
      .filter(Boolean)
  )]
  return cities.sort()
})

// Get current filters object
function getCurrentFilters() {
  const filters = {}
  if (startDate.value) filters.startDate = startDate.value
  if (endDate.value) filters.endDate = endDate.value
  if (selectedCity.value) filters.city = selectedCity.value
  if (selectedState.value) filters.state = selectedState.value
  return filters
}

// Update match count based on current filters
function updateMatchCount() {
  // Reset city if it's no longer valid for selected state
  if (selectedState.value && selectedCity.value) {
    const validCities = filteredCities.value
    if (!validCities.includes(selectedCity.value)) {
      selectedCity.value = ''
    }
  }

  const filters = getCurrentFilters()
  const hasFilters = Object.keys(filters).length > 0

  if (hasFilters) {
    const filtered = filterActivities(allActivities.value, filters)
    matchCount.value = filtered.length
  } else {
    matchCount.value = totalCount.value
  }
}

// Reset all filters
function resetFilters() {
  startDate.value = ''
  endDate.value = ''
  selectedCity.value = ''
  selectedState.value = ''
  matchCount.value = totalCount.value
}

// Apply preset: 2025 Home - MDR
function applyPreset2025MDR() {
  startDate.value = '2025-01-01'
  endDate.value = '2025-12-31'
  selectedState.value = 'Home - MDR'
  selectedCity.value = ''
  updateMatchCount()
}

// Load runs with current filters
function loadRuns() {
  const filters = getCurrentFilters()
  emit('load', Object.keys(filters).length > 0 ? filters : null)
}

// Load metadata on mount and preload ffmpeg in background
onMounted(async () => {
  // Start preloading ffmpeg in background (don't await - let it load while user selects filters)
  preloadFFmpeg().then(success => {
    if (success) {
      console.log('FFmpeg ready for video export')
    } else {
      console.warn('FFmpeg preload failed - video export will fall back to WebM')
    }
  })

  try {
    allActivities.value = await loadMetadataOnly()
    totalCount.value = allActivities.value.length
    matchCount.value = totalCount.value
  } catch (error) {
    console.error('Failed to load metadata:', error)
  } finally {
    loadingMetadata.value = false
  }
})
</script>

<style scoped>
.setup-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: system-ui, -apple-system, sans-serif;
}

.setup-container {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: #1e3a5f;
}

.subtitle {
  margin: 0 0 32px 0;
  color: #666;
  font-size: 16px;
}

.loading-metadata {
  text-align: center;
  padding: 40px 0;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3388ff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.filters-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.filter-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-inputs,
.location-inputs {
  display: flex;
  gap: 16px;
}

.input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.input-group input,
.input-group select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: system-ui, -apple-system, sans-serif;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-group input:focus,
.input-group select:focus {
  outline: none;
  border-color: #3388ff;
  box-shadow: 0 0 0 3px rgba(51, 136, 255, 0.1);
}

.input-group select {
  cursor: pointer;
  background: white;
}

.match-count {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.match-count .count {
  font-size: 32px;
  font-weight: 700;
  color: #3388ff;
}

.match-count .label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.match-count .total {
  font-size: 12px;
  color: #999;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.reset-btn {
  flex: 1;
  padding: 14px 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #f5f5f5;
  border-color: #bbb;
}

.load-btn {
  flex: 2;
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  background: #3388ff;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.load-btn:hover:not(:disabled) {
  background: #2563eb;
}

.load-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.presets-section {
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 8px 16px;
  border: 1px solid #3388ff;
  border-radius: 20px;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #3388ff;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #3388ff;
  color: white;
}
</style>
