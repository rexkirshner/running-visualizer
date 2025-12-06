<template>
  <div id="app">
    <div id="map" ref="mapContainer"></div>
    <div class="loading" v-if="loading">
      <div class="spinner"></div>
      <p>Loading runs... {{ loadedCount }} / {{ totalCount }}</p>
    </div>
    <div class="stats" v-if="!loading">
      {{ runs.length }} runs loaded
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import L from 'leaflet'
import { loadAllRuns } from './utils/dataLoader'

const mapContainer = ref(null)
const runs = ref([])
const loading = ref(true)
const loadedCount = ref(0)
const totalCount = ref(0)
let map = null

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

    // Calculate bounds to fit all runs
    const allCoordinates = runs.value.flatMap(run => run.coordinates)

    if (allCoordinates.length > 0) {
      const bounds = L.latLngBounds(allCoordinates)
      map.fitBounds(bounds, { padding: [50, 50] })
    }

    // Draw each run as a polyline
    runs.value.forEach(run => {
      if (run.coordinates && run.coordinates.length > 0) {
        const polyline = L.polyline(run.coordinates, {
          color: '#3388ff',
          weight: 2,
          opacity: 0.6
        })

        // Add popup with run details
        const distanceKm = (run.distance / 1000).toFixed(2)
        polyline.bindPopup(`
          <strong>${run.name}</strong><br>
          ${run.date}<br>
          Distance: ${distanceKm} km
        `)

        polyline.addTo(map)
      }
    })

    console.log(`Rendered ${runs.value.length} runs on the map`)
  } catch (error) {
    console.error('Error loading runs:', error)
  } finally {
    loading.value = false
  }
})
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
