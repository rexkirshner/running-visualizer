<template>
  <div id="app">
    <!-- Setup Page (filter before loading) -->
    <SetupPage
      v-if="appMode === 'setup'"
      @load="handleSetupLoad"
    />

    <!-- Map View -->
    <template v-else>
      <div id="map" ref="mapContainer" :class="{ 'transparent-bg': mapType === 'none' }"></div>

      <!-- Map Type Selector (top-center) -->
      <MapTypeSelector
      v-if="!loading"
      :selected-type="mapType"
      @update:selected-type="handleMapTypeChange"
    />

    <!-- Route Color Selector (below map type) -->
    <RouteColorSelector
      v-if="!loading"
      :color-mode="colorMode"
      :single-color="singleColor"
      @update:color-mode="handleColorModeChange"
      @update:single-color="handleSingleColorChange"
    />

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

    <!-- Animation Controls (bottom-left) -->
    <AnimationControls
      v-if="!loading"
      :runs="filteredRuns"
      :selected-run-id="selectedRunId"
      :duration="animationDuration"
      :is-animating="isAnimating"
      :progress="animationProgress"
      :is-animating-all="isAnimatingAll"
      :progress-all="animationProgressAll"
      :show-runner-dots="showRunnerDots"
      :runner-dot-size="runnerDotSize"
      :is-recording="isRecording"
      @update:selected-run-id="handleRunSelect"
      @update:duration="handleDurationChange"
      @update:show-runner-dots="handleShowRunnerDotsChange"
      @update:runner-dot-size="handleRunnerDotSizeChange"
      @play="handlePlay"
      @pause="handlePause"
      @reset="handleReset"
      @play-all="handlePlayAll"
      @pause-all="handlePauseAll"
      @reset-all="handleResetAll"
      @toggle-recording="handleToggleRecording"
    />

    <div class="loading" v-if="loading">
      <div class="spinner"></div>
      <p>Loading runs... {{ loadedCount }} / {{ totalCount }}</p>
    </div>
    <div class="stats" v-if="!loading">
      {{ filteredRuns.length }} / {{ runs.length }} runs
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'
import { loadAllRuns } from './utils/dataLoader'
import {
  createRunnerDot,
  updateRunnerDotPosition,
  removeRunnerDot,
  removeAllRunnerDots,
  getPositionAtProgress
} from './utils/runnerDot'
import {
  VideoRecorder,
  downloadBlob,
  generateFilename
} from './utils/videoExport'
import DateRangeFilter from './components/DateRangeFilter.vue'
import LocationFilter from './components/LocationFilter.vue'
import AnimationControls from './components/AnimationControls.vue'
import MapTypeSelector from './components/MapTypeSelector.vue'
import RouteColorSelector from './components/RouteColorSelector.vue'
import SetupPage from './components/SetupPage.vue'

// App mode: 'setup' or 'map'
const appMode = ref('setup')
const initialFilters = ref(null)

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

// Animation state (single run)
const selectedRunId = ref('')
const animationDuration = ref(10) // seconds
const isAnimating = ref(false)
const animationProgress = ref(0) // 0-100
let animationFrameId = null
let animationStartTime = null
let animatedPolyline = null // Currently animated polyline
let runnerDot = null // Runner dot marker for single-run animation

// Animation state (all filtered runs)
const isAnimatingAll = ref(false)
const animationProgressAll = ref(0) // 0-100
let animationFrameIdAll = null
let animationStartTimeAll = null
let animatedPolylines = [] // Multiple animated polylines
let runnerDotsAll = [] // Runner dot markers for multi-run animation

let map = null
let polylines = [] // Store polyline references for clearing
let currentTileLayer = null // Current map tile layer

// Map type state
const mapType = ref('streets')

// Route color state
const colorMode = ref('multiple') // 'single' or 'multiple'
const singleColor = ref('#3388ff')

// Runner dot state
const showRunnerDots = ref(true)
const runnerDotSize = ref(6)

// Recording state
const isRecording = ref(false)
let videoRecorder = null

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

/**
 * Handle setup page load event
 * Switches to map view and loads runs with filters
 */
async function handleSetupLoad(filters) {
  initialFilters.value = filters
  appMode.value = 'map'

  // Wait for next tick to ensure map container is rendered
  await nextTick()

  // Initialize Leaflet map centered on Southern California
  map = L.map(mapContainer.value).setView([34.0, -118.4], 11)

  // Add initial tile layer (OpenStreetMap)
  currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map)

  // Load and display runs with filters
  try {
    runs.value = await loadAllRuns((loaded, total) => {
      loadedCount.value = loaded
      totalCount.value = total
    }, filters)

    // Initial render
    renderRuns()

    console.log(`Loaded ${runs.value.length} runs`)
  } catch (error) {
    console.error('Error loading runs:', error)
  } finally {
    loading.value = false
  }
}

// Keep onMounted empty - map init happens in handleSetupLoad
onMounted(() => {
  // Map initialization moved to handleSetupLoad
})

// Render runs on the map
function renderRuns() {
  // Clear existing polylines
  polylines.forEach(polyline => map.removeLayer(polyline))
  polylines = []

  // If animating (single or all), don't show static routes - animation handles display
  if (isAnimating.value || selectedRunId.value || isAnimatingAll.value) {
    return
  }

  const runsToRender = filteredRuns.value

  // Calculate bounds to fit all filtered runs
  const allCoordinates = runsToRender.flatMap(run => run.coordinates)

  if (allCoordinates.length > 0) {
    const bounds = L.latLngBounds(allCoordinates)
    map.fitBounds(bounds, { padding: [50, 50] })
  }

  // Draw each run as a polyline
  runsToRender.forEach((run, index) => {
    if (run.coordinates && run.coordinates.length > 0) {
      const polyline = L.polyline(run.coordinates, {
        color: getRouteColor(index),
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

// ============================================
// Map Type Handlers
// ============================================

/**
 * Tile layer configurations for different map types
 */
const tileLayers = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    maxZoom: 19
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19
  },
  none: null // No background
}

/**
 * Handle map type change
 * Switches the tile layer or removes it for 'none'
 */
function handleMapTypeChange(newType) {
  mapType.value = newType

  // Remove current tile layer
  if (currentTileLayer) {
    map.removeLayer(currentTileLayer)
    currentTileLayer = null
  }

  // Add new tile layer (unless 'none')
  const config = tileLayers[newType]
  if (config) {
    currentTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom
    }).addTo(map)
  }
}

// ============================================
// Route Color Handlers
// ============================================

/** Color palette for multiple color mode */
const colorPalette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899']

/**
 * Get color for a route based on current color mode
 * @param {number} index - Route index for multi-color mode
 * @returns {string} Hex color
 */
function getRouteColor(index) {
  if (colorMode.value === 'single') {
    return singleColor.value
  }
  return colorPalette[index % colorPalette.length]
}

function handleColorModeChange(newMode) {
  colorMode.value = newMode
  renderRuns()
}

function handleSingleColorChange(newColor) {
  singleColor.value = newColor
  renderRuns()
}

// ============================================
// Runner Dot Handlers
// ============================================

function handleShowRunnerDotsChange(value) {
  showRunnerDots.value = value
}

function handleRunnerDotSizeChange(value) {
  runnerDotSize.value = value
}

// ============================================
// Recording Handlers
// ============================================

/**
 * Toggle video recording on/off
 * When starting, creates a new VideoRecorder
 * When stopping, downloads the recorded video
 */
async function handleToggleRecording() {
  if (isRecording.value) {
    // Stop recording
    if (videoRecorder) {
      const blob = await videoRecorder.stop()
      if (blob) {
        const filename = generateFilename('run-animation')
        downloadBlob(blob, filename)
      }
      videoRecorder = null
    }
    isRecording.value = false
  } else {
    // Start recording
    const mapElement = mapContainer.value
    if (!mapElement) {
      console.error('Map container not found')
      return
    }

    videoRecorder = new VideoRecorder(mapElement, {
      width: 1920,
      height: 1080,
      frameRate: 30,
      transparent: mapType.value === 'none'
    })

    await videoRecorder.start()
    isRecording.value = true
  }
}

// ============================================
// Animation Handlers
// ============================================

/**
 * Handle run selection for animation
 * Resets progress when selecting a new run
 * Hides static routes when a run is selected
 */
function handleRunSelect(runId) {
  selectedRunId.value = runId
  animationProgress.value = 0
  isAnimating.value = false

  // Clear any existing animation
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  // Clear the animated polyline if it exists
  if (animatedPolyline) {
    map.removeLayer(animatedPolyline)
    animatedPolyline = null
  }

  // Clear runner dot if it exists
  if (runnerDot) {
    removeRunnerDot(map, runnerDot)
    runnerDot = null
  }

  // Clear static routes when selecting a run
  // When deselecting (empty runId), renderRuns() will restore them
  renderRuns()
}

/**
 * Handle animation duration change
 */
function handleDurationChange(newDuration) {
  animationDuration.value = newDuration
}

/**
 * Start animation playback
 * Uses requestAnimationFrame for smooth 60fps animation
 */
function handlePlay() {
  if (!selectedRunId.value) return

  isAnimating.value = true
  animationStartTime = performance.now() - (animationProgress.value / 100 * animationDuration.value * 1000)

  animateRun()
}

/**
 * Pause animation playback
 * Preserves current progress
 */
function handlePause() {
  isAnimating.value = false

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

/**
 * Reset animation to start
 */
function handleReset() {
  isAnimating.value = false
  animationProgress.value = 0

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (animatedPolyline) {
    map.removeLayer(animatedPolyline)
    animatedPolyline = null
  }

  // Clean up runner dot
  if (runnerDot) {
    removeRunnerDot(map, runnerDot)
    runnerDot = null
  }
}

// ============================================
// Multi-Run Animation Handlers
// ============================================

/**
 * Start animation for all filtered runs
 * All routes draw simultaneously
 */
function handlePlayAll() {
  if (filteredRuns.value.length === 0) return

  // Clear any single-run animation
  if (selectedRunId.value) {
    handleRunSelect('')
  }

  isAnimatingAll.value = true
  animationStartTimeAll = performance.now() - (animationProgressAll.value / 100 * animationDuration.value * 1000)

  // Clear static routes
  renderRuns()

  // Fit map to all filtered runs before starting
  const allCoordinates = filteredRuns.value.flatMap(run => run.coordinates || [])
  if (allCoordinates.length > 0) {
    const bounds = L.latLngBounds(allCoordinates)
    map.fitBounds(bounds, { padding: [50, 50] })
  }

  animateAllRuns()
}

/**
 * Pause multi-run animation
 */
function handlePauseAll() {
  isAnimatingAll.value = false

  if (animationFrameIdAll) {
    cancelAnimationFrame(animationFrameIdAll)
    animationFrameIdAll = null
  }
}

/**
 * Reset multi-run animation
 */
function handleResetAll() {
  isAnimatingAll.value = false
  animationProgressAll.value = 0

  if (animationFrameIdAll) {
    cancelAnimationFrame(animationFrameIdAll)
    animationFrameIdAll = null
  }

  // Clear all animated polylines
  animatedPolylines.forEach(polyline => map.removeLayer(polyline))
  animatedPolylines = []

  // Clean up all runner dots
  removeAllRunnerDots(map, runnerDotsAll)
  runnerDotsAll = []

  // Restore static routes
  renderRuns()
}

/**
 * Main animation loop for all filtered runs
 * Progressively draws all routes simultaneously
 */
function animateAllRuns() {
  if (!isAnimatingAll.value) return

  const currentTime = performance.now()
  const elapsed = currentTime - animationStartTimeAll
  const progress = Math.min((elapsed / (animationDuration.value * 1000)) * 100, 100)

  animationProgressAll.value = progress

  // Clear previous frame's polylines
  animatedPolylines.forEach(polyline => map.removeLayer(polyline))
  animatedPolylines = []

  // Clear previous frame's runner dots
  removeAllRunnerDots(map, runnerDotsAll)
  runnerDotsAll = []

  // Draw all filtered runs progressively
  filteredRuns.value.forEach((run, index) => {
    if (!run.coordinates || run.coordinates.length === 0) return

    const totalPoints = run.coordinates.length
    const pointsToShow = Math.floor((progress / 100) * totalPoints)

    if (pointsToShow > 0) {
      const partialCoordinates = run.coordinates.slice(0, pointsToShow)
      const routeColor = getRouteColor(index)

      const polyline = L.polyline(partialCoordinates, {
        color: routeColor,
        weight: 2,
        opacity: 0.7
      }).addTo(map)

      // Add runner dot at the head of this route (if enabled)
      if (showRunnerDots.value) {
        const headPosition = partialCoordinates[partialCoordinates.length - 1]
        const dot = createRunnerDot(map, headPosition, routeColor, { radius: runnerDotSize.value })
        if (dot) {
          runnerDotsAll.push(dot)
        }
      }

      // Add popup with run details
      const distanceKm = (run.distance / 1000).toFixed(2)
      polyline.bindPopup(`
        <strong>${run.name}</strong><br>
        ${run.date}<br>
        Distance: ${distanceKm} km<br>
        <em>${run.location}, ${run.state}</em>
      `)

      animatedPolylines.push(polyline)
    }
  })

  // Capture frame if recording
  if (isRecording.value && videoRecorder) {
    videoRecorder.captureFrame()
  }

  // Continue animation if not complete
  if (progress < 100) {
    animationFrameIdAll = requestAnimationFrame(animateAllRuns)
  } else {
    // Animation complete - clean up runner dots
    removeAllRunnerDots(map, runnerDotsAll)
    runnerDotsAll = []
    isAnimatingAll.value = false
    animationFrameIdAll = null
  }
}

/**
 * Main animation loop using requestAnimationFrame
 * Progressively draws the route from start to finish
 */
function animateRun() {
  if (!isAnimating.value) return

  const currentTime = performance.now()
  const elapsed = currentTime - animationStartTime
  const progress = Math.min((elapsed / (animationDuration.value * 1000)) * 100, 100)

  animationProgress.value = progress

  // Find the selected run
  const run = filteredRuns.value.find(r => r.id === selectedRunId.value)
  if (!run || !run.coordinates) return

  // Calculate how many coordinates to show based on progress
  const totalPoints = run.coordinates.length
  const pointsToShow = Math.floor((progress / 100) * totalPoints)

  if (pointsToShow > 0) {
    const partialCoordinates = run.coordinates.slice(0, pointsToShow)

    // Remove old polyline
    if (animatedPolyline) {
      map.removeLayer(animatedPolyline)
    }

    // Draw new polyline with current progress
    // Use single color if set, otherwise red for visibility
    const animationColor = colorMode.value === 'single' ? singleColor.value : '#ef4444'
    animatedPolyline = L.polyline(partialCoordinates, {
      color: animationColor,
      weight: 3,
      opacity: 0.8
    }).addTo(map)

    // Update runner dot at the head of the route (if enabled)
    if (showRunnerDots.value) {
      const headPosition = partialCoordinates[partialCoordinates.length - 1]
      if (!runnerDot) {
        // Create runner dot on first frame
        runnerDot = createRunnerDot(map, headPosition, animationColor, { radius: runnerDotSize.value })
      } else {
        // Update position on subsequent frames
        updateRunnerDotPosition(runnerDot, headPosition)
      }
    } else if (runnerDot) {
      // Remove dot if disabled mid-animation
      removeRunnerDot(map, runnerDot)
      runnerDot = null
    }

    // Add popup with run details
    const distanceKm = (run.distance / 1000).toFixed(2)
    animatedPolyline.bindPopup(`
      <strong>${run.name}</strong><br>
      ${run.date}<br>
      Distance: ${distanceKm} km<br>
      <em>${run.location}, ${run.state}</em>
    `)

    // Fit map to show the animated route
    if (partialCoordinates.length > 1) {
      const bounds = L.latLngBounds(partialCoordinates)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }

  // Capture frame if recording
  if (isRecording.value && videoRecorder) {
    videoRecorder.captureFrame()
  }

  // Continue animation if not complete
  if (progress < 100) {
    animationFrameId = requestAnimationFrame(animateRun)
  } else {
    // Animation complete
    isAnimating.value = false
    animationFrameId = null
  }
}

// Cleanup on component unmount
onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (animationFrameIdAll) {
    cancelAnimationFrame(animationFrameIdAll)
  }
  // Clean up single-run runner dot
  if (runnerDot) {
    removeRunnerDot(map, runnerDot)
  }
  // Clean up multi-run runner dots
  removeAllRunnerDots(map, runnerDotsAll)
})
</script>

<style scoped>
#app {
  height: 100vh;
  width: 100vw;
  position: relative;
}

#app:has(.transparent-bg) {
  background: transparent !important;
}

#map {
  height: 100%;
  width: 100%;
}

/* Transparent background mode for export */
#map.transparent-bg {
  background: transparent !important;
}

#map.transparent-bg :deep(.leaflet-container) {
  background: transparent !important;
}

#map.transparent-bg :deep(.leaflet-pane) {
  background: transparent !important;
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
