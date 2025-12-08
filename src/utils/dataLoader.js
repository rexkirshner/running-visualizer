/**
 * Data loading utilities for running visualization
 * Loads and parses activities.csv and GPX files
 */

/**
 * Load and parse the activities CSV file
 * @returns {Promise<Array>} Array of activity objects with metadata
 */
export async function loadActivitiesCSV() {
  const response = await fetch('/data/activities.csv')
  const csvText = await response.text()

  const lines = csvText.split('\n')
  const headers = lines[0].split(',')

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
 * Parse a CSV line handling quoted fields
 * @param {string} line - CSV line to parse
 * @returns {Array<string>} Array of field values
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

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
  const csvText = await response.text()

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

  console.log(`Loaded location data for ${locations.size} activities`)
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
 * Load and parse a single GPX file
 * @param {string} filename - Filename from CSV (e.g., "activities/123456.gpx")
 * @returns {Promise<Array>} Array of [lat, lon] coordinates
 */
export async function loadGPXFile(filename) {
  try {
    const response = await fetch(`/data/${filename}`)
    const gpxText = await response.text()
    return parseGPX(gpxText)
  } catch (error) {
    console.error(`Failed to load GPX file: ${filename}`, error)
    return []
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
  console.log('Loading activities CSV...')
  const activities = await loadActivitiesCSV()
  console.log(`Found ${activities.length} running activities`)

  console.log('Loading location data...')
  const locations = await loadLocationsCSV()

  console.log('Merging activity and location data...')
  const mergedActivities = mergeActivityData(activities, locations)

  // Filter out treadmill runs (they have no meaningful GPS data)
  const outdoorActivities = mergedActivities.filter(activity => !activity.treadmill)
  console.log(`Found ${outdoorActivities.length} outdoor runs (${mergedActivities.length - outdoorActivities.length} treadmill runs excluded)`)

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
 * Load GPX data for a filtered set of activities
 * @param {Array} activities - Array of activity metadata (already filtered)
 * @param {Function} onProgress - Optional callback for progress updates (loaded, total)
 * @returns {Promise<Array>} Array of runs with coordinates
 */
export async function loadGPXForActivities(activities, onProgress = null) {
  console.log(`Loading GPX files for ${activities.length} activities...`)
  const runs = []

  // Load GPX files in batches to avoid overwhelming the browser
  const batchSize = 50
  for (let i = 0; i < activities.length; i += batchSize) {
    const batch = activities.slice(i, i + batchSize)

    const batchPromises = batch.map(async (activity) => {
      const coordinates = await loadGPXFile(activity.filename)
      return {
        ...activity,
        coordinates
      }
    })

    const batchResults = await Promise.all(batchPromises)
    runs.push(...batchResults)

    // Report progress
    if (onProgress) {
      onProgress(runs.length, activities.length)
    }

    console.log(`Loaded ${runs.length} / ${activities.length} runs`)
  }

  // Filter out runs with no coordinates
  const validRuns = runs.filter(run => run.coordinates.length > 0)
  console.log(`Successfully loaded ${validRuns.length} runs with GPS data`)

  return validRuns
}

/**
 * Load all running activities with their GPX data and location metadata
 * Excludes treadmill runs (no GPS data)
 * @param {Function} onProgress - Optional callback for progress updates (loaded, total)
 * @param {Object} filters - Optional filter criteria
 * @returns {Promise<Array>} Array of runs with coordinates and location data
 */
export async function loadAllRuns(onProgress = null, filters = null) {
  // Load metadata first
  const allActivities = await loadMetadataOnly()

  // Apply filters if provided
  const activitiesToLoad = filters
    ? filterActivities(allActivities, filters)
    : allActivities

  console.log(`Loading ${activitiesToLoad.length} of ${allActivities.length} activities after filtering`)

  // Load GPX files for filtered activities
  return loadGPXForActivities(activitiesToLoad, onProgress)
}
