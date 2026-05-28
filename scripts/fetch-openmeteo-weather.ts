/**
 * Optional fetch script for Open-Meteo weather data
 * 
 * This script demonstrates how weather data CAN be collected from Open-Meteo.
 * It is NOT run during build - it's for documentation and manual data updates.
 * 
 * Usage: npx tsx scripts/fetch-openmeteo-weather.ts
 */

import fs from 'fs'
import path from 'path'

const OPENMETEO_API_ENDPOINT = 'https://archive-api.open-meteo.com/v1/archive'

interface WeatherData {
  city: string
  country: string
  lat: number
  lon: number
  monthly_averages: Array<{
    month: number
    avg_temp_c: number
    total_precipitation_mm: number
  }>
}

/**
 * Fetch historical weather data from Open-Meteo
 */
async function fetchWeatherFromOpenMeteo(city: string, country: string, lat: number, lon: number): Promise<WeatherData | null> {
  // Fetch last year's data for monthly averages
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setFullYear(startDate.getFullYear() - 1)

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    daily: 'temperature_2m_mean,precipitation_sum',
    timezone: 'auto'
  })

  try {
    const response = await fetch(`${OPENMETEO_API_ENDPOINT}?${params}`)

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Calculate monthly averages
    const monthlyData: Record<number, { temps: number[], precip: number[] }> = {}
    
    data.daily.time.forEach((date: string, index: number) => {
      const month = new Date(date).getMonth() + 1
      if (!monthlyData[month]) {
        monthlyData[month] = { temps: [], precip: [] }
      }
      if (data.daily.temperature_2m_mean[index] !== null) {
        monthlyData[month].temps.push(data.daily.temperature_2m_mean[index])
      }
      if (data.daily.precipitation_sum[index] !== null) {
        monthlyData[month].precip.push(data.daily.precipitation_sum[index])
      }
    })

    const monthly_averages = Object.entries(monthlyData).map(([month, values]) => ({
      month: parseInt(month),
      avg_temp_c: Math.round(values.temps.reduce((a, b) => a + b, 0) / values.temps.length * 10) / 10,
      total_precipitation_mm: Math.round(values.precip.reduce((a, b) => a + b, 0) / values.precip.length * 10) / 10
    }))

    return {
      city,
      country,
      lat,
      lon,
      monthly_averages
    }
  } catch (error) {
    console.error(`❌ Failed to fetch weather for ${city}:`, error)
    
    // Save error for documentation
    const errorPath = path.join(process.cwd(), 'data', 'travel', 'raw', `openmeteo-fetch-error-${city}.json`)
    fs.writeFileSync(errorPath, JSON.stringify({
      city,
      country,
      error: String(error),
      timestamp: new Date().toISOString(),
      message: 'Open-Meteo fetch failed - this is expected if run without network or if API is down'
    }, null, 2))
    
    return null
  }
}

async function main() {
  console.log('📡 TravelScan AI - Open-Meteo Weather Fetcher')
  console.log('⚠️  This is an OPTIONAL script for data collection documentation')
  console.log('⚠️  It is NOT run during build\n')

  // Sample cities to fetch
  const cities = [
    { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lon: -9.1393 },
    { name: 'Athens', country: 'Greece', lat: 37.9838, lon: 23.7275 },
    { name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964 },
  ]

  console.log(`Fetching weather data for ${cities.length} sample cities from Open-Meteo...\n`)
  
  const weatherData: WeatherData[] = []
  
  for (const city of cities) {
    console.log(`Fetching ${city.name}, ${city.country}...`)
    const data = await fetchWeatherFromOpenMeteo(city.name, city.country, city.lat, city.lon)
    if (data) {
      weatherData.push(data)
      console.log(`  ✅ Fetched ${data.monthly_averages.length} months of data`)
    }
    
    // Rate limiting - wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  if (weatherData.length > 0) {
    const outputPath = path.join(process.cwd(), 'data', 'travel', 'raw', 'openmeteo-weather.json')
    fs.writeFileSync(outputPath, JSON.stringify({
      source: 'Open-Meteo Archive API',
      source_url: OPENMETEO_API_ENDPOINT,
      fetched_at: new Date().toISOString(),
      cities_queried: cities.length,
      cities_fetched: weatherData.length,
      data: weatherData
    }, null, 2))
    
    console.log(`\n✅ Fetched weather data for ${weatherData.length} cities`)
    console.log(`📁 Saved to: ${outputPath}`)
    console.log('\n💡 Next step: Run scripts/clean-travel-data.ts to process this raw data')
  } else {
    console.log('\n⚠️  No weather data fetched (network error or API unavailable)')
  }
}

// Only run if executed directly (not during build)
if (require.main === module) {
  main().catch(console.error)
}

export { fetchWeatherFromOpenMeteo }
