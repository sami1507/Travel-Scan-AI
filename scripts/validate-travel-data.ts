import { parse } from 'csv-parse/sync'
import fs from 'fs'
import path from 'path'

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

console.log('🔍 TravelScan AI - Travel Data Validation\n')

const dataDir = path.join(process.cwd(), 'data', 'travel')

// Load datasets
const routesCSV = fs.readFileSync(path.join(dataDir, 'routes.csv'), 'utf-8')
const routes: Route[] = parse(routesCSV, { columns: true })

const attractionsCSV = fs.readFileSync(path.join(dataDir, 'attractions.csv'), 'utf-8')
const attractions: Attraction[] = parse(attractionsCSV, { columns: true })

let errors = 0
let warnings = 0

console.log('='.repeat(80))
console.log('VALIDATING ROUTES')
console.log('='.repeat(80))

// Validate routes
const routeIds = new Set<string>()
const validBudgetLevels = ['budget', 'moderate', 'comfortable', 'luxury']
const validFatigueLevels = ['low', 'medium', 'high']
const validRouteTypes = ['single_country_multi_city', 'single_country_one_city', 'multi_country']
const bannedLongHaulStarter = ['Japan', 'Thailand', 'USA', 'Mexico', 'Brazil', 'Argentina', 'Australia', 'New Zealand', 'South Africa']

routes.forEach((route, index) => {
  const lineNum = index + 2 // +1 for 0-index, +1 for header

  // Check required fields
  const requiredFields = ['route_id', 'country', 'route_name', 'route_type', 'cities', 'recommended_nights', 
    'min_days', 'max_days', 'budget_level', 'fatigue_level', 'best_months', 'interests', 'region', 'why_route_fits', 'watch_out']
  
  requiredFields.forEach(field => {
    if (!route[field as keyof Route] || route[field as keyof Route].trim() === '') {
      console.error(`❌ Line ${lineNum}: Missing required field '${field}' in route ${route.route_id}`)
      errors++
    }
  })

  // Check duplicate route_id
  if (routeIds.has(route.route_id)) {
    console.error(`❌ Line ${lineNum}: Duplicate route_id '${route.route_id}'`)
    errors++
  }
  routeIds.add(route.route_id)

  // Validate route_type
  if (!validRouteTypes.includes(route.route_type)) {
    console.error(`❌ Line ${lineNum}: Invalid route_type '${route.route_type}' in ${route.route_id}. Must be one of: ${validRouteTypes.join(', ')}`)
    errors++
  }

  // Validate cities count for multi-city routes
  const cities = route.cities.split(',').map(c => c.trim()).filter(c => c.length > 0)
  if (route.route_type === 'single_country_multi_city' && cities.length < 2) {
    console.error(`❌ Line ${lineNum}: Route ${route.route_id} is type 'single_country_multi_city' but has only ${cities.length} city. Must have at least 2.`)
    errors++
  }

  // Validate budget_level
  if (!validBudgetLevels.includes(route.budget_level)) {
    console.error(`❌ Line ${lineNum}: Invalid budget_level '${route.budget_level}' in ${route.route_id}. Must be one of: ${validBudgetLevels.join(', ')}`)
    errors++
  }

  // Validate fatigue_level
  if (!validFatigueLevels.includes(route.fatigue_level)) {
    console.error(`❌ Line ${lineNum}: Invalid fatigue_level '${route.fatigue_level}' in ${route.route_id}. Must be one of: ${validFatigueLevels.join(', ')}`)
    errors++
  }

  // Validate best_months
  const bestMonths = route.best_months.split(',').map(m => m.trim())
  bestMonths.forEach(month => {
    const monthNum = parseInt(month)
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      console.error(`❌ Line ${lineNum}: Invalid month '${month}' in best_months for ${route.route_id}. Must be between 1 and 12.`)
      errors++
    }
  })

  // Validate avoid_months if present
  if (route.avoid_months && route.avoid_months.trim() !== '') {
    const avoidMonths = route.avoid_months.split(',').map(m => m.trim())
    avoidMonths.forEach(month => {
      const monthNum = parseInt(month)
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        console.error(`❌ Line ${lineNum}: Invalid month '${month}' in avoid_months for ${route.route_id}. Must be between 1 and 12.`)
        errors++
      }
    })
  }

  // Validate day ranges
  const minDays = parseInt(route.min_days)
  const maxDays = parseInt(route.max_days)
  const recNights = parseInt(route.recommended_nights)

  if (isNaN(minDays) || minDays < 1) {
    console.error(`❌ Line ${lineNum}: Invalid min_days '${route.min_days}' in ${route.route_id}. Must be a positive number.`)
    errors++
  }

  if (isNaN(maxDays) || maxDays < 1) {
    console.error(`❌ Line ${lineNum}: Invalid max_days '${route.max_days}' in ${route.route_id}. Must be a positive number.`)
    errors++
  }

  if (isNaN(recNights) || recNights < 1) {
    console.error(`❌ Line ${lineNum}: Invalid recommended_nights '${route.recommended_nights}' in ${route.route_id}. Must be a positive number.`)
    errors++
  }

  if (!isNaN(minDays) && !isNaN(maxDays) && minDays > maxDays) {
    console.error(`❌ Line ${lineNum}: min_days (${minDays}) > max_days (${maxDays}) in ${route.route_id}`)
    errors++
  }

  // Check for banned long-haul destinations in starter dataset
  if (bannedLongHaulStarter.includes(route.country)) {
    console.error(`❌ Line ${lineNum}: Banned long-haul destination '${route.country}' in ${route.route_id}. Starter dataset should focus on Europe/nearby regions.`)
    errors++
  }

  // Warn if watch_out is too short
  if (route.watch_out && route.watch_out.length < 20) {
    console.warn(`⚠️  Line ${lineNum}: watch_out seems very short (${route.watch_out.length} chars) in ${route.route_id}`)
    warnings++
  }

  // Warn if why_route_fits is too short
  if (route.why_route_fits && route.why_route_fits.length < 30) {
    console.warn(`⚠️  Line ${lineNum}: why_route_fits seems very short (${route.why_route_fits.length} chars) in ${route.route_id}`)
    warnings++
  }
})

console.log()

console.log('='.repeat(80))
console.log('VALIDATING ATTRACTIONS')
console.log('='.repeat(80))

const validCategories = ['history', 'food', 'nature', 'city', 'museum', 'market', 'viewpoint', 'beach', 'old_town', 'day_trip', 'spa', 'nightlife']

attractions.forEach((attraction, index) => {
  const lineNum = index + 2

  // Check required fields
  if (!attraction.country || attraction.country.trim() === '') {
    console.error(`❌ Line ${lineNum}: Missing country in attraction '${attraction.name}'`)
    errors++
  }

  if (!attraction.city || attraction.city.trim() === '') {
    console.error(`❌ Line ${lineNum}: Missing city in attraction '${attraction.name}'`)
    errors++
  }

  if (!attraction.name || attraction.name.trim() === '') {
    console.error(`❌ Line ${lineNum}: Missing name in attraction`)
    errors++
  }

  if (!attraction.category || attraction.category.trim() === '') {
    console.error(`❌ Line ${lineNum}: Missing category in attraction '${attraction.name}'`)
    errors++
  } else if (!validCategories.includes(attraction.category)) {
    console.warn(`⚠️  Line ${lineNum}: Unusual category '${attraction.category}' in ${attraction.name}. Expected one of: ${validCategories.join(', ')}`)
    warnings++
  }

  // Validate duration
  if (attraction.typical_duration_hours) {
    const duration = parseFloat(attraction.typical_duration_hours)
    if (isNaN(duration) || duration <= 0 || duration > 24) {
      console.error(`❌ Line ${lineNum}: Invalid typical_duration_hours '${attraction.typical_duration_hours}' in ${attraction.name}. Must be between 0 and 24.`)
      errors++
    }
  }
})

console.log()

console.log('='.repeat(80))
console.log('VALIDATION SUMMARY')
console.log('='.repeat(80))
console.log(`Routes validated:      ${routes.length}`)
console.log(`Attractions validated: ${attractions.length}`)
console.log()
console.log(`❌ Errors:   ${errors}`)
console.log(`⚠️  Warnings: ${warnings}`)
console.log()

if (errors === 0) {
  console.log('✅ All validation checks passed!')
} else {
  console.log(`❌ Validation failed with ${errors} error(s)`)
  process.exit(1)
}
