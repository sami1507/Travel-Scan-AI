// Mock Events Provider
import { BaseProvider } from './base-provider'
import type { ProviderResponse, SourceConfig, NormalizedRecord } from '../types'
import { sleep } from '../utils'
import { eventsPayloadSchema } from '../schemas/provider-schemas'

export class EventsProvider extends BaseProvider {
  name = 'Mock Events Provider'
  type = 'events' as const

  async fetch(config: SourceConfig): Promise<ProviderResponse> {
    try {
      await sleep(400 + Math.random() * 600)

      const settings = config.parser_settings as {
        city?: string
        start_date?: string
        end_date?: string
      }

      const mockEvents = this.generateMockEvents(
        settings.city || 'London',
        settings.start_date || new Date().toISOString().split('T')[0],
        settings.end_date
      )

      return {
        success: true,
        data: mockEvents,
        metadata: {
          provider: this.name,
          fetched_at: new Date().toISOString(),
          count: mockEvents.length,
        },
      }
    } catch (error) {
      return this.handleError(error, 'fetch')
    }
  }

  validate(data: any): boolean {
    try {
      eventsPayloadSchema.parse(data)
      return true
    } catch {
      return false
    }
  }

  normalize(data: any, config: SourceConfig, ingestionRunId: string): NormalizedRecord[] {
    if (!this.validate(data)) {
      throw new Error('Invalid events data structure')
    }

    return data.map((event: any) => 
      this.createNormalizedRecord(
        config.id,
        ingestionRunId,
        event.id,
        'event',
        {
          name: event.name,
          description: event.description,
          category: event.category,
          date: event.date,
          time: event.time,
          venue: event.venue,
          address: event.address,
          city: event.city,
          price_min: event.price_min,
          price_max: event.price_max,
          currency: event.currency,
          tickets_available: event.tickets_available,
          capacity: event.capacity,
        },
        {
          url: event.url,
          organizer: event.organizer,
        }
      )
    )
  }

  private generateMockEvents(city: string, startDate: string, endDate?: string) {
    const categories = ['Concert', 'Theater', 'Sports', 'Festival', 'Exhibition', 'Conference', 'Comedy', 'Opera']
    const venues = [
      'Royal Albert Hall',
      'O2 Arena',
      'Wembley Stadium',
      'National Theatre',
      'Hyde Park',
      'Convention Center',
      'City Hall',
      'Opera House',
    ]

    const eventNames = [
      'Summer Music Festival',
      'Classical Symphony Night',
      'International Food Fair',
      'Tech Innovation Summit',
      'Art & Design Exhibition',
      'Comedy Night Live',
      'Championship Finals',
      'Broadway Musical',
      'Jazz & Blues Evening',
      'Cultural Heritage Festival',
    ]

    const events = []
    const eventCount = 10 + Math.floor(Math.random() * 15)

    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))

    for (let i = 0; i < eventCount; i++) {
      const eventDate = new Date(start.getTime() + Math.random() * daysDiff * 24 * 60 * 60 * 1000)
      const category = categories[Math.floor(Math.random() * categories.length)]
      const priceMin = Math.floor(Math.random() * 50) + 10
      const priceMax = priceMin + Math.floor(Math.random() * 100) + 20

      events.push({
        id: `EVT${Date.now()}-${i}`,
        name: eventNames[i % eventNames.length] + (i >= eventNames.length ? ` ${Math.floor(i / eventNames.length) + 1}` : ''),
        description: `An exciting ${category.toLowerCase()} event featuring world-class performances and entertainment.`,
        category,
        date: eventDate.toISOString().split('T')[0],
        time: `${String(Math.floor(Math.random() * 12) + 10).padStart(2, '0')}:${['00', '30'][Math.floor(Math.random() * 2)]}`,
        venue: venues[Math.floor(Math.random() * venues.length)],
        address: `${Math.floor(Math.random() * 500) + 1} ${['Main', 'High', 'Park', 'King', 'Queen'][Math.floor(Math.random() * 5)]} Street`,
        city,
        price_min: priceMin,
        price_max: priceMax,
        currency: 'USD',
        tickets_available: Math.floor(Math.random() * 500) + 50,
        capacity: Math.floor(Math.random() * 2000) + 500,
        url: `https://example.com/events/${i}`,
        organizer: `${category} Productions Ltd`,
      })
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
}
