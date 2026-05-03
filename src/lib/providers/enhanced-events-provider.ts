// Enhanced Events Provider with Seasonality Intelligence
import type { EventData, IEventsProvider } from './interfaces'
import { logger } from '../utils'

interface SeasonalityData {
  season: 'peak' | 'shoulder' | 'off-peak'
  crowdLevel: 'low' | 'moderate' | 'high' | 'very-high'
  priceMultiplier: number
  attractiveness: number // 0-10
  notes: string[]
}

interface MajorEvent {
  name: string
  type: 'festival' | 'holiday' | 'sports' | 'cultural' | 'conference'
  startDate: string
  endDate?: string
  impact: 'low' | 'moderate' | 'high' | 'extreme'
  description: string
}

export interface EnhancedEventData extends EventData {
  seasonality?: SeasonalityData
  majorEvents?: MajorEvent[]
  timingAdvantages?: string[]
  timingDisadvantages?: string[]
  confidence: 'estimated' | 'structured' | 'live'
}

/**
 * Enhanced Events Provider with Seasonality Intelligence
 * Provides event data and seasonal attractiveness signals
 */
export class EnhancedEventsProvider implements IEventsProvider {
  private readonly source: 'demo' | 'api' = 'demo'

  /**
   * Search for events in a destination
   */
  async searchEvents(
    city: string,
    startDate?: string,
    endDate?: string
  ): Promise<EventData[]> {
    try {
      logger.info('Enhanced Events Provider: Searching events', { city, startDate, endDate })

      const events = await this.fetchEvents(city, startDate, endDate)
      
      return events.map(event => ({
        ...event,
        source: this.source,
      }))
    } catch (error) {
      logger.error('Enhanced Events Provider: Failed to search events', error)
      return []
    }
  }

  /**
   * Get enhanced event and seasonality data
   */
  async getEnhancedEventData(
    city: string,
    country: string,
    travelMonths?: number[]
  ): Promise<EnhancedEventData> {
    try {
      logger.info('Enhanced Events Provider: Getting enhanced data', { city, country, travelMonths })

      const month = travelMonths?.[0] || new Date().getMonth() + 1
      const startDate = this.getDateForMonth(month)
      const endDate = this.getDateForMonth(month, 30)

      const events = await this.fetchEvents(city, startDate, endDate)
      const seasonality = this.getSeasonalityData(city, country, month)
      const majorEvents = this.getMajorEvents(city, country, month)
      const { advantages, disadvantages } = this.getTimingInsights(seasonality, majorEvents, month)

      return {
        name: `Events in ${city}`,
        location: city,
        city,
        country,
        startDate,
        endDate,
        category: 'events-and-seasonality',
        description: `Event and seasonality intelligence for ${city}`,
        source: this.source,
        seasonality,
        majorEvents,
        timingAdvantages: advantages,
        timingDisadvantages: disadvantages,
        confidence: 'estimated',
      }
    } catch (error) {
      logger.error('Enhanced Events Provider: Failed to get enhanced data', error)
      throw error
    }
  }

  /**
   * Fetch events for a destination
   */
  private async fetchEvents(city: string, startDate?: string, endDate?: string): Promise<EventData[]> {
    // Demo implementation - returns estimated event data
    const eventCount = Math.floor(Math.random() * 8) + 3
    const events: EventData[] = []

    const categories = ['Festival', 'Concert', 'Sports', 'Cultural', 'Food & Wine', 'Conference', 'Exhibition']
    const start = startDate ? new Date(startDate) : new Date()
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)

    for (let i = 0; i < eventCount; i++) {
      const eventDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
      const category = categories[Math.floor(Math.random() * categories.length)]

      events.push({
        name: this.generateEventName(category, city),
        location: `${city} City Center`,
        city,
        country: this.inferCountry(city),
        startDate: eventDate.toISOString().split('T')[0],
        endDate: undefined,
        category,
        description: `${category} event in ${city}`,
        source: this.source,
      })
    }

    return events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }

  /**
   * Get seasonality data for a destination
   */
  private getSeasonalityData(city: string, country: string, month: number): SeasonalityData {
    // Simplified seasonality logic based on common patterns
    const cityLower = city.toLowerCase()
    const countryLower = country.toLowerCase()

    // European cities
    if (this.isEuropeanCity(cityLower, countryLower)) {
      if (month >= 6 && month <= 8) {
        return {
          season: 'peak',
          crowdLevel: 'very-high',
          priceMultiplier: 1.5,
          attractiveness: 9,
          notes: ['Peak summer season', 'Excellent weather', 'Very crowded', 'Higher prices'],
        }
      } else if (month === 5 || month === 9) {
        return {
          season: 'shoulder',
          crowdLevel: 'moderate',
          priceMultiplier: 1.2,
          attractiveness: 8,
          notes: ['Shoulder season', 'Good weather', 'Moderate crowds', 'Better value'],
        }
      } else if (month >= 11 || month <= 2) {
        return {
          season: 'off-peak',
          crowdLevel: 'low',
          priceMultiplier: 0.8,
          attractiveness: 6,
          notes: ['Off-peak season', 'Cold weather', 'Few tourists', 'Best prices'],
        }
      }
    }

    // Tropical destinations
    if (this.isTropicalDestination(cityLower, countryLower)) {
      if (month >= 11 && month <= 3) {
        return {
          season: 'peak',
          crowdLevel: 'high',
          priceMultiplier: 1.4,
          attractiveness: 9,
          notes: ['Dry season', 'Perfect weather', 'Peak crowds', 'Higher prices'],
        }
      } else if (month >= 6 && month <= 9) {
        return {
          season: 'off-peak',
          crowdLevel: 'low',
          priceMultiplier: 0.7,
          attractiveness: 5,
          notes: ['Rainy season', 'Humid weather', 'Few tourists', 'Significant discounts'],
        }
      }
    }

    // Default seasonality
    return {
      season: 'shoulder',
      crowdLevel: 'moderate',
      priceMultiplier: 1.0,
      attractiveness: 7,
      notes: ['Moderate season', 'Typical weather', 'Average crowds', 'Standard pricing'],
    }
  }

  /**
   * Get major events for a destination
   */
  private getMajorEvents(city: string, country: string, month: number): MajorEvent[] {
    const events: MajorEvent[] = []
    const cityLower = city.toLowerCase()

    // Major festivals and events (simplified demo data)
    const eventDatabase: Record<string, MajorEvent[]> = {
      'paris': [
        {
          name: 'Paris Fashion Week',
          type: 'cultural',
          startDate: '2024-09-23',
          endDate: '2024-10-01',
          impact: 'high',
          description: 'Major fashion event attracting global designers and celebrities',
        },
      ],
      'munich': [
        {
          name: 'Oktoberfest',
          type: 'festival',
          startDate: '2024-09-21',
          endDate: '2024-10-06',
          impact: 'extreme',
          description: 'World\'s largest beer festival with millions of visitors',
        },
      ],
      'rio de janeiro': [
        {
          name: 'Carnival',
          type: 'festival',
          startDate: '2024-02-09',
          endDate: '2024-02-14',
          impact: 'extreme',
          description: 'Massive carnival celebration with parades and street parties',
        },
      ],
      'edinburgh': [
        {
          name: 'Edinburgh Festival Fringe',
          type: 'cultural',
          startDate: '2024-08-02',
          endDate: '2024-08-26',
          impact: 'high',
          description: 'World\'s largest arts festival',
        },
      ],
    }

    const cityEvents = eventDatabase[cityLower] || []
    
    // Filter events by month
    return cityEvents.filter(event => {
      const eventMonth = new Date(event.startDate).getMonth() + 1
      return eventMonth === month
    })
  }

  /**
   * Get timing insights based on seasonality and events
   */
  private getTimingInsights(
    seasonality: SeasonalityData,
    majorEvents: MajorEvent[],
    month: number
  ): { advantages: string[]; disadvantages: string[] } {
    const advantages: string[] = []
    const disadvantages: string[] = []

    // Seasonality advantages
    if (seasonality.season === 'shoulder') {
      advantages.push('Shoulder season offers good weather with fewer crowds')
      advantages.push('Better value for accommodation and activities')
    } else if (seasonality.season === 'off-peak') {
      advantages.push('Off-peak season means lowest prices and no crowds')
      advantages.push('Authentic local experience without tourist masses')
    } else if (seasonality.season === 'peak') {
      advantages.push('Peak season ensures best weather conditions')
      advantages.push('All attractions and services fully operational')
    }

    // Seasonality disadvantages
    if (seasonality.season === 'peak') {
      disadvantages.push('Peak season means higher prices (up to 50% more)')
      disadvantages.push('Very crowded attractions with long wait times')
      disadvantages.push('Accommodation may be difficult to book')
    } else if (seasonality.season === 'off-peak') {
      disadvantages.push('Some attractions may have reduced hours or be closed')
      disadvantages.push('Weather may not be ideal for outdoor activities')
    }

    // Major events impact
    majorEvents.forEach(event => {
      if (event.impact === 'extreme' || event.impact === 'high') {
        advantages.push(`${event.name} happening - unique cultural experience`)
        disadvantages.push(`${event.name} causes extreme crowds and price surges`)
        disadvantages.push('Book accommodation well in advance or consider alternative dates')
      } else if (event.impact === 'moderate') {
        advantages.push(`${event.name} adds extra vibrancy to the city`)
      }
    })

    return { advantages, disadvantages }
  }

  /**
   * Helper: Generate event name
   */
  private generateEventName(category: string, city: string): string {
    const templates: Record<string, string[]> = {
      'Festival': ['Music Festival', 'Arts Festival', 'Film Festival', 'Food Festival'],
      'Concert': ['Summer Concert Series', 'Classical Music Night', 'Jazz Festival'],
      'Sports': ['Marathon', 'Championship Finals', 'International Tournament'],
      'Cultural': ['Heritage Week', 'Cultural Celebration', 'Traditional Festival'],
      'Food & Wine': ['Wine Tasting Event', 'Culinary Festival', 'Street Food Fair'],
      'Conference': ['Tech Summit', 'Business Conference', 'Innovation Forum'],
      'Exhibition': ['Art Exhibition', 'Design Showcase', 'Photography Exhibition'],
    }

    const options = templates[category] || ['Local Event']
    const template = options[Math.floor(Math.random() * options.length)]
    return `${city} ${template}`
  }

  /**
   * Helper: Infer country from city
   */
  private inferCountry(city: string): string {
    const cityCountryMap: Record<string, string> = {
      'paris': 'France',
      'london': 'United Kingdom',
      'barcelona': 'Spain',
      'rome': 'Italy',
      'amsterdam': 'Netherlands',
      'berlin': 'Germany',
      'munich': 'Germany',
      'vienna': 'Austria',
      'prague': 'Czech Republic',
      'budapest': 'Hungary',
      'lisbon': 'Portugal',
      'athens': 'Greece',
      'dublin': 'Ireland',
      'edinburgh': 'United Kingdom',
      'copenhagen': 'Denmark',
      'stockholm': 'Sweden',
      'oslo': 'Norway',
      'helsinki': 'Finland',
      'tokyo': 'Japan',
      'bangkok': 'Thailand',
      'singapore': 'Singapore',
      'hong kong': 'Hong Kong',
      'dubai': 'United Arab Emirates',
      'new york': 'United States',
      'los angeles': 'United States',
      'san francisco': 'United States',
      'chicago': 'United States',
      'miami': 'United States',
      'rio de janeiro': 'Brazil',
      'buenos aires': 'Argentina',
      'mexico city': 'Mexico',
      'sydney': 'Australia',
      'melbourne': 'Australia',
      'auckland': 'New Zealand',
    }

    return cityCountryMap[city.toLowerCase()] || 'Unknown'
  }

  /**
   * Helper: Check if European city
   */
  private isEuropeanCity(city: string, country: string): boolean {
    const europeanCountries = [
      'france', 'united kingdom', 'spain', 'italy', 'germany', 'netherlands',
      'austria', 'czech republic', 'hungary', 'portugal', 'greece', 'ireland',
      'denmark', 'sweden', 'norway', 'finland', 'belgium', 'switzerland',
    ]
    return europeanCountries.includes(country.toLowerCase())
  }

  /**
   * Helper: Check if tropical destination
   */
  private isTropicalDestination(city: string, country: string): boolean {
    const tropicalCountries = [
      'thailand', 'indonesia', 'philippines', 'vietnam', 'malaysia',
      'singapore', 'india', 'sri lanka', 'maldives', 'mexico', 'brazil',
      'costa rica', 'jamaica', 'bahamas', 'fiji',
    ]
    return tropicalCountries.includes(country.toLowerCase())
  }

  /**
   * Helper: Get date for specific month
   */
  private getDateForMonth(month: number, day: number = 1): string {
    const year = new Date().getFullYear()
    const date = new Date(year, month - 1, day)
    return date.toISOString().split('T')[0]
  }
}

// Export singleton instance
export const enhancedEventsProvider = new EnhancedEventsProvider()
