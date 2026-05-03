// Provider payload validation schemas using Zod
import { z } from 'zod'

// Flight Schema
export const flightSchema = z.object({
  id: z.string(),
  airline: z.string().min(1),
  flight_number: z.string().min(1),
  origin: z.string().min(3).max(3),
  destination: z.string().min(3).max(3),
  departure_time: z.string().datetime(),
  arrival_time: z.string().datetime(),
  duration_minutes: z.number().int().positive(),
  price: z.number().positive(),
  currency: z.string().length(3),
  available_seats: z.number().int().nonnegative(),
  aircraft_type: z.string().optional(),
  stops: z.number().int().nonnegative(),
  booking_class: z.string().optional(),
  baggage_included: z.boolean().optional(),
})

export const flightsPayloadSchema = z.array(flightSchema)

// Hotel Schema
export const hotelSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  rating: z.number().min(0).max(5),
  price_per_night: z.number().positive(),
  currency: z.string().length(3),
  available_rooms: z.number().int().nonnegative(),
  room_type: z.string(),
  amenities: z.array(z.string()),
  check_in_date: z.string().optional(),
  check_out_date: z.string().optional(),
  cancellation_policy: z.string().optional(),
  breakfast_included: z.boolean().optional(),
})

export const hotelsPayloadSchema = z.array(hotelSchema)

// Weather Schema
export const weatherSchema = z.object({
  id: z.string(),
  location: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  temperature: z.number(),
  feels_like: z.number(),
  humidity: z.number().min(0).max(100),
  pressure: z.number().positive(),
  wind_speed: z.number().nonnegative(),
  wind_direction: z.number().min(0).max(360),
  description: z.string(),
  icon: z.string(),
  timestamp: z.string().datetime(),
  forecast_date: z.string().optional(),
  precipitation_probability: z.number().min(0).max(100).optional(),
  uv_index: z.number().nonnegative().optional(),
})

export const weatherPayloadSchema = z.array(weatherSchema)

// Exchange Rate Schema
export const exchangeRateSchema = z.object({
  id: z.string(),
  base_currency: z.string().length(3),
  target_currency: z.string().length(3),
  rate: z.number().positive(),
  timestamp: z.string().datetime(),
  source: z.string().optional(),
  bid: z.number().positive().optional(),
  ask: z.number().positive().optional(),
})

export const exchangeRatesPayloadSchema = z.array(exchangeRateSchema)

// Event Schema
export const eventSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  venue: z.string().min(1),
  address: z.string(),
  city: z.string().min(1),
  country: z.string().min(1),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  category: z.string(),
  price_min: z.number().nonnegative().optional(),
  price_max: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  ticket_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  organizer: z.string().optional(),
  capacity: z.number().int().positive().optional(),
})

export const eventsPayloadSchema = z.array(eventSchema)

// Type exports
export type FlightPayload = z.infer<typeof flightSchema>
export type HotelPayload = z.infer<typeof hotelSchema>
export type WeatherPayload = z.infer<typeof weatherSchema>
export type ExchangeRatePayload = z.infer<typeof exchangeRateSchema>
export type EventPayload = z.infer<typeof eventSchema>

// Validation helper
export function validateProviderPayload(type: string, data: unknown): { success: boolean; error?: string } {
  try {
    switch (type) {
      case 'flights':
        flightsPayloadSchema.parse(data)
        break
      case 'hotels':
        hotelsPayloadSchema.parse(data)
        break
      case 'weather':
        weatherPayloadSchema.parse(data)
        break
      case 'exchange_rates':
        exchangeRatesPayloadSchema.parse(data)
        break
      case 'events':
        eventsPayloadSchema.parse(data)
        break
      default:
        return { success: false, error: `Unknown provider type: ${type}` }
    }
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') }
    }
    return { success: false, error: String(error) }
  }
}
