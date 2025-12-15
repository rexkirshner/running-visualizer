/**
 * Data loading utilities for running visualization
 * Loads and parses activities.csv and GPX files
 */

import { GPX_BATCH_SIZE } from './constants.js'
import { createLogger } from './logger.js'

const log = createLogger('DataLoader')

/**
 * Strip BOM (Byte Order Mark) from string if present
 * Common in files exported from Excel and other tools
 * @param {string} str - String that may have BOM
 * @returns {string} String without BOM
 */
export function stripBOM(str) {
  // UTF-8 BOM: EF BB BF (U+FEFF)
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1)
  }
  return str
}

/**
 * Load and parse the activities CSV file
 * @returns {Promise<Array>} Array of activity objects with metadata
 */
export async function loadActivitiesCSV() {
  const response = await fetch('/data/activities.csv')
  let csvText = await response.text()

  // Strip BOM if present (common in Excel exports)
  csvText = stripBOM(csvText)

  const lines = csvText.split('\n')
  const headers = parseCSVLine(lines[0]) // Parse headers properly too

  const activities = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    // Basic CSV parsing (handles quoted fields)
    const values = parseCSVLine(lines[i])

    const activity = {}
    headers.forEach((header, index) => {
      activity[header] = values[index] || ''
    })

    // Filter for running activities only
    if (activity['Activity Type'] === 'Run' && activity['Filename']) {
      activities.push({
        id: activity['Activity ID'],
        date: activity['Activity Date'],
        name: activity['Activity Name'],
        distance: parseFloat(activity['Distance']) || 0,
        filename: activity['Filename']
      })
    }
  }

  return activities
}

/**
 * Parse a CSV line handling quoted fields and escaped quotes
 *
 * Handles RFC 4180 CSV format:
 * - Fields may be enclosed in double quotes
 * - Double quotes within quoted fields are escaped as ""
 * - Commas within quoted fields are literal
 *
 * LIMITATION: Multi-line fields (newlines within quotes) are not supported
 * as lines are pre-split. This is acceptable for Strava export data.
 *
 * @param {string} line - CSV line to parse
 * @returns {Array<string>} Array of field values
 */
export function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        // Check if this is an escaped quote ("") or end of quoted field
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote - add single quote to result and skip both chars
          current += '"'
          i += 2
          continue
        } else {
          // End of quoted field
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true
      } else if (char === ',') {
        // Field separator
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    i++
  }

  // Add the last field
  result.push(current.trim())
  return result
}

/**
 * Load and parse the activities-location CSV file
 * Contains location metadata (city, state, country) and treadmill flag for each activity
 * @returns {Promise<Map>} Map of activity ID to location object
 */
export async function loadLocationsCSV() {
  const response = await fetch('/data/activities-location.csv')
  let csvText = await response.text()

  // Strip BOM if present (common in Excel exports)
  csvText = stripBOM(csvText)

  const lines = csvText.split('\n')
  const locations = new Map()

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    const values = parseCSVLine(lines[i])

    // CSV structure: id,Month,Day,Year,Location,State,Country,International,Treadmill
    const id = values[0]
    const location = values[4] || ''
    const state = values[5] || ''
    const country = values[6] || ''
    const international = values[7] || ''
    const treadmill = values[8] === 'TRUE'

    locations.set(id, {
      location,
      state,
      country,
      international,
      treadmill
    })
  }

  log.debug(`Loaded location data for ${locations.size} activities`)
  return locations
}

/**
 * Merge activity data with location metadata
 * @param {Array} activities - Array of activity objects from activities.csv
 * @param {Map} locations - Map of location data by activity ID
 * @returns {Array} Activities with location data merged in
 */
export function mergeActivityData(activities, locations) {
  return activities.map(activity => {
    const locationData = locations.get(activity.id) || {
      location: 'Unknown',
      state: 'Unknown',
      country: 'Unknown',
      international: 'Unknown',
      treadmill: false
    }

    return {
      ...activity,
      ...locationData
    }
  })
}

/**
 * Result from loading a GPX file
 * @typedef {Object} GPXLoadResult
 * @property {Array<Array<number>>} coordinates - Array of [lat, lon] coordinates
 * @property {string|null} error - Error message if load failed, null on success
 */

/**
 * Load and parse a single GPX file
 * @param {string} filename - Filename from CSV (e.g., "activities/123456.gpx")
 * @returns {Promise<GPXLoadResult>} Result with coordinates and optional error
 */
export async function loadGPXFile(filename) {
  try {
    const response = await fetch(`/data/${filename}`)

    if (!response.ok) {
      return {
        coordinates: [],
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const gpxText = await response.text()
    const coordinates = parseGPX(gpxText)

    if (coordinates.length === 0) {
      return {
        coordinates: [],
        error: 'No valid GPS coordinates found in file'
      }
    }

    return { coordinates, error: null }
  } catch (error) {
    log.error(`Failed to load GPX file: ${filename}`, error)
    return {
      coordinates: [],
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Parse GPX XML and extract coordinates
 * @param {string} gpxXML - GPX file content as XML string
 * @returns {Array} Array of [lat, lon] coordinate pairs
 */
export function parseGPX(gpxXML) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(gpxXML, 'text/xml')

  const trackPoints = doc.getElementsByTagName('trkpt')
  const coordinates = []

  for (let i = 0; i < trackPoints.length; i++) {
    const lat = parseFloat(trackPoints[i].getAttribute('lat'))
    const lon = parseFloat(trackPoints[i].getAttribute('lon'))

    if (!isNaN(lat) && !isNaN(lon)) {
      coordinates.push([lat, lon])
    }
  }

  return coordinates
}

/**
 * Load metadata only (no GPX files) for setup/filtering
 * Returns merged activity + location data without coordinates
 * @returns {Promise<Array>} Array of activity metadata
 */
export async function loadMetadataOnly() {
  log.debug('Loading activities CSV...')
  const activities = await loadActivitiesCSV()
  log.info(`Found ${activities.length} running activities`)

  log.debug('Loading location data...')
  const locations = await loadLocationsCSV()

  log.debug('Merging activity and location data...')
  const mergedActivities = mergeActivityData(activities, locations)

  // Filter out treadmill runs (they have no meaningful GPS data)
  const outdoorActivities = mergedActivities.filter(activity => !activity.treadmill)
  log.info(`Found ${outdoorActivities.length} outdoor runs (${mergedActivities.length - outdoorActivities.length} treadmill runs excluded)`)

  return outdoorActivities
}

/**
 * Parse activity date string to Date object
 * @param {string} dateStr - Date string from CSV (e.g., "Mar 24, 2017, 5:42:11 PM")
 * @returns {Date} Parsed date
 */
function parseActivityDate(dateStr) {
  return new Date(dateStr)
}

/**
 * Filter activities by date range and location
 * @param {Array} activities - Array of activity metadata
 * @param {Object} filters - Filter criteria
 * @param {string} filters.startDate - Start date (YYYY-MM-DD) or empty
 * @param {string} filters.endDate - End date (YYYY-MM-DD) or empty
 * @param {string} filters.city - City filter or empty
 * @param {string} filters.state - State filter or empty
 * @param {string} filters.country - Country filter or empty
 * @returns {Array} Filtered activities
 */
export function filterActivities(activities, filters = {}) {
  return activities.filter(activity => {
    // Date range filter
    if (filters.startDate || filters.endDate) {
      const activityDate = parseActivityDate(activity.date)

      if (filters.startDate) {
        const start = new Date(filters.startDate)
        start.setHours(0, 0, 0, 0)
        if (activityDate < start) return false
      }

      if (filters.endDate) {
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        if (activityDate > end) return false
      }
    }

    // Location filters
    if (filters.city && activity.location !== filters.city) {
      return false
    }

    if (filters.state && activity.state !== filters.state) {
      return false
    }

    if (filters.country && activity.country !== filters.country) {
      return false
    }

    return true
  })
}

/**
 * Failed GPX load information
 * @typedef {Object} FailedLoad
 * @property {string} id - Activity ID
 * @property {string} name - Activity name
 * @property {string} date - Activity date
 * @property {string} filename - GPX filename
 * @property {string} error - Error message
 */

/**
 * Result from loading GPX files
 * @typedef {Object} GPXLoadBatchResult
 * @property {Array} runs - Successfully loaded runs with coordinates
 * @property {Array<FailedLoad>} failed - Array of failed load information
 */

/**
 * Load GPX data for a filtered set of activities
 * @param {Array} activities - Array of activity metadata (already filtered)
 * @param {Function} onProgress - Optional callback for progress updates (loaded, total)
 * @returns {Promise<GPXLoadBatchResult>} Result with runs and failed loads
 */
export async function loadGPXForActivities(activities, onProgress = null) {
  log.info(`Loading GPX files for ${activities.length} activities...`)
  const runs = []
  const failed = []

  // Load GPX files in batches to avoid overwhelming the browser
  for (let i = 0; i < activities.length; i += GPX_BATCH_SIZE) {
    const batch = activities.slice(i, i + GPX_BATCH_SIZE)

    const batchPromises = batch.map(async (activity) => {
      const result = await loadGPXFile(activity.filename)
      return {
        activity,
        result
      }
    })

    const batchResults = await Promise.all(batchPromises)

    for (const { activity, result } of batchResults) {
      if (result.error) {
        failed.push({
          id: activity.id,
          name: activity.name,
          date: activity.date,
          filename: activity.filename,
          error: result.error
        })
      } else {
        runs.push({
          ...activity,
          coordinates: result.coordinates
        })
      }
    }

    // Report progress
    if (onProgress) {
      onProgress(runs.length + failed.length, activities.length)
    }

    log.debug(`Processed ${runs.length + failed.length} / ${activities.length} runs (${failed.length} failed)`)
  }

  if (failed.length > 0) {
    log.warn(`Failed to load ${failed.length} GPX files`)
  }
  log.info(`Successfully loaded ${runs.length} runs with GPS data`)

  return { runs, failed }
}

/**
 * Load all running activities with their GPX data and location metadata
 * Excludes treadmill runs (no GPS data)
 * @param {Function} onProgress - Optional callback for progress updates (loaded, total)
 * @param {Object} filters - Optional filter criteria
 * @returns {Promise<GPXLoadBatchResult>} Result with runs array and failed loads array
 */
export async function loadAllRuns(onProgress = null, filters = null) {
  // Load metadata first
  const allActivities = await loadMetadataOnly()

  // Apply filters if provided
  const activitiesToLoad = filters
    ? filterActivities(allActivities, filters)
    : allActivities

  log.info(`Loading ${activitiesToLoad.length} of ${allActivities.length} activities after filtering`)

  // Load GPX files for filtered activities
  return loadGPXForActivities(activitiesToLoad, onProgress)
}
