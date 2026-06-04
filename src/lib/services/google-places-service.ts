/**
 * Google Places API Service (Server-Side Only)
 * Uses Google Places API (New) for live place enrichment
 * Never exposes API key to browser
 */

import { logWarning, logError, logInfo } from '@/lib/error-logger'

export interface NormalizedPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  userRatingCount?: number
  types: string[]
  photoName?: string
  category: string
  source: 'google_places'
  confidence: 'live_place_data'
}

interface GooglePlacesResponse {
  places?: Array<{
    id: string
    displayName?: { text: string }
    formattedAddress?: string
    location?: { latitude: number; longitude: number }
    rating?: number
    userRatingCount?: number
    types?: string[]
    photos?: Array<{ name: string }>
  }>
}

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
const TIMEOUT_MS = 5000

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.photos',
].join(',')

/**
 * Search places for a city by category
 */
export async function searchPlacesForCity(
  cityName: string,
  countryName: string,
  category: string,
  maxResults = 4
): Promise<NormalizedPlace[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    logWarning('Google Places API key not configured')
    return []
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: `${category} in ${cityName}, ${countryName}`,
          maxResultCount: maxResults,
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      // Extract detailed error reason for 403 diagnostics
      let errorReason = 'unknown_error'
      try {
        const errorBody = await response.text()
        if (errorBody) {
          try {
            const errorJson = JSON.parse(errorBody)
            errorReason = errorJson.error?.message || errorJson.error?.status || errorReason
          } catch {
            // Not JSON, use text
            if (errorBody.includes('API key not valid')) {
              errorReason = 'api_key_invalid'
            } else if (errorBody.includes('API not enabled')) {
              errorReason = 'api_not_enabled'
            } else if (errorBody.includes('billing')) {
              errorReason = 'billing_not_enabled'
            } else if (errorBody.includes('restricted')) {
              errorReason = 'key_restricted'
            } else {
              errorReason = errorBody.substring(0, 100)
            }
          }
        }
      } catch {
        // Failed to read body
      }

      logWarning('Google Places API error', {
        status: response.status,
        statusText: response.statusText,
        reason: errorReason,
        city: cityName,
        country: countryName,
      })
      return []
    }

    const data: GooglePlacesResponse = await response.json()

    if (!data.places || data.places.length === 0) {
      return []
    }

    return data.places.map(place => ({
      id: place.id,
      name: place.displayName?.text || 'Unknown Place',
      address: place.formattedAddress || '',
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      types: place.types || [],
      photoName: place.photos?.[0]?.name,
      category,
      source: 'google_places' as const,
      confidence: 'live_place_data' as const,
    }))
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logWarning('Google Places API timeout', {
        city: cityName,
        country: countryName,
        category,
      })
    } else {
      logError('Google Places API error', error, {
        city: cityName,
        country: countryName,
        category,
      })
    }
    return []
  }
}

/**
 * Enrich route cities with places across multiple categories
 */
export async function enrichRouteCities(
  routeCities: string[],
  countryName: string
): Promise<{
  places: NormalizedPlace[]
  byCategory: Record<string, NormalizedPlace[]>
  byCity: Record<string, NormalizedPlace[]>
  stats: {
    attemptedRequests: number
    successfulRequests: number
    failedRequests: number
    errorStatus?: number
    errorReason?: string
  }
}> {
  if (!GOOGLE_PLACES_API_KEY) {
    logInfo('Google Places enrichment disabled - API key not configured')
    return {
      places: [],
      byCategory: {},
      byCity: {},
      stats: { attemptedRequests: 0, successfulRequests: 0, failedRequests: 0 },
    }
  }

  const categories = [
    'tourist attractions',
    'restaurants',
    'nature parks',
    'museums',
  ]

  const maxCities = Math.min(routeCities.length, 3)
  const citiesToEnrich = routeCities.slice(0, maxCities)

  logInfo('Enriching route cities with Google Places', {
    country: countryName,
    cities: citiesToEnrich,
    categories,
  })

  const allPlaces: NormalizedPlace[] = []
  const byCategory: Record<string, NormalizedPlace[]> = {}
  const byCity: Record<string, NormalizedPlace[]> = {}
  
  let attemptedRequests = 0
  let successfulRequests = 0
  let failedRequests = 0
  let consecutiveFailures = 0
  let lastErrorStatus: number | undefined
  let lastErrorReason: string | undefined

  // Stop early if we get 3 consecutive failures (likely 403 or config issue)
  const MAX_CONSECUTIVE_FAILURES = 3

  for (const city of citiesToEnrich) {
    byCity[city] = []

    for (const category of categories) {
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        logWarning('Stopping Google Places enrichment after repeated failures', {
          consecutiveFailures,
          lastErrorStatus,
          lastErrorReason,
        })
        break
      }

      attemptedRequests++
      const places = await searchPlacesForCity(city, countryName, category, 4)

      if (places.length > 0) {
        successfulRequests++
        consecutiveFailures = 0
        allPlaces.push(...places)

        if (!byCategory[category]) {
          byCategory[category] = []
        }
        byCategory[category].push(...places)
        byCity[city].push(...places)
      } else {
        failedRequests++
        consecutiveFailures++
        // Track error details for aggregated logging
        // Note: actual error status/reason would need to be returned from searchPlacesForCity
      }
    }

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      break
    }
  }

  // Aggregated logging
  if (failedRequests > 0) {
    logWarning('Google Places enrichment completed with failures', {
      totalPlaces: allPlaces.length,
      attemptedRequests,
      successfulRequests,
      failedRequests,
      consecutiveFailures,
    })
  } else {
    logInfo('Google Places enrichment complete', {
      totalPlaces: allPlaces.length,
      citiesEnriched: citiesToEnrich.length,
      categoriesSearched: categories.length,
      attemptedRequests,
      successfulRequests,
    })
  }

  return {
    places: allPlaces,
    byCategory,
    byCity,
    stats: {
      attemptedRequests,
      successfulRequests,
      failedRequests,
      errorStatus: lastErrorStatus,
      errorReason: lastErrorReason,
    },
  }
}
