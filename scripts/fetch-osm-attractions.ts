/**
 * Optional fetch script for OpenStreetMap attractions
 * 
 * This script demonstrates how attraction data CAN be collected from OpenStreetMap.
 * It is NOT run during build - it's for documentation and manual data updates.
 * 
 * Usage: npx tsx scripts/fetch-osm-attractions.ts
 */

import fs from 'fs'
import path from 'path'

const OVERPASS_API_ENDPOINT = 'https://overpass-api.de/api/interpreter'

interface OSMAttraction {
  name: string
  type: string
  lat: number
  lon: number
  tags: Record<string, string>
  osmId: string
}

/**
 * Fetch attractions from OpenStreetMap using Overpass API
 */
async function fetchAttractionsFromOSM(city: string, lat: number, lon: number, radiusKm: number = 10): Promise<OSMAttraction[]> {
  const radiusMeters = radiusKm * 1000
  
  // Overpass QL query for tourism POIs
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"](around:${radiusMeters},${lat},${lon});
      way["tourism"](around:${radiusMeters},${lat},${lon});
      relation["tourism"](around:${radiusMeters},${lat},${lon});
      node["historic"](around:${radiusMeters},${lat},${lon});
      way["historic"](around:${radiusMeters},${lat},${lon});
    );
    out center;
  `

  try {
    const response = await fetch(OVERPASS_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'TravelScan-AI-GraduationProject/1.0'
      },
      body: `data=${encodeURIComponent(query)}`
    })

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return data.elements
      .filter((el: any) => el.tags?.name)
      .map((el: any) => ({
        name: el.tags.name,
        type: el.type,
        lat: el.lat || el.center?.lat,
        lon: el.lon || el.center?.lon,
        tags: el.tags,
        osmId: `${el.type}/${el.id}`
      }))
      .slice(0, 50) // Limit to top 50 per city
  } catch (error) {
    console.error(`❌ Failed to fetch OSM data for ${city}:`, error)
    
    // Save error for documentation
    const errorPath = path.join(process.cwd(), 'data', 'travel', 'raw', `osm-fetch-error-${city}.json`)
    fs.writeFileSync(errorPath, JSON.stringify({
      city,
      error: String(error),
      timestamp: new Date().toISOString(),
      message: 'OSM fetch failed - this is expected if run without network or if API is down'
    }, null, 2))
    
    return []
  }
}

async function main() {
  console.log('📡 TravelScan AI - OpenStreetMap Attractions Fetcher')
  console.log('⚠️  This is an OPTIONAL script for data collection documentation')
  console.log('⚠️  It is NOT run during build\n')

  // Sample cities to fetch
  const cities = [
    { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lon: -9.1393 },
    { name: 'Athens', country: 'Greece', lat: 37.9838, lon: 23.7275 },
    { name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964 },
  ]

  console.log(`Fetching attractions for ${cities.length} sample cities from OpenStreetMap...\n`)
  
  const allAttractions: Record<string, OSMAttraction[]> = {}
  
  for (const city of cities) {
    console.log(`Fetching ${city.name}, ${city.country}...`)
    const attractions = await fetchAttractionsFromOSM(city.name, city.lat, city.lon)
    allAttractions[city.name] = attractions
    console.log(`  ✅ Found ${attractions.length} attractions`)
    
    // Rate limiting - wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  const totalAttractions = Object.values(allAttractions).reduce((sum, arr) => sum + arr.length, 0)
  
  if (totalAttractions > 0) {
    const outputPath = path.join(process.cwd(), 'data', 'travel', 'raw', 'osm-attractions.json')
    fs.writeFileSync(outputPath, JSON.stringify({
      source: 'OpenStreetMap Overpass API',
      source_url: OVERPASS_API_ENDPOINT,
      fetched_at: new Date().toISOString(),
      cities_queried: cities.length,
      total_attractions: totalAttractions,
      data: allAttractions
    }, null, 2))
    
    console.log(`\n✅ Fetched ${totalAttractions} attractions from OpenStreetMap`)
    console.log(`📁 Saved to: ${outputPath}`)
    console.log('\n💡 Next step: Run scripts/clean-travel-data.ts to process this raw data')
  } else {
    console.log('\n⚠️  No attractions fetched (network error or API unavailable)')
  }
}

// Only run if executed directly (not during build)
if (require.main === module) {
  main().catch(console.error)
}

export { fetchAttractionsFromOSM }
