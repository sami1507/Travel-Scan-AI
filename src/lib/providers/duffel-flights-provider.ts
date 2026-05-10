// Duffel Flights Provider - Real flight data integration
import type { IFlightsProvider, FlightData } from './interfaces'

interface DuffelOfferSlice {
  duration: string
  segments: Array<{
    origin: { iata_code: string }
    destination: { iata_code: string }
    operating_carrier: { name: string }
  }>
}

interface DuffelOffer {
  id: string
  total_amount: string
  total_currency: string
  slices: DuffelOfferSlice[]
}

interface DuffelOffersResponse {
  data: DuffelOffer[]
}

/**
 * Duffel Flights Provider
 * Uses Duffel API for real flight search and pricing
 * Server-side only - API token must not be exposed to client
 */
export class DuffelFlightsProvider implements IFlightsProvider {
  private apiToken: string | null = null
  private baseUrl: string = 'https://api.duffel.com'

  constructor() {
    // Lazy initialization - only check env vars when actually used
  }

  private initialize(): boolean {
    if (this.apiToken) return true // Already initialized

    const token = process.env.DUFFEL_API_TOKEN
    const environment = process.env.DUFFEL_ENVIRONMENT || 'test'

    if (!token) {
      console.warn('DUFFEL_API_TOKEN environment variable not configured - flight data will be unavailable')
      return false
    }

    this.apiToken = token
    this.baseUrl = environment === 'production' 
      ? 'https://api.duffel.com'
      : 'https://api.duffel.com' // Duffel uses same URL for test/prod, token determines environment
    
    return true
  }

  /**
   * Search for flights using Duffel API
   * Returns real flight offers with pricing
   */
  async searchFlights(
    origin: string,
    destination: string,
    departureDate: string,
    returnDate?: string
  ): Promise<FlightData[]> {
    if (!this.initialize()) {
      // API token not configured, return empty array
      console.log('[Duffel] API token not configured - returning empty results')
      return []
    }

    console.log(`[Duffel] Searching flights: ${origin} → ${destination} on ${departureDate}`)
    
    try {
      // Create offer request
      const offerRequestBody = {
        data: {
          slices: [
            {
              origin,
              destination,
              departure_date: departureDate,
            },
            ...(returnDate ? [{
              origin: destination,
              destination: origin,
              departure_date: returnDate,
            }] : []),
          ],
          passengers: [{ type: 'adult' }],
          cabin_class: 'economy',
        },
      }

      // Create offer request
      const offerRequestResponse = await fetch(`${this.baseUrl}/air/offer_requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          'Duffel-Version': 'v1',
        },
        body: JSON.stringify(offerRequestBody),
      })

      if (!offerRequestResponse.ok) {
        const errorText = await offerRequestResponse.text()
        console.error('Duffel offer request failed:', errorText)
        throw new Error(`Duffel API error: ${offerRequestResponse.status}`)
      }

      const offerRequest = await offerRequestResponse.json()
      const offerRequestId = offerRequest.data.id

      // Fetch offers
      const offersResponse = await fetch(
        `${this.baseUrl}/air/offers?offer_request_id=${offerRequestId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Duffel-Version': 'v1',
          },
        }
      )

      if (!offersResponse.ok) {
        const errorText = await offersResponse.text()
        console.error('Duffel offers fetch failed:', errorText)
        throw new Error(`Duffel API error: ${offersResponse.status}`)
      }

      const offersData: DuffelOffersResponse = await offersResponse.json()

      // Transform Duffel offers to FlightData format
      const flights = this.transformOffers(offersData.data, origin, destination, departureDate, returnDate)
      console.log(`[Duffel] Successfully retrieved ${flights.length} flight offers`)
      return flights
    } catch (error) {
      console.error('Duffel flight search error:', error)
      // Return empty array on error to allow graceful degradation
      return []
    }
  }

  /**
   * Transform Duffel offers to FlightData format
   */
  private transformOffers(
    offers: DuffelOffer[],
    origin: string,
    destination: string,
    departureDate: string,
    returnDate?: string
  ): FlightData[] {
    return offers.slice(0, 10).map(offer => {
      // Calculate total duration in minutes
      const totalDuration = offer.slices.reduce((sum, slice) => {
        const durationMatch = slice.duration.match(/PT(\d+H)?(\d+M)?/)
        const hours = durationMatch?.[1] ? parseInt(durationMatch[1]) : 0
        const minutes = durationMatch?.[2] ? parseInt(durationMatch[2]) : 0
        return sum + (hours * 60) + minutes
      }, 0)

      // Count total stops (segments - 1 per slice)
      const totalStops = offer.slices.reduce((sum, slice) => {
        return sum + Math.max(0, slice.segments.length - 1)
      }, 0)

      // Get primary airline from first segment
      const airline = offer.slices[0]?.segments[0]?.operating_carrier?.name || 'Unknown Airline'

      return {
        origin,
        destination,
        departureDate,
        returnDate,
        price: parseFloat(offer.total_amount),
        currency: offer.total_currency,
        airline,
        duration: totalDuration,
        stops: totalStops,
        source: 'api', // Mark as real API data
      }
    })
  }

  /**
   * Get cheapest flight from results
   */
  getCheapestFlight(flights: FlightData[]): FlightData | null {
    if (flights.length === 0) return null
    return flights.reduce((min, flight) => 
      flight.price < min.price ? flight : min
    )
  }

  /**
   * Calculate average flight price
   */
  getAveragePrice(flights: FlightData[]): number {
    if (flights.length === 0) return 0
    const sum = flights.reduce((acc, flight) => acc + flight.price, 0)
    return sum / flights.length
  }

  /**
   * Get flight value score (0-10) based on price and stops
   */
  getFlightValueScore(flights: FlightData[], budgetLevel: string): number {
    if (flights.length === 0) return 5
    
    const cheapest = this.getCheapestFlight(flights)
    if (!cheapest) return 5
    
    // Budget thresholds
    const budgetThresholds = {
      low: { excellent: 300, good: 500, fair: 700 },
      moderate: { excellent: 500, good: 800, fair: 1200 },
      high: { excellent: 800, good: 1500, fair: 2500 },
      luxury: { excellent: 1500, good: 3000, fair: 5000 },
    }
    
    const thresholds = budgetThresholds[budgetLevel as keyof typeof budgetThresholds] || budgetThresholds.moderate
    
    // Score based on price
    let score = 5
    if (cheapest.price <= thresholds.excellent) {
      score = 9 + (cheapest.stops === 0 ? 1 : 0)
    } else if (cheapest.price <= thresholds.good) {
      score = 7 + (cheapest.stops === 0 ? 1 : 0)
    } else if (cheapest.price <= thresholds.fair) {
      score = 5 + (cheapest.stops === 0 ? 1 : 0)
    } else {
      score = 3
    }
    
    return Math.min(10, score)
  }
}
