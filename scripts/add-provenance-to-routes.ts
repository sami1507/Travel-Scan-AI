import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import fs from 'fs'
import path from 'path'

const routesPath = path.join(process.cwd(), 'data', 'travel', 'routes.csv')
const outputPath = path.join(process.cwd(), 'data', 'travel', 'processed', 'routes.csv')

const routesCSV = fs.readFileSync(routesPath, 'utf-8')
const routes = parse(routesCSV, { columns: true })

const routesWithProvenance = routes.map((route: any) => ({
  ...route,
  source_name: 'TravelScan Curated Route Base',
  source_type: 'curated_route_knowledge',
  source_url_or_query: 'Expert-curated multi-city routes',
  collected_at: '2026-05-28',
  cleaned_at: '2026-05-28',
  confidence_level: 'planning_guidance',
  data_limitations: 'Not live transport schedules or prices; planning-level route design'
}))

const output = stringify(routesWithProvenance, { header: true })
fs.writeFileSync(outputPath, output)

console.log(`✅ Added provenance to ${routes.length} routes`)
console.log(`📁 Saved to: ${outputPath}`)
