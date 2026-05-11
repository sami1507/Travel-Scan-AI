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
  tripStructure?: 'single_country_one_city' | 'single_country_multi_city' | 'multi_country'
  userId?: string // For personalization
}

export class TravelAnalysisEngine {
  private openai: OpenAI | null = null
  private model: string = 'gpt-4o-2024-08-06'
  private weatherProvider: RealWeatherProvider
  private currencyProvider: RealCurrencyProvider
  private visaProvider: RealVisaProvider
  private flightsProvider: DuffelFlightsProvider
  private hotelsProvider: HotelbedsHotelsProvider
  private openaiAvailable: boolean = false

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      logger.warn('OPENAI_API_KEY environment variable not set - AI features will use fallback mode')
      this.openaiAvailable = false
    } else {
      try {
        this.openai = new OpenAI({ apiKey })
        this.openaiAvailable = true
      } catch (error) {
        logger.error('Failed to initialize OpenAI client', error)
        this.openaiAvailable = false
      }
    }

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

      // Step 7: Call OpenAI for structured analysis (with caching, resilience, and fallback)
      const cacheKey = this.buildCacheKey(request, scoredDestinations.slice(0, 5))
      
      let analysis: TravelAnalysisResponse
      
      try {
        // Check if OpenAI is available
        if (!this.openaiAvailable || !this.openai) {
          throw new Error('OpenAI client not available - API key missing or invalid')
        }

        analysis = await cacheManager.getOrSet(
          cacheKey,
          async () => {
            const completion = await withResilience(
              'gpt4-analysis',
              async () => {
                if (!this.openai) {
                  throw new Error('OpenAI client not initialized')
                }
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
      } catch (aiError) {
        // Log the AI provider error clearly
        logger.error('OpenAI provider failed, using fallback recommendations', {
          error: aiError instanceof Error ? aiError.message : String(aiError),
          errorStack: aiError instanceof Error ? aiError.stack : undefined,
          query: request.query,
          tripStructure: request.tripStructure,
        })

        // Track the error
        errorTracker.trackProviderError('openai', aiError, 'gpt4-analysis', { 
          fallbackUsed: true,
          query: request.query,
        })

        // Use fallback recommendations
        analysis = this.generateFallbackRecommendations(request, scoredDestinations)
      }

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
    return `You are a realistic Travel Consultant AI that provides route-aware, evidence-based travel recommendations.

CORE PRINCIPLES:
1. Act as a professional travel consultant, not a random destination generator
2. Base recommendations on provided knowledge base and computed scores
3. Never invent facts, prices, or data not in the context
4. Evaluate route realism, transport effort, and trip fatigue
5. Provide confidence scores based on data quality

YOUR ROLE (Route-Aware Travel Consultant):
- Interpret what the computed scores mean for the user
- Explain why routes/destinations match or don't match user preferences
- Evaluate geographic logic and transport feasibility
- Assess trip fatigue based on number of stops and trip length
- Generate warnings about unrealistic or rushed routes
- Suggest better alternatives when user's preference is not optimal
- Acknowledge data limitations

ROUTE REALISM RULES:

Single Country - One City:
- Recommend ONE strong base city only
- Explain day trips if useful
- Focus on depth, comfort, neighborhoods, best areas to stay
- Do NOT create multi-city routes

Single Country - Multi-City:
- Recommend ONE country only
- Suggest 2-4 logical cities/regions depending on trip length
- Prioritize easy transport (train, bus, short drives)
- Avoid unrealistic city combinations
- Good examples: Italy (Rome→Florence→Venice), Spain (Madrid→Seville→Granada)
- Add nights per stop and fatigue level

Multi-Country:
- Recommend countries that make geographic and transport sense
- Prefer 2 countries for 7-10 days, 2-3 countries for 12-15 days
- Avoid combining countries far apart unless flights are justified
- Classic logical routes: Vienna→Bratislava→Budapest, Prague→Vienna→Budapest
- Add warnings if route is too rushed or expensive
- If multi-country is illogical, suggest realistic single-country alternative

TRIP FATIGUE ASSESSMENT:
- Low: 1 city or 2 cities with 3+ nights each
- Medium: 2-3 cities with 2-3 nights each
- High: 3+ cities or frequent moves

TRANSPORT LOGIC:
- Explain whether route works by train, bus, car, flight, ferry, or mixed
- Mention if transport is easy, moderate, or complex
- Warn if route requires expensive flights between stops

OUTPUT REQUIREMENTS:
- Return structured JSON only
- Include route realism score (0-100)
- Include travel fatigue level (Low/Medium/High)
- Include transport logic explanation
- Include realistic consultant notes
- List warnings about rushed routes, visa issues, transport complexity
- Suggest alternatives if user's structure choice is not ideal
- Mark data sources (knowledge-based, estimated, demo)

SCORING INTERPRETATION:
- Total Score 80-100: Excellent match
- Total Score 60-79: Good match
- Total Score 40-59: Fair match
- Total Score 0-39: Poor match
- Route Realism 80-100: Highly realistic route
- Route Realism 60-79: Realistic with minor issues
- Route Realism 40-59: Questionable route
- Route Realism 0-39: Unrealistic route

Be helpful, honest, realistic, and precise like a professional travel consultant.`
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
    if (request.tripStructure) {
      const structureLabel = request.tripStructure === 'single_country_one_city' 
        ? 'Single Country - One City'
        : request.tripStructure === 'single_country_multi_city'
        ? 'Single Country - Multiple Cities'
        : 'Multiple Countries'
      sections.push(`Trip Structure: ${structureLabel}`)
      sections.push(`IMPORTANT: User wants ${structureLabel}. Respect this preference in recommendations.`)
    }
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
    sections.push('')
    sections.push('IMPORTANT - ROUTE-AWARE FIELDS:')
    sections.push('For EACH rankedDestination, include these route-aware fields:')
    sections.push('- tripType: "Single Country - One City" | "Single Country - Multi-City" | "Multi-Country Route"')
    sections.push('- suggestedRoute: Array of city names in order, e.g., ["Vienna", "Bratislava", "Budapest"]')
    sections.push('- recommendedNights: Object with nights per stop, e.g., {"Vienna": 4, "Bratislava": 2, "Budapest": 6}')
    sections.push('- routeRealismScore: Number 0-100 indicating how realistic/practical the route is')
    sections.push('- travelFatigueLevel: "Low" | "Medium" | "High"')
    sections.push('- transportLogic: String explaining best transport method (train, bus, flight, etc.)')
    sections.push('- realisticConsultantNotes: Practical advice like a travel consultant would give')
    sections.push('- routeWarnings: Array of warnings (rushed, expensive, visa issues, etc.)')
    sections.push('- routeAlternatives: String suggesting better alternative if current structure is not optimal')
    sections.push('')
    sections.push('These fields MUST be present in every rankedDestination object in your JSON response.')

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
    const tripLength = request.travelMonths?.length || 7
    const season = this.getSeasonFromMonths(request.travelMonths || [])
    
    // Filter by trip structure
    let candidates = library.filter(route => route.tripStructure === request.tripStructure)
    
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
    
    // Sort by score and return top N
    return scoredRoutes
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(sr => sr.route)
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
   * Generate deterministic fallback recommendations when AI provider fails
   */
  private generateFallbackRecommendations(request: AnalysisRequest, scoredDestinations: any[]): TravelAnalysisResponse {
    logger.warn('Generating fallback recommendations due to provider failure', {
      query: request.query,
      tripStructure: request.tripStructure,
    })

    // Select best routes from curated library
    const selectedRoutes = this.selectBestFallbackRoutes(request, 3)
    const tripLength = request.travelMonths?.length || 7
    
    const rankedDestinations = selectedRoutes.map((route, index) => {
      const tripType = request.tripStructure === 'single_country_one_city' 
        ? 'Single Country - One City'
        : request.tripStructure === 'single_country_multi_city'
        ? 'Single Country - Multi-City'
        : 'Multi-Country Route'

      // Adjust nights distribution to match actual trip length
      const totalNightsInTemplate = Object.values(route.nightsDistribution).reduce((a: number, b: number) => a + b, 0)
      const adjustedNights: Record<string, number> = {}
      
      Object.entries(route.nightsDistribution).forEach(([city, nights]) => {
        adjustedNights[city] = Math.round((nights as number / totalNightsInTemplate) * tripLength)
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
        if (tripLength < route.minDays) {
          routeWarnings.push(`${route.cities.length} countries in ${tripLength} days may feel rushed - consider ${route.minDays}+ days`)
          travelFatigueLevel = 'High'
          routeRealismScore = 60
        } else if (tripLength < route.minDays + 2) {
          routeWarnings.push('Tight schedule - plan transfers carefully')
          travelFatigueLevel = 'Medium'
          routeRealismScore = 75
        }
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

      return {
        rank: index + 1,
        destinationName: route.cities[0],
        country: route.countries[0],
        destinationSummary: `${route.cities.join(' → ')} offers a perfect ${tripType.toLowerCase()} experience combining ${route.travelStyles.slice(0, 3).join(', ')}`,
        whyRecommended: [
          `Ideal ${tripType.toLowerCase()} for ${tripLength} days`,
          `Matches your ${request.budget || 'moderate'} budget and ${route.travelStyles.slice(0, 2).join(', ')} interests`,
          `${transportLogic}`,
          `${travelFatigueLevel} travel fatigue with well-paced itinerary`,
        ],
        bestMonth: request.travelMonths?.[0] ? this.getMonthName(request.travelMonths[0]) : 'Spring',
        totalMatchScore: routeRealismScore,
        scoreBreakdown: {
          weather: Math.round(routeRealismScore * 0.2),
          budget: Math.round(routeRealismScore * 0.2),
          safety: Math.round(routeRealismScore * 0.2),
          activities: Math.round(routeRealismScore * 0.2),
          accessibility: Math.round(routeRealismScore * 0.2),
        },
        possibleDownsides: routeWarnings.length > 0 ? routeWarnings : ['Peak season may have higher prices', 'Book accommodation in advance'],
        tripType,
        suggestedRoute: route.cities,
        recommendedNights: adjustedNights,
        routeRealismScore,
        travelFatigueLevel,
        transportLogic,
        realisticConsultantNotes: consultantNotes,
        routeWarnings: routeWarnings.length > 0 ? routeWarnings : undefined,
        routeAlternatives: routeWarnings.length > 0 && request.tripStructure === 'multi_country'
          ? `Consider a single-country multi-city route for ${tripLength} days, or extend to ${route.minDays}+ days for this multi-country route`
          : undefined,
      }
    })

    const fallbackTripLength = request.travelMonths?.length || 7
    const firstDest = rankedDestinations[0]
    
    return {
      querySummary: `Travel recommendations for ${request.tripStructure?.replace(/_/g, ' ') || 'your trip'} with ${request.budget || 'moderate'} budget`,
      userConstraints: {
        budget: request.budget || 'moderate',
        travelMonths: request.travelMonths || [],
        interests: request.interests || [],
        travelStyle: request.travelStyle,
        pace: request.pace,
      },
      topRecommendations: rankedDestinations.slice(0, 3).map(d => d.destinationName),
      rankedDestinations,
      scoreBreakdown: 'Scores calculated based on budget fit, weather, safety, activities, and accessibility',
      reasons: ['Based on your preferences and budget', 'Realistic route planning', 'Safe fallback recommendations'],
      warnings: ['AI provider temporarily unavailable - using knowledge-based recommendations'],
      assumptions: ['Standard travel preferences applied', 'Moderate pacing assumed'],
      recommendedRoutes: firstDest ? [{
        routeType: firstDest.suggestedRoute && firstDest.suggestedRoute.length > 2 ? 'multi-city' : firstDest.suggestedRoute && firstDest.suggestedRoute.length === 2 ? '2-city' : 'single-destination',
        routeName: `${firstDest.destinationName} Route`,
        orderedStops: (firstDest.suggestedRoute || [firstDest.destinationName]).map((city, idx) => ({
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
        explanations: ['Fallback recommendations - AI provider temporarily unavailable'],
        feedbackCount: 0,
      },
    }
  }

  private getMonthName(month: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1] || 'Spring'
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
