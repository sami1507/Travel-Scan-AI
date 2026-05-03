// Demo provider implementations (to be replaced with real APIs)
import type {
  IFlightsProvider,
  IHotelsProvider,
  IWeatherProvider,
  ICurrencyProvider,
  IVisaProvider,
  IEventsProvider,
  FlightData,
  HotelData,
  WeatherData,
  CurrencyData,
  VisaData,
  EventData,
} from './interfaces'
import { getCountryKnowledge } from '../knowledge/base/countries'
import { RealWeatherProvider } from './real-weather-provider'
import { RealCurrencyProvider } from './real-currency-provider'
import { RealVisaProvider } from './real-visa-provider'

// Export real providers for use in analysis engine
export { RealWeatherProvider, RealCurrencyProvider, RealVisaProvider }

export class DemoFlightsProvider implements IFlightsProvider {
  async searchFlights(
    origin: string,
    destination: string,
    departureDate: string,
    returnDate?: string
  ): Promise<FlightData[]> {
    // Demo data with realistic pricing based on route characteristics
    // Clearly marked as estimated for transparency
    
    // Estimate base price based on typical route distances
    const basePrice = this.estimateBasePrice(origin, destination)
    const priceVariation = 0.3 // 30% variation
    
    return [
      {
        origin,
        destination,
        departureDate,
        returnDate,
        price: Math.round(basePrice * (1 - priceVariation + Math.random() * priceVariation)),
        currency: 'USD',
        airline: 'Demo Airlines',
        duration: 480 + Math.random() * 240,
        stops: 0,
        source: 'demo',
      },
      {
        origin,
        destination,
        departureDate,
        returnDate,
        price: Math.round(basePrice * (1 + Math.random() * priceVariation)),
        currency: 'USD',
        airline: 'Example Airways',
        duration: 420 + Math.random() * 300,
        stops: 1,
        source: 'demo',
      },
      {
        origin,
        destination,
        departureDate,
        returnDate,
        price: Math.round(basePrice * (1 + priceVariation + Math.random() * priceVariation)),
        currency: 'USD',
        airline: 'Budget Air',
        duration: 540 + Math.random() * 180,
        stops: 2,
        source: 'demo',
      },
    ]
  }

  private estimateBasePrice(origin: string, destination: string): number {
    // Rough estimation based on typical flight patterns
    // This is demo data - real API would provide actual prices
    const shortHaul = 300 // < 3 hours
    const mediumHaul = 600 // 3-6 hours
    const longHaul = 1200 // > 6 hours
    
    // Simple heuristic: if destination contains common long-haul indicators
    const longHaulKeywords = ['Asia', 'Tokyo', 'Bangkok', 'Singapore', 'Sydney', 'Dubai']
    const mediumHaulKeywords = ['Europe', 'London', 'Paris', 'Rome', 'Madrid', 'Berlin']
    
    if (longHaulKeywords.some(k => destination.includes(k))) {
      return longHaul
    } else if (mediumHaulKeywords.some(k => destination.includes(k))) {
      return mediumHaul
    }
    return shortHaul
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

export class DemoHotelsProvider implements IHotelsProvider {
  async searchHotels(city: string, checkIn: string, checkOut: string): Promise<HotelData[]> {
    // Demo data with realistic pricing tiers
    // Clearly marked as estimated for transparency
    
    const basePrices = this.estimateCityPricing(city)
    
    return [
      {
        name: `${city} Grand Hotel`,
        location: 'City Center',
        city,
        country: 'Demo Country',
        pricePerNight: Math.round(basePrices.luxury * (0.9 + Math.random() * 0.2)),
        currency: 'USD',
        rating: 4.5 + Math.random() * 0.5,
        reviewCount: Math.floor(Math.random() * 1000) + 500,
        amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Spa', 'Concierge'],
        source: 'demo',
      },
      {
        name: `${city} Boutique Inn`,
        location: 'Historic District',
        city,
        country: 'Demo Country',
        pricePerNight: Math.round(basePrices.moderate * (0.9 + Math.random() * 0.2)),
        currency: 'USD',
        rating: 4 + Math.random() * 0.5,
        reviewCount: Math.floor(Math.random() * 500) + 200,
        amenities: ['WiFi', 'Breakfast', 'Bar', 'Room Service'],
        source: 'demo',
      },
      {
        name: `${city} Budget Stay`,
        location: 'Suburbs',
        city,
        country: 'Demo Country',
        pricePerNight: Math.round(basePrices.budget * (0.9 + Math.random() * 0.2)),
        currency: 'USD',
        rating: 3.5 + Math.random() * 0.5,
        reviewCount: Math.floor(Math.random() * 300) + 100,
        amenities: ['WiFi', 'Breakfast'],
        source: 'demo',
      },
      {
        name: `${city} Business Hotel`,
        location: 'Business District',
        city,
        country: 'Demo Country',
        pricePerNight: Math.round(basePrices.moderate * (1.1 + Math.random() * 0.2)),
        currency: 'USD',
        rating: 4.2 + Math.random() * 0.3,
        reviewCount: Math.floor(Math.random() * 800) + 300,
        amenities: ['WiFi', 'Gym', 'Business Center', 'Restaurant'],
        source: 'demo',
      },
    ]
  }

  private estimateCityPricing(city: string): { budget: number; moderate: number; luxury: number } {
    // Rough estimation based on typical city hotel pricing
    // This is demo data - real API would provide actual prices
    const expensiveCities = ['London', 'Paris', 'Tokyo', 'New York', 'Singapore', 'Dubai', 'Hong Kong']
    const moderateCities = ['Barcelona', 'Rome', 'Berlin', 'Amsterdam', 'Prague', 'Lisbon']
    
    if (expensiveCities.some(c => city.includes(c))) {
      return { budget: 80, moderate: 180, luxury: 350 }
    } else if (moderateCities.some(c => city.includes(c))) {
      return { budget: 50, moderate: 120, luxury: 250 }
    }
    // Budget-friendly cities
    return { budget: 30, moderate: 80, luxury: 180 }
  }

  /**
   * Get best value hotel based on rating and price
   */
  getBestValueHotel(hotels: HotelData[]): HotelData | null {
    if (hotels.length === 0) return null
    
    // Calculate value score: rating / (pricePerNight / 100)
    return hotels.reduce((best, hotel) => {
      const hotelValue = hotel.rating / (hotel.pricePerNight / 100)
      const bestValue = best.rating / (best.pricePerNight / 100)
      return hotelValue > bestValue ? hotel : best
    })
  }

  /**
   * Get average hotel price
   */
  getAveragePrice(hotels: HotelData[]): number {
    if (hotels.length === 0) return 0
    const sum = hotels.reduce((acc, hotel) => acc + hotel.pricePerNight, 0)
    return sum / hotels.length
  }

  /**
   * Get hotel value score (0-10) based on price, rating, and budget
   */
  getHotelValueScore(hotels: HotelData[], budgetLevel: string): number {
    if (hotels.length === 0) return 5
    
    const bestValue = this.getBestValueHotel(hotels)
    if (!bestValue) return 5
    
    // Budget thresholds for nightly rates
    const budgetThresholds = {
      low: { excellent: 50, good: 80, fair: 120 },
      moderate: { excellent: 100, good: 150, fair: 250 },
      high: { excellent: 200, good: 350, fair: 500 },
      luxury: { excellent: 350, good: 600, fair: 1000 },
    }
    
    const thresholds = budgetThresholds[budgetLevel as keyof typeof budgetThresholds] || budgetThresholds.moderate
    
    // Score based on price and rating
    let score = 5
    if (bestValue.pricePerNight <= thresholds.excellent && bestValue.rating >= 4.0) {
      score = 9
    } else if (bestValue.pricePerNight <= thresholds.good && bestValue.rating >= 3.5) {
      score = 7
    } else if (bestValue.pricePerNight <= thresholds.fair) {
      score = 5
    } else {
      score = 3
    }
    
    // Bonus for high ratings
    if (bestValue.rating >= 4.5) score = Math.min(10, score + 1)
    
    return score
  }
}

export class DemoWeatherProvider implements IWeatherProvider {
  async getWeather(location: string, date?: string): Promise<WeatherData> {
    // Demo data - clearly marked as estimated
    const temp = 15 + Math.random() * 20
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy']
    
    return {
      location,
      date: date || new Date().toISOString().split('T')[0],
      temperature: temp,
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      humidity: 40 + Math.random() * 40,
      windSpeed: 5 + Math.random() * 15,
      precipitation: Math.random() * 10,
      source: 'demo',
    }
  }

  async getForecast(location: string, days: number): Promise<WeatherData[]> {
    const forecast: WeatherData[] = []
    const today = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      forecast.push(await this.getWeather(location, date.toISOString().split('T')[0]))
    }

    return forecast
  }
}

export class DemoCurrencyProvider implements ICurrencyProvider {
  private rates: Record<string, number> = {
    'USD-EUR': 0.92,
    'USD-GBP': 0.79,
    'USD-JPY': 149.5,
    'USD-THB': 35.2,
    'EUR-USD': 1.09,
    'GBP-USD': 1.27,
  }

  async getExchangeRate(from: string, to: string): Promise<CurrencyData> {
    const key = `${from}-${to}`
    const rate = this.rates[key] || 1.0

    return {
      from,
      to,
      rate,
      lastUpdated: new Date().toISOString(),
      source: 'demo',
    }
  }
}

export class DemoVisaProvider implements IVisaProvider {
  async getVisaRequirement(fromCountry: string, toCountry: string): Promise<VisaData> {
    // Use knowledge base for visa requirements
    const countryKnowledge = getCountryKnowledge(toCountry)

    if (countryKnowledge) {
      return {
        fromCountry,
        toCountry,
        requirement: countryKnowledge.visaEase,
        maxStay: countryKnowledge.visaEase === 'visa-free' ? 90 : undefined,
        notes: [
          `${countryKnowledge.name} visa policy: ${countryKnowledge.visaEase}`,
          'Check official embassy website for latest requirements',
        ],
        source: 'knowledge',
      }
    }

    // Fallback demo data
    return {
      fromCountry,
      toCountry,
      requirement: 'visa-required',
      notes: ['Demo data - check official sources'],
      source: 'demo',
    }
  }
}

export class DemoEventsProvider implements IEventsProvider {
  async searchEvents(city: string, startDate?: string, endDate?: string): Promise<EventData[]> {
    // Demo data - clearly marked as estimated
    return [
      {
        name: `${city} Music Festival`,
        location: 'City Park',
        city,
        country: 'Demo Country',
        startDate: startDate || new Date().toISOString().split('T')[0],
        category: 'Music',
        description: 'Demo event - check local sources for actual events',
        source: 'demo',
      },
      {
        name: `${city} Food Market`,
        location: 'Central Square',
        city,
        country: 'Demo Country',
        startDate: startDate || new Date().toISOString().split('T')[0],
        category: 'Food',
        description: 'Demo event - check local sources for actual events',
        source: 'demo',
      },
    ]
  }
}

// Export singleton instances
export const demoFlightsProvider = new DemoFlightsProvider()
export const demoHotelsProvider = new DemoHotelsProvider()
export const demoWeatherProvider = new DemoWeatherProvider()
export const demoCurrencyProvider = new DemoCurrencyProvider()
export const demoVisaProvider = new DemoVisaProvider()
export const demoEventsProvider = new DemoEventsProvider()
