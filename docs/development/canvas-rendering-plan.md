# Direct Canvas Rendering Implementation Plan

**Date:** 2025-12-15
**Author:** Claude Sonnet 4.5
**Status:** Planning Phase

---

## Executive Summary

This document outlines a comprehensive plan to replace `html2canvas` with direct canvas rendering for PNG sequence export. The current html2canvas approach has fundamental limitations with Leaflet's CSS transform-based positioning, causing misalignment between the export frame overlay and actual exported content.

**Key Benefits:**
- Complete control over coordinate mapping and positioning
- Elimination of CSS transform interpretation issues
- Likely performance improvements (no DOM cloning)
- Smaller bundle size (remove html2canvas dependency)
- More predictable and testable rendering pipeline

---

## Problem Statement

### Current Issues with html2canvas

1. **CSS Transform Handling**: html2canvas doesn't correctly interpret Leaflet's `transform: translate3d()` positioning on `.leaflet-map-pane`
2. **Coordinate Mapping**: No reliable way to map export frame coordinates to captured canvas content
3. **Performance**: DOM cloning and traversal is expensive for every frame
4. **Unpredictability**: Results vary based on tile loading state and CSS complexity

### Current Behavior

**Export Frame (User's Intent):**
```
left: 94.5px
top: 194.15625px
width: 1761px
height: 993.1875px
```

**Actual Export Result:**
- Content appears in top-left corner
- Map tiles are clipped/offset from expected position
- No reliable alignment with export frame overlay

---

## Architecture Overview

### High-Level Approach

Replace the html2canvas capture pipeline with a direct canvas rendering approach that:

1. **Creates a blank export canvas** at exact export frame dimensions
2. **Identifies visible routes** within the export frame bounds
3. **Projects route coordinates** from geographic (lat/lng) to canvas pixel space
4. **Renders routes directly** using Canvas 2D API
5. **Optionally renders map tiles** as background (if needed)

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ Current Animation Frame                                  │
│ - currentActivity (route data)                          │
│ - map instance (Leaflet)                                │
│ - exportFrame dimensions                                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Coordinate Projection System                            │
│ 1. Get current map bounds from Leaflet                  │
│ 2. Calculate export frame bounds in lat/lng             │
│ 3. Create projection function: latLng → canvas (x,y)    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Canvas Rendering Pipeline                               │
│ 1. Create canvas at export dimensions                   │
│ 2. Draw background (optional: tiles or solid color)     │
│ 3. Draw route polyline(s) in route color                │
│ 4. Draw current position marker                         │
│ 5. Return canvas as Blob                                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Existing Export System (unchanged)                      │
│ - Collect frame Blobs in ZIP                            │
│ - Download as PNG sequence                              │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Approach

### 1. Coordinate System Mapping

The core challenge is mapping geographic coordinates (latitude/longitude) to canvas pixel coordinates within the export frame.

**Leaflet's Coordinate System:**
```javascript
// Leaflet provides these methods on the map instance:
map.latLngToContainerPoint(latLng) // → {x, y} pixels from top-left of map container
map.containerPointToLatLng(point)  // → {lat, lng} from pixel coordinates
map.getBounds()                    // → LatLngBounds of visible map area
map.getZoom()                      // → Current zoom level
```

**Export Frame Coordinate System:**
```javascript
// Export frame is positioned relative to map container
const exportFrame = {
  left: 94.5,          // pixels from left edge of map container
  top: 194.15625,      // pixels from top edge of map container
  width: 1761,         // export canvas width
  height: 993.1875     // export canvas height
}
```

**Mapping Strategy:**

```javascript
/**
 * Convert lat/lng coordinate to export canvas pixel coordinate
 * @param {L.LatLng} latLng - Geographic coordinate
 * @param {Object} exportFrame - Export frame dimensions
 * @param {L.Map} map - Leaflet map instance
 * @returns {{x: number, y: number}} Canvas pixel coordinate (0,0 = top-left of export canvas)
 */
function latLngToExportCanvas(latLng, exportFrame, map) {
  // Step 1: Get container pixel coordinate from Leaflet
  const containerPoint = map.latLngToContainerPoint(latLng)

  // Step 2: Adjust relative to export frame origin
  const canvasX = containerPoint.x - exportFrame.left
  const canvasY = containerPoint.y - exportFrame.top

  // Step 3: Return canvas coordinate
  return { x: canvasX, y: canvasY }
}
```

### 2. Route Rendering

**Polyline Rendering:**

```javascript
/**
 * Draw a route polyline on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array<{lat, lng}>} coordinates - Route coordinates
 * @param {Object} exportFrame - Export frame dimensions
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} style - Line style options
 */
function drawRoute(ctx, coordinates, exportFrame, map, style = {}) {
  const {
    color = '#FF0000',
    width = 3,
    opacity = 1.0
  } = style

  if (coordinates.length === 0) return

  // Set line style
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.globalAlpha = opacity
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Begin path
  ctx.beginPath()

  // Move to first point
  const firstPoint = latLngToExportCanvas(coordinates[0], exportFrame, map)
  ctx.moveTo(firstPoint.x, firstPoint.y)

  // Draw line segments
  for (let i = 1; i < coordinates.length; i++) {
    const point = latLngToExportCanvas(coordinates[i], exportFrame, map)
    ctx.lineTo(point.x, point.y)
  }

  // Stroke the path
  ctx.stroke()

  // Reset alpha
  ctx.globalAlpha = 1.0
}
```

**Current Position Marker:**

```javascript
/**
 * Draw the current position marker (animated point on route)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {{lat, lng}} position - Current position
 * @param {Object} exportFrame - Export frame dimensions
 * @param {L.Map} map - Leaflet map instance
 */
function drawCurrentMarker(ctx, position, exportFrame, map) {
  const point = latLngToExportCanvas(position, exportFrame, map)

  // Draw outer circle (white)
  ctx.beginPath()
  ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 2
  ctx.stroke()

  // Draw inner circle (route color)
  ctx.beginPath()
  ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI)
  ctx.fillStyle = '#FF0000'
  ctx.fill()
}
```

### 3. Background Options

We have several options for the background:

**Option A: Solid Color Background**
- Simplest approach
- Fast rendering
- No CORS issues
- Con: No geographic context

```javascript
ctx.fillStyle = '#F5F5F5' // Light gray
ctx.fillRect(0, 0, canvas.width, canvas.height)
```

**Option B: Capture Map Tiles**
- More complex but provides context
- Need to handle CORS for tile images
- May need proxy server for some tile sources

```javascript
// Pseudo-code - requires tile loading and drawing
const tiles = getVisibleTilesInFrame(exportFrame, map)
for (const tile of tiles) {
  const img = await loadTileImage(tile.url)
  const pos = calculateTilePosition(tile, exportFrame, map)
  ctx.drawImage(img, pos.x, pos.y, pos.width, pos.height)
}
```

**Option C: Hybrid - Leaflet for Background, Canvas for Route**
- Keep using html2canvas for static background tiles
- Draw route on separate canvas layer
- Composite together
- Con: Still has html2canvas dependency

**Recommendation:** Start with Option A (solid color) for initial implementation. This eliminates complexity and focuses on getting coordinate mapping correct. Can add tile rendering later if needed.

### 4. Animation State Tracking

**What We're Animating:**

During route animation, we need to render:
1. **Static route path**: The full route drawn in route color
2. **Completed portion**: Optionally in different color/width
3. **Current position marker**: Circle at current lat/lng
4. **Static routes** (if "Show All Routes" is enabled): Other routes in gray

**Animation State (from App.vue):**

```javascript
// Current state available during animation
{
  currentActivity: {
    name: "Run name",
    coordinates: [{lat, lng}, ...],
    color: "#FF0000"
  },
  animationProgress: 0-100,          // Percentage complete
  showStaticRoutes: true/false,
  staticActivities: [...],           // All routes if showing static
  selectedMapType: 'osm',
  selectedColor: '#FF0000'
}
```

**Frame Rendering Logic:**

```javascript
function renderAnimationFrame(canvas, state, exportFrame, map) {
  const ctx = canvas.getContext('2d')

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 1. Draw background
  ctx.fillStyle = '#F5F5F5'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 2. Draw static routes (if enabled)
  if (state.showStaticRoutes) {
    for (const activity of state.staticActivities) {
      if (activity.id !== state.currentActivity.id) {
        drawRoute(ctx, activity.coordinates, exportFrame, map, {
          color: '#CCCCCC',
          width: 2,
          opacity: 0.5
        })
      }
    }
  }

  // 3. Draw current route
  const coords = state.currentActivity.coordinates
  const progressIndex = Math.floor((state.animationProgress / 100) * coords.length)
  const visibleCoords = coords.slice(0, progressIndex)

  drawRoute(ctx, visibleCoords, exportFrame, map, {
    color: state.selectedColor,
    width: 4,
    opacity: 1.0
  })

  // 4. Draw current position marker
  if (progressIndex > 0 && progressIndex < coords.length) {
    drawCurrentMarker(ctx, coords[progressIndex], exportFrame, map)
  }

  return canvas
}
```

---

## Implementation Steps

### Phase 1: Core Infrastructure (Est. 2-3 hours)

**Step 1.1: Create Canvas Renderer Module**

Create `src/utils/canvasRenderer.js`:

```javascript
/**
 * Direct canvas rendering utilities for route export
 * Replaces html2canvas approach with coordinate-based rendering
 */
import * as log from './logger.js'

/**
 * Convert lat/lng to export canvas coordinates
 */
export function latLngToExportCanvas(latLng, exportFrame, map) {
  // Implementation from technical approach section
}

/**
 * Draw a route polyline
 */
export function drawRoute(ctx, coordinates, exportFrame, map, style = {}) {
  // Implementation from technical approach section
}

/**
 * Draw current position marker
 */
export function drawCurrentMarker(ctx, position, exportFrame, map) {
  // Implementation from technical approach section
}

/**
 * Main export frame rendering function
 */
export function renderExportFrame(exportFrame, map, currentActivity, animationState) {
  // Implementation combining all drawing functions
}
```

**Step 1.2: Create Unit Tests**

Create `src/utils/__tests__/canvasRenderer.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { latLngToExportCanvas, drawRoute } from '../canvasRenderer.js'

describe('canvasRenderer', () => {
  describe('latLngToExportCanvas', () => {
    it('should convert lat/lng to canvas coordinates', () => {
      // Test coordinate projection
    })

    it('should handle points outside export frame', () => {
      // Test clipping behavior
    })
  })

  describe('drawRoute', () => {
    it('should draw polyline with correct style', () => {
      // Test canvas API calls
    })
  })
})
```

**Success Criteria:**
- All coordinate projection tests pass
- Functions properly handle edge cases (empty coordinates, out-of-bounds points)

### Phase 2: Integration with PNGSequenceRecorder (Est. 1-2 hours)

**Step 2.1: Add Canvas Rendering Path**

Modify `src/utils/videoExport.js`:

```javascript
import { renderExportFrame } from './canvasRenderer.js'

class PNGSequenceRecorder {
  async captureFrame() {
    const crop = calculateExportCrop(/* ... */)

    // NEW: Direct canvas rendering path
    if (this.useCanvasRendering) {
      const canvas = document.createElement('canvas')
      canvas.width = crop.width
      canvas.height = crop.height

      // Get current animation state from App.vue
      const animationState = {
        currentActivity: this.currentActivity,
        animationProgress: this.animationProgress,
        showStaticRoutes: this.showStaticRoutes,
        staticActivities: this.staticActivities,
        selectedColor: this.selectedColor
      }

      // Render directly to canvas
      renderExportFrame(canvas, crop, this.map, animationState)

      // Convert to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png')
      })

      this.frames.push(blob)
      this.frameCount++
      return
    }

    // FALLBACK: Keep html2canvas path for now
    const fullCanvas = await html2canvas(/* ... */)
    // ... existing code
  }
}
```

**Step 2.2: Pass Required State to Recorder**

Modify `src/App.vue` to pass animation state to recorder:

```javascript
// When starting recording
this.recorder = new PNGSequenceRecorder(
  this.$refs.mapContainer,
  {
    useCanvasRendering: true,  // Enable new path
    map: this.map,             // Pass Leaflet map instance
    currentActivity: this.currentActivity,
    animationProgress: this.animationProgress,
    showStaticRoutes: this.showStaticRoutes,
    staticActivities: this.activities,
    selectedColor: this.selectedColor
  }
)

// Update state during animation
function animate() {
  // ... existing animation code

  // Update recorder state
  if (this.recorder) {
    this.recorder.updateState({
      animationProgress: this.animationProgress,
      currentActivity: this.currentActivity
    })
  }
}
```

**Success Criteria:**
- Recorder receives all necessary state
- Can toggle between canvas rendering and html2canvas
- No runtime errors when rendering first frame

### Phase 3: Coordinate Mapping Verification (Est. 1-2 hours)

**Step 3.1: Add Visual Debug Mode**

Add overlay to show projected coordinates:

```javascript
// In canvasRenderer.js
export function addDebugOverlay(canvas, coordinates, exportFrame, map) {
  const ctx = canvas.getContext('2d')

  // Draw crosshairs at each coordinate
  for (const coord of coordinates) {
    const point = latLngToExportCanvas(coord, exportFrame, map)

    // Draw crosshair
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(point.x - 5, point.y)
    ctx.lineTo(point.x + 5, point.y)
    ctx.moveTo(point.x, point.y - 5)
    ctx.lineTo(point.x, point.y + 5)
    ctx.stroke()
  }
}
```

**Step 3.2: Manual Verification Test**

1. Start animation with a known route
2. Export first frame with debug overlay
3. Compare exported canvas with live map view
4. Verify route coordinates align with expected positions

**Success Criteria:**
- Route appears in correct position within export frame
- Coordinates map accurately from lat/lng to pixels
- Export frame boundaries match visible frame overlay

### Phase 4: Full Animation Support (Est. 1-2 hours)

**Step 4.1: Progressive Route Drawing**

Implement animation progress tracking:

```javascript
// In canvasRenderer.js
export function getVisibleRouteCoordinates(coordinates, progressPercent) {
  const visibleCount = Math.floor((progressPercent / 100) * coordinates.length)
  return coordinates.slice(0, Math.max(1, visibleCount))
}
```

**Step 4.2: Static Routes Support**

Add rendering for background routes:

```javascript
export function drawStaticRoutes(ctx, activities, exportFrame, map, excludeId = null) {
  for (const activity of activities) {
    if (activity.id === excludeId) continue

    drawRoute(ctx, activity.coordinates, exportFrame, map, {
      color: '#CCCCCC',
      width: 2,
      opacity: 0.5
    })
  }
}
```

**Success Criteria:**
- Progressive route drawing works smoothly
- Static routes render in background (if enabled)
- Current position marker tracks route correctly

### Phase 5: Polish and Optimization (Est. 1 hour)

**Step 5.1: Performance Optimization**

```javascript
// Cache projection calculations if map hasn't moved
let cachedProjection = null
let cachedZoom = null
let cachedBounds = null

function getProjectionCache(map, exportFrame) {
  const currentZoom = map.getZoom()
  const currentBounds = map.getBounds().toBBoxString()

  if (cachedZoom === currentZoom && cachedBounds === currentBounds) {
    return cachedProjection
  }

  // Recalculate projection
  cachedProjection = createProjection(map, exportFrame)
  cachedZoom = currentZoom
  cachedBounds = currentBounds

  return cachedProjection
}
```

**Step 5.2: Error Handling**

```javascript
try {
  const canvas = renderExportFrame(exportFrame, map, currentActivity, state)
  const blob = await canvasToBlob(canvas)
  return blob
} catch (error) {
  log.error('Failed to render export frame:', error)
  // Fallback to html2canvas or show error to user
  throw new Error('Export frame rendering failed: ' + error.message)
}
```

**Success Criteria:**
- Rendering performance is acceptable (< 100ms per frame)
- Graceful error handling
- Clear logging for debugging

### Phase 6: Migration and Cleanup (Est. 30 min)

**Step 6.1: Remove html2canvas Fallback**

Once canvas rendering is verified working:

```javascript
// Remove conditional logic
- if (this.useCanvasRendering) {
    // Canvas rendering
- } else {
-   // html2canvas fallback
- }

// Keep only canvas rendering path
```

**Step 6.2: Remove html2canvas Dependency**

```bash
npm uninstall html2canvas
```

Update `package.json` and verify build still works.

**Step 6.3: Update Documentation**

- Update README if it mentions html2canvas
- Add comments explaining coordinate projection system
- Document any limitations (e.g., solid color background only)

**Success Criteria:**
- html2canvas completely removed
- All tests still pass
- Bundle size reduced
- Documentation updated

---

## Testing Strategy

### Unit Tests

**Coordinate Projection:**
```javascript
describe('latLngToExportCanvas', () => {
  it('maps center of map to center of export frame', () => {
    const map = createMockLeafletMap()
    const exportFrame = { left: 100, top: 100, width: 800, height: 600 }
    const center = map.getCenter()

    const result = latLngToExportCanvas(center, exportFrame, map)

    expect(result.x).toBeCloseTo(400) // width/2
    expect(result.y).toBeCloseTo(300) // height/2
  })

  it('handles points outside export frame', () => {
    // Test points that project outside canvas bounds
  })
})
```

**Route Drawing:**
```javascript
describe('drawRoute', () => {
  it('calls canvas API with correct style', () => {
    const mockCtx = createMockCanvasContext()
    const coords = [{ lat: 40.7, lng: -74.0 }, { lat: 40.8, lng: -74.1 }]

    drawRoute(mockCtx, coords, exportFrame, map, { color: '#FF0000', width: 4 })

    expect(mockCtx.strokeStyle).toBe('#FF0000')
    expect(mockCtx.lineWidth).toBe(4)
    expect(mockCtx.stroke).toHaveBeenCalled()
  })
})
```

### Integration Tests

**End-to-End Export:**
```javascript
describe('PNGSequenceRecorder with canvas rendering', () => {
  it('exports frame that matches export frame dimensions', async () => {
    const recorder = new PNGSequenceRecorder(mapElement, {
      useCanvasRendering: true,
      map: leafletMap,
      currentActivity: testActivity
    })

    await recorder.captureFrame()

    const blob = recorder.frames[0]
    const img = await loadImageFromBlob(blob)

    expect(img.width).toBe(exportFrame.width)
    expect(img.height).toBe(exportFrame.height)
  })
})
```

### Manual Testing

**Visual Verification Checklist:**

1. **Single Route Animation**
   - [ ] Route appears centered in export frame
   - [ ] Route color matches selected color
   - [ ] Progressive drawing is smooth
   - [ ] Current position marker tracks correctly

2. **Multiple Routes (Static)**
   - [ ] Background routes render in gray
   - [ ] Active route renders on top in selected color
   - [ ] No z-fighting or visual artifacts

3. **Export Frame Alignment**
   - [ ] Exported PNG matches red frame overlay exactly
   - [ ] No offset or clipping
   - [ ] Consistent across different zoom levels

4. **Edge Cases**
   - [ ] Very short routes (< 10 points)
   - [ ] Very long routes (> 10,000 points)
   - [ ] Routes crossing dateline
   - [ ] Routes at extreme latitudes

---

## Migration Strategy

### Backwards Compatibility

Keep html2canvas as fallback during migration:

```javascript
const USE_CANVAS_RENDERING = true // Feature flag

if (USE_CANVAS_RENDERING) {
  // New canvas rendering path
} else {
  // Old html2canvas path
}
```

Toggle flag to test both paths and compare results.

### Gradual Rollout

1. **Phase 1**: Implement canvas rendering, keep html2canvas
2. **Phase 2**: Test canvas rendering extensively
3. **Phase 3**: Make canvas rendering default, keep html2canvas as fallback
4. **Phase 4**: Remove html2canvas entirely

### Rollback Plan

If canvas rendering has issues:
1. Set feature flag to `false`
2. Revert to html2canvas immediately
3. Debug canvas rendering offline
4. Re-enable when fixed

---

## Benefits Summary

### Performance

**html2canvas:**
- DOM traversal and cloning: ~50-100ms per frame
- Style computation: ~20-50ms per frame
- Canvas rendering: ~30-50ms per frame
- **Total: ~100-200ms per frame**

**Direct Canvas:**
- Coordinate projection: ~5-10ms per frame
- Canvas drawing: ~10-20ms per frame
- **Total: ~15-30ms per frame**

**Expected improvement: 5-10x faster**

### Bundle Size

- html2canvas: ~120KB minified
- Direct canvas: ~5KB (our code only)
- **Savings: ~115KB**

### Maintainability

**Before:**
- Black box (html2canvas internals)
- CSS transform workarounds needed
- Debugging requires understanding html2canvas source
- Limited control over rendering

**After:**
- Full visibility into rendering pipeline
- Direct coordinate mapping (predictable)
- Easy to debug with canvas API
- Complete control over styling and optimization

### Reliability

**html2canvas issues:**
- CSS transform interpretation
- CORS complexity
- Inconsistent results across browsers
- Dependency on external library updates

**Canvas rendering:**
- Simple coordinate math (deterministic)
- CORS only needed if adding tile backgrounds
- Consistent Canvas 2D API across browsers
- Full control over implementation

---

## Potential Challenges

### Challenge 1: Coordinate Projection Edge Cases

**Issue:** Points near poles or crossing dateline may not project correctly.

**Mitigation:**
- Test with routes at extreme latitudes
- Add bounds checking in projection function
- Clip coordinates outside export frame

### Challenge 2: Map Tiles Background (Future)

**Issue:** If we want to add tile backgrounds, need to handle CORS and tile loading.

**Mitigation:**
- Start with solid color background (simple)
- Add tile rendering as separate phase
- Consider tile proxy server for CORS
- Cache loaded tiles to avoid repeated fetches

### Challenge 3: Performance with Many Static Routes

**Issue:** Drawing hundreds of background routes could be slow.

**Mitigation:**
- Implement spatial culling (only draw routes in frame)
- Pre-render static routes to offscreen canvas (cache)
- Add option to disable static routes during export

### Challenge 4: Anti-aliasing and Visual Quality

**Issue:** Canvas line rendering may look different than Leaflet's SVG.

**Mitigation:**
- Use `ctx.lineCap = 'round'` and `ctx.lineJoin = 'round'`
- Test different line widths
- Consider using higher resolution canvas and downsampling

---

## Success Metrics

### Primary Goal: Export Frame Alignment

**Before:** Content offset and clipped ❌
**After:** Content matches export frame exactly ✅

**Verification:**
1. Place export frame over specific map features
2. Export first frame
3. Overlay exported PNG on original view
4. Confirm pixel-perfect alignment

### Secondary Goals

1. **Performance**: Frame capture < 30ms (target 60fps)
2. **Bundle Size**: Remove 115KB from bundle
3. **Code Quality**: 100% test coverage on coordinate projection
4. **Reliability**: Zero coordinate mapping bugs in production

---

## Timeline Estimate

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| Phase 1 | Core infrastructure + tests | 2-3 hours |
| Phase 2 | Integration with recorder | 1-2 hours |
| Phase 3 | Coordinate verification | 1-2 hours |
| Phase 4 | Full animation support | 1-2 hours |
| Phase 5 | Polish and optimization | 1 hour |
| Phase 6 | Migration and cleanup | 30 minutes |
| **Total** | | **7-11 hours** |

With testing and debugging buffer: **1-2 days of development**

---

## Next Steps

1. **Get approval on this plan** from stakeholder (you!)
2. **Create feature branch**: `git checkout -b feature/canvas-rendering`
3. **Implement Phase 1**: Core infrastructure
4. **Test coordinate projection** with visual debug mode
5. **Iterate** based on results

---

## Questions for Consideration

1. **Background preference**: Solid color or attempt tile rendering?
   - Recommendation: Start with solid color, add tiles later if needed

2. **Static routes**: Always render or make optional?
   - Recommendation: Keep existing "show static routes" toggle

3. **Export quality**: Standard resolution or add 2x/4x option?
   - Recommendation: Start with 1x, can add later

4. **Fallback strategy**: Keep html2canvas temporarily or remove immediately?
   - Recommendation: Keep as feature flag initially, remove after verification

---

**Status:** Ready for implementation pending approval
