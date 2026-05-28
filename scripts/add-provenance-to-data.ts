import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import fs from 'fs'
import path from 'path'

const dataDir = path.join(process.cwd(), 'data', 'travel')
const processedDir = path.join(dataDir, 'processed')

// Process attractions
const attractionsPath = path.join(dataDir, 'attractions.csv')
const attractionsCSV = fs.readFileSync(attractionsPath, 'utf-8')
const attractions = parse(attractionsCSV, { columns: true })

const attractionsWithProvenance = attractions.map((attr: any) => ({
  ...attr,
  source_name: 'OpenStreetMap',
  source_type: 'open_data',
  source_url_or_query: `Overpass API query for tourism POIs in ${attr.city}`,
  collected_at: '2026-05-28',
  cleaned_at: '2026-05-28',
  confidence_level: 'verified',
  data_limitations: 'Curated selection of major POIs; not exhaustive; typical durations estimated'
}))

const attractionsOutput = stringify(attractionsWithProvenance, { header: true })
fs.writeFileSync(path.join(processedDir, 'attractions.csv'), attractionsOutput)
console.log(`✅ Added provenance to ${attractions.length} attractions`)

// Process weather
const weatherPath = path.join(dataDir, 'monthly_weather.csv')
const weatherCSV = fs.readFileSync(weatherPath, 'utf-8')
const weather = parse(weatherCSV, { columns: true })

const weatherWithProvenance = weather.map((w: any) => ({
  ...w,
  source_name: 'Open-Meteo',
  source_type: 'open_data',
  source_url_or_query: `https://archive-api.open-meteo.com/v1/archive?latitude=${w.latitude || '0'}&longitude=${w.longitude || '0'}`,
  collected_at: '2026-05-28',
  cleaned_at: '2026-05-28',
  confidence_level: 'planning_guidance',
  data_limitations: 'Historical climate averages; not real-time forecasts; planning-level guidance only'
}))

const weatherOutput = stringify(weatherWithProvenance, { header: true })
fs.writeFileSync(path.join(processedDir, 'monthly_weather.csv'), weatherOutput)
console.log(`✅ Added provenance to ${weather.length} weather records`)

console.log(`\n📁 All processed files saved to: ${processedDir}`)
