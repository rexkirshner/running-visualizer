<template>
  <div id="app">
    <div id="map" ref="mapContainer"></div>

    <!-- Date Range Filter (top-left) -->
    <DateRangeFilter
      v-if="!loading"
      class="date-filter-position"
      :start-date="startDate"
      :end-date="endDate"
      @update:start-date="handleStartDateChange"
      @update:end-date="handleEndDateChange"
      @reset="handleDateReset"
    />

    <!-- Location Filter (top-right) -->
    <LocationFilter
      v-if="!loading"
      :cities="uniqueCities"
      :states="uniqueStates"
      :countries="uniqueCountries"
      :selected-city="selectedCity"
      :selected-state="selectedState"
      :selected-country="selectedCountry"
      @update:selected-city="handleCityChange"
      @update:selected-state="handleStateChange"
      @update:selected-country="handleCountryChange"
      @reset="handleLocationReset"
    />

    <div class="loading" v-if="loading">
      <div class="spinner"></div>
      <p>Loading runs... {{ loadedCount }} / {{ totalCount }}</p>
    </div>
    <div class="stats" v-if="!loading">
      {{ filteredRuns.length }} / {{ runs.length }} runs
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import L from 'leaflet'
import { loadAllRuns } from './utils/dataLoader'
import DateRangeFilter from './components/DateRangeFilter.vue'
import LocationFilter from './components/LocationFilter.vue'

const mapContainer = ref(null)
const runs = ref([])
const loading = ref(true)
const loadedCount = ref(0)
const totalCount = ref(0)

// Date filter state
const startDate = ref('')
const endDate = ref('')

// Location filter state
const selectedCity = ref('')
const selectedState = ref('')
const selectedCountry = ref('')

let map = null
let polylines = [] // Store polyline references for clearing

/**
 * Extract unique values from runs for filter dropdowns
 * Sorted alphabetically for better UX
 */
const uniqueCities = computed(() => {
  const cities = [...new Set(runs.value.map(run => run.location).filter(Boolean))]
  return cities.sort()
})

const uniqueStates = computed(() => {
  const states = [...new Set(runs.value.map(run => run.state).filter(Boolean))]
  return states.sort()
})

const uniqueCountries = computed(() => {
  const countries = [...new Set(runs.value.map(run => run.country).filter(Boolean))]
  return countries.sort()
})

// Parse date string from CSV format to Date object
function parseActivityDate(dateStr) {
  // Format: "Mar 24, 2017, 5:42:11 PM"
  return new Date(dateStr)
}

/**
 * Filter runs by date range AND location
 * Combines all active filters
 */
const filteredRuns = computed(() => {
  return runs.value.filter(run => {
    // Date range filter
    if (startDate.value || endDate.value) {
      const runDate = parseActivityDate(run.date)

      if (startDate.value) {
        const start = new Date(startDate.value)
        start.setHours(0, 0, 0, 0)
        if (runDate < start) return false
      }

      if (endDate.value) {
        const end = new Date(endDate.value)
        end.setHours(23, 59, 59, 999)
        if (runDate > end) return false
      }
    }

    // Location filters
    if (selectedCity.value && run.location !== selectedCity.value) {
      return false
    }

    if (selectedState.value && run.state !== selectedState.value) {
      return false
    }

    if (selectedCountry.value && run.country !== selectedCountry.value) {
      return false
    }

    return true
  })
})

onMounted(async () => {
  // Initialize Leaflet map centered on Southern California
  map = L.map(mapContainer.value).setView([34.0, -118.4], 11)

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map)

  // Load and display runs
  try {
    runs.value = await loadAllRuns((loaded, total) => {
      loadedCount.value = loaded
      totalCount.value = total
    })

    // Initial render
    renderRuns()

    console.log(`Loaded ${runs.value.length} runs`)
  } catch (error) {
    console.error('Error loading runs:', error)
  } finally {
    loading.value = false
  }
})

// Render runs on the map
function renderRuns() {
  // Clear existing polylines
  polylines.forEach(polyline => map.removeLayer(polyline))
  polylines = []

  const runsToRender = filteredRuns.value

  // Calculate bounds to fit all filtered runs
  const allCoordinates = runsToRender.flatMap(run => run.coordinates)

  if (allCoordinates.length > 0) {
    const bounds = L.latLngBounds(allCoordinates)
    map.fitBounds(bounds, { padding: [50, 50] })
  }

  // Draw each run as a polyline
  runsToRender.forEach(run => {
    if (run.coordinates && run.coordinates.length > 0) {
      const polyline = L.polyline(run.coordinates, {
        color: '#3388ff',
        weight: 2,
        opacity: 0.6
      })

      // Add popup with run details including location
      const distanceKm = (run.distance / 1000).toFixed(2)
      polyline.bindPopup(`
        <strong>${run.name}</strong><br>
        ${run.date}<br>
        Distance: ${distanceKm} km<br>
        <em>${run.location}, ${run.state}</em>
      `)

      polyline.addTo(map)
      polylines.push(polyline)
    }
  })

  console.log(`Rendered ${runsToRender.length} runs on the map`)
}

// Date filter handlers
function handleStartDateChange(newDate) {
  startDate.value = newDate
  renderRuns()
}

function handleEndDateChange(newDate) {
  endDate.value = newDate
  renderRuns()
}

function handleDateReset() {
  startDate.value = ''
  endDate.value = ''
  renderRuns()
}

// Location filter handlers
function handleCityChange(newCity) {
  selectedCity.value = newCity
  renderRuns()
}

function handleStateChange(newState) {
  selectedState.value = newState
  renderRuns()
}

function handleCountryChange(newCountry) {
  selectedCountry.value = newCountry
  renderRuns()
}

function handleLocationReset() {
  selectedCity.value = ''
  selectedState.value = ''
  selectedCountry.value = ''
  renderRuns()
}
</script>

<style scoped>
#app {
  height: 100vh;
  width: 100vw;
  position: relative;
}

#map {
  height: 100%;
  width: 100%;
}

/* Position date filter on top-left */
.date-filter-position {
  left: 20px;
  right: auto;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 30px 40px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  text-align: center;
  z-index: 1000;
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

.loading p {
  margin: 0;
  color: #333;
  font-family: system-ui, -apple-system, sans-serif;
}

.stats {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: white;
  padding: 12px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 14px;
  color: #333;
  z-index: 1000;
}
</style>
