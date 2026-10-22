import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  clearClimateCache,
  describeCondition,
  getClimateNormals,
  latestCompleteYear,
  mean,
} from './live-climate'
import { RealWeatherProvider } from './real-weather-provider'

function mockOpenMeteo(opts: { geocode?: boolean; archive?: boolean } = {}) {
  const { geocode = true, archive = true } = opts
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('geocoding-api')) {
      return Response.json(geocode ? { results: [{ latitude: 41.39, longitude: 2.16 }] } : {})
    }
    if (!archive) return new Response('down', { status: 503 })
    return Response.json({
      daily: {
        temperature_2m_mean: [24, 26, 28],
        precipitation_sum: [0, 3, 0],
        wind_speed_10m_mean: [10, 12, 14],
        relative_humidity_2m_mean: [60, 70, 80],
      },
    })
  })
}

beforeEach(() => clearClimateCache())
afterEach(() => vi.unstubAllGlobals())

describe('helpers', () => {
  it('mean ignores null/non-finite values and handles empty input', () => {
    expect(mean([2, null, 4])).toBe(3)
    expect(mean([])).toBeNull()
    expect(mean([null, Number.NaN])).toBeNull()
  })

  it('latestCompleteYear uses last year for the current and future months', () => {
    const now = new Date(Date.UTC(2026, 7, 15)) // August 2026
    expect(latestCompleteYear(7, now)).toBe(2026) // July already complete
    expect(latestCompleteYear(8, now)).toBe(2025) // current month not complete
    expect(latestCompleteYear(12, now)).toBe(2025)
  })

  it('describeCondition maps temperature and rain to a label', () => {
    expect(describeCondition(32, 0)).toBe('Hot and dry')
    expect(describeCondition(25, 0)).toBe('Warm and sunny')
    expect(describeCondition(15, 0)).toBe('Mild')
    expect(describeCondition(-2, 0)).toBe('Cold')
    expect(describeCondition(25, 6)).toBe('Rainy')
  })
})

describe('getClimateNormals', () => {
  it('averages the daily observations', async () => {
    vi.stubGlobal('fetch', mockOpenMeteo())
    const normals = await getClimateNormals('Barcelona, Spain', 7, new Date(Date.UTC(2026, 7, 1)))
    expect(normals).toMatchObject({ temperature: 26, humidity: 70, windSpeed: 12, yearUsed: 2026 })
    expect(normals!.precipitation).toBeCloseTo(1)
  })

  it('caches per location and month', async () => {
    const fetchMock = mockOpenMeteo()
    vi.stubGlobal('fetch', fetchMock)
    await getClimateNormals('Barcelona', 7)
    await getClimateNormals('Barcelona', 7)
    expect(fetchMock).toHaveBeenCalledTimes(2) // 1 geocode + 1 archive, second call cached
  })

  it('returns null when the location cannot be geocoded or the archive is down', async () => {
    vi.stubGlobal('fetch', mockOpenMeteo({ geocode: false }))
    expect(await getClimateNormals('Nowhereville', 7)).toBeNull()
    clearClimateCache()
    vi.stubGlobal('fetch', mockOpenMeteo({ archive: false }))
    expect(await getClimateNormals('Barcelona', 7)).toBeNull()
  })
})

describe('RealWeatherProvider', () => {
  it('reports live observed data as source "api"', async () => {
    vi.stubGlobal('fetch', mockOpenMeteo())
    const weather = await new RealWeatherProvider().getWeather('Barcelona', '2026-07-15')
    expect(weather.source).toBe('api')
    expect(weather.metadata?.dataType).toBe('observed-monthly-average')
  })

  it('falls back to deterministic seasonal data when the live service fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const provider = new RealWeatherProvider()
    const first = await provider.getWeather('Spain', '2026-07-15')
    const second = await provider.getWeather('Spain', '2026-07-15')
    expect(first.source).toBe('structured')
    expect(first.temperature).toBe(second.temperature) // no random jitter
  })
})
