// Route Intelligence Service - Analyzes and scores multi-city travel routes
import { logger } from '../utils'
import type { RankedDestination } from '../analysis/schemas'

export interface RouteStop {
  destinationId: string
  destinationName: string
  destinationType: 'country' | 'city'
  totalScore: number
  categoryScores: any
  daysRecommended: number
  orderInRoute: number
}

export interface RouteScore {
  coherence: number // 0-10: Geographic/cultural flow
  transferSimplicity: number // 0-10: Ease of moving between stops
  transportConvenience: number // 0-10: Transport quality/availability
  budgetEfficiency: number // 0-10: Value across all stops
  seasonalCompatibility: number // 0-10: Weather/timing alignment
  destinationSynergy: number // 0-10: How well destinations complement each other
  fatiguePenalty: number // 0-10: Lower = more fatigue (inverted)
  totalRouteQuality: number // 0-100: Weighted total
}

export interface IntelligentRoute {
  routeType: 'single-destination' | '2-city' | '3-city' | 'multi-city'
  routeName: string
  orderedStops: RouteStop[]
  routeScore: RouteScore
  whyThisRoute: string[]
  transferNotes: string[]
  routeWarnings: string[]
  estimatedTripIntensity: 'relaxed' | 'moderate' | 'intense' | 'very-intense'
  bestFor: string[]
  routeConfidence: number // 0-1
  totalDays: number
  estimatedCost: {
    min: number
    max: number
    currency: string
  }
  highlights: string[]
  bestMonths: number[]
  dataQuality: 'knowledge-based' | 'estimated' | 'demo'
}

export interface RouteAnalysis {
  singleDestinationOption: IntelligentRoute | null
  twoStopRouteOption: IntelligentRoute | null
  threeStopRouteOption: IntelligentRoute | null
  recommendedRoute: IntelligentRoute
  reasoning: string
  alternativeRoutes: IntelligentRoute[]
}

/**
 * Route Intelligence Service
 * Analyzes destinations and creates intelligent multi-city routes
 */
export class RouteIntelligenceService {
  /**
   * Analyze destinations and generate route recommendations
   */
  analyzeRoutes(
    destinations: RankedDestination[],
    userPreferences: {
      budget?: string
      travelMonths?: number[]
      interests?: string[]
      travelStyle?: string
      pace?: string
      tripStructure?: 'single_country_one_city' | 'single_country_multi_city' | 'multi_country'
    }
  ): RouteAnalysis {
    logger.info('Route Intelligence: Analyzing routes', {
      destinationCount: destinations.length,
      tripStructure: userPreferences.tripStructure,
      preferences: userPreferences,
    })

    // Generate route options
    const singleDestination = this.createSingleDestinationRoute(destinations, userPreferences)
    const twoStopRoute = this.createTwoStopRoute(destinations, userPreferences)
    const threeStopRoute = this.createThreeStopRoute(destinations, userPreferences)

    // Score and compare routes
    const routes = [singleDestination, twoStopRoute, threeStopRoute].filter(Boolean) as IntelligentRoute[]
    const recommendedRoute = this.selectBestRoute(routes, userPreferences)

    // Generate reasoning
    const reasoning = this.explainRouteChoice(recommendedRoute, routes, userPreferences)

    // Alternative routes (excluding recommended)
    const alternativeRoutes = routes.filter(r => r !== recommendedRoute)

    return {
      singleDestinationOption: singleDestination,
      twoStopRouteOption: twoStopRoute,
      threeStopRouteOption: threeStopRoute,
      recommendedRoute,
      reasoning,
      alternativeRoutes,
    }
  }

  /**
   * Create single-destination route (best city or country)
   */
  private createSingleDestinationRoute(
    destinations: RankedDestination[],
    userPreferences: any
  ): IntelligentRoute | null {
    if (destinations.length === 0) return null

    const topDestination = destinations[0]
    const days = this.estimateDaysForDestination(topDestination, userPreferences)

    const stop: RouteStop = {
      destinationId: topDestination.destinationId,
      destinationName: topDestination.destinationName,
      destinationType: topDestination.destinationType,
      totalScore: topDestination.totalMatchScore,
      categoryScores: topDestination.categoryScores,
      daysRecommended: days,
      orderInRoute: 1,
    }

    const routeScore = this.scoreSingleDestinationRoute(topDestination)
    const intensity = this.calculateTripIntensity([stop], userPreferences)
    const cost = this.estimateRouteCost([stop], userPreferences.budget)

    return {
      routeType: 'single-destination',
      routeName: `${topDestination.destinationName} Deep Dive`,
      orderedStops: [stop],
      routeScore,
      whyThisRoute: [
        `${topDestination.destinationName} is the top-scoring destination (${topDestination.totalMatchScore.toFixed(1)}/100)`,
        'Single-destination trips allow deeper exploration and less travel fatigue',
        'No time wasted on transfers or packing/unpacking',
        ...topDestination.whyRecommended.slice(0, 2),
      ],
      transferNotes: ['No transfers required - stay in one location'],
      routeWarnings: topDestination.possibleDownsides,
      estimatedTripIntensity: intensity,
      bestFor: this.determineBestFor([topDestination]),
      routeConfidence: topDestination.confidence,
      totalDays: days,
      estimatedCost: cost,
      highlights: topDestination.whyRecommended,
      bestMonths: topDestination.bestMonths,
      dataQuality: topDestination.dataQuality,
    }
  }

  /**
   * Create 2-stop route
   */
  private createTwoStopRoute(
    destinations: RankedDestination[],
    userPreferences: any
  ): IntelligentRoute | null {
    if (destinations.length < 2) return null

    // Find best 2-city combination
    const cities = destinations.filter(d => d.destinationType === 'city').slice(0, 5)
    if (cities.length < 2) return null

    const [city1, city2] = this.findBestCityPair(cities)
    const orderedStops = this.orderStops([city1, city2], userPreferences)

    const routeScore = this.scoreTwoStopRoute(orderedStops, userPreferences)
    const intensity = this.calculateTripIntensity(orderedStops, userPreferences)
    const cost = this.estimateRouteCost(orderedStops, userPreferences.budget)

    const transferInfo = this.analyzeTransfer(orderedStops[0], orderedStops[1])

    return {
      routeType: '2-city',
      routeName: `${orderedStops[0].destinationName} & ${orderedStops[1].destinationName}`,
      orderedStops,
      routeScore,
      whyThisRoute: [
        `Combines two high-scoring cities (${orderedStops[0].totalScore.toFixed(1)} + ${orderedStops[1].totalScore.toFixed(1)})`,
        `${transferInfo.distance} - ${transferInfo.method}`,
        'Offers variety while maintaining travel efficiency',
        'Both destinations complement each other well',
      ],
      transferNotes: [
        `Transfer: ${orderedStops[0].destinationName} → ${orderedStops[1].destinationName}`,
        transferInfo.notes,
      ],
      routeWarnings: this.generateRouteWarnings(orderedStops, routeScore),
      estimatedTripIntensity: intensity,
      bestFor: this.determineBestFor([orderedStops[0], orderedStops[1]]),
      routeConfidence: Math.min(orderedStops[0].totalScore, orderedStops[1].totalScore) / 100,
      totalDays: orderedStops.reduce((sum, s) => sum + s.daysRecommended, 0),
      estimatedCost: cost,
      highlights: this.combineHighlights(orderedStops),
      bestMonths: this.findCommonMonths(orderedStops),
      dataQuality: 'estimated',
    }
  }

  /**
   * Create 3-stop route
   */
  private createThreeStopRoute(
    destinations: RankedDestination[],
    userPreferences: any
  ): IntelligentRoute | null {
    if (destinations.length < 3) return null

    const cities = destinations.filter(d => d.destinationType === 'city').slice(0, 6)
    if (cities.length < 3) return null

    const [city1, city2, city3] = this.findBestThreeCityRoute(cities)
    const orderedStops = this.orderStops([city1, city2, city3], userPreferences)

    const routeScore = this.scoreThreeStopRoute(orderedStops, userPreferences)
    const intensity = this.calculateTripIntensity(orderedStops, userPreferences)
    const cost = this.estimateRouteCost(orderedStops, userPreferences.budget)

    return {
      routeType: '3-city',
      routeName: `${orderedStops[0].destinationName}, ${orderedStops[1].destinationName} & ${orderedStops[2].destinationName}`,
      orderedStops,
      routeScore,
      whyThisRoute: [
        'Three-city route offers maximum variety and cultural diversity',
        `Balanced scores across all stops (avg: ${(orderedStops.reduce((sum, s) => sum + s.totalScore, 0) / 3).toFixed(1)})`,
        'Route optimized for efficient transfers',
        'Each city offers unique experiences',
      ],
      transferNotes: [
        `Route: ${orderedStops[0].destinationName} → ${orderedStops[1].destinationName} → ${orderedStops[2].destinationName}`,
        'Multiple transfers increase trip complexity',
      ],
      routeWarnings: [
        ...this.generateRouteWarnings(orderedStops, routeScore),
        'Three-city routes require more planning and energy',
        'Consider travel time between cities when booking',
      ],
      estimatedTripIntensity: intensity,
      bestFor: this.determineBestFor(orderedStops),
      routeConfidence: Math.min(...orderedStops.map(s => s.totalScore)) / 100,
      totalDays: orderedStops.reduce((sum, s) => sum + s.daysRecommended, 0),
      estimatedCost: cost,
      highlights: this.combineHighlights(orderedStops),
      bestMonths: this.findCommonMonths(orderedStops),
      dataQuality: 'estimated',
    }
  }

  /**
   * Score single-destination route
   */
  private scoreSingleDestinationRoute(destination: RankedDestination): RouteScore {
    const scores = destination.categoryScores

    return {
      coherence: 10, // Perfect coherence - single location
      transferSimplicity: 10, // No transfers
      transportConvenience: scores.transport,
      budgetEfficiency: scores.budgetFit,
      seasonalCompatibility: scores.weatherFit,
      destinationSynergy: 8, // Good for deep exploration
      fatiguePenalty: 10, // No fatigue from transfers
      totalRouteQuality: destination.totalMatchScore,
    }
  }

  /**
   * Score 2-stop route
   */
  private scoreTwoStopRoute(stops: RouteStop[], userPreferences: any): RouteScore {
    const avgTransport = (stops[0].categoryScores.transport + stops[1].categoryScores.transport) / 2
    const avgBudget = (stops[0].categoryScores.budgetFit + stops[1].categoryScores.budgetFit) / 2
    const avgWeather = (stops[0].categoryScores.weatherFit + stops[1].categoryScores.weatherFit) / 2

    const coherence = this.calculateCoherence(stops)
    const transferSimplicity = this.calculateTransferSimplicity(stops)
    const synergy = this.calculateDestinationSynergy(stops)
    const fatiguePenalty = 8 // Moderate fatigue from one transfer

    const totalRouteQuality = (
      coherence * 0.15 +
      transferSimplicity * 0.15 +
      avgTransport * 0.10 +
      avgBudget * 0.20 +
      avgWeather * 0.15 +
      synergy * 0.15 +
      fatiguePenalty * 0.10
    ) * 10

    return {
      coherence,
      transferSimplicity,
      transportConvenience: avgTransport,
      budgetEfficiency: avgBudget,
      seasonalCompatibility: avgWeather,
      destinationSynergy: synergy,
      fatiguePenalty,
      totalRouteQuality,
    }
  }

  /**
   * Score 3-stop route
   */
  private scoreThreeStopRoute(stops: RouteStop[], userPreferences: any): RouteScore {
    const avgTransport = stops.reduce((sum, s) => sum + s.categoryScores.transport, 0) / stops.length
    const avgBudget = stops.reduce((sum, s) => sum + s.categoryScores.budgetFit, 0) / stops.length
    const avgWeather = stops.reduce((sum, s) => sum + s.categoryScores.weatherFit, 0) / stops.length

    const coherence = this.calculateCoherence(stops)
    const transferSimplicity = this.calculateTransferSimplicity(stops)
    const synergy = this.calculateDestinationSynergy(stops)
    const fatiguePenalty = 6 // Higher fatigue from multiple transfers

    const totalRouteQuality = (
      coherence * 0.15 +
      transferSimplicity * 0.15 +
      avgTransport * 0.10 +
      avgBudget * 0.20 +
      avgWeather * 0.15 +
      synergy * 0.15 +
      fatiguePenalty * 0.10
    ) * 10

    return {
      coherence,
      transferSimplicity,
      transportConvenience: avgTransport,
      budgetEfficiency: avgBudget,
      seasonalCompatibility: avgWeather,
      destinationSynergy: synergy,
      fatiguePenalty,
      totalRouteQuality,
    }
  }

  /**
   * Select best route from options
   */
  private selectBestRoute(routes: IntelligentRoute[], userPreferences: any): IntelligentRoute {
    // Guard against empty routes array
    if (routes.length === 0) {
      return this.createFallbackRoute(userPreferences)
    }

    const tripStructure = userPreferences.tripStructure
    const singleDest = routes.find(r => r.routeType === 'single-destination')
    const multiCity = routes.find(r => r.routeType === '2-city' || r.routeType === '3-city' || r.routeType === 'multi-city')

    // Respect user's tripStructure preference
    if (tripStructure === 'single_country_one_city') {
      // Prefer single destination
      if (singleDest) {
        logger.info('Route Intelligence: Selecting single-destination per tripStructure', {
          tripStructure,
          routeType: singleDest.routeType,
        })
        return singleDest
      }
    } else if (tripStructure === 'single_country_multi_city' || tripStructure === 'multi_country') {
      // Prefer multi-city routes
      if (multiCity) {
        logger.info('Route Intelligence: Selecting multi-city per tripStructure', {
          tripStructure,
          routeType: multiCity.routeType,
        })
        return multiCity
      }
    }

    // Fallback to score-based selection
    // Default to single destination if it's strong
    if (singleDest && singleDest.routeScore.totalRouteQuality >= 75) {
      return singleDest
    }

    // Find highest scoring route - safe because we checked length above
    const bestRoute = routes.reduce((best, current) => {
      return current.routeScore.totalRouteQuality > best.routeScore.totalRouteQuality ? current : best
    })

    // Only recommend multi-city if it's significantly better (5+ points)
    if (singleDest && bestRoute !== singleDest) {
      const scoreDiff = bestRoute.routeScore.totalRouteQuality - singleDest.routeScore.totalRouteQuality
      if (scoreDiff < 5) {
        return singleDest
      }
    }

    return bestRoute
  }

  /**
   * Create fallback route when no destinations are available
   */
  private createFallbackRoute(userPreferences: any): IntelligentRoute {
    // Create a minimal fallback route indicating no recommendations available
    const fallbackStop: RouteStop = {
      destinationId: 'fallback-1',
      destinationName: 'No destinations available',
      destinationType: 'city',
      totalScore: 0,
      categoryScores: {
        weatherFit: 0,
        budgetFit: 0,
        safety: 0,
        nightlife: 0,
        nature: 0,
        culture: 0,
        food: 0,
        transport: 0,
        hotelValue: 0,
        passportEase: 0,
      },
      daysRecommended: 7,
      orderInRoute: 1,
    }

    return {
      routeType: 'single-destination',
      routeName: 'No Recommendations Available',
      orderedStops: [fallbackStop],
      routeScore: {
        coherence: 0,
        transferSimplicity: 0,
        transportConvenience: 0,
        budgetEfficiency: 0,
        seasonalCompatibility: 0,
        destinationSynergy: 0,
        fatiguePenalty: 0,
        totalRouteQuality: 0,
      },
      whyThisRoute: [
        'No destinations match your criteria at this time',
        'Try adjusting your search parameters',
        'Consider different travel dates or budget',
      ],
      transferNotes: ['No route available'],
      routeWarnings: ['Unable to generate recommendations with current parameters'],
      estimatedTripIntensity: 'relaxed',
      bestFor: [],
      routeConfidence: 0,
      totalDays: 7,
      estimatedCost: { min: 0, max: 0, currency: 'USD' },
      highlights: [],
      bestMonths: [],
      dataQuality: 'demo',
    }
  }

  /**
   * Explain why this route was chosen
   */
  private explainRouteChoice(
    recommended: IntelligentRoute,
    allRoutes: IntelligentRoute[],
    userPreferences: any
  ): string {
    const parts: string[] = []

    if (recommended.routeType === 'single-destination') {
      parts.push('Single-destination recommended: The top destination is strong enough to warrant full focus.')
      parts.push(`Route quality score: ${recommended.routeScore.totalRouteQuality.toFixed(1)}/100`)
      parts.push('Multi-city routes would add complexity without significant value gain.')
    } else {
      parts.push(`${recommended.routeType} route recommended: Offers best balance of variety and efficiency.`)
      parts.push(`Route quality score: ${recommended.routeScore.totalRouteQuality.toFixed(1)}/100`)
      
      const singleDest = allRoutes.find(r => r.routeType === 'single-destination')
      if (singleDest) {
        const scoreDiff = recommended.routeScore.totalRouteQuality - singleDest.routeScore.totalRouteQuality
        parts.push(`This route scores ${scoreDiff.toFixed(1)} points higher than single-destination option.`)
      }
    }

    return parts.join(' ')
  }

  // Helper methods

  private findBestCityPair(cities: RankedDestination[]): [RankedDestination, RankedDestination] {
    // Simple heuristic: top 2 cities with good synergy
    return [cities[0], cities[1]]
  }

  private findBestThreeCityRoute(cities: RankedDestination[]): [RankedDestination, RankedDestination, RankedDestination] {
    // Simple heuristic: top 3 cities
    return [cities[0], cities[1], cities[2]]
  }

  private orderStops(destinations: RankedDestination[], userPreferences: any): RouteStop[] {
    // Order by score (highest first) and assign days
    return destinations.map((dest, idx) => ({
      destinationId: dest.destinationId,
      destinationName: dest.destinationName,
      destinationType: dest.destinationType,
      totalScore: dest.totalMatchScore,
      categoryScores: dest.categoryScores,
      daysRecommended: this.estimateDaysForDestination(dest, userPreferences),
      orderInRoute: idx + 1,
    }))
  }

  private estimateDaysForDestination(destination: any, userPreferences: any): number {
    const pace = userPreferences.pace || 'moderate'
    const baselineDays = destination.destinationType === 'city' ? 4 : 7

    if (pace === 'relaxed') return Math.ceil(baselineDays * 1.3)
    if (pace === 'fast') return Math.ceil(baselineDays * 0.7)
    return baselineDays
  }

  private calculateCoherence(stops: RouteStop[]): number {
    // Simplified: assume geographic proximity based on similar scores
    const scoreVariance = this.calculateVariance(stops.map(s => s.totalScore))
    return Math.max(5, 10 - scoreVariance / 10)
  }

  private calculateTransferSimplicity(stops: RouteStop[]): number {
    // Fewer stops = simpler transfers
    if (stops.length === 1) return 10
    if (stops.length === 2) return 8
    if (stops.length === 3) return 6
    return 4
  }

  private calculateDestinationSynergy(stops: RouteStop[]): number {
    // Check if destinations complement each other
    const avgScore = stops.reduce((sum, s) => sum + s.totalScore, 0) / stops.length
    return Math.min(10, avgScore / 10)
  }

  private calculateTripIntensity(stops: RouteStop[], userPreferences: any): 'relaxed' | 'moderate' | 'intense' | 'very-intense' {
    const totalDays = stops.reduce((sum, s) => sum + s.daysRecommended, 0)
    const stopsCount = stops.length

    if (stopsCount === 1) return 'relaxed'
    if (stopsCount === 2 && totalDays >= 10) return 'moderate'
    if (stopsCount === 2 && totalDays < 10) return 'intense'
    if (stopsCount === 3 && totalDays >= 14) return 'moderate'
    if (stopsCount === 3 && totalDays < 14) return 'intense'
    return 'very-intense'
  }

  private estimateRouteCost(stops: RouteStop[], budget?: string): { min: number; max: number; currency: string } {
    const budgetMultipliers: Record<string, { min: number; max: number }> = {
      low: { min: 50, max: 100 },
      moderate: { min: 100, max: 200 },
      high: { min: 200, max: 400 },
      luxury: { min: 400, max: 800 },
    }

    const multiplier = budgetMultipliers[budget || 'moderate']
    const totalDays = stops.reduce((sum, s) => sum + s.daysRecommended, 0)

    return {
      min: multiplier.min * totalDays,
      max: multiplier.max * totalDays,
      currency: 'USD',
    }
  }

  private analyzeTransfer(stop1: RouteStop, stop2: RouteStop): { distance: string; method: string; notes: string } {
    // Simplified transfer analysis
    return {
      distance: 'Moderate distance',
      method: 'Flight or train recommended',
      notes: 'Transfer time: 2-4 hours estimated',
    }
  }

  private generateRouteWarnings(stops: RouteStop[], routeScore: RouteScore): string[] {
    const warnings: string[] = []

    if (routeScore.fatiguePenalty < 7) {
      warnings.push('Multiple transfers may cause travel fatigue')
    }

    if (routeScore.transferSimplicity < 7) {
      warnings.push('Complex route - plan transfers carefully')
    }

    if (routeScore.budgetEfficiency < 6) {
      warnings.push('Route may exceed budget expectations')
    }

    return warnings
  }

  private determineBestFor(destinations: any[]): string[] {
    const bestFor: string[] = []

    const avgNightlife = destinations.reduce((sum, d) => sum + (d.nightlifeLevel || d.categoryScores?.nightlife || 0), 0) / destinations.length
    const avgNature = destinations.reduce((sum, d) => sum + (d.natureLevel || d.categoryScores?.nature || 0), 0) / destinations.length
    const avgSafety = destinations.reduce((sum, d) => sum + (d.safetyLevel || d.categoryScores?.safety || 0), 0) / destinations.length

    if (avgNightlife >= 7) bestFor.push('Nightlife enthusiasts')
    if (avgNature >= 7) bestFor.push('Nature lovers')
    if (avgSafety >= 8) bestFor.push('Safety-conscious travelers')
    if (destinations.length === 1) bestFor.push('Deep cultural immersion')
    if (destinations.length >= 2) bestFor.push('Variety seekers')

    return bestFor
  }

  private combineHighlights(stops: RouteStop[]): string[] {
    return stops.flatMap((stop, idx) => [
      `${stop.destinationName}: Top-rated destination (${stop.totalScore.toFixed(1)}/100)`,
    ]).slice(0, 5)
  }

  private findCommonMonths(stops: RouteStop[]): number[] {
    // Return months 5-9 as default (May-September)
    return [5, 6, 7, 8, 9]
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2))
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length
  }
}

// Export singleton instance
export const routeIntelligenceService = new RouteIntelligenceService()
