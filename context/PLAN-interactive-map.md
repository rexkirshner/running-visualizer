# Interactive Map Visualization - Implementation Plan

## Overview
Build an interactive web application using Vue 3 and Leaflet to display all 2,277 running activities on a scrollable map.

## User Requirements
- Simple interactive map visualization
- Display GPS data from GPX files
- Scrollable/pannable map interface
- Load all 2,277 runs

## Technology Stack
- **Frontend Framework:** Vue 3 (Composition API)
- **Mapping Library:** Leaflet + OpenStreetMap tiles
- **Build Tool:** Vite (fast, modern, Vue-optimized)
- **Language:** JavaScript (can migrate to TypeScript later)
- **GPX Parsing:** Built-in XML parsing or lightweight library

## Architecture

### Data Flow
1. Parse `activities.csv` to get list of runs with metadata
2. Load GPX files on demand or in batches
3. Parse GPX XML to extract coordinate arrays
4. Render polylines on Leaflet map
5. Enable panning/zooming for exploration

### Performance Considerations
- **2,277 runs is a lot of data** - need to handle efficiently
- Options:
  - Load all GPX files upfront (slower initial load, instant interaction)
  - Lazy load GPX files as needed (faster startup, delay on interaction)
  - Use map clustering or bounds-based filtering
- **Recommendation:** Start simple - load all, optimize if slow

## Implementation Steps

### 1. Project Setup
**Files to create:**
- `package.json` - Dependencies and scripts
- `vite.config.js` - Vite build configuration
- `index.html` - Entry HTML file
- `.gitignore` updates - Add node_modules, dist

**Dependencies:**
```json
{
  "vue": "^3.4.0",
  "leaflet": "^1.9.4",
  "vite": "^5.0.0",
  "@vitejs/plugin-vue": "^5.0.0"
}
```

### 2. Data Processing Utility
**File:** `src/utils/dataLoader.js`

**Purpose:** Load and parse running data

**Functions:**
- `loadActivitiesCSV()` - Parse CSV, filter for runs only, return activity list
- `loadGPXFile(filename)` - Load single GPX file from data/activities/
- `parseGPX(xmlString)` - Extract lat/lon coordinates from GPX XML
- `loadAllRuns()` - Load CSV + all GPX files, return structured data

**Output format:**
```javascript
{
  id: "912765286",
  date: "Mar 24, 2017, 5:42:11 PM",
  name: "Morning Run",
  distance: 11949, // meters
  coordinates: [
    [33.9579160, -118.4470760],
    [33.9579260, -118.4470730],
    // ... all track points
  ]
}
```

### 3. Vue Application Structure
**File:** `src/main.js` - App entry point
**File:** `src/App.vue` - Root component with map

**App.vue structure:**
```vue
<template>
  <div id="app">
    <div id="map" ref="mapContainer"></div>
    <div class="loading" v-if="loading">Loading runs...</div>
    <div class="stats">
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
let map = null

onMounted(async () => {
  // Initialize Leaflet map
  map = L.map(mapContainer.value).setView([34.0, -118.4], 11)

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  // Load and display runs
  runs.value = await loadAllRuns()

  // Draw each run as a polyline
  runs.value.forEach(run => {
    L.polyline(run.coordinates, {
      color: 'blue',
      weight: 2,
      opacity: 0.6
    }).bindPopup(`${run.name}<br>${run.distance}m`)
      .addTo(map)
  })

  loading.value = false
})
</script>

<style>
#app { height: 100vh; width: 100vw; }
#map { height: 100%; width: 100%; }
.loading {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 10px 20px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.stats {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: white;
  padding: 10px;
  border-radius: 4px;
}
</style>
```

### 4. HTML Entry Point
**File:** `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Running Visualizer</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### 5. Vite Configuration
**File:** `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true
  }
})
```

## File Structure After Implementation
```
running-visualizer/
├── data/                    # (existing, gitignored)
├── src/
│   ├── main.js             # Vue app entry
│   ├── App.vue             # Main component with map
│   └── utils/
│       └── dataLoader.js   # CSV/GPX parsing utilities
├── public/                  # Static assets (Vite convention)
├── index.html              # HTML entry point
├── package.json            # Dependencies
├── vite.config.js          # Build config
└── .gitignore              # (update with node_modules, dist)
```

## Critical Decisions

### D001: Data Loading Strategy
**Decision:** Load all GPX files on app startup

**Why:**
- Simplest implementation for MVP
- User wants to see all 2,277 runs
- Modern browsers can handle this data volume
- No server needed - pure client-side

**Trade-offs:**
- ✅ Simple, no complex state management
- ✅ Instant interaction after load
- ❌ Slower initial page load (3-5 seconds estimated)
- ❌ Higher memory usage

**Future optimization if needed:**
- Add clustering for overlapping runs
- Implement viewport-based filtering
- Lazy load GPX files

### D002: No Backend Server
**Decision:** Pure client-side application using Vite dev server

**Why:**
- GPX files are local to filesystem
- No need for API or database
- Faster development iteration
- Simpler deployment (static site)

**Trade-offs:**
- ✅ Zero infrastructure cost
- ✅ Fast development
- ❌ Requires local file access (development only)
- ❌ For production, would need to bundle data or add server

**Note:** For production deployment later, we'll need to either:
1. Bundle GPX data with the app
2. Add a simple static file server
3. Convert data to JSON and include in build

### D003: Leaflet + OpenStreetMap
**Decision:** Use Leaflet with free OSM tiles

**Why:**
- Free, no API keys needed
- Lightweight (40kb)
- Great GPX/polyline support
- Familiar controls (zoom, pan)

**Trade-offs:**
- ✅ Zero cost
- ✅ Open source
- ✅ Perfect for GPS tracks
- ❌ Less polished than Mapbox
- ❌ Fewer advanced features

## Testing Strategy
1. **Manual testing:** Load app, verify map displays
2. **Data validation:** Check that all 2,277 runs load
3. **Performance:** Monitor load time and memory usage
4. **Visual verification:** Spot check that routes look correct

## Success Criteria
- [x] Map displays with OpenStreetMap tiles
- [x] All 2,277 running activities visible as polylines
- [x] Can pan and zoom to explore routes
- [x] Runs are distinguishable on the map
- [x] Performance is acceptable (<10 second load time)

## Next Steps After This Implementation
1. Add filtering (by date, distance, etc.)
2. Add route highlighting on hover
3. Add detailed run information panel
4. Performance optimization if needed (clustering, lazy loading)
5. Color coding by pace/distance/elevation

## Estimated Implementation Time
- Project setup: 15 minutes
- Data loader utility: 30 minutes
- Vue app with Leaflet: 30 minutes
- Testing and refinement: 15 minutes
**Total: ~90 minutes**
