/**
 * Optional fetch script for Wikidata destinations
 * 
 * This script demonstrates how destination data CAN be collected from Wikidata.
 * It is NOT run during build - it's for documentation and manual data updates.
 * 
 * Usage: npx tsx scripts/fetch-wikidata-destinations.ts
 */

import fs from 'fs'
import path from 'path'

const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'

interface WikidataCity {
  cityLabel: string
  countryLabel: string
  lat: string
  lon: string
  population?: string
  wikidataId: string
}

/**
 * Fetch city data from Wikidata using SPARQL query
 */
async function fetchCitiesFromWikidata(countries: string[]): Promise<WikidataCity[]> {
  const countryFilter = countries.map(c => `"${c}"@en`).join(', ')
  
  const query = `
    SELECT ?city ?cityLabel ?country ?countryLabel ?lat ?lon ?population WHERE {
      ?city wdt:P31 wd:Q515.  # instance of city
      ?city wdt:P17 ?country.  # country
      ?city wdt:P625 ?coords.  # coordinates
      ?city wdt:P1082 ?population.  # population
      
      BIND(geof:latitude(?coords) AS ?lat)
      BIND(geof:longitude(?coords) AS ?lon)
      
      ?country rdfs:label ?countryLabel.
      FILTER(?countryLabel IN (${countryFilter}))
      FILTER(LANG(?countryLabel) = "en")
      
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?population)
    LIMIT 100
  `

  try {
    const response = await fetch(WIKIDATA_SPARQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'TravelScan-AI-GraduationProject/1.0'
      },
      body: `query=${encodeURIComponent(query)}`
    })

    if (!response.ok) {
      throw new Error(`Wikidata API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return data.results.bindings.map((binding: any) => ({
      cityLabel: binding.cityLabel.value,
      countryLabel: binding.countryLabel.value,
      lat: binding.lat.value,
      lon: binding.lon.value,
      population: binding.population?.value,
      wikidataId: binding.city.value.split('/').pop()
    }))
  } catch (error) {
    console.error('❌ Failed to fetch from Wikidata:', error)
    
    // Save error for documentation
    const errorPath = path.join(process.cwd(), 'data', 'travel', 'raw', 'wikidata-fetch-error.json')
    fs.writeFileSync(errorPath, JSON.stringify({
      error: String(error),
      timestamp: new Date().toISOString(),
      message: 'Wikidata fetch failed - this is expected if run without network or if API is down'
    }, null, 2))
    
    return []
  }
}

async function main() {
  console.log('📡 TravelScan AI - Wikidata Destinations Fetcher')
  console.log('⚠️  This is an OPTIONAL script for data collection documentation')
  console.log('⚠️  It is NOT run during build\n')

  const countries = [
    'Portugal', 'Greece', 'Italy', 'Croatia', 'Slovenia',
    'Romania', 'Georgia', 'Austria', 'Hungary', 'Czech Republic',
    'Cyprus', 'Albania'
  ]

  console.log(`Fetching cities for ${countries.length} countries from Wikidata...`)
  
  const cities = await fetchCitiesFromWikidata(countries)
  
  if (cities.length > 0) {
    const outputPath = path.join(process.cwd(), 'data', 'travel', 'raw', 'wikidata-destinations.json')
    fs.writeFileSync(outputPath, JSON.stringify({
      source: 'Wikidata SPARQL API',
      source_url: WIKIDATA_SPARQL_ENDPOINT,
      fetched_at: new Date().toISOString(),
      query_countries: countries,
      results_count: cities.length,
      data: cities
    }, null, 2))
    
    console.log(`✅ Fetched ${cities.length} cities from Wikidata`)
    console.log(`📁 Saved to: ${outputPath}`)
    console.log('\n💡 Next step: Run scripts/clean-travel-data.ts to process this raw data')
  } else {
    console.log('⚠️  No cities fetched (network error or API unavailable)')
    console.log('📁 Error details saved to: data/travel/raw/wikidata-fetch-error.json')
  }
}

// Only run if executed directly (not during build)
if (require.main === module) {
  main().catch(console.error)
}

export { fetchCitiesFromWikidata }
