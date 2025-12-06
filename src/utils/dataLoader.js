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
 * Load all running activities with their GPX data
 * @returns {Promise<Array>} Array of runs with coordinates
 */
export async function loadAllRuns() {
  console.log('Loading activities CSV...')
  const activities = await loadActivitiesCSV()
  console.log(`Found ${activities.length} running activities`)

  console.log('Loading GPX files...')
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

    console.log(`Loaded ${runs.length} / ${activities.length} runs`)
  }

  // Filter out runs with no coordinates
  const validRuns = runs.filter(run => run.coordinates.length > 0)
  console.log(`Successfully loaded ${validRuns.length} runs with GPS data`)

  return validRuns
}
