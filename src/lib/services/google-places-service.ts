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
      logWarning('Google Places API error', {
        status: response.status,
        statusText: response.statusText,
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
}> {
  if (!GOOGLE_PLACES_API_KEY) {
    logInfo('Google Places enrichment disabled - API key not configured')
    return { places: [], byCategory: {}, byCity: {} }
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

  for (const city of citiesToEnrich) {
    byCity[city] = []

    for (const category of categories) {
      const places = await searchPlacesForCity(city, countryName, category, 4)

      allPlaces.push(...places)

      if (!byCategory[category]) {
        byCategory[category] = []
      }
      byCategory[category].push(...places)

      byCity[city].push(...places)
    }
  }

  logInfo('Google Places enrichment complete', {
    totalPlaces: allPlaces.length,
    citiesEnriched: citiesToEnrich.length,
    categoriesSearched: categories.length,
  })

  return {
    places: allPlaces,
    byCategory,
    byCity,
  }
}
