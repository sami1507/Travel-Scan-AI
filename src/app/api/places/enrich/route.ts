/**
 * Internal API Route: Places Enrichment
 * Server-side only - enriches route cities with Google Places data
 */

import { NextRequest, NextResponse } from 'next/server'
import { enrichRouteCities } from '@/lib/services/google-places-service'
import { logError, logInfo } from '@/lib/error-logger'

interface EnrichRequest {
  country: string
  routeCities: string[]
  categories?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: EnrichRequest = await request.json()

    const { country, routeCities, categories } = body

    // Validate input
    if (!country || !routeCities || routeCities.length === 0) {
      return NextResponse.json(
        {
          enabled: false,
          places: [],
          reason: 'invalid_request',
          error: 'country and routeCities are required',
        },
        { status: 400 }
      )
    }

    // Check if Google Places API key is configured
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      logInfo('Google Places enrichment disabled - API key not configured')
      return NextResponse.json({
        enabled: false,
        places: [],
        reason: 'missing_google_places_key',
      })
    }

    // Check if enrichment is enabled
    const enabled = process.env.ENABLE_GOOGLE_PLACES_ENRICHMENT === 'true'
    if (!enabled) {
      logInfo('Google Places enrichment disabled via env var')
      return NextResponse.json({
        enabled: false,
        places: [],
        reason: 'disabled',
      })
    }

    // Limit cities to 3
    const citiesToEnrich = routeCities.slice(0, 3)

    logInfo('Places enrichment request', {
      country,
      citiesRequested: routeCities.length,
      citiesProcessing: citiesToEnrich.length,
    })

    // Enrich cities
    try {
      const result = await enrichRouteCities(citiesToEnrich, country)

      return NextResponse.json({
        enabled: true,
        places: result.places,
        byCategory: result.byCategory,
        byCity: result.byCity,
        citiesEnriched: citiesToEnrich.length,
        totalPlaces: result.places.length,
      })
    } catch (enrichError) {
      logError('Google Places enrichment failed', enrichError, {
        country,
        cities: citiesToEnrich,
      })

      return NextResponse.json({
        enabled: true,
        places: [],
        reason: 'failed',
        error: 'Enrichment service temporarily unavailable',
      })
    }
  } catch (error) {
    logError('Places enrichment API error', error)

    return NextResponse.json(
      {
        enabled: false,
        places: [],
        reason: 'error',
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
