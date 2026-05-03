// Mock Hotels Provider
import { BaseProvider } from './base-provider'
import type { ProviderResponse, SourceConfig, NormalizedRecord } from '../types'
import { sleep } from '../utils'
import { hotelsPayloadSchema } from '../schemas/provider-schemas'

export class HotelsProvider extends BaseProvider {
  name = 'Mock Hotels Provider'
  type = 'hotels' as const

  async fetch(config: SourceConfig): Promise<ProviderResponse> {
    try {
      await sleep(500 + Math.random() * 1000)

      const settings = config.parser_settings as {
        city?: string
        check_in?: string
        check_out?: string
        guests?: number
      }

      const mockHotels = this.generateMockHotels(
        settings.city || 'London',
        settings.check_in || '2024-06-15',
        settings.check_out || '2024-06-20',
        settings.guests || 2
      )

      return {
        success: true,
        data: mockHotels,
        metadata: {
          provider: this.name,
          fetched_at: new Date().toISOString(),
          count: mockHotels.length,
        },
      }
    } catch (error) {
      return this.handleError(error, 'fetch')
    }
  }

  validate(data: any): boolean {
    try {
      hotelsPayloadSchema.parse(data)
      return true
    } catch {
      return false
    }
  }

  normalize(data: any, config: SourceConfig, ingestionRunId: string): NormalizedRecord[] {
    if (!this.validate(data)) {
      throw new Error('Invalid hotel data structure')
    }

    return data.map((hotel: any) => 
      this.createNormalizedRecord(
        config.id,
        ingestionRunId,
        hotel.id,
        'hotel',
        {
          name: hotel.name,
          city: hotel.city,
          address: hotel.address,
          rating: hotel.rating,
          review_count: hotel.review_count,
          price_per_night: hotel.price_per_night,
          currency: hotel.currency,
          available_rooms: hotel.available_rooms,
          room_type: hotel.room_type,
          amenities: hotel.amenities,
          distance_from_center: hotel.distance_from_center,
        },
        {
          cancellation_policy: hotel.cancellation_policy,
          breakfast_included: hotel.breakfast_included,
        }
      )
    )
  }

  private generateMockHotels(city: string, checkIn: string, checkOut: string, guests: number) {
    const hotelNames = [
      'Grand Plaza Hotel',
      'City Center Inn',
      'Riverside Boutique Hotel',
      'Metropolitan Suites',
      'Heritage Hotel',
      'Modern Comfort Hotel',
      'Royal Palace Hotel',
      'Skyline Tower Hotel',
      'Garden View Hotel',
      'Historic District Hotel',
    ]

    const amenities = ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Room Service', 'Parking']
    const roomTypes = ['Standard', 'Deluxe', 'Suite', 'Executive']

    const hotels = []
    const hotelCount = 20 + Math.floor(Math.random() * 10)

    for (let i = 0; i < hotelCount; i++) {
      const basePrice = 80 + Math.floor(Math.random() * 300)
      const rating = 3 + Math.random() * 2

      hotels.push({
        id: `HTL${Date.now()}-${i}`,
        name: hotelNames[i % hotelNames.length] + (i >= hotelNames.length ? ` ${Math.floor(i / hotelNames.length) + 1}` : ''),
        city,
        address: `${Math.floor(Math.random() * 500) + 1} ${['Main', 'High', 'Park', 'King', 'Queen'][Math.floor(Math.random() * 5)]} Street`,
        rating: Math.round(rating * 10) / 10,
        review_count: Math.floor(Math.random() * 2000) + 100,
        price_per_night: basePrice,
        currency: 'USD',
        available_rooms: Math.floor(Math.random() * 20) + 1,
        room_type: roomTypes[Math.floor(Math.random() * roomTypes.length)],
        amenities: this.getRandomAmenities(amenities),
        distance_from_center: Math.round(Math.random() * 50) / 10,
        cancellation_policy: Math.random() > 0.5 ? 'Free cancellation' : 'Non-refundable',
        breakfast_included: Math.random() > 0.6,
      })
    }

    return hotels
  }

  private getRandomAmenities(allAmenities: string[]): string[] {
    const count = 3 + Math.floor(Math.random() * 4)
    const shuffled = [...allAmenities].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }
}
