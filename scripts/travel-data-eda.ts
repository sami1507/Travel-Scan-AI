import { parse } from 'csv-parse/sync'
import fs from 'fs'
import path from 'path'

interface Destination {
  country: string
  city: string
  region: string
  latitude: string
  longitude: string
  budget_level: string
  main_interests: string
  notes: string
}

interface Route {
  route_id: string
  country: string
  route_name: string
  route_type: string
  cities: string
  recommended_nights: string
  min_days: string
  max_days: string
  budget_level: string
  fatigue_level: string
  best_months: string
  avoid_months: string
  interests: string
  region: string
  why_route_fits: string
  watch_out: string
}

interface Attraction {
  country: string
  city: string
  name: string
  category: string
  interest_tags: string
  typical_duration_hours: string
  best_time_of_day: string
  source_type: string
  notes: string
}

interface Weather {
  country: string
  city: string
  month: string
  avg_temp_c: string
  rain_risk: string
  weather_score: string
  crowd_risk: string
  summer_warning: string
  season_note: string
}

interface EvaluationScenario {
  id: string
  name: string
  departureCity: string
  passportCountry: string
  tripLength: number
  budget: string
  travelMonths: number[]
  interests: string[]
  tripStructure: string
  destination?: string
  expected: {
    mustBeMultiCity: boolean
    avoidLongHaul: boolean
    allowedRegions: string[]
    mustHaveWatchOut: boolean
    mustHaveBeforeBookingChecks: boolean
    minimumRouteCities: number
    bannedCountries: string[]
  }
}

console.log('📊 TravelScan AI - Travel Data EDA\n')

// Load datasets
const dataDir = path.join(process.cwd(), 'data', 'travel')
const processedDir = path.join(dataDir, 'processed')

// Prefer processed files, fallback to original
const destinationsPath = fs.existsSync(path.join(processedDir, 'destinations.csv'))
  ? path.join(processedDir, 'destinations.csv')
  : path.join(dataDir, 'destinations.csv')
const destinationsCSV = fs.readFileSync(destinationsPath, 'utf-8')
const destinations: Destination[] = parse(destinationsCSV, { columns: true })

const routesPath = fs.existsSync(path.join(processedDir, 'routes.csv'))
  ? path.join(processedDir, 'routes.csv')
  : path.join(dataDir, 'routes.csv')
const routesCSV = fs.readFileSync(routesPath, 'utf-8')
const routes: Route[] = parse(routesCSV, { columns: true })

const attractionsPath = fs.existsSync(path.join(processedDir, 'attractions.csv'))
  ? path.join(processedDir, 'attractions.csv')
  : path.join(dataDir, 'attractions.csv')
const attractionsCSV = fs.readFileSync(attractionsPath, 'utf-8')
const attractions: Attraction[] = parse(attractionsCSV, { columns: true })

const weatherPath = fs.existsSync(path.join(processedDir, 'monthly_weather.csv'))
  ? path.join(processedDir, 'monthly_weather.csv')
  : path.join(dataDir, 'monthly_weather.csv')
const weatherCSV = fs.readFileSync(weatherPath, 'utf-8')
const weather: Weather[] = parse(weatherCSV, { columns: true })

const scenariosJSON = fs.readFileSync(path.join(dataDir, 'evaluation_scenarios.json'), 'utf-8')
const scenarios: EvaluationScenario[] = JSON.parse(scenariosJSON)

console.log(`📁 Reading from: ${destinationsPath.includes('processed') ? 'processed/' : 'original'} files\n`)

// Compute summary statistics
const summary = {
  overview: {
    total_countries: new Set(destinations.map(d => d.country)).size,
    total_cities: destinations.length,
    total_routes: routes.length,
    total_attractions: attractions.length,
    total_weather_records: weather.length,
    total_evaluation_scenarios: scenarios.length,
  },
  destinations: {
    by_region: {} as Record<string, number>,
    by_budget_level: {} as Record<string, number>,
    countries: Array.from(new Set(destinations.map(d => d.country))).sort(),
  },
  routes: {
    by_country: {} as Record<string, number>,
    by_region: {} as Record<string, number>,
    by_route_type: {} as Record<string, number>,
    by_budget_level: {} as Record<string, number>,
    by_fatigue_level: {} as Record<string, number>,
    by_best_months: {} as Record<string, number>,
    avg_recommended_nights: 0,
    avg_min_days: 0,
    avg_max_days: 0,
  },
  attractions: {
    by_country: {} as Record<string, number>,
    by_category: {} as Record<string, number>,
    by_source_type: {} as Record<string, number>,
    avg_duration_hours: 0,
  },
  weather: {
    cities_with_data: new Set(weather.map(w => `${w.country}-${w.city}`)).size,
    avg_weather_score_by_month: {} as Record<string, number>,
    high_weather_score_months: [] as string[],
  },
  evaluation: {
    by_trip_length: {} as Record<string, number>,
    by_budget: {} as Record<string, number>,
    by_trip_structure: {} as Record<string, number>,
    with_fixed_destination: 0,
    with_banned_countries: 0,
  },
  provenance: {
    destinations_by_source_type: {} as Record<string, number>,
    routes_by_source_type: {} as Record<string, number>,
    attractions_by_source_type: {} as Record<string, number>,
    weather_by_source_type: {} as Record<string, number>,
    total_curated: 0,
    total_open_data: 0,
    has_provenance_fields: false,
  },
}

// Destinations analysis
destinations.forEach(d => {
  summary.destinations.by_region[d.region] = (summary.destinations.by_region[d.region] || 0) + 1
  summary.destinations.by_budget_level[d.budget_level] = (summary.destinations.by_budget_level[d.budget_level] || 0) + 1
})

// Routes analysis
let totalNights = 0
let totalMinDays = 0
let totalMaxDays = 0

routes.forEach(r => {
  summary.routes.by_country[r.country] = (summary.routes.by_country[r.country] || 0) + 1
  summary.routes.by_region[r.region] = (summary.routes.by_region[r.region] || 0) + 1
  summary.routes.by_route_type[r.route_type] = (summary.routes.by_route_type[r.route_type] || 0) + 1
  summary.routes.by_budget_level[r.budget_level] = (summary.routes.by_budget_level[r.budget_level] || 0) + 1
  summary.routes.by_fatigue_level[r.fatigue_level] = (summary.routes.by_fatigue_level[r.fatigue_level] || 0) + 1
  
  totalNights += parseInt(r.recommended_nights)
  totalMinDays += parseInt(r.min_days)
  totalMaxDays += parseInt(r.max_days)
  
  // Parse best months
  const bestMonths = r.best_months.split(',').map(m => m.trim())
  bestMonths.forEach(month => {
    summary.routes.by_best_months[month] = (summary.routes.by_best_months[month] || 0) + 1
  })
})

summary.routes.avg_recommended_nights = Math.round(totalNights / routes.length * 10) / 10
summary.routes.avg_min_days = Math.round(totalMinDays / routes.length * 10) / 10
summary.routes.avg_max_days = Math.round(totalMaxDays / routes.length * 10) / 10

// Attractions analysis
let totalDuration = 0
let durationCount = 0

attractions.forEach(a => {
  summary.attractions.by_country[a.country] = (summary.attractions.by_country[a.country] || 0) + 1
  summary.attractions.by_category[a.category] = (summary.attractions.by_category[a.category] || 0) + 1
  summary.attractions.by_source_type[a.source_type] = (summary.attractions.by_source_type[a.source_type] || 0) + 1
  
  const duration = parseFloat(a.typical_duration_hours)
  if (!isNaN(duration)) {
    totalDuration += duration
    durationCount++
  }
})

summary.attractions.avg_duration_hours = Math.round(totalDuration / durationCount * 10) / 10

// Weather analysis
const weatherScoreByMonth: Record<string, number[]> = {}

weather.forEach(w => {
  if (!weatherScoreByMonth[w.month]) {
    weatherScoreByMonth[w.month] = []
  }
  weatherScoreByMonth[w.month].push(parseInt(w.weather_score))
})

Object.keys(weatherScoreByMonth).forEach(month => {
  const scores = weatherScoreByMonth[month]
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  summary.weather.avg_weather_score_by_month[month] = Math.round(avg)
})

// Find high weather score months (avg > 80)
summary.weather.high_weather_score_months = Object.entries(summary.weather.avg_weather_score_by_month)
  .filter(([_, score]) => score >= 80)
  .map(([month, _]) => month)
  .sort((a, b) => parseInt(a) - parseInt(b))

// Evaluation scenarios analysis
scenarios.forEach(s => {
  const lengthKey = `${s.tripLength}d`
  summary.evaluation.by_trip_length[lengthKey] = (summary.evaluation.by_trip_length[lengthKey] || 0) + 1
  summary.evaluation.by_budget[s.budget] = (summary.evaluation.by_budget[s.budget] || 0) + 1
  summary.evaluation.by_trip_structure[s.tripStructure] = (summary.evaluation.by_trip_structure[s.tripStructure] || 0) + 1
  
  if (s.destination) {
    summary.evaluation.with_fixed_destination++
  }
  if (s.expected.bannedCountries.length > 0) {
    summary.evaluation.with_banned_countries++
  }
})

// Provenance analysis (check if processed files have provenance fields)
const hasProvenanceFields = (destinations[0] as any).source_type !== undefined

summary.provenance.has_provenance_fields = hasProvenanceFields

if (hasProvenanceFields) {
  destinations.forEach((d: any) => {
    const sourceType = d.source_type || 'unknown'
    summary.provenance.destinations_by_source_type[sourceType] = (summary.provenance.destinations_by_source_type[sourceType] || 0) + 1
    if (sourceType === 'open_data') summary.provenance.total_open_data++
    if (sourceType === 'curated' || sourceType === 'curated_route_knowledge') summary.provenance.total_curated++
  })

  routes.forEach((r: any) => {
    const sourceType = r.source_type || 'unknown'
    summary.provenance.routes_by_source_type[sourceType] = (summary.provenance.routes_by_source_type[sourceType] || 0) + 1
    if (sourceType === 'curated' || sourceType === 'curated_route_knowledge') summary.provenance.total_curated++
  })

  attractions.forEach((a: any) => {
    const sourceType = a.source_type || 'unknown'
    summary.provenance.attractions_by_source_type[sourceType] = (summary.provenance.attractions_by_source_type[sourceType] || 0) + 1
    if (sourceType === 'open_data') summary.provenance.total_open_data++
    if (sourceType === 'curated') summary.provenance.total_curated++
  })

  weather.forEach((w: any) => {
    const sourceType = w.source_type || 'unknown'
    summary.provenance.weather_by_source_type[sourceType] = (summary.provenance.weather_by_source_type[sourceType] || 0) + 1
    if (sourceType === 'open_data') summary.provenance.total_open_data++
  })
}

// Print summary
console.log('='.repeat(80))
console.log('OVERVIEW')
console.log('='.repeat(80))
console.log(`Total Countries:          ${summary.overview.total_countries}`)
console.log(`Total Cities:             ${summary.overview.total_cities}`)
console.log(`Total Routes:             ${summary.overview.total_routes}`)
console.log(`Total Attractions:        ${summary.overview.total_attractions}`)
console.log(`Total Weather Records:    ${summary.overview.total_weather_records}`)
console.log(`Total Eval Scenarios:     ${summary.overview.total_evaluation_scenarios}`)
console.log()

console.log('='.repeat(80))
console.log('DESTINATIONS')
console.log('='.repeat(80))
console.log('Countries:', summary.destinations.countries.join(', '))
console.log()
console.log('By Region:')
Object.entries(summary.destinations.by_region)
  .sort((a, b) => b[1] - a[1])
  .forEach(([region, count]) => {
    console.log(`  ${region.padEnd(20)} ${count}`)
  })
console.log()
console.log('By Budget Level:')
Object.entries(summary.destinations.by_budget_level)
  .sort((a, b) => b[1] - a[1])
  .forEach(([level, count]) => {
    console.log(`  ${level.padEnd(20)} ${count}`)
  })
console.log()

console.log('='.repeat(80))
console.log('ROUTES')
console.log('='.repeat(80))
console.log(`Average Recommended Nights: ${summary.routes.avg_recommended_nights}`)
console.log(`Average Min Days:           ${summary.routes.avg_min_days}`)
console.log(`Average Max Days:           ${summary.routes.avg_max_days}`)
console.log()
console.log('By Country:')
Object.entries(summary.routes.by_country)
  .sort((a, b) => b[1] - a[1])
  .forEach(([country, count]) => {
    console.log(`  ${country.padEnd(20)} ${count}`)
  })
console.log()
console.log('By Region:')
Object.entries(summary.routes.by_region)
  .sort((a, b) => b[1] - a[1])
  .forEach(([region, count]) => {
    console.log(`  ${region.padEnd(20)} ${count}`)
  })
console.log()
console.log('By Route Type:')
Object.entries(summary.routes.by_route_type)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  ${type.padEnd(30)} ${count}`)
  })
console.log()
console.log('By Budget Level:')
Object.entries(summary.routes.by_budget_level)
  .sort((a, b) => b[1] - a[1])
  .forEach(([level, count]) => {
    console.log(`  ${level.padEnd(20)} ${count}`)
  })
console.log()
console.log('By Fatigue Level:')
Object.entries(summary.routes.by_fatigue_level)
  .sort((a, b) => b[1] - a[1])
  .forEach(([level, count]) => {
    console.log(`  ${level.padEnd(20)} ${count}`)
  })
console.log()
console.log('Top Best Months (most routes):')
Object.entries(summary.routes.by_best_months)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6)
  .forEach(([month, count]) => {
    const monthName = new Date(2024, parseInt(month) - 1, 1).toLocaleString('en', { month: 'long' })
    console.log(`  ${monthName.padEnd(15)} ${count} routes`)
  })
console.log()

console.log('='.repeat(80))
console.log('ATTRACTIONS')
console.log('='.repeat(80))
console.log(`Average Duration: ${summary.attractions.avg_duration_hours} hours`)
console.log()
console.log('By Category:')
Object.entries(summary.attractions.by_category)
  .sort((a, b) => b[1] - a[1])
  .forEach(([category, count]) => {
    console.log(`  ${category.padEnd(20)} ${count}`)
  })
console.log()
console.log('By Source Type:')
Object.entries(summary.attractions.by_source_type)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  ${type.padEnd(20)} ${count}`)
  })
console.log()

console.log('='.repeat(80))
console.log('WEATHER')
console.log('='.repeat(80))
console.log(`Cities with Data: ${summary.weather.cities_with_data}`)
console.log()
console.log('Average Weather Score by Month:')
Object.entries(summary.weather.avg_weather_score_by_month)
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .forEach(([month, score]) => {
    const monthName = new Date(2024, parseInt(month) - 1, 1).toLocaleString('en', { month: 'long' })
    const bar = '█'.repeat(Math.round(score / 5))
    console.log(`  ${monthName.padEnd(12)} ${score.toString().padStart(3)} ${bar}`)
  })
console.log()
console.log('High Weather Score Months (avg ≥ 80):', summary.weather.high_weather_score_months.map(m => {
  return new Date(2024, parseInt(m) - 1, 1).toLocaleString('en', { month: 'short' })
}).join(', '))
console.log()

console.log('='.repeat(80))
console.log('EVALUATION SCENARIOS')
console.log('='.repeat(80))
console.log('By Trip Length:')
Object.entries(summary.evaluation.by_trip_length)
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .forEach(([length, count]) => {
    console.log(`  ${length.padEnd(10)} ${count}`)
  })
console.log()
console.log('By Budget:')
Object.entries(summary.evaluation.by_budget)
  .sort((a, b) => b[1] - a[1])
  .forEach(([budget, count]) => {
    console.log(`  ${budget.padEnd(15)} ${count}`)
  })
console.log()
console.log('By Trip Structure:')
Object.entries(summary.evaluation.by_trip_structure)
  .sort((a, b) => b[1] - a[1])
  .forEach(([structure, count]) => {
    console.log(`  ${structure.padEnd(30)} ${count}`)
  })
console.log()
console.log(`With Fixed Destination:   ${summary.evaluation.with_fixed_destination}`)
console.log(`With Banned Countries:    ${summary.evaluation.with_banned_countries}`)
console.log()

console.log('='.repeat(80))
console.log('DATA PROVENANCE')
console.log('='.repeat(80))
console.log(`Provenance Fields Present: ${summary.provenance.has_provenance_fields ? '✅ Yes' : '❌ No'}`)
console.log()

if (summary.provenance.has_provenance_fields) {
  console.log('Total Records by Source Type:')
  console.log(`  Curated:   ${summary.provenance.total_curated}`)
  console.log(`  Open Data: ${summary.provenance.total_open_data}`)
  console.log()
  
  if (Object.keys(summary.provenance.destinations_by_source_type).length > 0) {
    console.log('Destinations by Source:')
    Object.entries(summary.provenance.destinations_by_source_type).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(30)} ${count}`)
    })
    console.log()
  }
  
  if (Object.keys(summary.provenance.routes_by_source_type).length > 0) {
    console.log('Routes by Source:')
    Object.entries(summary.provenance.routes_by_source_type).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(30)} ${count}`)
    })
    console.log()
  }
  
  if (Object.keys(summary.provenance.attractions_by_source_type).length > 0) {
    console.log('Attractions by Source:')
    Object.entries(summary.provenance.attractions_by_source_type).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(30)} ${count}`)
    })
    console.log()
  }
  
  if (Object.keys(summary.provenance.weather_by_source_type).length > 0) {
    console.log('Weather by Source:')
    Object.entries(summary.provenance.weather_by_source_type).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(30)} ${count}`)
    })
    console.log()
  }
} else {
  console.log('⚠️  Using original files without provenance metadata')
  console.log('💡 Run scripts/add-provenance-to-data.ts to add provenance fields')
  console.log()
}

// Save summary to JSON
const outputPath = path.join(dataDir, 'eda-summary.json')
fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2))

console.log('='.repeat(80))
console.log(`✅ EDA summary saved to: ${outputPath}`)
console.log('='.repeat(80))
