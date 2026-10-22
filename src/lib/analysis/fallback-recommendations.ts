// Deterministic fallback recommendations, used when the AI response is unavailable or
// fails validation. Extracted verbatim from engine.ts so the engine stays focused on
// orchestration; behaviour is unchanged.
import type { AnalysisRequest } from './engine'
import type { RankedDestination, TravelAnalysisResponse } from './schemas'
import type { RouteCandidate } from './route-candidate-pool'
import { logger } from '../utils'

export class FallbackRecommendationBuilder {
  /**
   * Curated fallback route library for realistic recommendations
   */
  private getFallbackRouteLibrary() {
    return [
      // Multi-Country Routes
      {
        id: 'central-europe-classic',
        tripStructure: 'multi_country',
        countries: ['Austria', 'Slovakia', 'Hungary'],
        cities: ['Vienna', 'Bratislava', 'Budapest'],
        bestSeasons: ['spring', 'autumn'],
        budgetFit: ['moderate', 'high'],
        travelStyles: ['city-life', 'history', 'food', 'nightlife'],
        transportMode: 'train',
        fatigueLevel: 'Low',
        minDays: 10,
        maxDays: 15,
        nightsDistribution: { 'Vienna': 4, 'Bratislava': 2, 'Budapest': 5 },
      },
      {
        id: 'central-europe-prague',
        tripStructure: 'multi_country',
        countries: ['Czech Republic', 'Austria', 'Hungary'],
        cities: ['Prague', 'Vienna', 'Budapest'],
        bestSeasons: ['spring', 'summer', 'autumn'],
        budgetFit: ['moderate', 'high'],
        travelStyles: ['city-life', 'history', 'food', 'nightlife', 'culture'],
        transportMode: 'train',
        fatigueLevel: 'Medium',
        minDays: 12,
        maxDays: 18,
        nightsDistribution: { 'Prague': 4, 'Vienna': 4, 'Budapest': 5 },
      },
      {
        id: 'balkans-adriatic',
        tripStructure: 'multi_country',
        countries: ['Albania', 'Montenegro'],
        cities: ['Tirana', 'Shkoder', 'Kotor', 'Budva'],
        bestSeasons: ['spring', 'summer', 'autumn'],
        budgetFit: ['low', 'moderate'],
        travelStyles: ['nature', 'beach', 'history', 'adventure'],
        transportMode: 'bus',
        fatigueLevel: 'Medium',
        minDays: 10,
        maxDays: 14,
        nightsDistribution: { 'Tirana': 2, 'Shkoder': 2, 'Kotor': 3, 'Budva': 4 },
      },
      {
        id: 'balkans-capitals',
        tripStructure: 'multi_country',
        countries: ['Serbia', 'Bosnia', 'Croatia'],
        cities: ['Belgrade', 'Sarajevo', 'Mostar'],
        bestSeasons: ['spring', 'summer', 'autumn'],
        budgetFit: ['low', 'moderate'],
        travelStyles: ['history', 'food', 'culture', 'city-life'],
        transportMode: 'bus',
        fatigueLevel: 'Medium',
        minDays: 10,
        maxDays: 14,
        nightsDistribution: { 'Belgrade': 4, 'Sarajevo': 4, 'Mostar': 3 },
      },
      {
        id: 'benelux-route',
        tripStructure: 'multi_country',
        countries: ['Belgium', 'Netherlands'],
        cities: ['Brussels', 'Amsterdam', 'Rotterdam'],
        bestSeasons: ['spring', 'summer', 'autumn'],
        budgetFit: ['moderate', 'high', 'luxury'],
        travelStyles: ['city-life', 'culture', 'food', 'nightlife'],
        transportMode: 'train',
        fatigueLevel: 'Low',
        minDays: 8,
        maxDays: 12,
        nightsDistribution: { 'Brussels': 3, 'Amsterdam': 4, 'Rotterdam': 2 },
      },
      {
        id: 'iberia-capitals',
        tripStructure: 'multi_country',
        countries: ['Spain', 'Portugal'],
        cities: ['Madrid', 'Lisbon', 'Porto'],
        bestSeasons: ['spring', 'autumn'],
        budgetFit: ['moderate', 'high'],
        travelStyles: ['city-life', 'food', 'history', 'nightlife'],
        transportMode: 'train',
        fatigueLevel: 'Medium',
        minDays: 12,
        maxDays: 16,
        nightsDistribution: { 'Madrid': 4, 'Lisbon': 5, 'Porto': 3 },
      },
      
      // Single Country Multi-City Routes
      {
        id: 'italy-classic',
        tripStructure: 'single_country_multi_city',
        countries: ['Italy'],
        cities: ['Rome', 'Florence', 'Venice'],
        bestSeasons: ['spring', 'autumn'],
        budgetFit: ['moderate', 'high', 'luxury'],
        travelStyles: ['history', 'food', 'culture', 'city-life'],
        transportMode: 'train',
        fatigueLevel: 'Low',
        minDays: 10,
        maxDays: 14,
        nightsDistribution: { 'Rome': 4, 'Florence': 3, 'Venice': 3 },
      },
      {
        id: 'spain-south',
        tripStructure: 'single_country_multi_city',
        countries: ['Spain'],
        cities: ['Madrid', 'Seville', 'Granada'],
        bestSeasons: ['spring', 'autumn'],
        budgetFit: ['moderate', 'high'],
        travelStyles: ['history', 'food', 'culture', 'nightlife'],
        transportMode: 'train',
        fatigueLevel: 'Low',
        minDays: 10,
        maxDays: 14,
        nightsDistribution: { 'Madrid': 4, 'Seville': 3, 'Granada': 3 },
      },
      {
        id: 'portugal-highlights',
        tripStructure: 'single_country_multi_city',
        countries: ['Portugal'],
        cities: ['Lisbon', 'Porto', 'Sintra'],
        bestSeasons: ['spring', 'summer', 'autumn'],
        budgetFit: ['moderate', 'high'],
        travelStyles: ['history', 'food', 'nature', 'beach'],
        transportMode: 'train',
        fatigueLevel: 'Low',
        minDays: 8,
        maxDays: 12,
        nightsDistribution: { 'Lisbon': 4, 'Porto': 3, 'Sintra': 2 },
      },
      {
        id: 'georgia-adventure',
        tripStructure: 'single_country_multi_city',
        countries: ['Georgia'],
        cities: ['Tbilisi', 'Kazbegi', 'Batumi'],
        bestSeasons: ['spring', 'summer', 'autumn'],
        budgetFit: ['low', 'moderate'],
        travelStyles: ['nature', 'adventure', 'food', 'history'],
        transportMode: 'bus',
        fatigueLevel: 'Medium',
        minDays: 10,
        maxDays: 14,
        nightsDistribution: { 'Tbilisi': 4, 'Kazbegi': 3, 'Batumi': 4 },
      },
      {
        id: 'greece-mainland',
        tripStructure: 'single_country_multi_city',
        countries: ['Greece'],
        cities: ['Athens', 'Meteora', 'Thessaloniki'],
        bestSeasons: ['spring', 'summer', 'autumn'],
        budgetFit: ['moderate', 'high'],
        travelStyles: ['history', 'nature', 'food', 'culture'],
        transportMode: 'train',
        fatigueLevel: 'Medium',
        minDays: 10,
        maxDays: 14,
        nightsDistribution: { 'Athens': 4, 'Meteora': 2, 'Thessaloniki': 4 },
      },
      {
        id: 'albania-coast',
        tripStructure: 'single_country_multi_city',
        countries: ['Albania'],
        cities: ['Tirana', 'Berat', 'Saranda'],
        bestSeasons: ['spring', 'summer', 'autumn'],
        budgetFit: ['low', 'moderate'],
        travelStyles: ['history', 'beach', 'nature', 'adventure'],
        transportMode: 'bus',
        fatigueLevel: 'Medium',
        minDays: 8,
        maxDays: 12,
        nightsDistribution: { 'Tirana': 3, 'Berat': 2, 'Saranda': 4 },
      },
      
      // Single City Routes
      {
        id: 'budapest-solo',
        tripStructure: 'single_country_one_city',
        countries: ['Hungary'],
        cities: ['Budapest'],
        bestSeasons: ['spring', 'summer', 'autumn'],
        budgetFit: ['low', 'moderate', 'high'],
        travelStyles: ['city-life', 'history', 'nightlife', 'food', 'culture'],
        transportMode: 'local',
        fatigueLevel: 'Low',
        minDays: 5,
        maxDays: 10,
        nightsDistribution: { 'Budapest': 7 },
      },
      {
        id: 'athens-solo',
        tripStructure: 'single_country_one_city',
        countries: ['Greece'],
        cities: ['Athens'],
        bestSeasons: ['spring', 'autumn'],
        budgetFit: ['moderate', 'high'],
        travelStyles: ['history', 'culture', 'food', 'city-life'],
        transportMode: 'local',
        fatigueLevel: 'Low',
        minDays: 5,
        maxDays: 10,
        nightsDistribution: { 'Athens': 7 },
      },
      {
        id: 'prague-solo',
        tripStructure: 'single_country_one_city',
        countries: ['Czech Republic'],
        cities: ['Prague'],
        bestSeasons: ['spring', 'summer', 'autumn'],
        budgetFit: ['moderate', 'high'],
        travelStyles: ['city-life', 'history', 'nightlife', 'food'],
        transportMode: 'local',
        fatigueLevel: 'Low',
        minDays: 4,
        maxDays: 8,
        nightsDistribution: { 'Prague': 7 },
      },
      {
        id: 'istanbul-solo',
        tripStructure: 'single_country_one_city',
        countries: ['Turkey'],
        cities: ['Istanbul'],
        bestSeasons: ['spring', 'autumn'],
        budgetFit: ['low', 'moderate', 'high'],
        travelStyles: ['history', 'food', 'culture', 'city-life'],
        transportMode: 'local',
        fatigueLevel: 'Low',
        minDays: 5,
        maxDays: 10,
        nightsDistribution: { 'Istanbul': 7 },
      },
      {
        id: 'rome-solo',
        tripStructure: 'single_country_one_city',
        countries: ['Italy'],
        cities: ['Rome'],
        bestSeasons: ['spring', 'autumn'],
        budgetFit: ['moderate', 'high', 'luxury'],
        travelStyles: ['history', 'food', 'culture', 'city-life'],
        transportMode: 'local',
        fatigueLevel: 'Low',
        minDays: 5,
        maxDays: 10,
        nightsDistribution: { 'Rome': 7 },
      },
      {
        id: 'tbilisi-solo',
        tripStructure: 'single_country_one_city',
        countries: ['Georgia'],
        cities: ['Tbilisi'],
        bestSeasons: ['spring', 'summer', 'autumn'],
        budgetFit: ['low', 'moderate'],
        travelStyles: ['food', 'history', 'culture', 'nightlife'],
        transportMode: 'local',
        fatigueLevel: 'Low',
        minDays: 4,
        maxDays: 8,
        nightsDistribution: { 'Tbilisi': 7 },
      },
    ]
  }

  /**
   * Select best fallback routes based on user preferences
   */
  private selectBestFallbackRoutes(request: AnalysisRequest, count: number = 3) {
    const library = this.getFallbackRouteLibrary()
    const tripLength = request.tripLength || request.travelMonths?.length || 7
    const season = this.getSeasonFromMonths(request.travelMonths || [])
    
    // Filter by trip structure; with no stated structure (or no match) consider the whole library
    // rather than returning nothing
    const matching = library.filter(route => route.tripStructure === request.tripStructure)
    let candidates = matching.length > 0 ? matching : library
    
    // Score each route
    const scoredRoutes = candidates.map(route => {
      let score = 0
      
      // Trip length fit (most important)
      if (tripLength >= route.minDays && tripLength <= route.maxDays) {
        score += 40
      } else if (tripLength >= route.minDays - 2 && tripLength <= route.maxDays + 2) {
        score += 20
      }
      
      // Budget fit
      if (request.budget && route.budgetFit.includes(request.budget)) {
        score += 20
      }
      
      // Season fit
      if (route.bestSeasons.includes(season)) {
        score += 15
      }
      
      // Travel style match
      const userStyles = (request.interests || []).map(i => i.toLowerCase().replace(/\s+/g, '-'))
      const matchingStyles = route.travelStyles.filter(style => 
        userStyles.some(us => style.includes(us) || us.includes(style))
      )
      score += matchingStyles.length * 5
      
      return { route, score }
    })
    
    // Sort by score
    scoredRoutes.sort((a, b) => b.score - a.score)
    
    // Ensure diversity: select top routes from different countries/regions
    const selected: typeof scoredRoutes = []
    const usedCountries = new Set<string>()
    
    for (const scoredRoute of scoredRoutes) {
      const country = scoredRoute.route.countries[0]
      
      // Add if we haven't used this country yet or if we need more routes
      if (!usedCountries.has(country) || selected.length < count) {
        selected.push(scoredRoute)
        usedCountries.add(country)
        
        if (selected.length >= count) break
      }
    }
    
    // If we still need more routes, add remaining by score
    if (selected.length < count) {
      for (const scoredRoute of scoredRoutes) {
        if (!selected.includes(scoredRoute)) {
          selected.push(scoredRoute)
          if (selected.length >= count) break
        }
      }
    }
    
    logger.info('Fallback routes selected', {
      candidateCount: scoredRoutes.length,
      selectedCount: selected.length,
      selectedCountries: selected.map(sr => sr.route.countries[0]).join(', '),
      diversityScore: usedCountries.size / Math.max(selected.length, 1),
    })
    
    return selected.map(sr => sr.route)
  }

  private getSeasonFromMonths(months: number[]): string {
    if (months.length === 0) return 'spring'
    const month = months[0]
    if (month >= 3 && month <= 5) return 'spring'
    if (month >= 6 && month <= 8) return 'summer'
    if (month >= 9 && month <= 11) return 'autumn'
    return 'winter'
  }

  /**
   * Select routes from route candidate pool
   */
  private selectRoutesFromCandidatePool(candidates: RouteCandidate[], request: AnalysisRequest, count: number): any[] {
    // Sort by estimated score
    const sorted = [...candidates].sort((a, b) => b.estimatedScore - a.estimatedScore)
    
    // Select top routes with diversity
    const selected = []
    const usedCountries = new Set<string>()
    const usedRegions = new Set<string>()
    
    for (const candidate of sorted) {
      if (selected.length >= count) break
      
      // Ensure diversity
      if (selected.length === 0 || !usedCountries.has(candidate.country) || usedRegions.size < 2) {
        selected.push({
          countries: [candidate.country],
          cities: candidate.routeCities,
          nightsDistribution: candidate.routeCities.reduce((acc, city, i) => {
            acc[city] = i === 0 ? 4 : 3
            return acc
          }, {} as Record<string, number>),
          minDays: 7,
          maxDays: 14,
          transportMode: candidate.transportMode.toLowerCase().includes('train') ? 'train' : 'bus',
          fatigueLevel: candidate.travelFatigue,
          travelStyles: candidate.interestsFit,
          whyRecommended: [candidate.whyCandidateFits, candidate.routeLogic],
        })
        usedCountries.add(candidate.country)
        usedRegions.add(candidate.region)
      }
    }
    
    return selected
  }

  /**
   * Generate deterministic fallback recommendations when AI provider fails
   */
  generateFallbackRecommendations(
    request: AnalysisRequest, 
    scoredDestinations: any[], 
    isTimeout: boolean = false,
    routeCandidatePool: RouteCandidate[] = []
  ): TravelAnalysisResponse {
    logger.warn('Generating fallback recommendations due to provider failure', {
      query: request.query,
      tripStructure: request.tripStructure,
      isTimeout,
      routeCandidatePoolAvailable: routeCandidatePool.length > 0,
    })

    // Select best routes from curated library or route candidate pool
    const selectedRoutes = routeCandidatePool.length > 0
      ? this.selectRoutesFromCandidatePool(routeCandidatePool, request, 3)
      : this.selectBestFallbackRoutes(request, 3)
    const tripLength: number = request.tripLength || request.travelMonths?.length || 7
    
    const rankedDestinations = selectedRoutes.map((route, index) => {
      const tripType = request.tripStructure === 'single_country_one_city' 
        ? 'Single Country - One City'
        : request.tripStructure === 'single_country_multi_city'
        ? 'Single Country - Multi-City'
        : 'Multi-Country Route'

      // Adjust nights distribution to match actual trip length
      const nightsValues = Object.values(route.nightsDistribution) as number[]
      const totalNightsInTemplate: number = nightsValues.reduce((a: number, b: number) => a + b, 0)
      const adjustedNights: Record<string, number> = {}
      
      Object.entries(route.nightsDistribution).forEach(([city, nights]) => {
        const nightsNum: number = typeof nights === 'number' ? nights : Number(nights)
        const tripLengthNum: number = tripLength
        adjustedNights[city] = Math.round((nightsNum / totalNightsInTemplate) * tripLengthNum)
      })
      
      // Ensure total matches trip length
      const currentTotal = Object.values(adjustedNights).reduce((a, b) => a + b, 0)
      if (currentTotal !== tripLength && route.cities.length > 0) {
        const firstCity = route.cities[0]
        adjustedNights[firstCity] = adjustedNights[firstCity] + (tripLength - currentTotal)
      }

      // Generate warnings for rushed itineraries
      const routeWarnings: string[] = []
      let travelFatigueLevel: 'Low' | 'Medium' | 'High' = route.fatigueLevel as any
      let routeRealismScore = 85
      
      if (request.tripStructure === 'multi_country') {
        // Only mark as rushed if significantly below minimum days
        if (tripLength < route.minDays - 2) {
          routeWarnings.push(`${route.cities.length} countries in ${tripLength} days may feel rushed - consider ${route.minDays}+ days`)
          travelFatigueLevel = 'High'
          routeRealismScore = 55
        } else if (tripLength < route.minDays) {
          routeWarnings.push('Tight schedule - plan transfers carefully')
          travelFatigueLevel = 'Medium'
          routeRealismScore = 70
        } else if (tripLength >= route.minDays && tripLength <= route.maxDays) {
          // Perfect fit - use route's natural fatigue level and high realism
          routeRealismScore = 85
          // Keep the route's designed fatigue level
        } else if (tripLength > route.maxDays) {
          // Extra time is good - lower fatigue
          routeRealismScore = 88
          travelFatigueLevel = 'Low'
        }
      } else if (request.tripStructure === 'single_country_multi_city') {
        // Single country routes are generally less fatiguing
        if (tripLength >= route.minDays && tripLength <= route.maxDays) {
          routeRealismScore = 88
        } else if (tripLength > route.maxDays) {
          routeRealismScore = 90
          travelFatigueLevel = 'Low'
        }
      } else if (request.tripStructure === 'single_country_one_city') {
        // Single city is always low fatigue
        routeRealismScore = 92
        travelFatigueLevel = 'Low'
      }

      const transportLogic = route.transportMode === 'train' 
        ? 'Convenient train connections between cities'
        : route.transportMode === 'bus'
        ? 'Bus connections recommended - book in advance'
        : route.transportMode === 'local'
        ? 'Local transport within city - metro, trams, walking'
        : 'Mixed transport - trains and buses'

      const consultantNotes = tripLength < route.minDays
        ? `This ${tripType.toLowerCase()} route typically needs ${route.minDays}-${route.maxDays} days. With ${tripLength} days, you'll have a fast-paced trip. Consider reducing stops for a more relaxed experience.`
        : tripLength > route.maxDays
        ? `Perfect timing for this ${tripType.toLowerCase()} route. You'll have ${tripLength} days to explore comfortably with time for day trips and spontaneous discoveries.`
        : `This is a realistic ${tripType.toLowerCase()} itinerary for ${tripLength} days. The pacing allows for comfortable exploration of each destination.`

      // Create categoryScores for compatibility with ML and other components
      // Vary scores based on rank to ensure distinctiveness
      const baseScore = routeRealismScore / 10
      const rankVariation = index * 0.5 // Add variation based on rank
      const categoryScores = {
        budgetFit: Math.min(10, Math.max(0, baseScore + (index === 0 ? 0.5 : index === 1 ? -0.3 : 0.2))),
        weatherFit: Math.min(10, Math.max(0, baseScore + (index === 0 ? 0.3 : index === 1 ? 0.5 : -0.2))),
        passportEase: 8,
        nightlife: route.travelStyles.includes('nightlife') ? (8 + (index === 1 ? 0.5 : 0)) : (5 + (index === 2 ? 0.5 : 0)),
        nature: route.travelStyles.includes('nature') || route.travelStyles.includes('adventure') ? (8 + (index === 2 ? 0.5 : 0)) : (5 + (index === 0 ? 0.5 : 0)),
        transport: route.transportMode === 'train' ? 9 : route.transportMode === 'local' ? 8 : 7,
        hotelValue: Math.min(10, Math.max(0, baseScore + (index === 1 ? 0.4 : index === 2 ? -0.3 : 0.1))),
        safety: 8,
        flightValue: 7 + (index === 0 ? 0.3 : index === 1 ? -0.2 : 0.4),
      }

      // Generate consultant-grade labels
      const diversityLabel = index === 0 ? 'Best Overall' : index === 1 ? 'Best Value' : 'Unique Discovery'
      
      // Generate specific summary based on route
      const routeDisplay = route.cities.join(' → ')
      const primaryInterest = route.travelStyles[0] || 'exploration'
      const destinationSummary = `${routeDisplay} route for ${primaryInterest} with ${route.transportMode} connections and ${route.fatigueLevel.toLowerCase()} fatigue`

      return {
        rank: index + 1,
        destinationId: `${route.cities[0].toLowerCase().replace(/\s+/g, '-')}-route-${index + 1}`,
        destinationName: route.cities[0],
        destinationType: 'city' as const,
        country: route.countries[0],
        destinationSummary,
        diversityLabel,
        whyRecommended: [
          `${diversityLabel}: ${routeRealismScore}/100 match for ${tripLength}-day ${tripType.toLowerCase()}`,
          `Matches your ${request.budget || 'moderate'} budget and ${route.travelStyles.slice(0, 2).join(', ')} interests`,
          `${transportLogic}`,
          `${travelFatigueLevel} travel fatigue with well-paced itinerary`,
        ],
        bestMonth: request.travelMonths?.[0] ? this.getMonthName(request.travelMonths[0]) : 'Spring',
        bestMonths: request.travelMonths || [3, 4, 5, 9, 10],
        totalMatchScore: routeRealismScore,
        categoryScores,
        seasonality: this.generateSeasonalityInfo(route, request.travelMonths),
        scoreBreakdown: {
          weather: Math.round(routeRealismScore * 0.2),
          budget: Math.round(routeRealismScore * 0.2),
          safety: Math.round(routeRealismScore * 0.2),
          activities: Math.round(routeRealismScore * 0.2),
          accessibility: Math.round(routeRealismScore * 0.2),
        },
        possibleDownsides: routeWarnings.length > 0 ? routeWarnings : ['Peak season may have higher prices', 'Book accommodation in advance'],
        estimatedBudgetLevel: request.budget || 'moderate',
        passportEase: 'easy',
        nightlifeLevel: categoryScores.nightlife,
        natureLevel: categoryScores.nature,
        transportLevel: categoryScores.transport,
        hotelValueLevel: categoryScores.hotelValue,
        safetyLevel: categoryScores.safety,
        confidence: 0.7,
        sourceLabels: ['knowledge-base', 'fallback'],
        dataQuality: 'estimated' as const,
        tripType,
        suggestedRoute: route.cities,
        recommendedNights: adjustedNights,
        routeRealismScore,
        travelFatigueLevel,
        transportLogic,
        realisticConsultantNotes: consultantNotes,
        routeWarnings: routeWarnings.length > 0 ? routeWarnings : null,
        routeAlternatives: routeWarnings.length > 0 && request.tripStructure === 'multi_country'
          ? `Consider a single-country multi-city route for ${tripLength} days, or extend to ${route.minDays}+ days for this multi-country route`
          : null,
        // Add basic travel strategy tips for fallback
        travelStrategyTips: {
          idealDateScanner: {
            title: 'Best Travel Timing',
            suggestedDateWindow: request.season || 'Spring/Autumn',
            whyThisWindow: 'Moderate weather and fewer crowds',
            estimatedPriceTendency: 'moderate' as const,
            weatherNote: 'Pleasant temperatures for sightseeing',
            crowdNote: 'Moderate tourist levels',
            flexibilityTip: 'Consider traveling mid-week for better rates',
            dataConfidence: 0.6,
            sourceLabel: 'fallback_estimate' as const,
          },
          extraFeesBreakdown: {
            title: 'Common Extra Costs',
            likelyExtraFees: [
              { feeType: 'Baggage fees', estimatedAmount: '$30-60', avoidable: true },
              { feeType: 'City tax', estimatedAmount: '$2-5 per night', avoidable: false },
              { feeType: 'Airport transfer', estimatedAmount: '$20-40', avoidable: true },
            ],
            howToAvoid: ['Pack light for carry-on only', 'Use public transport from airport', 'Book hotels with taxes included'],
            bookingChecklist: ['Check baggage allowance', 'Verify if breakfast included', 'Confirm cancellation policy'],
            riskLevel: 'medium' as const,
            confidence: 0.7,
          },
          alternativeAirportStrategy: null,
          smartRouteOptimizer: null,
          verifiedDealsAndPromotionsDetector: null,
          negotiationEmail: null,
          nearbyDestinationStrategy: null,
          flexibilityAndRiskAnalysis: {
            title: 'Trip Flexibility Analysis',
            flexibilityScore: travelFatigueLevel === 'Low' ? 8 : travelFatigueLevel === 'Medium' ? 6 : 4,
            mainRisks: routeWarnings.length > 0 ? routeWarnings : ['Weather changes', 'Transport delays'],
            whatCanGoWrong: ['Missed connections', 'Fully booked accommodation', 'Unexpected closures'],
            saferAlternative: travelFatigueLevel === 'High' ? 'Reduce number of stops' : 'Current plan is reasonable',
            changeDateImpact: 'Flexible dates can save 20-30% on flights',
            routeRisk: travelFatigueLevel === 'High' ? 'High - tight schedule' : 'Moderate',
            budgetRisk: 'Moderate - prices vary by season',
            cancellationRisk: 'Book refundable options if uncertain',
            recommendation: travelFatigueLevel === 'High' ? 'Consider extending trip or reducing stops' : 'Plan looks feasible',
          },
        },
        // Add basic itinerary map plan for fallback
        itineraryMapPlan: this.generateFallbackItinerary(route, tripLength, travelFatigueLevel),
      }
    })

    const fallbackTripLength = request.tripLength || request.travelMonths?.length || 7
    const firstDest = rankedDestinations[0]
    
    return {
      querySummary: `Travel recommendations for ${request.tripStructure?.replace(/_/g, ' ') || 'your trip'} with ${request.budget || 'moderate'} budget`,
      userConstraints: {
        budget: request.budget || 'moderate',
        travelMonths: request.travelMonths || [],
        interests: request.interests || [],
        travelStyle: request.travelStyle ?? null,
        pace: request.pace ?? null,
      },
      topRecommendations: rankedDestinations.slice(0, 3).map(d => d.destinationName),
      rankedDestinations,
      scoreBreakdown: 'Scores calculated based on budget fit, weather, safety, activities, and accessibility',
      reasons: ['Based on your preferences and budget', 'Realistic route planning', 'Knowledge-based conservative estimates'],
      warnings: [isTimeout 
        ? 'Live AI took too long to respond. Showing knowledge-based recommendations with conservative estimates.'
        : 'Live AI provider unavailable. Showing knowledge-based recommendations with conservative estimates.'],
      assumptions: ['Standard travel preferences applied', 'Moderate pacing assumed'],
      recommendedRoutes: firstDest ? [{
        routeType: firstDest.suggestedRoute && firstDest.suggestedRoute.length === 3 ? '3-city' : firstDest.suggestedRoute && firstDest.suggestedRoute.length > 3 ? 'multi-city' : firstDest.suggestedRoute && firstDest.suggestedRoute.length === 2 ? '2-city' : 'single-destination',
        routeName: `${firstDest.destinationName} Route`,
        orderedStops: (firstDest.suggestedRoute || [firstDest.destinationName]).map((city: string, idx: number) => ({
          destinationId: `${city.toLowerCase().replace(/\s+/g, '-')}-${idx}`,
          destinationName: city,
          destinationType: 'city' as const,
          totalScore: firstDest.totalMatchScore || 75,
          daysRecommended: firstDest.recommendedNights?.[city] || Math.floor(fallbackTripLength / (firstDest.suggestedRoute?.length || 1)),
          orderInRoute: idx + 1,
        })),
        routeScore: {
          coherence: 7.5,
          transferSimplicity: 7.5,
          transportConvenience: 7.5,
          budgetEfficiency: 7.5,
          seasonalCompatibility: 7.5,
          destinationSynergy: 7.5,
          fatiguePenalty: firstDest.travelFatigueLevel === 'Low' ? 9 : firstDest.travelFatigueLevel === 'Medium' ? 7 : 5,
          totalRouteQuality: 75,
        },
        whyThisRoute: [firstDest.realisticConsultantNotes || 'Good route for your trip length'],
        transferNotes: [firstDest.transportLogic || 'Standard transport options available'],
        routeWarnings: firstDest.routeWarnings || [],
        estimatedTripIntensity: firstDest.travelFatigueLevel === 'Low' ? 'relaxed' : firstDest.travelFatigueLevel === 'Medium' ? 'moderate' : 'intense',
        bestFor: request.interests || ['General travel'],
        routeConfidence: 0.7,
        totalDays: fallbackTripLength,
        estimatedCost: {
          min: request.budget === 'luxury' ? 4000 : request.budget === 'high' ? 2500 : request.budget === 'low' ? 800 : 1500,
          max: request.budget === 'luxury' ? 6000 : request.budget === 'high' ? 3500 : request.budget === 'low' ? 1200 : 2500,
          currency: 'USD',
        },
        highlights: ['Cultural experiences', 'Local cuisine', 'Historical sites'],
        bestMonths: request.travelMonths || [4, 5, 9, 10],
        dataQuality: 'knowledge-based' as const,
      }] : [],
      nextBestAlternatives: rankedDestinations.slice(3, 5).map(d => d.destinationName),
      dataFreshness: {
        knowledgeBase: new Date().toISOString(),
        providerData: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
      confidence: 0.7,
      sourcesUsed: ['Knowledge base', 'Scoring engine'],
      personalization: {
        isPersonalized: false,
        confidence: 0,
        explanations: ['Knowledge-based recommendations - Live AI provider unavailable'],
        feedbackCount: 0,
      },
      // Add season month strategy if season is selected
      seasonMonthStrategy: request.season ? this.generateFallbackSeasonStrategy(request, selectedRoutes[0]) : null,
    }
  }

  private getMonthName(month: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1] || 'Spring'
  }

  /**
   * Generate realistic seasonality information
   */
  private generateSeasonalityInfo(route: any, travelMonths?: number[]) {
    const month = travelMonths?.[0] || 4 // Default to April
    const destination = route.cities[0]
    const country = route.countries[0]
    
    // Define peak/shoulder/low seasons for common destinations
    const seasonInfo: Record<string, any> = {
      'Italy': {
        peak: 'June-August, Easter week',
        shoulder: 'April-May, September-October',
        low: 'November-March (except Christmas/New Year)',
        peakMonths: [6, 7, 8],
        shoulderMonths: [4, 5, 9, 10],
      },
      'Spain': {
        peak: 'July-August, Easter week',
        shoulder: 'April-June, September-October',
        low: 'November-March',
        peakMonths: [7, 8],
        shoulderMonths: [4, 5, 6, 9, 10],
      },
      'Portugal': {
        peak: 'July-August',
        shoulder: 'May-June, September-October',
        low: 'November-April',
        peakMonths: [7, 8],
        shoulderMonths: [5, 6, 9, 10],
      },
      'Greece': {
        peak: 'July-August',
        shoulder: 'May-June, September-October',
        low: 'November-April',
        peakMonths: [7, 8],
        shoulderMonths: [5, 6, 9, 10],
      },
      'Georgia': {
        peak: 'July-August',
        shoulder: 'May-June, September-October',
        low: 'November-April',
        peakMonths: [7, 8],
        shoulderMonths: [5, 6, 9, 10],
      },
      'Albania': {
        peak: 'July-August',
        shoulder: 'May-June, September',
        low: 'October-April',
        peakMonths: [7, 8],
        shoulderMonths: [5, 6, 9],
      },
    }

    const info = seasonInfo[country] || seasonInfo['Italy']
    const isPeak = info.peakMonths.includes(month)
    const isShoulder = info.shoulderMonths.includes(month)
    
    let weatherReality = ''
    let crowdReality = ''
    let priceReality = ''
    let honestNote = ''
    
    if (month >= 3 && month <= 5) {
      weatherReality = 'Spring weather: mild temperatures (15-22°C), occasional rain possible. Pack layers.'
      crowdReality = isShoulder ? 'Moderate crowds - popular sites busy but manageable' : 'Light crowds - easier to explore'
      priceReality = isShoulder ? 'Moderate prices - better value than summer peak' : 'Lower prices - good deals available'
      honestNote = `${this.getMonthName(month)} is ${isShoulder ? 'shoulder season' : 'low season'} in ${destination}. Weather is generally pleasant but can be unpredictable. Hotels and flights are typically ${isShoulder ? '20-30% cheaper than peak summer' : '30-40% cheaper than peak season'}.`
    } else if (month >= 6 && month <= 8) {
      weatherReality = isPeak ? 'Summer peak: hot (25-35°C), crowded, expensive. Book everything in advance.' : 'Summer weather: warm and sunny, ideal for beaches'
      crowdReality = isPeak ? 'Heavy crowds - expect queues at major attractions' : 'Moderate to heavy crowds'
      priceReality = isPeak ? 'Peak prices - expect 40-60% premium on hotels and flights' : 'High prices - book early for better rates'
      honestNote = `${this.getMonthName(month)} is ${isPeak ? 'peak season' : 'high season'} in ${destination}. Expect crowds and premium prices. Book accommodation 2-3 months in advance. Consider visiting major sites early morning or late afternoon.`
    } else if (month >= 9 && month <= 11) {
      weatherReality = 'Autumn weather: pleasant temperatures (18-25°C), less rain than spring'
      crowdReality = isShoulder ? 'Moderate crowds - much quieter than summer' : 'Light crowds - peaceful exploration'
      priceReality = isShoulder ? 'Good value - 25-35% cheaper than summer peak' : 'Lower prices - excellent deals available'
      honestNote = `${this.getMonthName(month)} is ${isShoulder ? 'shoulder season' : 'low season'} in ${destination}. One of the best times to visit - pleasant weather, fewer tourists, and better prices. Hotels are typically 30-40% cheaper than July-August.`
    } else {
      weatherReality = 'Winter weather: cool to cold (5-15°C), some rain. Indoor attractions ideal.'
      crowdReality = 'Very light crowds - attractions nearly empty'
      priceReality = 'Lowest prices - best deals of the year (except Christmas/New Year)'
      honestNote = `${this.getMonthName(month)} is low season in ${destination}. Weather can be chilly and rainy, but you'll have attractions to yourself and find excellent hotel deals. Perfect for budget travelers and those who prefer fewer crowds.`
    }
    
    return {
      peakSeason: info.peak,
      shoulderSeason: info.shoulder,
      lowSeason: info.low,
      weatherReality,
      crowdReality,
      priceReality,
      whenToAvoid: isPeak ? `Avoid ${this.getMonthName(month)} if you dislike crowds and high prices` : null,
      honestConsultantNote: honestNote,
    }
  }

  /**
   * Generate fallback season month strategy
   */
  private generateFallbackSeasonStrategy(request: AnalysisRequest, route: any): any {
    const seasonMonths: Record<string, number[]> = {
      'Winter': [12, 1, 2],
      'Spring': [3, 4, 5],
      'Summer': [6, 7, 8],
      'Autumn': [9, 10, 11],
    }

    const months = seasonMonths[request.season || 'Spring'] || [3, 4, 5]
    const tripLength = request.tripLength || 7

    return {
      season: request.season || 'Spring',
      months: months.map(month => ({
        month,
        monthName: this.getMonthName(month),
        options: [
          {
            title: `Best Value - ${this.getMonthName(month)}`,
            month,
            optionType: 'bestValue' as const,
            suggestedRoute: route.cities.slice(0, 2),
            recommendedNights: route.cities.slice(0, 2).reduce((acc: any, city: string, idx: number) => {
              acc[city] = idx === 0 ? Math.ceil(tripLength * 0.6) : Math.floor(tripLength * 0.4)
              return acc
            }, {}),
            whyRecommended: `${this.getMonthName(month)} offers good value with moderate prices and decent weather`,
            budgetNote: 'Mid-range pricing, good deals available',
            weatherNote: 'Generally pleasant conditions',
            crowdNote: 'Moderate tourist levels',
            routeLogic: route.transportMode === 'train' ? 'Easy train connections' : 'Standard transport options',
            riskWarnings: [],
            dataConfidence: 0.6,
            sourceLabel: 'fallback_estimate' as const,
          },
          {
            title: `Best Experience - ${this.getMonthName(month)}`,
            month,
            optionType: 'bestExperience' as const,
            suggestedRoute: route.cities,
            recommendedNights: route.nightsDistribution,
            whyRecommended: `${this.getMonthName(month)} provides excellent conditions for experiencing all destinations`,
            budgetNote: 'Expect higher prices during peak times',
            weatherNote: 'Optimal weather conditions',
            crowdNote: 'Popular travel period',
            routeLogic: `Full ${route.cities.length}-stop route with ${route.transportMode} connections`,
            riskWarnings: ['Book accommodation early', 'Higher prices expected'],
            dataConfidence: 0.6,
            sourceLabel: 'fallback_estimate' as const,
          },
          {
            title: `Lowest Fatigue - ${this.getMonthName(month)}`,
            month,
            optionType: 'lowestFatigue' as const,
            suggestedRoute: [route.cities[0]],
            recommendedNights: { [route.cities[0]]: tripLength },
            whyRecommended: `Single-city stay in ${route.cities[0]} for ${this.getMonthName(month)} minimizes travel fatigue`,
            budgetNote: 'Moderate pricing for extended stay',
            weatherNote: 'Comfortable for relaxed exploration',
            crowdNote: 'Manageable crowds',
            routeLogic: 'No inter-city travel required',
            riskWarnings: [],
            dataConfidence: 0.6,
            sourceLabel: 'fallback_estimate' as const,
          },
        ],
      })),
    }
  }

  /**
   * Generate basic itinerary map plan for fallback
   */
  private generateFallbackItinerary(route: any, tripLength: number, fatigueLevel: string): any {
    const daysPerCity: Array<{ city: string; nights: number; startDay: number }> = route.cities.map((city: string, idx: number) => {
      const nights = route.nightsDistribution[city] || Math.floor(tripLength / route.cities.length)
      return { city, nights, startDay: idx === 0 ? 1 : route.cities.slice(0, idx).reduce((sum: number, c: string) => sum + (route.nightsDistribution[c] || 0), 0) + 1 }
    })

    const stops = route.cities.flatMap((city: string, cityIdx: number) => {
      const cityDay = daysPerCity[cityIdx]
      return [
        {
          id: `${city.toLowerCase().replace(/\s+/g, '-')}-center`,
          name: `${city} City Center`,
          city,
          country: route.countries[cityIdx] || route.countries[0],
          lat: null,
          lng: null,
          day: cityDay.startDay,
          recommendedTimeOfDay: 'morning' as const,
          durationEstimate: '2-3 hours',
          type: 'neighborhood' as const,
          whyVisit: `Explore the heart of ${city}`,
          whatToDo: 'Walk around main squares, visit local shops',
          whatToSee: 'Historic architecture and city landmarks',
          practicalTip: 'Start early to avoid crowds',
          costLevel: 'free' as const,
        },
        {
          id: `${city.toLowerCase().replace(/\s+/g, '-')}-landmark`,
          name: `${city} Main Attraction`,
          city,
          country: route.countries[cityIdx] || route.countries[0],
          lat: null,
          lng: null,
          day: cityDay.startDay,
          recommendedTimeOfDay: 'afternoon' as const,
          durationEstimate: '2-4 hours',
          type: 'landmark' as const,
          whyVisit: `Must-see attraction in ${city}`,
          whatToDo: 'Visit, take photos, learn history',
          whatToSee: 'Main cultural or historical site',
          practicalTip: 'Book tickets online to skip lines',
          costLevel: 'moderate' as const,
        },
      ]
    })

    const dayPlans = Array.from({ length: tripLength }, (_, i) => {
      const day = i + 1
      const cityData = daysPerCity.find(c => day >= c.startDay && day < c.startDay + c.nights)
      const city = cityData?.city || route.cities[0]
      
      return {
        day,
        title: `Day ${day}: ${city}`,
        areaFocus: `${city} Center`,
        whyThisArea: `Best area for exploring ${city}'s main attractions`,
        morning: 'Breakfast and explore city center',
        afternoon: 'Visit main attractions and museums',
        evening: 'Dinner at local restaurant, evening walk',
        foodSuggestion: 'Try local specialties',
        transportTip: route.transportMode === 'train' ? 'Use metro or walk' : 'Public transport or walking',
        walkingIntensity: fatigueLevel === 'Low' ? 'low' : fatigueLevel === 'Medium' ? 'moderate' : 'high',
        warnings: [],
      }
    })

    return {
      routeTitle: `${route.cities.join(' → ')} Route`,
      mapAvailable: false,
      center: null,
      zoomLevel: null,
      routePolyline: null,
      polylineSource: 'fallback_visual' as const,
      stops,
      dayPlans,
      routeReasoning: {
        whyThisRoute: `Classic route combining ${route.cities.length} destinations`,
        whyThisOrder: `Logical geographic progression with ${route.transportMode} connections`,
        whyTheseAreas: `Selected for cultural significance and ease of access`,
        fatigueReasoning: `${fatigueLevel} fatigue level with ${tripLength} days for ${route.cities.length} cities`,
        transportReasoning: `${route.transportMode === 'train' ? 'Easy train connections' : 'Standard transport options'} between cities`,
        budgetReasoning: `Moderate budget accommodating standard travel costs`,
      },
    }
  }
}
