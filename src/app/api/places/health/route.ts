/**
 * Google Places Health Check Endpoint
 * Server-side diagnostic to verify Google Places API configuration
 * Does not expose API key
 */

import { NextResponse } from 'next/server'
import { logInfo, logWarning } from '@/lib/error-logger'

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const enabled = process.env.ENABLE_GOOGLE_PLACES_ENRICHMENT === 'true'

  const result: {
    configured: boolean
    enabled: boolean
    canReachGoogle: boolean
    status?: number
    reason?: string
    placesFound?: number
  } = {
    configured: !!apiKey,
    enabled,
    canReachGoogle: false,
  }

  if (!apiKey) {
    logInfo('Google Places health check: API key not configured')
    return NextResponse.json(result)
  }

  if (!enabled) {
    logInfo('Google Places health check: enrichment disabled')
    return NextResponse.json(result)
  }

  // Make minimal test request to verify API configuration
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName',
        },
        body: JSON.stringify({
          textQuery: 'tourist attractions in Rome, Italy',
          maxResultCount: 1,
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    result.status = response.status
    result.canReachGoogle = response.ok

    if (!response.ok) {
      // Extract error reason
      let errorReason = 'unknown_error'
      try {
        const errorBody = await response.text()
        if (errorBody) {
          try {
            const errorJson = JSON.parse(errorBody)
            errorReason = errorJson.error?.message || errorJson.error?.status || errorReason
          } catch {
            if (errorBody.includes('API key not valid')) {
              errorReason = 'api_key_invalid'
            } else if (errorBody.includes('API not enabled')) {
              errorReason = 'api_not_enabled - Enable Places API (New) in Google Cloud Console'
            } else if (errorBody.includes('billing')) {
              errorReason = 'billing_not_enabled - Enable billing in Google Cloud Console'
            } else if (errorBody.includes('restricted')) {
              errorReason = 'key_restricted - Check API key restrictions in Google Cloud Console'
            } else {
              errorReason = errorBody.substring(0, 200)
            }
          }
        }
      } catch {
        // Failed to read body
      }

      result.reason = errorReason

      logWarning('Google Places health check failed', {
        status: response.status,
        reason: errorReason,
      })
    } else {
      // Success - count places
      try {
        const data = await response.json()
        result.placesFound = data.places?.length || 0
        logInfo('Google Places health check passed', {
          placesFound: result.placesFound,
        })
      } catch {
        result.placesFound = 0
      }
    }
  } catch (error) {
    result.reason =
      (error as Error).name === 'AbortError'
        ? 'timeout'
        : (error as Error).message

    logWarning('Google Places health check error', {
      error: (error as Error).message,
    })
  }

  return NextResponse.json(result)
}
