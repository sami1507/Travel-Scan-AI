// Mock Weather Provider
import { BaseProvider } from './base-provider'
import type { ProviderResponse, SourceConfig, NormalizedRecord } from '../types'
import { sleep } from '../utils'
import { weatherPayloadSchema } from '../schemas/provider-schemas'

export class WeatherProvider extends BaseProvider {
  name = 'Mock Weather Provider'
  type = 'weather' as const

  async fetch(config: SourceConfig): Promise<ProviderResponse> {
    try {
      await sleep(300 + Math.random() * 500)

      const settings = config.parser_settings as {
        city?: string
        country?: string
      }

      const mockWeather = this.generateMockWeather(
        settings.city || 'London',
        settings.country || 'GB'
      )

      return {
        success: true,
        data: mockWeather,
        metadata: {
          provider: this.name,
          fetched_at: new Date().toISOString(),
        },
      }
    } catch (error) {
      return this.handleError(error, 'fetch')
    }
  }

  validate(data: any): boolean {
    try {
      weatherPayloadSchema.parse(data)
      return true
    } catch {
      return false
    }
  }

  normalize(data: any, config: SourceConfig, ingestionRunId: string): NormalizedRecord[] {
    if (!this.validate(data)) {
      throw new Error('Invalid weather data structure')
    }

    const records: NormalizedRecord[] = []

    // Current weather
    records.push(
      this.createNormalizedRecord(
        config.id,
        ingestionRunId,
        `current-${data.city}`,
        'weather_current',
        {
          city: data.city,
          country: data.country,
          temperature: data.current.temperature,
          feels_like: data.current.feels_like,
          humidity: data.current.humidity,
          pressure: data.current.pressure,
          wind_speed: data.current.wind_speed,
          wind_direction: data.current.wind_direction,
          conditions: data.current.conditions,
          description: data.current.description,
          visibility: data.current.visibility,
          uv_index: data.current.uv_index,
        },
        {
          timestamp: data.current.timestamp,
        }
      )
    )

    // Forecast
    data.forecast.forEach((day: any, index: number) => {
      records.push(
        this.createNormalizedRecord(
          config.id,
          ingestionRunId,
          `forecast-${data.city}-${day.date}`,
          'weather_forecast',
          {
            city: data.city,
            date: day.date,
            temp_min: day.temp_min,
            temp_max: day.temp_max,
            conditions: day.conditions,
            description: day.description,
            precipitation_chance: day.precipitation_chance,
            precipitation_amount: day.precipitation_amount,
            wind_speed: day.wind_speed,
            humidity: day.humidity,
          },
          {
            day_index: index,
          }
        )
      )
    })

    return records
  }

  private generateMockWeather(city: string, country: string) {
    const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Sunny', 'Overcast']
    const currentCondition = conditions[Math.floor(Math.random() * conditions.length)]
    const baseTemp = 15 + Math.random() * 15

    const forecast = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const dayTemp = baseTemp + (Math.random() - 0.5) * 5

      forecast.push({
        date: date.toISOString().split('T')[0],
        temp_min: Math.round(dayTemp - 3),
        temp_max: Math.round(dayTemp + 5),
        conditions: conditions[Math.floor(Math.random() * conditions.length)],
        description: this.getWeatherDescription(conditions[Math.floor(Math.random() * conditions.length)]),
        precipitation_chance: Math.floor(Math.random() * 100),
        precipitation_amount: Math.random() * 10,
        wind_speed: Math.floor(Math.random() * 30) + 5,
        humidity: Math.floor(Math.random() * 40) + 40,
      })
    }

    return {
      city,
      country,
      current: {
        temperature: Math.round(baseTemp),
        feels_like: Math.round(baseTemp + (Math.random() - 0.5) * 3),
        humidity: Math.floor(Math.random() * 40) + 40,
        pressure: Math.floor(Math.random() * 50) + 1000,
        wind_speed: Math.floor(Math.random() * 30) + 5,
        wind_direction: Math.floor(Math.random() * 360),
        conditions: currentCondition,
        description: this.getWeatherDescription(currentCondition),
        visibility: Math.floor(Math.random() * 5) + 5,
        uv_index: Math.floor(Math.random() * 11),
        timestamp: new Date().toISOString(),
      },
      forecast,
    }
  }

  private getWeatherDescription(condition: string): string {
    const descriptions: Record<string, string> = {
      'Clear': 'Clear sky with excellent visibility',
      'Partly Cloudy': 'Partly cloudy with some sunshine',
      'Cloudy': 'Overcast with clouds',
      'Rainy': 'Rain expected throughout the day',
      'Sunny': 'Bright sunny day',
      'Overcast': 'Completely overcast skies',
    }
    return descriptions[condition] || 'Weather conditions'
  }
}
