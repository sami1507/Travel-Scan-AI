// Real Weather Provider using structured weather data
import type { IWeatherProvider, WeatherData } from './interfaces'
import { describeCondition, getClimateNormals } from './live-climate'

/**
 * Real Weather Provider
 * Primary: live climate normals from Open-Meteo (observed data for the requested
 * month from the latest complete year), marked source 'api'.
 * Fallback: deterministic seasonal patterns by hemisphere/climate zone, marked
 * 'structured', used when the live service is unreachable.
 */
export class RealWeatherProvider implements IWeatherProvider {
  /**
   * Get weather data for a location
   * Uses structured seasonal data based on hemisphere and month
   */
  async getWeather(location: string, date?: string): Promise<WeatherData> {
    const targetDate = date ? new Date(date) : new Date()
    const month = targetDate.getMonth() + 1 // 1-12

    const live = await getClimateNormals(location, month)
    if (live) {
      return {
        location,
        date: targetDate.toISOString().split('T')[0],
        temperature: Math.round(live.temperature * 10) / 10,
        condition: describeCondition(live.temperature, live.precipitation),
        humidity: Math.round(live.humidity),
        windSpeed: Math.round(live.windSpeed * 10) / 10,
        precipitation: Math.round(live.precipitation * 10) / 10,
        source: 'api',
        metadata: {
          dataType: 'observed-monthly-average',
          provider: 'open-meteo.com',
          basedOnYear: live.yearUsed,
          note: 'Average daily conditions for this month in the latest complete year; not a forecast',
        },
      }
    }
    
    // Parse location to determine hemisphere and climate zone
    const { hemisphere, climateZone, countryCode } = this.parseLocation(location)
    
    // Get structured weather based on season and climate
    const weatherPattern = this.getSeasonalWeather(month, hemisphere, climateZone)
    
    return {
      location,
      date: targetDate.toISOString().split('T')[0],
      temperature: weatherPattern.temperature,
      condition: weatherPattern.condition,
      humidity: weatherPattern.humidity,
      windSpeed: weatherPattern.windSpeed,
      precipitation: weatherPattern.precipitation,
      source: 'structured', // Clearly marked as structured data
      metadata: {
        hemisphere,
        climateZone,
        season: this.getSeason(month, hemisphere),
        dataType: 'seasonal-pattern',
      },
    }
  }

  private parseLocation(location: string): {
    hemisphere: 'northern' | 'southern'
    climateZone: 'tropical' | 'temperate' | 'cold'
    countryCode: string
  } {
    // Map of countries to hemisphere and climate
    const locationData: Record<string, any> = {
      // Northern Hemisphere - Temperate
      'france': { hemisphere: 'northern', climateZone: 'temperate', code: 'FR' },
      'spain': { hemisphere: 'northern', climateZone: 'temperate', code: 'ES' },
      'italy': { hemisphere: 'northern', climateZone: 'temperate', code: 'IT' },
      'japan': { hemisphere: 'northern', climateZone: 'temperate', code: 'JP' },
      'usa': { hemisphere: 'northern', climateZone: 'temperate', code: 'US' },
      'uk': { hemisphere: 'northern', climateZone: 'temperate', code: 'GB' },
      'germany': { hemisphere: 'northern', climateZone: 'temperate', code: 'DE' },
      'greece': { hemisphere: 'northern', climateZone: 'temperate', code: 'GR' },
      
      // Northern Hemisphere - Tropical
      'thailand': { hemisphere: 'northern', climateZone: 'tropical', code: 'TH' },
      'mexico': { hemisphere: 'northern', climateZone: 'tropical', code: 'MX' },
      'vietnam': { hemisphere: 'northern', climateZone: 'tropical', code: 'VN' },
      
      // Southern Hemisphere - Temperate
      'australia': { hemisphere: 'southern', climateZone: 'temperate', code: 'AU' },
      'new zealand': { hemisphere: 'southern', climateZone: 'temperate', code: 'NZ' },
      'argentina': { hemisphere: 'southern', climateZone: 'temperate', code: 'AR' },
      'chile': { hemisphere: 'southern', climateZone: 'temperate', code: 'CL' },
      
      // Southern Hemisphere - Tropical
      'brazil': { hemisphere: 'southern', climateZone: 'tropical', code: 'BR' },
      'indonesia': { hemisphere: 'southern', climateZone: 'tropical', code: 'ID' },
    }

    const locationLower = location.toLowerCase()
    for (const [key, value] of Object.entries(locationData)) {
      if (locationLower.includes(key)) {
        return {
          hemisphere: value.hemisphere,
          climateZone: value.climateZone,
          countryCode: value.code,
        }
      }
    }

    // Default to northern temperate
    return { hemisphere: 'northern', climateZone: 'temperate', countryCode: 'XX' }
  }

  private getSeason(month: number, hemisphere: 'northern' | 'southern'): string {
    // Northern hemisphere seasons
    const northernSeasons = {
      winter: [12, 1, 2],
      spring: [3, 4, 5],
      summer: [6, 7, 8],
      fall: [9, 10, 11],
    }

    // Southern hemisphere is opposite
    const southernSeasons = {
      summer: [12, 1, 2],
      fall: [3, 4, 5],
      winter: [6, 7, 8],
      spring: [9, 10, 11],
    }

    const seasons = hemisphere === 'northern' ? northernSeasons : southernSeasons

    for (const [season, months] of Object.entries(seasons)) {
      if (months.includes(month)) {
        return season
      }
    }

    return 'unknown'
  }

  private getSeasonalWeather(
    month: number,
    hemisphere: 'northern' | 'southern',
    climateZone: 'tropical' | 'temperate' | 'cold'
  ): {
    temperature: number
    condition: string
    humidity: number
    windSpeed: number
    precipitation: number
  } {
    const season = this.getSeason(month, hemisphere)

    // Tropical climate (consistent year-round)
    if (climateZone === 'tropical') {
      return {
        temperature: 30, // 28-32°C
        condition: 'Warm with frequent showers',
        humidity: 80, // 70-90%
        windSpeed: 15, // 10-20 km/h
        precipitation: 12.5, // 5-20mm
      }
    }

    // Temperate climate (seasonal variation)
    const temperatePatterns: Record<string, any> = {
      winter: {
        temperature: 7.5, // 5-10°C
        condition: 'Cloudy',
        humidity: 82.5,
        windSpeed: 22.5,
        precipitation: 6.5,
      },
      spring: {
        temperature: 17.5, // 15-20°C
        condition: 'Partly Cloudy',
        humidity: 70,
        windSpeed: 15,
        precipitation: 4.5,
      },
      summer: {
        temperature: 27.5, // 25-30°C
        condition: 'Sunny',
        humidity: 60,
        windSpeed: 12,
        precipitation: 3,
      },
      fall: {
        temperature: 16, // 12-20°C
        condition: 'Partly Cloudy',
        humidity: 75,
        windSpeed: 18,
        precipitation: 6,
      },
    }

    return temperatePatterns[season] || temperatePatterns.spring
  }

  /**
   * Get weather forecast for multiple days
   */
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
