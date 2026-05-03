// Mock Flights Provider
import { BaseProvider } from './base-provider'
import type { ProviderResponse, SourceConfig, NormalizedRecord } from '../types'
import { sleep } from '../utils'
import { flightsPayloadSchema } from '../schemas/provider-schemas'

export class FlightsProvider extends BaseProvider {
  name = 'Mock Flights Provider'
  type = 'flights' as const

  async fetch(config: SourceConfig): Promise<ProviderResponse> {
    try {
      // Simulate API delay
      await sleep(500 + Math.random() * 1000)

      const settings = config.parser_settings as {
        origin?: string
        destination?: string
        departure_date?: string
        passengers?: number
      }

      // Generate mock flight data
      const mockFlights = this.generateMockFlights(
        settings.origin || 'JFK',
        settings.destination || 'LHR',
        settings.departure_date || '2024-06-15',
        settings.passengers || 1
      )

      return {
        success: true,
        data: mockFlights,
        metadata: {
          provider: this.name,
          fetched_at: new Date().toISOString(),
          count: mockFlights.length,
        },
      }
    } catch (error) {
      return this.handleError(error, 'fetch')
    }
  }

  validate(data: any): boolean {
    try {
      flightsPayloadSchema.parse(data)
      return true
    } catch {
      return false
    }
  }

  normalize(data: any, config: SourceConfig, ingestionRunId: string): NormalizedRecord[] {
    if (!this.validate(data)) {
      throw new Error('Invalid flight data structure')
    }

    return data.map((flight: any) => 
      this.createNormalizedRecord(
        config.id,
        ingestionRunId,
        flight.id,
        'flight',
        {
          airline: flight.airline,
          flight_number: flight.flight_number,
          origin: flight.origin,
          destination: flight.destination,
          departure_time: flight.departure_time,
          arrival_time: flight.arrival_time,
          duration_minutes: flight.duration_minutes,
          price: flight.price,
          currency: flight.currency,
          available_seats: flight.available_seats,
          aircraft_type: flight.aircraft_type,
          stops: flight.stops,
        },
        {
          booking_class: flight.booking_class,
          baggage_included: flight.baggage_included,
        }
      )
    )
  }

  private generateMockFlights(origin: string, destination: string, date: string, passengers: number) {
    const airlines = ['American Airlines', 'British Airways', 'Delta', 'United', 'Virgin Atlantic']
    const aircraftTypes = ['Boeing 777', 'Boeing 787', 'Airbus A350', 'Airbus A380']
    const basePrice = 450
    const priceVariation = 0.3

    const flights = []
    const flightCount = 15 + Math.floor(Math.random() * 10)

    for (let i = 0; i < flightCount; i++) {
      const airline = airlines[Math.floor(Math.random() * airlines.length)]
      const departureHour = 6 + Math.floor(Math.random() * 16)
      const durationMinutes = 420 + Math.floor(Math.random() * 120)
      const price = Math.round(basePrice * (1 + (Math.random() - 0.5) * priceVariation * 2))
      const stops = Math.random() > 0.7 ? 1 : 0

      flights.push({
        id: `FL${Date.now()}-${i}`,
        airline,
        flight_number: `${airline.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
        origin,
        destination,
        departure_time: `${date}T${String(departureHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00Z`,
        arrival_time: this.addMinutes(`${date}T${String(departureHour).padStart(2, '0')}:00:00Z`, durationMinutes),
        duration_minutes: durationMinutes,
        price: price * passengers,
        currency: 'USD',
        available_seats: Math.floor(Math.random() * 50) + 10,
        aircraft_type: aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)],
        stops,
        booking_class: 'Economy',
        baggage_included: Math.random() > 0.5,
      })
    }

    return flights
  }

  private addMinutes(dateString: string, minutes: number): string {
    const date = new Date(dateString)
    date.setMinutes(date.getMinutes() + minutes)
    return date.toISOString()
  }
}
