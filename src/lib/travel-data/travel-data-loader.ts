/**
 * Travel Data Loader
 * 
 * Loads processed travel data from CSV/JSON files for use in the analysis engine.
 * Provides structured context for the AI travel consultant.
 * 
 * Data sources:
 * - data/travel/processed/*.csv (preferred)
 * - data/travel/*.csv (fallback)
 */

import { parse } from 'csv-parse/sync'
import fs from 'fs'
import path from 'path'

// Types
export interface Destination {
  country: string
  city: string
  region: string
  latitude: string
  longitude: string
  budget_level: string
  main_interests: string
  notes: string
  source_name?: string
  source_type?: string
  source_url_or_query?: string
  collected_at?: string
  cleaned_at?: string
  confidence_level?: string
  data_limitations?: string
}

export interface Route {
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
  source_name?: string
  source_type?: string
  source_url_or_query?: string
  collected_at?: string
  cleaned_at?: string
  confidence_level?: string
  data_limitations?: string
}

export interface Attraction {
  country: string
  city: string
  name: string
  category: string
  interest_tags: string
  typical_duration_hours: string
  best_time_of_day: string
  source_type: string
  notes: string
  source_name?: string
  source_url_or_query?: string
  collected_at?: string
  cleaned_at?: string
  confidence_level?: string
  data_limitations?: string
}

export interface MonthlyWeather {
  country: string
  city: string
  month: string
  avg_temp_c: string
  rain_risk: string
  weather_score: string
  crowd_risk: string
  summer_warning: string
  season_note: string
  source_name?: string
  source_type?: string
  source_url_or_query?: string
  collected_at?: string
  cleaned_at?: string
  confidence_level?: string
  data_limitations?: string
}

export interface EvaluationScenario {
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
    mustBeMultiCity?: boolean
    avoidLongHaul?: boolean
    allowedRegions?: string[]
    mustHaveWatchOut?: boolean
    mustHaveBeforeBookingChecks?: boolean
    minimumRouteCities?: number
    bannedCountries?: string[]
  }
}

export interface TravelAnalysisRequest {
  tripLength: number
  budget: string
  travelMonths: number[]
  interests: string[]
  tripStructure?: string
  departureCity?: string
  passportCountry?: string
  destination?: string
}

// In-memory cache
let destinationsCache: Destination[] | null = null
let routesCache: Route[] | null = null
let attractionsCache: Attraction[] | null = null
let weatherCache: MonthlyWeather[] | null = null
let scenariosCache: EvaluationScenario[] | null = null

/**
 * Get data directory path (server-side safe)
 */
function getDataPath(): string {
  return path.join(process.cwd(), 'data', 'travel')
}

/**
 * Load CSV file with fallback
 */
function loadCSV<T>(filename: string): T[] {
  const dataDir = getDataPath()
  const processedPath = path.join(dataDir, 'processed', filename)
  const fallbackPath = path.join(dataDir, filename)

  try {
    // Try processed first
    if (fs.existsSync(processedPath)) {
      const content = fs.readFileSync(processedPath, 'utf-8')
      return parse(content, { columns: true, skip_empty_lines: true })
    }

    // Fallback to original
    if (fs.existsSync(fallbackPath)) {
      const content = fs.readFileSync(fallbackPath, 'utf-8')
      return parse(content, { columns: true, skip_empty_lines: true })
    }

    console.warn(`[TravelData] File not found: ${filename}`)
    return []
  } catch (error) {
    console.error(`[TravelData] Error loading ${filename}:`, error)
    return []
  }
}

/**
 * Load destinations
 */
export function loadDestinations(): Destination[] {
  if (destinationsCache) {
    return destinationsCache
  }

  destinationsCache = loadCSV<Destination>('destinations.csv')
  return destinationsCache
}

/**
 * Load routes
 */
export function loadRoutes(): Route[] {
  if (routesCache) {
    return routesCache
  }

  routesCache = loadCSV<Route>('routes.csv')
  return routesCache
}

/**
 * Load attractions
 */
export function loadAttractions(): Attraction[] {
  if (attractionsCache) {
    return attractionsCache
  }

  attractionsCache = loadCSV<Attraction>('attractions.csv')
  return attractionsCache
}

/**
 * Load monthly weather
 */
export function loadMonthlyWeather(): MonthlyWeather[] {
  if (weatherCache) {
    return weatherCache
  }

  weatherCache = loadCSV<MonthlyWeather>('monthly_weather.csv')
  return weatherCache
}

/**
 * Load evaluation scenarios
 */
export function loadEvaluationScenarios(): EvaluationScenario[] {
  if (scenariosCache) {
    return scenariosCache
  }

  const dataDir = getDataPath()
  const scenariosPath = path.join(dataDir, 'evaluation_scenarios.json')

  try {
    if (fs.existsSync(scenariosPath)) {
      const content = fs.readFileSync(scenariosPath, 'utf-8')
      scenariosCache = JSON.parse(content)
      return scenariosCache!
    }

    console.warn('[TravelData] evaluation_scenarios.json not found')
    return []
  } catch (error) {
    console.error('[TravelData] Error loading evaluation scenarios:', error)
    return []
  }
}

/**
 * Get routes matching request criteria
 */
export function getRoutesForRequest(request: TravelAnalysisRequest): Route[] {
  const allRoutes = loadRoutes()

  return allRoutes.filter(route => {
    // Filter by trip length
    const minDays = parseInt(route.min_days)
    const maxDays = parseInt(route.max_days)
    if (request.tripLength < minDays || request.tripLength > maxDays) {
      return false
    }

    // Filter by budget
    if (request.budget) {
      const budgetOrder = ['budget', 'moderate', 'comfortable', 'luxury']
      const requestBudgetIndex = budgetOrder.indexOf(request.budget.toLowerCase())
      const routeBudgetIndex = budgetOrder.indexOf(route.budget_level.toLowerCase())
      
      // Allow routes at or below budget level
      if (routeBudgetIndex > requestBudgetIndex) {
        return false
      }
    }

    // Filter by travel months
    if (request.travelMonths && request.travelMonths.length > 0) {
      const bestMonths = route.best_months.split(',').map(m => parseInt(m.trim()))
      const avoidMonths = route.avoid_months ? route.avoid_months.split(',').map(m => parseInt(m.trim())) : []
      
      // Check if any travel month is in best months
      const hasGoodMonth = request.travelMonths.some(m => bestMonths.includes(m))
      
      // Check if any travel month is in avoid months
      const hasAvoidMonth = request.travelMonths.some(m => avoidMonths.includes(m))
      
      // Prefer routes with good months, but don't exclude if avoid months
      if (!hasGoodMonth && avoidMonths.length > 0 && hasAvoidMonth) {
        return false
      }
    }

    // Filter by interests (at least one match)
    if (request.interests && request.interests.length > 0) {
      const routeInterests = route.interests.toLowerCase().split(',').map(i => i.trim())
      const hasInterestMatch = request.interests.some(interest => 
        routeInterests.some(ri => ri.includes(interest.toLowerCase()) || interest.toLowerCase().includes(ri))
      )
      
      if (!hasInterestMatch) {
        return false
      }
    }

    // Filter by trip structure
    if (request.tripStructure) {
      if (request.tripStructure === 'single_country_multi_city' && route.route_type !== 'single_country_multi_city') {
        return false
      }
      if (request.tripStructure === 'single_country_one_city' && route.route_type !== 'single_country_one_city') {
        return false
      }
      if (request.tripStructure === 'multi_country' && route.route_type !== 'multi_country') {
        return false
      }
    }

    // Filter by destination (if fixed) - check country or cities
    if (request.destination) {
      const destLower = request.destination.toLowerCase()
      const countryMatch = route.country.toLowerCase().includes(destLower)
      const cities = route.cities.toLowerCase().split(',').map(c => c.trim())
      const cityMatch = cities.some(c => c.includes(destLower))
      
      if (!countryMatch && !cityMatch) {
        return false
      }
    }

    return true
  })
}

/**
 * Get attractions for a route
 */
export function getAttractionsForRoute(
  country: string,
  cities: string[],
  interests?: string[]
): Attraction[] {
  const allAttractions = loadAttractions()

  let filtered = allAttractions.filter(attr => 
    attr.country.toLowerCase() === country.toLowerCase() &&
    cities.some(city => attr.city.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes(attr.city.toLowerCase()))
  )

  // Filter by interests if provided
  if (interests && interests.length > 0) {
    filtered = filtered.filter(attr => {
      const attrTags = attr.interest_tags.toLowerCase().split(',').map(t => t.trim())
      const attrCategory = attr.category.toLowerCase()
      
      return interests.some(interest => 
        attrTags.some(tag => tag.includes(interest.toLowerCase()) || interest.toLowerCase().includes(tag)) ||
        attrCategory.includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(attrCategory)
      )
    })
  }

  // Limit to top 6 attractions
  return filtered.slice(0, 6)
}

/**
 * Get weather for a route
 */
export function getWeatherForRoute(
  country: string,
  cities: string[],
  travelMonths: number[]
): MonthlyWeather[] {
  const allWeather = loadMonthlyWeather()

  return allWeather.filter(weather => 
    weather.country.toLowerCase() === country.toLowerCase() &&
    cities.some(city => weather.city.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes(weather.city.toLowerCase())) &&
    travelMonths.includes(parseInt(weather.month))
  )
}

/**
 * Build structured travel data context for OpenAI
 */
export function buildTravelDataContext(request: TravelAnalysisRequest): {
  routes: Route[]
  attractions: Map<string, Attraction[]>
  weather: Map<string, MonthlyWeather[]>
  summary: {
    totalRoutes: number
    totalAttractions: number
    totalWeatherRecords: number
    sourceTypes: string[]
    confidenceLevels: string[]
  }
} {
  const routes = getRoutesForRequest(request)
  const attractions = new Map<string, Attraction[]>()
  const weather = new Map<string, MonthlyWeather[]>()

  const sourceTypes = new Set<string>()
  const confidenceLevels = new Set<string>()

  // Get attractions and weather for each route
  routes.forEach(route => {
    const cities = route.cities.split(',').map(c => c.trim())
    
    const routeAttractions = getAttractionsForRoute(route.country, cities, request.interests)
    attractions.set(route.route_id, routeAttractions)

    const routeWeather = getWeatherForRoute(route.country, cities, request.travelMonths || [])
    weather.set(route.route_id, routeWeather)

    // Collect provenance metadata
    if (route.source_type) sourceTypes.add(route.source_type)
    if (route.confidence_level) confidenceLevels.add(route.confidence_level)
    
    routeAttractions.forEach(attr => {
      if (attr.source_type) sourceTypes.add(attr.source_type)
      if (attr.confidence_level) confidenceLevels.add(attr.confidence_level)
    })

    routeWeather.forEach(w => {
      if (w.source_type) sourceTypes.add(w.source_type)
      if (w.confidence_level) confidenceLevels.add(w.confidence_level)
    })
  })

  const totalAttractions = Array.from(attractions.values()).reduce((sum, arr) => sum + arr.length, 0)
  const totalWeatherRecords = Array.from(weather.values()).reduce((sum, arr) => sum + arr.length, 0)

  return {
    routes,
    attractions,
    weather,
    summary: {
      totalRoutes: routes.length,
      totalAttractions,
      totalWeatherRecords,
      sourceTypes: Array.from(sourceTypes),
      confidenceLevels: Array.from(confidenceLevels)
    }
  }
}

/**
 * Clear cache (for testing)
 */
export function clearCache(): void {
  destinationsCache = null
  routesCache = null
  attractionsCache = null
  weatherCache = null
  scenariosCache = null
}
