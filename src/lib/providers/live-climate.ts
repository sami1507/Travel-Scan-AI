// Live climate normals from Open-Meteo (free, no API key).
// Returns the daily averages for the requested month taken from the most recent
// complete year of observed data — i.e. a real climatology, not a forecast.

import { logger } from '../utils'

export interface ClimateNormals {
  location: string
  latitude: number
  longitude: number
  month: number
  yearUsed: number
  temperature: number // °C daily mean
  precipitation: number // mm/day mean
  humidity: number // %
  windSpeed: number // km/h
  fetchedAt: number
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 8000
const cache = new Map<string, ClimateNormals>()

interface GeoResult {
  latitude: number
  longitude: number
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch (error) {
    logger.warn('Live climate request failed', {
      url: url.split('?')[0],
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

async function geocode(location: string): Promise<GeoResult | null> {
  // "Barcelona, Spain" -> search by the city part only
  const name = location.split(',')[0].trim()
  if (!name) return null
  const data = await fetchJson<{ results?: GeoResult[] }>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
  )
  return data?.results?.[0] ?? null
}

export function mean(values: Array<number | null>): number | null {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (valid.length === 0) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}

/** The most recent calendar year in which the whole `month` has already passed. */
export function latestCompleteYear(month: number, now: Date = new Date()): number {
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth() + 1
  return month < currentMonth ? currentYear : currentYear - 1
}

export async function getClimateNormals(
  location: string,
  month: number,
  now: Date = new Date()
): Promise<ClimateNormals | null> {
  const key = `${location.toLowerCase()}|${month}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached

  const geo = await geocode(location)
  if (!geo) return null

  const year = latestCompleteYear(month, now)
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const url =
    'https://archive-api.open-meteo.com/v1/archive' +
    `?latitude=${geo.latitude}&longitude=${geo.longitude}` +
    `&start_date=${year}-${mm}-01&end_date=${year}-${mm}-${lastDay}` +
    '&daily=temperature_2m_mean,precipitation_sum,wind_speed_10m_mean,relative_humidity_2m_mean&timezone=auto'

  const data = await fetchJson<{
    daily?: {
      temperature_2m_mean?: Array<number | null>
      precipitation_sum?: Array<number | null>
      wind_speed_10m_mean?: Array<number | null>
      relative_humidity_2m_mean?: Array<number | null>
    }
  }>(url)

  const daily = data?.daily
  if (!daily) return null

  const temperature = mean(daily.temperature_2m_mean ?? [])
  if (temperature === null) return null

  const normals: ClimateNormals = {
    location,
    latitude: geo.latitude,
    longitude: geo.longitude,
    month,
    yearUsed: year,
    temperature,
    precipitation: mean(daily.precipitation_sum ?? []) ?? 0,
    humidity: mean(daily.relative_humidity_2m_mean ?? []) ?? 0,
    windSpeed: mean(daily.wind_speed_10m_mean ?? []) ?? 0,
    fetchedAt: Date.now(),
  }
  cache.set(key, normals)
  return normals
}

export function describeCondition(temperatureC: number, precipitationMmPerDay: number): string {
  if (precipitationMmPerDay >= 4) return 'Rainy'
  if (precipitationMmPerDay >= 1.5) return 'Mixed with frequent showers'
  if (temperatureC >= 30) return 'Hot and dry'
  if (temperatureC >= 22) return 'Warm and sunny'
  if (temperatureC >= 12) return 'Mild'
  if (temperatureC >= 3) return 'Cool'
  return 'Cold'
}

export function clearClimateCache(): void {
  cache.clear()
}
