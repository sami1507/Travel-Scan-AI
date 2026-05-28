// Deterministic route candidate pool for when knowledge retrieval returns 0
// Provides realistic route options as fallback candidates
// Now integrates with processed travel data from CSV files

import { AnalysisRequest } from './engine'
import { logger } from '../utils'
import { loadRoutes, Route } from '../travel-data/travel-data-loader'

export interface RouteCandidate {
  id: string
  country: string
  region: string
  routeCities: string[]
  routeType: 'single-city' | 'multi-city-single-country' | 'multi-country'
  priceTier: 'budget' | 'moderate' | 'premium'
  travelFatigue: 'low' | 'moderate' | 'high'
  bestMonths: number[]
  interestsFit: string[]
  mainstreamLevel: 'mainstream' | 'less-mainstream' | 'unique'
  routeLogic: string
  transportMode: string
  approximateCoordinates: { city: string; lat: number; lng: number }[]
  whyCandidateFits: string
  estimatedScore: number
  // Travel data provenance
  sourceType?: string
  confidenceLevel?: string
  dataLimitations?: string
  watchOut?: string
}

/**
 * Convert Route from CSV to RouteCandidate
 */
function routeToCandidate(route: Route): RouteCandidate {
  const cities = route.cities.split(',').map(c => c.trim())
  
  // Map route_type
  let routeType: 'single-city' | 'multi-city-single-country' | 'multi-country'
  if (route.route_type === 'single_country_one_city') {
    routeType = 'single-city'
  } else if (route.route_type === 'multi_country') {
    routeType = 'multi-country'
  } else {
    routeType = 'multi-city-single-country'
  }

  // Map budget_level to priceTier
  const priceTier = route.budget_level === 'comfortable' || route.budget_level === 'luxury' 
    ? 'premium' 
    : route.budget_level as 'budget' | 'moderate'

  // Map fatigue_level
  const travelFatigue = route.fatigue_level as 'low' | 'moderate' | 'high'

  // Parse months
  const bestMonths = route.best_months.split(',').map(m => parseInt(m.trim()))

  // Parse interests
  const interestsFit = route.interests.split(',').map(i => i.trim())

  return {
    id: route.route_id,
    country: route.country,
    region: route.region,
    routeCities: cities,
    routeType,
    priceTier,
    travelFatigue,
    bestMonths,
    interestsFit,
    mainstreamLevel: 'less-mainstream', // Most routes in our dataset are less mainstream
    routeLogic: route.why_route_fits,
    transportMode: 'Train and local transport',
    approximateCoordinates: [], // Would need destination coordinates
    whyCandidateFits: route.why_route_fits,
    estimatedScore: 80,
    sourceType: route.source_type,
    confidenceLevel: route.confidence_level,
    dataLimitations: route.data_limitations,
    watchOut: route.watch_out,
  }
}

export function buildRouteCandidatePool(request: AnalysisRequest): RouteCandidate[] {
  // Try to load routes from processed travel data
  let travelDataRoutes: Route[] = []
  let travelDataUsed = false
  
  try {
    travelDataRoutes = loadRoutes()
    if (travelDataRoutes.length > 0) {
      travelDataUsed = true
      logger.info('[RouteCandidatePool] Loaded routes from travel data', {
        routesCount: travelDataRoutes.length,
        source: 'processed CSV'
      })
    }
  } catch (error) {
    logger.warn('[RouteCandidatePool] Failed to load travel data routes, using fallback', { error })
  }

  // Convert travel data routes to candidates
  const travelDataCandidates = travelDataRoutes.map(routeToCandidate)

  // Fallback hard-coded candidates (if travel data unavailable or for additional coverage)
  const fallbackCandidates: RouteCandidate[] = [
    // Mediterranean - Mainstream
    {
      id: 'greece-islands',
      country: 'Greece',
      region: 'Mediterranean',
      routeCities: ['Athens', 'Naxos', 'Crete'],
      routeType: 'multi-city-single-country',
      priceTier: 'moderate',
      travelFatigue: 'moderate',
      bestMonths: [4, 5, 6, 9, 10],
      interestsFit: ['nature', 'food', 'beach', 'history'],
      mainstreamLevel: 'mainstream',
      routeLogic: 'Athens for history, island-hopping for beaches and nature',
      transportMode: 'Ferry and short flights',
      approximateCoordinates: [
        { city: 'Athens', lat: 37.9838, lng: 23.7275 },
        { city: 'Naxos', lat: 37.1036, lng: 25.3766 },
        { city: 'Crete', lat: 35.2401, lng: 24.8093 },
      ],
      whyCandidateFits: 'Classic Greek experience with islands and mainland',
      estimatedScore: 85,
    },
    {
      id: 'italy-classic',
      country: 'Italy',
      region: 'Mediterranean',
      routeCities: ['Rome', 'Florence', 'Bologna'],
      routeType: 'multi-city-single-country',
      priceTier: 'moderate',
      travelFatigue: 'moderate',
      bestMonths: [4, 5, 6, 9, 10],
      interestsFit: ['food', 'history', 'culture', 'art'],
      mainstreamLevel: 'mainstream',
      routeLogic: 'Rome for ancient history, Florence for Renaissance, Bologna for food',
      transportMode: 'High-speed train',
      approximateCoordinates: [
        { city: 'Rome', lat: 41.9028, lng: 12.4964 },
        { city: 'Florence', lat: 43.7696, lng: 11.2558 },
        { city: 'Bologna', lat: 44.4949, lng: 11.3426 },
      ],
      whyCandidateFits: 'Classic Italian cultural route with excellent train connections',
      estimatedScore: 88,
    },
    {
      id: 'spain-andalusia',
      country: 'Spain',
      region: 'Mediterranean',
      routeCities: ['Madrid', 'Seville', 'Granada'],
      routeType: 'multi-city-single-country',
      priceTier: 'moderate',
      travelFatigue: 'moderate',
      bestMonths: [3, 4, 5, 9, 10, 11],
      interestsFit: ['food', 'history', 'culture', 'nightlife'],
      mainstreamLevel: 'mainstream',
      routeLogic: 'Madrid for urban culture, Seville for flamenco, Granada for Alhambra',
      transportMode: 'High-speed train',
      approximateCoordinates: [
        { city: 'Madrid', lat: 40.4168, lng: -3.7038 },
        { city: 'Seville', lat: 37.3891, lng: -5.9845 },
        { city: 'Granada', lat: 37.1773, lng: -3.5986 },
      ],
      whyCandidateFits: 'Spanish culture and history with Moorish influence',
      estimatedScore: 86,
    },
    {
      id: 'portugal-classic',
      country: 'Portugal',
      region: 'Mediterranean',
      routeCities: ['Lisbon', 'Porto', 'Coimbra'],
      routeType: 'multi-city-single-country',
      priceTier: 'budget',
      travelFatigue: 'low',
      bestMonths: [3, 4, 5, 6, 9, 10],
      interestsFit: ['food', 'history', 'culture', 'beach'],
      mainstreamLevel: 'mainstream',
      routeLogic: 'Lisbon for capital culture, Porto for wine, Coimbra for university town',
      transportMode: 'Train and bus',
      approximateCoordinates: [
        { city: 'Lisbon', lat: 38.7223, lng: -9.1393 },
        { city: 'Porto', lat: 41.1579, lng: -8.6291 },
        { city: 'Coimbra', lat: 40.2033, lng: -8.4103 },
      ],
      whyCandidateFits: 'Affordable Portuguese experience with good transport',
      estimatedScore: 82,
    },

    // Balkans - Less Mainstream
    {
      id: 'croatia-coast',
      country: 'Croatia',
      region: 'Balkans',
      routeCities: ['Split', 'Hvar', 'Dubrovnik'],
      routeType: 'multi-city-single-country',
      priceTier: 'moderate',
      travelFatigue: 'moderate',
      bestMonths: [5, 6, 9, 10],
      interestsFit: ['nature', 'beach', 'history', 'food'],
      mainstreamLevel: 'less-mainstream',
      routeLogic: 'Split for Roman ruins, Hvar for island life, Dubrovnik for medieval walls',
      transportMode: 'Ferry and bus',
      approximateCoordinates: [
        { city: 'Split', lat: 43.5081, lng: 16.4402 },
        { city: 'Hvar', lat: 43.1729, lng: 16.4415 },
        { city: 'Dubrovnik', lat: 42.6507, lng: 18.0944 },
      ],
      whyCandidateFits: 'Adriatic coast with history and natural beauty',
      estimatedScore: 84,
    },
    {
      id: 'slovenia-croatia',
      country: 'Slovenia',
      region: 'Balkans',
      routeCities: ['Ljubljana', 'Bled', 'Zagreb'],
      routeType: 'multi-country',
      priceTier: 'moderate',
      travelFatigue: 'low',
      bestMonths: [5, 6, 7, 8, 9],
      interestsFit: ['nature', 'outdoor', 'culture', 'food'],
      mainstreamLevel: 'less-mainstream',
      routeLogic: 'Ljubljana for charming capital, Bled for alpine lake, Zagreb for urban culture',
      transportMode: 'Bus and train',
      approximateCoordinates: [
        { city: 'Ljubljana', lat: 46.0569, lng: 14.5058 },
        { city: 'Bled', lat: 46.3683, lng: 14.1146 },
        { city: 'Zagreb', lat: 45.8150, lng: 15.9819 },
      ],
      whyCandidateFits: 'Alpine and cultural mix with great value',
      estimatedScore: 80,
    },
    {
      id: 'albania-montenegro',
      country: 'Albania',
      region: 'Balkans',
      routeCities: ['Tirana', 'Berat', 'Kotor'],
      routeType: 'multi-country',
      priceTier: 'budget',
      travelFatigue: 'moderate',
      bestMonths: [5, 6, 9, 10],
      interestsFit: ['nature', 'history', 'adventure', 'budget'],
      mainstreamLevel: 'unique',
      routeLogic: 'Tirana for emerging capital, Berat for Ottoman heritage, Kotor for fjord-like bay',
      transportMode: 'Bus',
      approximateCoordinates: [
        { city: 'Tirana', lat: 41.3275, lng: 19.8187 },
        { city: 'Berat', lat: 40.7058, lng: 19.9522 },
        { city: 'Kotor', lat: 42.4247, lng: 18.7712 },
      ],
      whyCandidateFits: 'Off-beaten path Balkans with dramatic scenery',
      estimatedScore: 75,
    },

    // Eastern Europe - Unique
    {
      id: 'romania-transylvania',
      country: 'Romania',
      region: 'Eastern Europe',
      routeCities: ['Bucharest', 'Brașov', 'Sibiu'],
      routeType: 'multi-city-single-country',
      priceTier: 'budget',
      travelFatigue: 'moderate',
      bestMonths: [5, 6, 7, 8, 9],
      interestsFit: ['history', 'nature', 'culture', 'budget'],
      mainstreamLevel: 'unique',
      routeLogic: 'Bucharest for capital, Brașov for Dracula castle, Sibiu for medieval town',
      transportMode: 'Train and bus',
      approximateCoordinates: [
        { city: 'Bucharest', lat: 44.4268, lng: 26.1025 },
        { city: 'Brașov', lat: 45.6579, lng: 25.6012 },
        { city: 'Sibiu', lat: 45.7983, lng: 24.1256 },
      ],
      whyCandidateFits: 'Unique Eastern European experience with great value',
      estimatedScore: 78,
    },
    {
      id: 'georgia-caucasus',
      country: 'Georgia',
      region: 'Caucasus',
      routeCities: ['Tbilisi', 'Kazbegi', 'Kakheti'],
      routeType: 'multi-city-single-country',
      priceTier: 'budget',
      travelFatigue: 'moderate',
      bestMonths: [5, 6, 7, 8, 9, 10],
      interestsFit: ['nature', 'food', 'wine', 'adventure', 'culture'],
      mainstreamLevel: 'unique',
      routeLogic: 'Tbilisi for capital culture, Kazbegi for mountain scenery, Kakheti for wine region',
      transportMode: 'Marshrutka and taxi',
      approximateCoordinates: [
        { city: 'Tbilisi', lat: 41.7151, lng: 44.8271 },
        { city: 'Kazbegi', lat: 42.6589, lng: 44.6449 },
        { city: 'Kakheti', lat: 41.6488, lng: 45.6944 },
      ],
      whyCandidateFits: 'Unique Caucasus experience with wine and mountains',
      estimatedScore: 76,
    },

    // Central Europe - Less Mainstream
    {
      id: 'hungary-budapest',
      country: 'Hungary',
      region: 'Central Europe',
      routeCities: ['Budapest', 'Eger', 'Pécs'],
      routeType: 'multi-city-single-country',
      priceTier: 'budget',
      travelFatigue: 'low',
      bestMonths: [4, 5, 6, 9, 10],
      interestsFit: ['culture', 'food', 'history', 'thermal-baths'],
      mainstreamLevel: 'less-mainstream',
      routeLogic: 'Budapest for capital and baths, Eger for wine, Pécs for southern culture',
      transportMode: 'Train',
      approximateCoordinates: [
        { city: 'Budapest', lat: 47.4979, lng: 19.0402 },
        { city: 'Eger', lat: 47.9026, lng: 20.3770 },
        { city: 'Pécs', lat: 46.0727, lng: 18.2324 },
      ],
      whyCandidateFits: 'Central European culture with thermal baths and wine',
      estimatedScore: 79,
    },
    {
      id: 'czechia-prague',
      country: 'Czech Republic',
      region: 'Central Europe',
      routeCities: ['Prague', 'Český Krumlov', 'Brno'],
      routeType: 'multi-city-single-country',
      priceTier: 'moderate',
      travelFatigue: 'low',
      bestMonths: [4, 5, 6, 9, 10],
      interestsFit: ['culture', 'history', 'beer', 'architecture'],
      mainstreamLevel: 'less-mainstream',
      routeLogic: 'Prague for capital, Český Krumlov for fairy-tale town, Brno for second city',
      transportMode: 'Train and bus',
      approximateCoordinates: [
        { city: 'Prague', lat: 50.0755, lng: 14.4378 },
        { city: 'Český Krumlov', lat: 48.8127, lng: 14.3175 },
        { city: 'Brno', lat: 49.1951, lng: 16.6068 },
      ],
      whyCandidateFits: 'Czech culture and architecture with beer tradition',
      estimatedScore: 81,
    },
    {
      id: 'austria-vienna',
      country: 'Austria',
      region: 'Central Europe',
      routeCities: ['Vienna', 'Salzburg', 'Graz'],
      routeType: 'multi-city-single-country',
      priceTier: 'premium',
      travelFatigue: 'low',
      bestMonths: [4, 5, 6, 9, 10],
      interestsFit: ['culture', 'music', 'history', 'food'],
      mainstreamLevel: 'less-mainstream',
      routeLogic: 'Vienna for imperial capital, Salzburg for Mozart, Graz for southern charm',
      transportMode: 'Train',
      approximateCoordinates: [
        { city: 'Vienna', lat: 48.2082, lng: 16.3738 },
        { city: 'Salzburg', lat: 47.8095, lng: 13.0550 },
        { city: 'Graz', lat: 47.0707, lng: 15.4395 },
      ],
      whyCandidateFits: 'Austrian culture and music with alpine scenery',
      estimatedScore: 83,
    },

    // Island Options
    {
      id: 'cyprus-mediterranean',
      country: 'Cyprus',
      region: 'Mediterranean',
      routeCities: ['Larnaca', 'Limassol', 'Paphos'],
      routeType: 'multi-city-single-country',
      priceTier: 'moderate',
      travelFatigue: 'low',
      bestMonths: [3, 4, 5, 6, 9, 10, 11],
      interestsFit: ['beach', 'history', 'food', 'nature'],
      mainstreamLevel: 'less-mainstream',
      routeLogic: 'Larnaca for arrival, Limassol for coast, Paphos for archaeology',
      transportMode: 'Car or bus',
      approximateCoordinates: [
        { city: 'Larnaca', lat: 34.9167, lng: 33.6333 },
        { city: 'Limassol', lat: 34.6841, lng: 33.0378 },
        { city: 'Paphos', lat: 34.7571, lng: 32.4246 },
      ],
      whyCandidateFits: 'Mediterranean island with Greek and Turkish influence',
      estimatedScore: 77,
    },
  ]

  // Combine travel data candidates with fallback candidates
  // Prefer travel data if available, otherwise use fallback
  const allCandidates = travelDataUsed && travelDataCandidates.length > 0
    ? travelDataCandidates
    : [...travelDataCandidates, ...fallbackCandidates]

  logger.info('Route candidate pool built', {
    candidateCount: allCandidates.length,
    travelDataCandidates: travelDataCandidates.length,
    fallbackCandidates: fallbackCandidates.length,
    travelDataUsed,
    regions: [...new Set(allCandidates.map(c => c.region))],
    countries: [...new Set(allCandidates.map(c => c.country))],
    mainstreamCount: allCandidates.filter(c => c.mainstreamLevel === 'mainstream').length,
    uniqueCount: allCandidates.filter(c => c.mainstreamLevel === 'unique').length,
  })

  return allCandidates
}

export function filterCandidatesByRequest(
  candidates: RouteCandidate[],
  request: AnalysisRequest
): RouteCandidate[] {
  let filtered = [...candidates]

  // Filter by tripStructure
  if (request.tripStructure === 'single_country_one_city') {
    filtered = filtered.filter(c => c.routeType === 'single-city')
  } else if (request.tripStructure === 'single_country_multi_city') {
    filtered = filtered.filter(c => c.routeType === 'multi-city-single-country')
  } else if (request.tripStructure === 'multi_country') {
    filtered = filtered.filter(c => c.routeType === 'multi-country' || c.routeType === 'multi-city-single-country')
  }

  // Filter by budget
  if (request.budget === 'low') {
    filtered = filtered.filter(c => c.priceTier === 'budget' || c.priceTier === 'moderate')
  } else if (request.budget === 'luxury') {
    filtered = filtered.filter(c => c.priceTier === 'premium' || c.priceTier === 'moderate')
  }

  // Filter by interests
  if (request.interests && request.interests.length > 0) {
    filtered = filtered.map(c => ({
      ...c,
      estimatedScore: c.estimatedScore + (
        request.interests!.filter(i => c.interestsFit.includes(i)).length * 2
      ),
    })).sort((a, b) => b.estimatedScore - a.estimatedScore)
  }

  // Filter by travel months
  if (request.travelMonths && request.travelMonths.length > 0) {
    filtered = filtered.map(c => ({
      ...c,
      estimatedScore: c.estimatedScore + (
        request.travelMonths!.filter(m => c.bestMonths.includes(m)).length * 1.5
      ),
    })).sort((a, b) => b.estimatedScore - a.estimatedScore)
  }

  logger.info('Route candidates filtered', {
    originalCount: candidates.length,
    filteredCount: filtered.length,
    tripStructure: request.tripStructure,
    budget: request.budget,
  })

  return filtered.slice(0, 12) // Return top 12
}
