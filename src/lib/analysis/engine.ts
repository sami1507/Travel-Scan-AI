// Travel Analysis Engine - combines knowledge, scoring, providers, and AI
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { knowledgeRetrieval } from '../knowledge/retrieval'
import { scoringEngine, type UserPreferences } from '../scoring/engine'
import { getCountryKnowledge } from '../knowledge/base/countries'
import { getCityKnowledge } from '../knowledge/base/cities'
import {
  RealWeatherProvider,
  RealCurrencyProvider,
  RealVisaProvider,
} from '../providers/demo-providers'
import { DuffelFlightsProvider } from '../providers/duffel-flights-provider'
import { HotelbedsHotelsProvider } from '../providers/hotelbeds-hotels-provider'
import { enhancedEventsProvider } from '../providers/enhanced-events-provider'
import { travelAnalysisResponseSchema, type TravelAnalysisResponse } from './schemas'
import { logger } from '../utils'
import { getUserFeedback } from '../db/feedback'
import { getUserPreferences, updateInferredPreferences } from '../db/preferences'
import { preferenceInferenceService } from '../services/preference-inference'
import { personalizedScoringService } from '../services/personalized-scoring'
import { routeIntelligenceService } from '../services/route-intelligence'
import type { UserPreferenceProfile } from '../types/preferences'
import { errorTracker } from '../monitoring/error-tracker'
import { costTracker } from '../monitoring/cost-tracker'
import { cacheManager, CachePresets } from '../cache/cache-manager'
import { withResilience, ProviderConfigs } from '../providers/provider-resilience'

export interface AnalysisRequest {
  query: string
  destination?: string
  departureCity?: string
  budget?: 'low' | 'moderate' | 'high' | 'luxury'
  travelMonths?: number[]
  interests?: string[]
  travelStyle?: 'solo' | 'couple' | 'family' | 'friends'
  pace?: 'relaxed' | 'moderate' | 'fast'
  userId?: string // For personalization
}

export class TravelAnalysisEngine {
  private openai: OpenAI
  private model: string = 'gpt-4o-2024-08-06'
  private weatherProvider: RealWeatherProvider
  private currencyProvider: RealCurrencyProvider
  private visaProvider: RealVisaProvider
  private flightsProvider: DuffelFlightsProvider
  private hotelsProvider: HotelbedsHotelsProvider

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    this.openai = new OpenAI({ apiKey })
    this.weatherProvider = new RealWeatherProvider()
    this.currencyProvider = new RealCurrencyProvider()
    this.visaProvider = new RealVisaProvider()
    this.flightsProvider = new DuffelFlightsProvider()
    this.hotelsProvider = new HotelbedsHotelsProvider()
  }

  private static instance: TravelAnalysisEngine | null = null

  static getInstance(): TravelAnalysisEngine {
    if (!this.instance) {
      this.instance = new TravelAnalysisEngine()
    }
    return this.instance
  }

  /**
   * Analyze travel request and return structured recommendations
   */
  async analyze(request: AnalysisRequest): Promise<TravelAnalysisResponse> {
    try {
      logger.info('Travel Analysis Engine: Starting analysis', request)

      // Step 0: Load user preferences for personalization (if userId provided)
      let userPreferenceProfile: UserPreferenceProfile | null = null
      let isPersonalized = false
      let feedbackHistory: any[] = []

      if (request.userId) {
        try {
          // Get existing preferences
          userPreferenceProfile = await getUserPreferences(request.userId)

          // Update inferred preferences from latest feedback
          feedbackHistory = await getUserFeedback(request.userId, 100)
          if (feedbackHistory.length >= 3) {
            const inferred = preferenceInferenceService.inferPreferences(feedbackHistory)
            const confidence = preferenceInferenceService.calculateConfidence(feedbackHistory)
            
            userPreferenceProfile = await updateInferredPreferences(
              request.userId,
              inferred,
              feedbackHistory.length,
              confidence
            )
            
            isPersonalized = confidence >= 0.3
            logger.info('User preferences loaded', { userId: request.userId, confidence, isPersonalized })
          }
        } catch (error) {
          logger.error('Failed to load user preferences, using defaults', error)
        }
      }

      // Step 1: Retrieve relevant knowledge
      const retrievedKnowledge = knowledgeRetrieval.retrieve({
        query: request.query,
        destination: request.destination,
        budget: request.budget,
        months: request.travelMonths,
        interests: request.interests,
      })

      logger.info('Knowledge retrieved', {
        countries: retrievedKnowledge.countries.length,
        cities: retrievedKnowledge.cities.length,
        relevance: retrievedKnowledge.relevanceScore,
      })

      // Step 2: Apply personalized scoring weights (if available)
      const personalizedWeights = personalizedScoringService.getPersonalizedWeights(userPreferenceProfile || undefined)
      
      if (personalizedWeights.is_personalized) {
        scoringEngine.setWeights(personalizedWeights)
        logger.info('Using personalized scoring weights', { confidence: personalizedWeights.confidence })
      }

      // Step 3: Initial scoring (without provider data)
      const userPreferences: UserPreferences = {
        budget: request.budget || 'moderate',
        travelMonths: request.travelMonths,
        interests: request.interests,
        travelStyle: request.travelStyle,
        pace: request.pace,
      }

      let scoredDestinations = [
        ...retrievedKnowledge.cities.map(city => {
          const country = getCountryKnowledge(city.countryCode)
          return scoringEngine.scoreCity(city, country, userPreferences)
        }),
        ...retrievedKnowledge.countries.map(country =>
          scoringEngine.scoreCountry(country, userPreferences)
        ),
      ]

      // Sort by total score
      scoredDestinations.sort((a, b) => b.totalScore - a.totalScore)

      logger.info('Initial destinations scored', {
        total: scoredDestinations.length,
        topScore: scoredDestinations[0]?.totalScore,
      })

      // Step 4: Gather provider data for top destinations
      const providerData = await this.gatherProviderData(scoredDestinations.slice(0, 5), userPreferences.budget, request.travelMonths, request.departureCity, request.query)

      // Step 5: Re-score top destinations with provider data
      scoredDestinations = scoredDestinations.map(dest => {
        const providerScores = providerData.providerScores.get(dest.destinationId)
        if (!providerScores) return dest

        // Re-score with provider data
        if (dest.destinationType === 'city') {
          const city = getCityKnowledge(dest.destinationId)
          const country = city ? getCountryKnowledge(city.countryCode) : undefined
          if (city) {
            return scoringEngine.scoreCity(city, country, userPreferences, providerScores)
          }
        } else {
          const country = getCountryKnowledge(dest.destinationId)
          if (country) {
            return scoringEngine.scoreCountry(country, userPreferences, providerScores)
          }
        }
        return dest
      })

      // Re-sort after provider data integration
      scoredDestinations.sort((a, b) => b.totalScore - a.totalScore)

      logger.info('Re-scored destinations with provider data', {
        total: scoredDestinations.length,
        topScore: scoredDestinations[0]?.totalScore,
      })

      // Step 6: Analyze routes with route intelligence
      const routeAnalysis = routeIntelligenceService.analyzeRoutes(
        scoredDestinations.slice(0, 10).map(dest => ({
          destinationId: dest.destinationId,
          destinationName: dest.destinationName,
          destinationType: dest.destinationType,
          totalMatchScore: dest.totalScore,
          categoryScores: dest.categoryScores,
          whyRecommended: dest.reasons,
          possibleDownsides: dest.warnings,
          bestMonths: dest.bestMonths || [],
          estimatedBudgetLevel: userPreferences.budget,
          passportEase: dest.categoryScores.passportEase >= 7 ? 'easy' : 'moderate',
          nightlifeLevel: dest.categoryScores.nightlife,
          natureLevel: dest.categoryScores.nature,
          transportLevel: dest.categoryScores.transport,
          hotelValueLevel: dest.categoryScores.hotelValue,
          safetyLevel: dest.categoryScores.safety,
          confidence: dest.confidence,
          sourceLabels: ['knowledge-base', 'scoring-engine'],
          dataQuality: 'knowledge-based' as const,
        })),
        {
          budget: userPreferences.budget,
          travelMonths: request.travelMonths,
          interests: request.interests,
          travelStyle: request.travelStyle,
          pace: request.pace,
        }
      )

      logger.info('Route intelligence analysis complete', {
        recommendedRouteType: routeAnalysis.recommendedRoute.routeType,
        routeScore: routeAnalysis.recommendedRoute.routeScore.totalRouteQuality,
      })

      // Step 7: Prepare context for AI analysis
      const personalizationExplanations = personalizedWeights.is_personalized
        ? personalizedScoringService.explainWeights(personalizedWeights, userPreferenceProfile || undefined)
        : []

      const analysisContext = this.prepareAnalysisContext(
        request,
        retrievedKnowledge,
        scoredDestinations,
        providerData,
        isPersonalized,
        personalizationExplanations,
        routeAnalysis
      )

      // Step 7: Call OpenAI for structured analysis (with caching and resilience)
      const cacheKey = this.buildCacheKey(request, scoredDestinations.slice(0, 5))
      
      const analysis = await cacheManager.getOrSet(
        cacheKey,
        async () => {
          const completion = await withResilience(
            'gpt4-analysis',
            async () => {
              return await this.openai.beta.chat.completions.parse({
                model: this.model,
                messages: [
                  {
                    role: 'system',
                    content: this.getSystemInstructions(),
                  },
                  {
                    role: 'user',
                    content: analysisContext,
                  },
                ],
                response_format: zodResponseFormat(travelAnalysisResponseSchema, 'travel_analysis'),
                temperature: 0.3,
              })
            },
            ProviderConfigs.OPENAI
          )

          const parsed = completion.choices[0].message.parsed

          if (!parsed) {
            throw new Error('Failed to parse AI response')
          }

          // Track OpenAI cost
          costTracker.trackOpenAI('gpt-4o', completion.usage?.total_tokens)

          return parsed
        },
        CachePresets.OPENAI_ANALYSIS
      )

      // Add personalization metadata to response
      if (isPersonalized && personalizedWeights.is_personalized) {
        analysis.personalization = {
          isPersonalized: true,
          confidence: personalizedWeights.confidence,
          explanations: personalizationExplanations,
          feedbackCount: userPreferenceProfile?.feedback_count,
        }
      } else {
        analysis.personalization = {
          isPersonalized: false,
          confidence: 0,
          explanations: ['Using standard recommendation weights'],
          feedbackCount: 0,
        }
      }

      // Add route intelligence to response if not already present
      if (!analysis.recommendedRoutes || analysis.recommendedRoutes.length === 0) {
        analysis.recommendedRoutes = [routeAnalysis.recommendedRoute]
      }

      // Step 8: Apply ML inference for improved ranking (with fallback and error tracking)
      try {
        const { mlInferenceEngine } = await import('../ml/models/ml-inference')
        
        const mlResult = await mlInferenceEngine.infer(
          analysis.rankedDestinations,
          userPreferenceProfile,
          feedbackHistory,
          {
            query: request.query,
            budget: request.budget,
            travelMonths: request.travelMonths,
            interests: request.interests,
            travelStyle: request.travelStyle,
            pace: request.pace,
          }
        )

        // Update ranked destinations with ML-improved ranking
        analysis.rankedDestinations = mlResult.top3Recommendations

        // Update top recommendations to exactly 3
        analysis.topRecommendations = mlResult.top3Recommendations.map(d => d.destinationName)

        // Add accommodation recommendations to metadata
        if (mlResult.accommodationRecommendations.size > 0) {
          // Store accommodation recommendations in analysis metadata
          for (const [destId, accomRec] of mlResult.accommodationRecommendations) {
            const dest = analysis.rankedDestinations.find(d => d.destinationId === destId)
            if (dest) {
              // Add accommodation info to destination reasons
              dest.whyRecommended.push(
                `Recommended accommodation: ${accomRec.primaryType.replace(/-/g, ' ')} (${Math.round(accomRec.confidence * 100)}% confidence)`
              )
              if (accomRec.reasons.length > 0) {
                dest.whyRecommended.push(...accomRec.reasons.slice(0, 2))
              }
            }
          }
        }

        logger.info('Travel Analysis Engine: ML inference applied', {
          mlUsed: mlResult.mlUsed,
          top3Count: mlResult.top3Recommendations.length,
          accommodationCount: mlResult.accommodationRecommendations.size,
        })
      } catch (mlError) {
        errorTracker.trackMLError(mlError, 'inference', { userId: request.userId })
        logger.error('Travel Analysis Engine: ML inference failed, using baseline', mlError)
        // Fallback: Keep original AI-generated ranking but limit to top 3
        analysis.rankedDestinations = analysis.rankedDestinations.slice(0, 3)
        analysis.topRecommendations = analysis.rankedDestinations.map(d => d.destinationName)
      }

      logger.info('Travel Analysis Engine: Analysis complete', {
        recommendations: analysis.topRecommendations.length,
        rankedDestinations: analysis.rankedDestinations.length,
        personalized: analysis.personalization.isPersonalized,
        personalizationConfidence: analysis.personalization.confidence,
        routeType: routeAnalysis.recommendedRoute.routeType,
        routeScore: routeAnalysis.recommendedRoute.routeScore.totalRouteQuality,
      })

      return analysis
    } catch (error) {
      logger.error('Travel Analysis Engine: Analysis failed', error)
      throw error
    }
  }

  /**
   * Get system instructions for AI
   */
  private getSystemInstructions(): string {
    return `You are a Travel Analysis AI that provides structured, evidence-based travel recommendations.

CORE PRINCIPLES:
1. Base recommendations on provided knowledge base and computed scores
2. Never invent facts, prices, or data not in the context
3. Clearly separate facts from interpretations
4. Mark estimated/demo data appropriately
5. Provide confidence scores based on data quality

YOUR ROLE (Interpretation & Explanation):
- Interpret what the computed scores mean for the user
- Explain why destinations match or don't match user preferences
- Provide clear, evidence-backed explanations
- Generate warnings about potential issues
- Acknowledge data limitations

IMPORTANT: You are NOT the primary ranking system.
- ML models and scoring engines handle ranking
- Your job is to INTERPRET and EXPLAIN the rankings
- Focus on clear, specific, evidence-based explanations
- Reference actual scores and data in your explanations

OUTPUT REQUIREMENTS:
- Return structured JSON only
- Include score breakdowns with explanations
- List specific reasons tied to actual data
- Provide warnings about potential issues
- State assumptions clearly
- Mark data sources (knowledge-based, estimated, demo)

SCORING INTERPRETATION:
- Total Score 80-100: Excellent match
- Total Score 60-79: Good match
- Total Score 40-59: Fair match
- Total Score 0-39: Poor match

Category scores (0-10):
- 8-10: Excellent
- 6-7: Good
- 4-5: Fair
- 0-3: Poor

Be helpful, honest, and precise.`
  }

  /**
   * Prepare analysis context for AI
   */
  private prepareAnalysisContext(
    request: AnalysisRequest,
    knowledge: any,
    scores: any[],
    providerData: any,
    isPersonalized: boolean = false,
    personalizationExplanations: string[] = [],
    routeAnalysis?: any
  ): string {
    const sections: string[] = []

    sections.push('=== USER REQUEST ===')
    sections.push(`Query: ${request.query}`)
    if (request.destination) sections.push(`Destination: ${request.destination}`)
    if (request.budget) sections.push(`Budget: ${request.budget}`)
    if (request.travelMonths) sections.push(`Travel Months: ${request.travelMonths.join(', ')}`)
    if (request.interests) sections.push(`Interests: ${request.interests.join(', ')}`)
    if (request.travelStyle) sections.push(`Travel Style: ${request.travelStyle}`)
    if (request.pace) sections.push(`Pace: ${request.pace}`)
    sections.push('')

    sections.push('=== KNOWLEDGE BASE RESULTS ===')
    sections.push(`Relevance Score: ${knowledge.relevanceScore.toFixed(2)}`)
    sections.push(`Countries Found: ${knowledge.countries.length}`)
    sections.push(`Cities Found: ${knowledge.cities.length}`)
    sections.push(`Matched Keywords: ${knowledge.matchedKeywords.join(', ')}`)
    sections.push('')

    sections.push('=== TOP SCORED DESTINATIONS ===')
    scores.slice(0, 10).forEach((dest, idx) => {
      sections.push(`${idx + 1}. ${dest.destinationName} (${dest.destinationType})`)
      sections.push(`   Total Score: ${dest.totalScore}/100`)
      sections.push(`   Category Scores:`)
      sections.push(`   - Budget Fit: ${dest.categoryScores.budgetFit}/10`)
      sections.push(`   - Weather Fit: ${dest.categoryScores.weatherFit}/10`)
      sections.push(`   - Passport Ease: ${dest.categoryScores.passportEase}/10`)
      sections.push(`   - Safety: ${dest.categoryScores.safety}/10`)
      sections.push(`   - Transport: ${dest.categoryScores.transport}/10`)
      sections.push(`   - Hotel Value: ${dest.categoryScores.hotelValue}/10`)
      sections.push(`   Reasons: ${dest.reasons.join('; ')}`)
      if (dest.warnings.length > 0) {
        sections.push(`   Warnings: ${dest.warnings.join('; ')}`)
      }
      sections.push('')
    })

    sections.push('=== PROVIDER DATA ===')
    sections.push('Note: Weather=structured, Currency=structured, Visa=knowledge-based, Flights/Hotels=demo (estimated)')
    sections.push('')
    
    // Flight data summary
    if (providerData.flights && providerData.flights.length > 0) {
      const cheapest = providerData.flights.reduce((min: any, f: any) => f.price < min.price ? f : min, providerData.flights[0])
      sections.push(`Flights: ${providerData.flights.length} options found`)
      sections.push(`  Cheapest: $${Math.round(cheapest.price)} (${cheapest.stops} stops, ${cheapest.airline})`)
      sections.push(`  Source: demo (estimated pricing)`)
      sections.push('')
    }
    
    // Hotel data summary
    if (providerData.hotels && providerData.hotels.length > 0) {
      const bestValue = providerData.hotels.reduce((best: any, h: any) => {
        const hValue = h.rating / (h.pricePerNight / 100)
        const bestV = best.rating / (best.pricePerNight / 100)
        return hValue > bestV ? h : best
      }, providerData.hotels[0])
      sections.push(`Hotels: ${providerData.hotels.length} options found`)
      sections.push(`  Best Value: ${bestValue.name} - $${Math.round(bestValue.pricePerNight)}/night (${bestValue.rating.toFixed(1)}★)`)
      sections.push(`  Source: demo (estimated pricing)`)
      sections.push('')
    }
    
    // Weather data
    if (providerData.weather) {
      sections.push(`Weather: ${providerData.weather.condition || 'Available'}`)
      sections.push(`  Source: ${providerData.weather.source}`)
      sections.push('')
    }
    
    // Currency data
    if (providerData.currency) {
      sections.push(`Currency: ${providerData.currency.from} to ${providerData.currency.to} = ${providerData.currency.rate}`)
      sections.push(`  Source: ${providerData.currency.source}`)
      sections.push('')
    }

    // Events and seasonality data
    if (providerData.events) {
      sections.push('=== EVENTS & SEASONALITY ===')
      sections.push(`Source: ${providerData.events.confidence} (estimated data)`)
      sections.push('')
      
      if (providerData.events.seasonality) {
        const s = providerData.events.seasonality
        sections.push(`Season: ${s.season} (${s.crowdLevel} crowds)`)
        sections.push(`Attractiveness: ${s.attractiveness}/10`)
        sections.push(`Price Multiplier: ${s.priceMultiplier}x`)
        sections.push(`Notes:`)
        s.notes.forEach((note: string) => sections.push(`  - ${note}`))
        sections.push('')
      }

      if (providerData.events.majorEvents && providerData.events.majorEvents.length > 0) {
        sections.push('Major Events:')
        providerData.events.majorEvents.forEach((event: any) => {
          sections.push(`  - ${event.name} (${event.type}, ${event.impact} impact)`)
          sections.push(`    ${event.startDate}${event.endDate ? ' to ' + event.endDate : ''}`)
          sections.push(`    ${event.description}`)
        })
        sections.push('')
      }

      if (providerData.events.timingAdvantages && providerData.events.timingAdvantages.length > 0) {
        sections.push('Timing Advantages:')
        providerData.events.timingAdvantages.forEach((adv: string) => sections.push(`  ✓ ${adv}`))
        sections.push('')
      }

      if (providerData.events.timingDisadvantages && providerData.events.timingDisadvantages.length > 0) {
        sections.push('Timing Disadvantages:')
        providerData.events.timingDisadvantages.forEach((dis: string) => sections.push(`  ✗ ${dis}`))
        sections.push('')
      }
    }

    if (isPersonalized && personalizationExplanations.length > 0) {
      sections.push('=== PERSONALIZATION ===')
      sections.push('These recommendations are personalized based on user feedback:')
      personalizationExplanations.forEach(explanation => {
        sections.push(`- ${explanation}`)
      })
      sections.push('')
    }

    // Route intelligence analysis
    if (routeAnalysis) {
      sections.push('=== ROUTE INTELLIGENCE ===')
      sections.push(`Recommended Route Type: ${routeAnalysis.recommendedRoute.routeType}`)
      sections.push(`Route Name: ${routeAnalysis.recommendedRoute.routeName}`)
      sections.push(`Route Quality Score: ${routeAnalysis.recommendedRoute.routeScore.totalRouteQuality.toFixed(1)}/100`)
      sections.push(`Trip Intensity: ${routeAnalysis.recommendedRoute.estimatedTripIntensity}`)
      sections.push('')
      
      sections.push('Route Scores:')
      const rs = routeAnalysis.recommendedRoute.routeScore
      sections.push(`  - Coherence: ${rs.coherence.toFixed(1)}/10`)
      sections.push(`  - Transfer Simplicity: ${rs.transferSimplicity.toFixed(1)}/10`)
      sections.push(`  - Transport Convenience: ${rs.transportConvenience.toFixed(1)}/10`)
      sections.push(`  - Budget Efficiency: ${rs.budgetEfficiency.toFixed(1)}/10`)
      sections.push(`  - Seasonal Compatibility: ${rs.seasonalCompatibility.toFixed(1)}/10`)
      sections.push(`  - Destination Synergy: ${rs.destinationSynergy.toFixed(1)}/10`)
      sections.push(`  - Fatigue Penalty: ${rs.fatiguePenalty.toFixed(1)}/10`)
      sections.push('')
      
      sections.push('Route Stops:')
      routeAnalysis.recommendedRoute.orderedStops.forEach((stop: any) => {
        sections.push(`  ${stop.orderInRoute}. ${stop.destinationName} (${stop.daysRecommended} days, score: ${stop.totalScore.toFixed(1)})`)
      })
      sections.push('')
      
      sections.push('Why This Route:')
      routeAnalysis.recommendedRoute.whyThisRoute.forEach((reason: string) => {
        sections.push(`  - ${reason}`)
      })
      sections.push('')
      
      if (routeAnalysis.recommendedRoute.transferNotes.length > 0) {
        sections.push('Transfer Notes:')
        routeAnalysis.recommendedRoute.transferNotes.forEach((note: string) => {
          sections.push(`  - ${note}`)
        })
        sections.push('')
      }
      
      if (routeAnalysis.recommendedRoute.routeWarnings.length > 0) {
        sections.push('Route Warnings:')
        routeAnalysis.recommendedRoute.routeWarnings.forEach((warning: string) => {
          sections.push(`  ⚠ ${warning}`)
        })
        sections.push('')
      }
      
      sections.push(`Route Reasoning: ${routeAnalysis.reasoning}`)
      sections.push('')
      
      if (routeAnalysis.alternativeRoutes.length > 0) {
        sections.push('Alternative Route Options:')
        routeAnalysis.alternativeRoutes.forEach((alt: any) => {
          sections.push(`  - ${alt.routeType}: ${alt.routeName} (score: ${alt.routeScore.totalRouteQuality.toFixed(1)})`)
        })
        sections.push('')
      }
    }

    sections.push('=== ANALYSIS INSTRUCTIONS ===')
    sections.push('Based on the above data:')
    sections.push('1. Identify top 3-5 recommendations')
    sections.push('2. Explain score breakdowns (including flight/hotel value when available)')
    sections.push('3. Provide specific reasons for each recommendation')
    sections.push('4. Consider route intelligence analysis - use the recommended route structure')
    sections.push('5. Include route information in recommendedRoutes field if multi-city route is recommended')
    sections.push('6. Consider seasonality and timing factors (peak/off-peak, major events)')
    sections.push('7. List warnings and considerations (including event-based crowding/pricing, route complexity)')
    sections.push('8. State assumptions due to limited data')
    sections.push('9. Mark all data sources appropriately (flights/hotels/events/routes are demo/estimated)')
    sections.push('10. Provide overall confidence score')
    sections.push('11. Note that flight, hotel, event, and route data are estimates for demonstration purposes')

    return sections.join('\n')
  }

  /**
   * Gather provider data for top destinations
   */
  private async gatherProviderData(topDestinations: any[], budget: string = 'moderate', travelMonths?: number[], departureCity?: string, query?: string): Promise<any> {
    const data: any = {
      flights: [],
      hotels: [],
      weather: [],
      currency: [],
      visa: [],
      events: null,
      providerScores: new Map<string, { flightValue?: number; hotelValue?: number }>(),
    }

    // Gather data for top 5 destinations
    for (let i = 0; i < Math.min(5, topDestinations.length); i++) {
      const dest = topDestinations[i]

      try {
        // Real flight data from Duffel API (with error handling)
        try {
          // Use departureCity parameter, fallback to extracting from query, or default to NYC
          const origin = departureCity || (query ? this.extractDepartureCity(query) : null) || 'NYC'
          
          const flights = await this.flightsProvider.searchFlights(
            origin,
            dest.destinationName,
            new Date().toISOString().split('T')[0]
          )
          
          if (i === 0) {
            data.flights = flights // Store for first destination
          }

          // Calculate flight value score
          const flightValueScore = this.flightsProvider.getFlightValueScore(flights, budget)
          
          data.providerScores.set(dest.destinationId, {
            flightValue: flightValueScore,
          })
        } catch (flightError) {
          logger.error(`Flight provider failed for ${dest.destinationName}`, flightError)
          // Continue without flight data
        }

        // Real hotel data from Hotelbeds API (cities only)
        if (dest.destinationType === 'city') {
          try {
          const hotels = await this.hotelsProvider.searchHotels(
            dest.destinationName,
            new Date().toISOString().split('T')[0],
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          )
          
          if (i === 0) {
            data.hotels = hotels // Store for first destination
          }

            // Calculate hotel value score
            const hotelValueScore = this.hotelsProvider.getHotelValueScore(hotels, budget)
            
            // Update provider scores with hotel data
            const existing = data.providerScores.get(dest.destinationId) || {}
            data.providerScores.set(dest.destinationId, {
              ...existing,
              hotelValue: hotelValueScore,
            })
          } catch (hotelError) {
            logger.error(`Hotel provider failed for ${dest.destinationName}`, hotelError)
            // Continue without hotel data
          }
        }

        // Real weather data (structured seasonal patterns) - first destination only
        if (i === 0) {
          data.weather = await this.weatherProvider.getWeather(dest.destinationName)

          // Real currency data (structured exchange rates)
          data.currency = await this.currencyProvider.getExchangeRate('USD', 'EUR')

          // Real visa data (knowledge-based rules)
          if (dest.destinationType === 'country') {
            data.visa = await this.visaProvider.getVisaRequirement('US', dest.destinationId)
          }

          // Enhanced events and seasonality data
          if (dest.destinationType === 'city') {
            try {
              const country = this.inferCountryFromCity(dest.destinationName)
              data.events = await enhancedEventsProvider.getEnhancedEventData(
                dest.destinationName,
                country,
                travelMonths
              )
            } catch (error) {
              logger.error(`Failed to get events data for ${dest.destinationName}`, error)
            }
          }
        }
      } catch (error) {
        logger.error(`Failed to gather provider data for ${dest.destinationName}`, error)
      }
    }

    return data
  }

  /**
   * Build cache key for analysis results
   */
  private buildCacheKey(request: AnalysisRequest, topDestinations: any[]): string {
    const destIds = topDestinations.map(d => d.destinationId).join(',')
    const key = `${request.query}:${request.budget || 'any'}:${(request.travelMonths || []).join(',')}:${(request.interests || []).join(',')}:${destIds}`
    // Hash to keep key length reasonable
    return Buffer.from(key).toString('base64').substring(0, 100)
  }

  /**
   * Helper: Infer country from city name
   */
  private inferCountryFromCity(city: string): string {
    const cityCountryMap: Record<string, string> = {
      'paris': 'France',
      'london': 'United Kingdom',
      'barcelona': 'Spain',
      'rome': 'Italy',
      'amsterdam': 'Netherlands',
      'berlin': 'Germany',
      'munich': 'Germany',
      'vienna': 'Austria',
      'prague': 'Czech Republic',
      'budapest': 'Hungary',
      'lisbon': 'Portugal',
      'athens': 'Greece',
      'dublin': 'Ireland',
      'edinburgh': 'United Kingdom',
      'copenhagen': 'Denmark',
      'stockholm': 'Sweden',
      'oslo': 'Norway',
      'helsinki': 'Finland',
      'tokyo': 'Japan',
      'bangkok': 'Thailand',
      'singapore': 'Singapore',
      'hong kong': 'Hong Kong',
      'dubai': 'United Arab Emirates',
      'new york': 'United States',
      'los angeles': 'United States',
      'san francisco': 'United States',
      'chicago': 'United States',
      'miami': 'United States',
      'rio de janeiro': 'Brazil',
      'buenos aires': 'Argentina',
      'mexico city': 'Mexico',
      'sydney': 'Australia',
      'melbourne': 'Australia',
      'auckland': 'New Zealand',
    }

    return cityCountryMap[city.toLowerCase()] || 'Unknown'
  }

  /**
   * Extract departure city from query string
   * Looks for patterns like "from NYC", "departing from London", etc.
   */
  private extractDepartureCity(query: string): string | null {
    const patterns = [
      /(?:from|departing from|traveling from|flying from)\s+([A-Za-z\s]+?)(?:\.|,|$|\s+to\s+|\s+passport)/i,
      /^([A-Z]{3})\s+to\s+/i, // Airport code at start
    ]

    for (const pattern of patterns) {
      const match = query.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return null
  }
}

export const travelAnalysisEngine = {
  analyze: (request: any) => TravelAnalysisEngine.getInstance().analyze(request),
}
