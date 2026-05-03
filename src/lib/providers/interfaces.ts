// Provider interfaces for external data sources
export interface FlightData {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  price: number
  currency: string
  airline: string
  duration: number // minutes
  stops: number
  source: 'demo' | 'api'
}

export interface HotelData {
  name: string
  location: string
  city: string
  country: string
  pricePerNight: number
  currency: string
  rating: number // 1-5
  reviewCount: number
  amenities: string[]
  source: 'demo' | 'api'
}

export interface WeatherData {
  location: string
  date: string
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
  precipitation: number
  source: 'demo' | 'api' | 'structured'
  metadata?: Record<string, any>
}

export interface CurrencyData {
  from: string
  to: string
  rate: number
  lastUpdated: string
  source: 'demo' | 'api' | 'structured'
  metadata?: Record<string, any>
}

export interface VisaData {
  passportCountry?: string
  fromCountry?: string
  destinationCountry?: string
  toCountry?: string
  visaRequired?: boolean
  requirement?: 'visa-free' | 'visa-on-arrival' | 'e-visa' | 'visa-required'
  visaType?: string
  maxStay?: number
  maxStayDays?: number
  processingTime?: string
  cost?: number
  notes?: string | string[]
  source: 'demo' | 'knowledge' | 'knowledge-based' | 'assumed'
  metadata?: Record<string, any>
}

export interface EventData {
  name: string
  location: string
  city: string
  country: string
  startDate: string
  endDate?: string
  category: string
  description: string
  source: 'demo' | 'api'
}

export interface IFlightsProvider {
  searchFlights(origin: string, destination: string, departureDate: string, returnDate?: string): Promise<FlightData[]>
}

export interface IHotelsProvider {
  searchHotels(city: string, checkIn: string, checkOut: string): Promise<HotelData[]>
}

export interface IWeatherProvider {
  getWeather(location: string, date?: string): Promise<WeatherData>
  getForecast(location: string, days: number): Promise<WeatherData[]>
}

export interface ICurrencyProvider {
  getExchangeRate(from: string, to: string): Promise<CurrencyData>
}

export interface IVisaProvider {
  getVisaRequirement(fromCountry: string, toCountry: string): Promise<VisaData>
}

export interface IEventsProvider {
  searchEvents(city: string, startDate?: string, endDate?: string): Promise<EventData[]>
}
