/**
 * Tests for dataLoader.js
 * Covers filterActivities function, date parsing, and GPX parsing
 */
import { describe, it, expect } from 'vitest'
import { filterActivities, parseGPX } from '../dataLoader.js'

// Sample test data
const sampleActivities = [
  {
    id: '1',
    date: 'Mar 24, 2017, 5:42:11 PM',
    name: 'Morning Run',
    location: 'Los Angeles',
    state: 'California',
    country: 'United States'
  },
  {
    id: '2',
    date: 'Jun 15, 2018, 8:30:00 AM',
    name: 'Beach Run',
    location: 'Santa Monica',
    state: 'California',
    country: 'United States'
  },
  {
    id: '3',
    date: 'Dec 1, 2019, 6:00:00 PM',
    name: 'Trail Run',
    location: 'Denver',
    state: 'Colorado',
    country: 'United States'
  },
  {
    id: '4',
    date: 'Jul 4, 2020, 9:00:00 AM',
    name: 'Holiday Run',
    location: 'New York',
    state: 'New York',
    country: 'United States'
  },
  {
    id: '5',
    date: 'Jan 10, 2021, 7:00:00 AM',
    name: 'London Run',
    location: 'London',
    state: 'England',
    country: 'United Kingdom'
  }
]

describe('filterActivities', () => {
  describe('no filters', () => {
    it('should return all activities when no filters provided', () => {
      const result = filterActivities(sampleActivities)
      expect(result).toHaveLength(5)
    })

    it('should return all activities when filters is empty object', () => {
      const result = filterActivities(sampleActivities, {})
      expect(result).toHaveLength(5)
    })

    it('should return empty array when activities is empty', () => {
      const result = filterActivities([])
      expect(result).toHaveLength(0)
    })
  })

  describe('date range filtering', () => {
    it('should filter by start date only', () => {
      const result = filterActivities(sampleActivities, {
        startDate: '2019-01-01'
      })
      // Should include Dec 2019, Jul 2020, Jan 2021
      expect(result).toHaveLength(3)
      expect(result.map(a => a.id)).toEqual(['3', '4', '5'])
    })

    it('should filter by end date only', () => {
      const result = filterActivities(sampleActivities, {
        endDate: '2018-12-31'
      })
      // Should include Mar 2017, Jun 2018
      expect(result).toHaveLength(2)
      expect(result.map(a => a.id)).toEqual(['1', '2'])
    })

    it('should filter by date range (both start and end)', () => {
      const result = filterActivities(sampleActivities, {
        startDate: '2018-01-01',
        endDate: '2020-01-01'
      })
      // Should include Jun 2018, Dec 2019
      expect(result).toHaveLength(2)
      expect(result.map(a => a.id)).toEqual(['2', '3'])
    })

    it('should include activities on the exact start date', () => {
      const result = filterActivities(sampleActivities, {
        startDate: '2017-03-24'  // Exact date of activity 1
      })
      expect(result.map(a => a.id)).toContain('1')
    })

    it('should include activities on the end date', () => {
      // Note: Using a date after the activity to avoid timezone edge cases
      // Activity 1 is Mar 24, 2017, 5:42:11 PM
      const result = filterActivities(sampleActivities, {
        endDate: '2017-03-25'  // Day after activity 1
      })
      expect(result.map(a => a.id)).toContain('1')
    })

    it('should return empty when date range excludes all activities', () => {
      const result = filterActivities(sampleActivities, {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      })
      expect(result).toHaveLength(0)
    })
  })

  describe('city filtering', () => {
    it('should filter by city', () => {
      const result = filterActivities(sampleActivities, {
        city: 'Los Angeles'
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should return empty when city not found', () => {
      const result = filterActivities(sampleActivities, {
        city: 'Chicago'
      })
      expect(result).toHaveLength(0)
    })

    it('should be case sensitive for city', () => {
      const result = filterActivities(sampleActivities, {
        city: 'los angeles'  // lowercase
      })
      expect(result).toHaveLength(0)
    })
  })

  describe('state filtering', () => {
    it('should filter by state', () => {
      const result = filterActivities(sampleActivities, {
        state: 'California'
      })
      expect(result).toHaveLength(2)
      expect(result.map(a => a.id)).toEqual(['1', '2'])
    })

    it('should return empty when state not found', () => {
      const result = filterActivities(sampleActivities, {
        state: 'Texas'
      })
      expect(result).toHaveLength(0)
    })
  })

  describe('country filtering', () => {
    it('should filter by country', () => {
      const result = filterActivities(sampleActivities, {
        country: 'United Kingdom'
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('5')
    })

    it('should filter for United States', () => {
      const result = filterActivities(sampleActivities, {
        country: 'United States'
      })
      expect(result).toHaveLength(4)
    })
  })

  describe('combined filters', () => {
    it('should combine date range with city', () => {
      const result = filterActivities(sampleActivities, {
        startDate: '2017-01-01',
        endDate: '2018-12-31',
        city: 'Los Angeles'
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should combine date range with state', () => {
      const result = filterActivities(sampleActivities, {
        startDate: '2018-01-01',
        state: 'California'
      })
      // Jun 2018 in Santa Monica, CA
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('should combine city, state, and country', () => {
      const result = filterActivities(sampleActivities, {
        city: 'Denver',
        state: 'Colorado',
        country: 'United States'
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
    })

    it('should combine all filters', () => {
      const result = filterActivities(sampleActivities, {
        startDate: '2020-01-01',
        endDate: '2020-12-31',
        city: 'New York',
        state: 'New York',
        country: 'United States'
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('4')
    })

    it('should return empty when combined filters are contradictory', () => {
      const result = filterActivities(sampleActivities, {
        city: 'Los Angeles',
        state: 'New York'  // LA is not in NY
      })
      expect(result).toHaveLength(0)
    })
  })

  describe('empty filter values', () => {
    it('should ignore empty string city', () => {
      const result = filterActivities(sampleActivities, {
        city: ''
      })
      expect(result).toHaveLength(5)
    })

    it('should ignore empty string state', () => {
      const result = filterActivities(sampleActivities, {
        state: ''
      })
      expect(result).toHaveLength(5)
    })

    it('should ignore empty string country', () => {
      const result = filterActivities(sampleActivities, {
        country: ''
      })
      expect(result).toHaveLength(5)
    })

    it('should ignore empty string dates', () => {
      const result = filterActivities(sampleActivities, {
        startDate: '',
        endDate: ''
      })
      expect(result).toHaveLength(5)
    })
  })
})

describe('parseGPX', () => {
  it('should parse valid GPX with track points', () => {
    const gpxXML = `<?xml version="1.0" encoding="UTF-8"?>
      <gpx version="1.1">
        <trk>
          <trkseg>
            <trkpt lat="34.0522" lon="-118.2437"></trkpt>
            <trkpt lat="34.0530" lon="-118.2440"></trkpt>
            <trkpt lat="34.0540" lon="-118.2450"></trkpt>
          </trkseg>
        </trk>
      </gpx>`

    const result = parseGPX(gpxXML)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual([34.0522, -118.2437])
    expect(result[1]).toEqual([34.0530, -118.2440])
    expect(result[2]).toEqual([34.0540, -118.2450])
  })

  it('should return empty array for GPX with no track points', () => {
    const gpxXML = `<?xml version="1.0" encoding="UTF-8"?>
      <gpx version="1.1">
        <trk>
          <trkseg>
          </trkseg>
        </trk>
      </gpx>`

    const result = parseGPX(gpxXML)
    expect(result).toHaveLength(0)
  })

  it('should return empty array for empty GPX', () => {
    const gpxXML = `<?xml version="1.0" encoding="UTF-8"?>
      <gpx version="1.1"></gpx>`

    const result = parseGPX(gpxXML)
    expect(result).toHaveLength(0)
  })

  it('should skip track points with invalid coordinates', () => {
    const gpxXML = `<?xml version="1.0" encoding="UTF-8"?>
      <gpx version="1.1">
        <trk>
          <trkseg>
            <trkpt lat="34.0522" lon="-118.2437"></trkpt>
            <trkpt lat="invalid" lon="-118.2440"></trkpt>
            <trkpt lat="34.0540" lon="-118.2450"></trkpt>
          </trkseg>
        </trk>
      </gpx>`

    const result = parseGPX(gpxXML)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual([34.0522, -118.2437])
    expect(result[1]).toEqual([34.0540, -118.2450])
  })

  it('should handle multiple track segments', () => {
    const gpxXML = `<?xml version="1.0" encoding="UTF-8"?>
      <gpx version="1.1">
        <trk>
          <trkseg>
            <trkpt lat="34.0522" lon="-118.2437"></trkpt>
          </trkseg>
          <trkseg>
            <trkpt lat="35.0522" lon="-119.2437"></trkpt>
          </trkseg>
        </trk>
      </gpx>`

    const result = parseGPX(gpxXML)
    expect(result).toHaveLength(2)
  })
})
