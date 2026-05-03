// Provider registry
import type { TravelProvider, SourceType } from '../types'
import { FlightsProvider } from './flights-provider'
import { HotelsProvider } from './hotels-provider'
import { WeatherProvider } from './weather-provider'
import { ExchangeRatesProvider } from './exchange-rates-provider'
import { EventsProvider } from './events-provider'
import { enhancedEventsProvider } from './enhanced-events-provider'

const providers: Record<SourceType, TravelProvider> = {
  flights: new FlightsProvider(),
  hotels: new HotelsProvider(),
  weather: new WeatherProvider(),
  exchange_rates: new ExchangeRatesProvider(),
  events: new EventsProvider(),
}

export function getProvider(type: SourceType): TravelProvider {
  const provider = providers[type]
  if (!provider) {
    throw new Error(`No provider found for type: ${type}`)
  }
  return provider
}

export { FlightsProvider, HotelsProvider, WeatherProvider, ExchangeRatesProvider, EventsProvider, enhancedEventsProvider }
