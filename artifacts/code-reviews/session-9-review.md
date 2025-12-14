# Code Review - Session 9 | 2025-12-13

## Overview

**Project:** Running Visualizer
**Tech Stack:** Vue 3, Vite, Leaflet, JavaScript, html2canvas, JSZip, ffmpeg.wasm
**Files Reviewed:** 12 source files (~3,200 lines)
**Reviewer:** Claude Code
**Scope:** Comprehensive code quality audit - architecture, performance, security, maintainability

---

## Executive Summary

The Running Visualizer is a well-structured Vue 3 application for visualizing GPS running data on an interactive map with animation and export capabilities. The codebase demonstrates good separation of concerns with modular components and utility functions. However, there are several areas for improvement, particularly around error handling, memory management, and the complex export capture logic.

### Quality Score: 7/10

**Strengths:**
- Clean Vue 3 Composition API usage
- Good component modularity
- Comprehensive JSDoc documentation in utilities
- Effective use of computed properties for filtering

**Areas for Improvement:**
- Error handling needs strengthening
- Memory management concerns in recording
- Complex export capture logic is fragile
- Missing TypeScript for better type safety

---

## Issues by Severity

### Critical (0)

No critical issues found.

---

### High Severity (3)

#### H1. Memory Leak Risk in PNG Recording
**Location:** `src/utils/videoExport.js:348-494`
**Issue:** PNG frames are stored as Blobs in memory during recording. For long recordings at high resolution (4K, 60fps, 10s = 600 frames), this could consume several GB of RAM and crash the browser.

**Current Code:**
```javascript
this.frames = []
// ... in captureFrame()
this.frames.push(blob)
```

**Impact:** Browser crash during long/high-res recordings
**Recommendation:** Implement streaming to IndexedDB or use a chunked approach that writes to disk periodically.

---

#### H2. Unprotected fitBounds Calls Can Still Cause View Shifts
**Location:** `src/App.vue:703-709`
**Issue:** While `renderRuns()` now checks `isRecording`, the `handlePlayAll()` function at line 703 also calls `fitBounds` without proper coordination with recording state changes.

**Current Code:**
```javascript
// Fit map to all filtered runs before starting (unless recording - user positioned view manually)
if (!isRecording.value) {
  const allCoordinates = filteredRuns.value.flatMap(run => run.coordinates || [])
  // ...
  map.fitBounds(bounds, { padding: [50, 50] })
}
```

**Issue:** Race condition - if recording starts just after this check, the fitBounds still executes.
**Recommendation:** Use a mutex or recording lock that prevents any viewport changes once recording begins.

---

#### H3. html2canvas Capture Relies on Fragile DOM Queries
**Location:** `src/utils/videoExport.js:406-424`
**Issue:** The capture logic queries `.export-frame-overlay` by class selector. If the overlay is hidden during recording (via `v-if="!isRecording"`), the selector returns null and falls back to calculated dimensions which may not match.

**Current Code (App.vue:15):**
```html
<div
  v-if="showExportFrame && !isRecording"  <!-- Hidden during recording! -->
  class="export-frame-overlay"
```

**Current Code (videoExport.js:406):**
```javascript
const exportFrameOverlay = document.querySelector('.export-frame-overlay')
// Will be null during recording because v-if removes it
```

**Impact:** Export dimensions use fallback calculation which may differ from the preview
**Recommendation:** Store the export frame dimensions in state before hiding, or use a data attribute approach.

---

### Medium Severity (6)

#### M1. No Error Handling for Failed GPX Loads
**Location:** `src/utils/dataLoader.js:138-147`
**Issue:** Failed GPX file loads return empty array silently. Users have no visibility into which runs failed to load.

**Current Code:**
```javascript
export async function loadGPXFile(filename) {
  try {
    const response = await fetch(`/data/${filename}`)
    const gpxText = await response.text()
    return parseGPX(gpxText)
  } catch (error) {
    console.error(`Failed to load GPX file: ${filename}`, error)
    return []  // Silent failure
  }
}
```

**Recommendation:** Return error information and display a summary of failed loads to the user.

---

#### M2. CSV Parsing Doesn't Handle Edge Cases
**Location:** `src/utils/dataLoader.js:50-70`
**Issue:** The CSV parser doesn't handle:
- Escaped quotes (`""` for literal quotes)
- Newlines within quoted fields
- BOM characters in UTF-8 files

**Recommendation:** Consider using a robust CSV parsing library like PapaParse.

---

#### M3. Async Animation Functions Are Not Cancellable
**Location:** `src/App.vue:755-857, 864-971`
**Issue:** The `animateAllRuns()` and `animateRun()` async functions use `await` for frame capture but don't have clean cancellation. The `stopRequested` flag is checked, but if the await is blocked, cleanup may be delayed.

**Recommendation:** Implement AbortController pattern for cleaner async cancellation.

---

#### M4. Redundant Filter Logic Duplication
**Location:** `src/App.vue:236-270` and `src/utils/dataLoader.js:216-250`
**Issue:** Filter logic is duplicated between App.vue's `filteredRuns` computed property and dataLoader's `filterActivities` function.

**Recommendation:** Use a single source of truth for filtering logic. Either use only the dataLoader function or only the computed property.

---

#### M5. No Loading State During Recording
**Location:** `src/App.vue:531-561`
**Issue:** When starting recording, there's no indication to the user that initialization is happening. The `await pngRecorder.start()` could take time.

**Recommendation:** Add a loading/initializing state before recording begins.

---

#### M6. Tile Layer Attribution Not Properly Escaped
**Location:** `src/App.vue:418-440`
**Issue:** Tile layer attributions contain raw HTML. While these are hardcoded and trusted, this pattern could be problematic if attributions ever came from external sources.

**Recommendation:** Document this as a security consideration in comments.

---

### Low Severity (8)

#### L1. Magic Numbers Throughout
**Location:** Multiple files
**Examples:**
- `padding: [50, 50]` for fitBounds (App.vue:341, 707, 944)
- `batchSize = 50` for GPX loading (dataLoader.js:263)
- `min="1" max="60"` for duration (AnimationControls.vue:35-36)

**Recommendation:** Extract to named constants for clarity and maintainability.

---

#### L2. Inconsistent Event Handler Naming
**Location:** Multiple components
**Issue:** Some handlers use `handle*` prefix, others use `update*`, and emits use `update:*` or bare names.

**Examples:**
- `handleRunChange` vs `updateStartDate`
- `@update:selectedCity` vs `@reset`

**Recommendation:** Standardize naming conventions across all components.

---

#### L3. Missing Default Values in Props
**Location:** `src/components/DateRangeFilter.vue:33-36`
**Issue:** Props don't have default values, which could cause issues if parent forgets to pass them.

**Current Code:**
```javascript
const props = defineProps({
  startDate: String,
  endDate: String
})
```

**Recommendation:** Add `default: ''` to props.

---

#### L4. Console.log Statements in Production Code
**Location:** Multiple files (dataLoader.js, videoExport.js, App.vue)
**Issue:** Extensive console.log statements that should be removed or replaced with a proper logging system for production.

**Recommendation:** Implement a debug logging utility that can be disabled in production.

---

#### L5. CSS Z-Index Management
**Location:** Multiple components
**Issue:** Multiple components use `z-index: 1000` which could cause layering conflicts.

**Files affected:**
- DateRangeFilter.vue:63
- LocationFilter.vue:133
- AnimationControls.vue:367
- App.vue:1075

**Recommendation:** Create a z-index scale in a shared CSS file.

---

#### L6. No Input Validation for Export Settings
**Location:** `src/utils/videoExport.js:339-346`
**Issue:** Constructor accepts options without validation. Invalid dimensions could cause issues.

**Recommendation:** Add validation for width/height/frameRate parameters.

---

#### L7. Potential Stale Closure in Animation Loop
**Location:** `src/App.vue:839-843`
**Issue:** The setTimeout callback captures `animateAllRuns` reference which could be stale.

**Current Code:**
```javascript
setTimeout(() => requestAnimationFrame(animateAllRuns), 0)
```

**Recommendation:** This works due to hoisting but is unclear. Consider using a stable reference.

---

#### L8. Unused CSS Class
**Location:** `src/App.vue:1019-1022`
**Issue:** The `.recording-mode` CSS class exists but is no longer applied (was removed as a fix).

**Current Code:**
```css
/* Hide UI elements during recording */
#map.recording-mode :deep(.leaflet-control-container) {
  display: none !important;
}
```

**Recommendation:** Remove dead CSS or document why it's kept.

---

## Architecture Observations

### Positive Patterns

1. **Clean Component Structure:** Components are focused and have single responsibilities.

2. **Effective Use of Computed Properties:** `filteredRuns`, `uniqueCities`, `exportFrameStyle` are well-designed.

3. **Good Separation of Concerns:** Utilities (dataLoader, videoExport, runnerDot) are cleanly separated from UI logic.

4. **JSDoc Documentation:** Utility functions have comprehensive JSDoc comments.

### Areas for Improvement

1. **State Management:** As the app grows, consider Pinia for state management. Currently, App.vue has 30+ refs which is getting unwieldy.

2. **Export Logic Complexity:** The videoExport.js file handles too many concerns. Consider splitting:
   - Frame capture strategy
   - Recording state machine
   - Output packaging (ZIP)
   - Video conversion (ffmpeg)

3. **Testing:** No test files present. The data loading and filtering logic would benefit from unit tests.

---

## Performance Observations

### Memory
- PNG frames stored in memory could cause issues (see H1)
- Polylines are properly cleaned up in animation loops
- Runner dots are properly managed

### Rendering
- Good use of requestAnimationFrame for animation
- html2canvas is inherently slow (~100-200ms per frame)
- Batch loading of GPX files is well-implemented

### Recommendations
1. Consider lazy-loading GPX files only when needed for animation
2. Implement virtual scrolling for run selector if list gets long
3. Profile html2canvas capture time and consider alternatives

---

## Security Observations

### Low Risk
- No user input is executed as code
- All data comes from local files
- No authentication required

### Considerations
1. External CDN usage for ffmpeg-core (unpkg.com) - acceptable for dev but consider self-hosting for production
2. CORS is enabled for html2canvas but only for local tile services
3. File downloads are handled safely via blob URLs

---

## Recommendations Summary

### Priority 1 (Address Soon)
1. Fix export frame dimension capture (H3) - currently broken
2. Add export frame state persistence before recording starts
3. Implement memory management for long recordings (H1)

### Priority 2 (Address When Possible)
4. Add error reporting for failed GPX loads (M1)
5. Remove duplicate filter logic (M4)
6. Add recording initialization state (M5)

### Priority 3 (Technical Debt)
7. Extract magic numbers to constants (L1)
8. Standardize event handler naming (L2)
9. Remove console.log statements or add logging utility (L4)
10. Clean up unused CSS (L8)

---

## Files Reviewed

| File | Lines | Issues |
|------|-------|--------|
| src/App.vue | 1111 | H2, M4, L1, L5, L7, L8 |
| src/utils/videoExport.js | 664 | H1, H3, L4, L6 |
| src/utils/dataLoader.js | 314 | M1, M2, M4, L1, L4 |
| src/utils/runnerDot.js | 146 | - |
| src/components/AnimationControls.vue | 752 | L1, L2, L5 |
| src/components/SetupPage.vue | 423 | L4 |
| src/components/DateRangeFilter.vue | 134 | L3, L5 |
| src/components/LocationFilter.vue | 206 | L5 |
| src/components/MapTypeSelector.vue | ~100 | - |
| src/components/RouteColorSelector.vue | ~100 | - |
| src/main.js | ~20 | - |
| package.json | 24 | - |

---

## Conclusion

The Running Visualizer codebase is well-structured for its size and purpose. The main areas requiring attention are:

1. **The export capture system needs architectural rework** - The current approach of querying DOM elements that may not exist during recording is fundamentally flawed.

2. **Memory management for recording** - Long recordings at high resolution will exhaust browser memory.

3. **Error handling is inconsistent** - Some failures are silent, others logged, none surfaced to users.

The codebase is maintainable and the Vue 3 patterns are used correctly. With the fixes above, this would be a solid 8.5/10.

---

**Review completed:** 2025-12-13
**Next steps:** Create TodoWrite tasks from Priority 1 items
