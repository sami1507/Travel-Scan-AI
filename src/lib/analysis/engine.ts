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
import { travelAnalysisResponseSchema, type TravelAnalysisResponse, type RankedDestination } from './schemas'
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

// Analysis cache version - increment to invalidate all cached results after algorithm changes
const ANALYSIS_CACHE_VERSION = 'consultant-v8-finalized-analysis-2026-06-02'
import { withResilience, ProviderConfigs } from '../providers/provider-resilience'
import { getLearningContextForAnalysis, recordRecommendationEvent } from '../learning/learning-service'
import { compactAnalysisResponseSchema, CompactAnalysisResponse } from './compact-schema'
import { buildCompactTravelAnalysisPrompt, getCompactSystemInstructions, TravelDataContext } from './compact-prompt'
import { buildRouteCandidatePool, filterCandidatesByRequest, RouteCandidate } from './route-candidate-pool'
import { getAttractionsForRoute, getWeatherForRoute } from '../travel-data/travel-data-loader'
import { finalizeAnalysisResult, type QualityGateResult, type ClaudeVerificationResult, type RouteContext, type CacheInfo } from './finalize-analysis-result'
import { generateGlobalCandidates, type GlobalCandidate } from './global-candidate-generation'
import { validateAnalysisContract } from './analysis-contract'
import { FallbackRecommendationBuilder } from './fallback-recommendations'
import { enrichRouteCities, type NormalizedPlace } from '../services/google-places-service'
import { searchTravelContext, type TravelSearchContext } from '../services/tavily-search'
import { normalizeAllRecommendations, normalizeFinalRecommendation } from './normalize-recommendation'
import { estimatePricing } from '../services/price-estimation'
import type { FlightData, HotelData } from '../providers/interfaces'

export interface AnalysisRequest {
  query: string
  destination?: string
  departureCity?: string
  passportCountry?: string
  budget?: 'low' | 'moderate' | 'high' | 'luxury'
  season?: 'Winter' | 'Spring' | 'Summer' | 'Autumn' // Season selection for month strategy
  travelMonths?: number[]
  tripLength?: number // Trip duration in days
  interests?: string[]
  travelStyle?: 'solo' | 'couple' | 'family' | 'friends'
  pace?: 'relaxed' | 'moderate' | 'fast'
  tripStructure?: 'single_country_one_city' | 'single_country_multi_city' | 'multi_country'
  accommodationPreference?: string
  userId?: string // For personalization
  // Fresh analysis controls
  forceFresh?: boolean // Bypass cache and generate fresh analysis
  freshRunId?: string // Unique ID for fresh run tracking
  excludeCountries?: string[] // Countries to avoid in recommendations
  diversityMode?: 'best_fit' | 'alternative_ideas' | 'hidden_gems' | 'cheaper_options' | 'low_fatigue'
}

export class TravelAnalysisEngine {
  private fallbackBuilder = new FallbackRecommendationBuilder()
  private openai: OpenAI | null = null
  private model: string = 'gpt-4o-2024-08-06'
  private weatherProvider: RealWeatherProvider
  private currencyProvider: RealCurrencyProvider
  private visaProvider: RealVisaProvider
  private flightsProvider: DuffelFlightsProvider
  private hotelsProvider: HotelbedsHotelsProvider
  private openaiAvailable: boolean = false

  constructor() {
    // Read and sanitize API key
    let apiKey = process.env.OPENAI_API_KEY
    
    // Trim whitespace and remove surrounding quotes if present
    if (apiKey) {
      apiKey = apiKey.trim()
      if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || 
          (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
        apiKey = apiKey.slice(1, -1)
      }
    }

    // Safe diagnostics (never log the actual key)
    const keyPresent = !!apiKey
    const keyLengthValid = apiKey ? apiKey.length > 20 : false
    const keyFormatValid = apiKey ? (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-')) : false
    
    logger.info('OpenAI Provider Initialization', {
      keyPresent,
      keyLengthValid,
      keyFormatValid,
      runtime: typeof window === 'undefined' ? 'server' : 'client',
    })

    if (!apiKey || !keyLengthValid || !keyFormatValid) {
      logger.warn('OPENAI_API_KEY invalid or not set - AI features will use fallback mode', {
        keyPresent,
        keyLengthValid,
        keyFormatValid,
      })
      this.openaiAvailable = false
    } else {
      try {
        this.openai = new OpenAI({ apiKey })
        this.openaiAvailable = true
        logger.info('OpenAI client initialized successfully')
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
    const analysisStartTime = Date.now()
    
    try {
      logger.info('Travel Analysis Engine: Starting analysis', request)

      // Step 0: Load user preferences for personalization (if userId provided)
      let userPreferenceProfile: UserPreferenceProfile | null = null
      let isPersonalized = false
      let feedbackHistory: any[] = []

      // Step 0b: Real-time web search via Tavily
      let tavilyContext: TravelSearchContext | null = null
      try {
        const tavilyEnabled = process.env.TAVILY_API_KEY &&
                              process.env.TAVILY_API_KEY.length > 10
        if (tavilyEnabled) {
          tavilyContext = await searchTravelContext({
            destination: request.destination,
            departureCity: request.departureCity,
            passportCountry: request.passportCountry,
            budget: request.budget,
            tripLength: request.tripLength,
            travelMonths: request.travelMonths,
            interests: request.interests,
          })
          if (tavilyContext.searchSuccess) {
            logger.info('Tavily search completed', {
              sourcesCount: tavilyContext.sources.length,
            })
          }
        }
      } catch (error) {
        logger.warn('Tavily search failed, continuing without web context', { error: error instanceof Error ? error.message : String(error) })
      }

      // Step 0a: Load AI learning context (Phase 1)
      let learningContext: any = null
      try {
        learningContext = await getLearningContextForAnalysis(request.userId || null, {
          departure: request.departureCity,
          passportCountry: undefined,
          budgetLevel: request.budget,
          tripLength: request.tripLength,
          season: undefined,
          travelMonths: request.travelMonths?.map(m => m.toString()),
          interests: request.interests,
          tripStructure: request.tripStructure,
        })
        if (learningContext?.learningContextAvailable) {
          logger.info('Learning context loaded', { 
            confidenceScore: learningContext.confidenceScore,
            fatigueTolerance: learningContext.fatigueTolerance 
          })
        }
      } catch (error) {
        logger.warn('Failed to load learning context, continuing without it', { error: error instanceof Error ? error.message : String(error) })
      }

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

      // Build route candidate pool if knowledge retrieval returned 0
      let routeCandidatePool: RouteCandidate[] = []
      let globalCandidates: GlobalCandidate[] = [] // Track for contract validation
      if (scoredDestinations.length === 0) {
        logger.info('Knowledge retrieval returned 0, building route candidate pool')
        
        // Step 1: Generate global AI candidates (worldwide destinations)
        const globalResult = await generateGlobalCandidates(request)
        globalCandidates = globalResult.candidates
        
        // Step 2: Build structured CSV candidates
        const allCandidates = buildRouteCandidatePool(request)
        const structuredCandidates = filterCandidatesByRequest(allCandidates, request)
        
        // Step 3: Merge global and structured candidates
        const mergedCandidates: RouteCandidate[] = []
        const seenCountries = new Set<string>()
        
        // Add structured candidates first (they have full data)
        for (const candidate of structuredCandidates) {
          mergedCandidates.push(candidate)
          seenCountries.add(candidate.country.toLowerCase())
        }
        
        // Add global AI candidates that don't overlap with structured data
        for (const globalCandidate of globalResult.candidates) {
          const countryKey = globalCandidate.country.toLowerCase()
          if (!seenCountries.has(countryKey)) {
            // Convert GlobalCandidate to RouteCandidate format
            const routeType: 'single-city' | 'multi-city-single-country' | 'multi-country' = 
              globalCandidate.routeCities.length === 1 ? 'single-city' : 'multi-city-single-country'
            
            const priceTier: 'budget' | 'moderate' | 'premium' = 
              globalCandidate.budgetFit === 'comfortable' || globalCandidate.budgetFit === 'luxury' 
                ? 'premium' 
                : globalCandidate.budgetFit as 'budget' | 'moderate'
            
            mergedCandidates.push({
              id: `global-${globalCandidate.country.toLowerCase().replace(/\s+/g, '-')}`,
              country: globalCandidate.country,
              routeCities: globalCandidate.routeCities,
              region: globalCandidate.region,
              routeType,
              priceTier,
              travelFatigue: globalCandidate.estimatedFatigue,
              bestMonths: [], // Will be inferred from likelySeasonFit
              interestsFit: globalCandidate.interestsFit,
              mainstreamLevel: 'less-mainstream' as const,
              routeLogic: `${globalCandidate.routeCities.join(' → ')} route`,
              transportMode: 'mixed',
              approximateCoordinates: [],
              whyCandidateFits: globalCandidate.whyPotentialFit,
              estimatedScore: 75, // Default score for AI candidates
              sourceType: 'ai_global_knowledge',
              confidenceLevel: 'medium',
              dataLimitations: 'Generated by AI - verify details before booking',
              watchOut: globalCandidate.cautions,
            })
            seenCountries.add(countryKey)
          }
        }
        
        routeCandidatePool = mergedCandidates
        
        logger.info('Global Candidate Discovery', {
          openAIUsed: globalResult.openAIUsed,
          globalCandidatesGenerated: globalResult.globalCandidatesGenerated,
          countriesGenerated: globalResult.countriesGenerated,
          structuredDataMatches: structuredCandidates.length,
          limitedDataCandidates: globalResult.candidates.filter(gc => 
            !structuredCandidates.some(sc => sc.country.toLowerCase() === gc.country.toLowerCase())
          ).length,
          totalMergedCandidates: routeCandidatePool.length,
        })
        
        logger.info('Route candidate pool built', {
          routeCandidatePoolBuilt: true,
          routeCandidateCount: routeCandidatePool.length,
          candidateRegions: [...new Set(routeCandidatePool.map(c => c.region))],
          candidateCountries: [...new Set(routeCandidatePool.map(c => c.country))],
          structuredDataCount: structuredCandidates.length,
          globalAICount: globalResult.globalCandidatesGenerated,
        })
      }

      // Step 4: Gather provider data for top destinations (expanded to 12 for diversity)
      const candidatePoolSize = 12
      const providerData = await this.gatherProviderData(scoredDestinations.slice(0, candidatePoolSize), userPreferences.budget, request.travelMonths, request.departureCity, request.query)

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
      // Use route candidate pool if knowledge retrieval returned 0
      let routeAnalysisDestinations: RankedDestination[] = scoredDestinations.slice(0, 10).map(dest => ({
        destinationId: dest.destinationId,
        destinationName: dest.destinationName,
        destinationType: dest.destinationType,
        destinationSummary: null,
        diversityLabel: null,
        totalMatchScore: dest.totalScore,
        categoryScores: dest.categoryScores,
        whyRecommended: dest.reasons,
        possibleDownsides: dest.warnings,
        bestMonths: dest.bestMonths || [],
        seasonality: null,
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
        tripType: null,
        suggestedRoute: null,
        recommendedNights: null,
        routeRealismScore: null,
        travelFatigueLevel: null,
        transportLogic: null,
        realisticConsultantNotes: null,
        routeWarnings: null,
        routeAlternatives: null,
        itineraryMapPlan: null,
        travelStrategyTips: null,
      }))

      // If knowledge retrieval returned 0 but we have route candidates, use them
      if (routeAnalysisDestinations.length === 0 && routeCandidatePool.length > 0) {
        routeAnalysisDestinations = routeCandidatePool.map(candidate => ({
          destinationId: candidate.id,
          destinationName: candidate.country,
          destinationType: 'country' as const,
          destinationSummary: null,
          diversityLabel: null,
          totalMatchScore: candidate.estimatedScore,
          categoryScores: {
            budgetFit: candidate.priceTier === 'budget' ? 9 : candidate.priceTier === 'moderate' ? 8 : 7,
            weatherFit: 8,
            passportEase: 8,
            nightlife: 7,
            nature: candidate.interestsFit.includes('nature') ? 9 : 7,
            transport: 8,
            hotelValue: 8,
            safety: 9,
            flightValue: null,
          },
          whyRecommended: [candidate.whyCandidateFits, candidate.routeLogic],
          possibleDownsides: [],
          bestMonths: candidate.bestMonths,
          seasonality: null,
          estimatedBudgetLevel: (candidate.priceTier === 'budget' ? 'low' : candidate.priceTier === 'premium' ? 'high' : 'moderate') as 'low' | 'moderate' | 'high' | 'luxury',
          passportEase: 'easy' as const,
          nightlifeLevel: 7,
          natureLevel: candidate.interestsFit.includes('nature') ? 9 : 7,
          transportLevel: 8,
          hotelValueLevel: 8,
          safetyLevel: 9,
          confidence: 0.8,
          sourceLabels: ['route-candidate-pool'],
          dataQuality: 'knowledge-based' as const,
          tripType: null,
          suggestedRoute: candidate.routeCities,
          recommendedNights: null,
          routeRealismScore: null,
          travelFatigueLevel: null,
          transportLogic: null,
          realisticConsultantNotes: null,
          routeWarnings: null,
          routeAlternatives: null,
          itineraryMapPlan: null,
          travelStrategyTips: null,
        }))
        
        logger.info('Route intelligence using route candidate pool', {
          candidateCount: routeAnalysisDestinations.length,
        })
      }

      const routeAnalysis = routeIntelligenceService.analyzeRoutes(
        routeAnalysisDestinations,
        {
          budget: userPreferences.budget,
          travelMonths: request.travelMonths,
          interests: request.interests,
          travelStyle: request.travelStyle,
          pace: request.pace,
          tripStructure: request.tripStructure,
        }
      )

      logger.info('Route intelligence analysis complete', {
        destinationCount: routeAnalysisDestinations.length,
        tripStructure: request.tripStructure,
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
        routeAnalysis,
        tavilyContext
      )

      // Step 7: Call OpenAI for structured analysis (with caching, resilience, and fallback)
      const cacheKey = this.buildCacheKey(request, scoredDestinations.slice(0, candidatePoolSize), routeCandidatePool)
      
      // Check if cache should be bypassed
      const bypassCache = process.env.DISABLE_ANALYSIS_CACHE === 'true' || request.forceFresh === true
      
      if (bypassCache) {
        logger.info('Travel Analysis Cache: BYPASSED', {
          reason: process.env.DISABLE_ANALYSIS_CACHE === 'true' ? 'env_flag' : 'forceFresh',
          freshRunId: request.freshRunId,
          diversityMode: request.diversityMode,
          excludeCountries: request.excludeCountries,
        })
      }
      
      let analysis: TravelAnalysisResponse
      
      try {
        // Check if OpenAI is available
        if (!this.openaiAvailable || !this.openai) {
          throw new Error('OpenAI client not available - API key missing or invalid')
        }

        const fetchFresh = async () => {
            const openAIStartTime = Date.now()
            const fastMode = true // Use fast core analysis mode
            
            // Build travel data context if route candidates available
            let travelDataContext: TravelDataContext | undefined
            if (routeCandidatePool.length > 0) {
              const attractions = new Map<string, any[]>()
              const weather = new Map<string, any[]>()
              
              routeCandidatePool.forEach(route => {
                const cities = route.routeCities
                const routeAttractions = getAttractionsForRoute(route.country, cities, request.interests)
                attractions.set(route.id, routeAttractions)
                
                if (request.travelMonths && request.travelMonths.length > 0) {
                  const routeWeather = getWeatherForRoute(route.country, cities, request.travelMonths)
                  weather.set(route.id, routeWeather)
                }
              })
              
              travelDataContext = {
                routeCandidates: routeCandidatePool,
                attractions,
                weather
              }
            }
            
            // Calculate travel data usage counts
            const attractionsCount = travelDataContext ? Array.from(travelDataContext.attractions?.values() || []).reduce((sum, arr) => sum + arr.length, 0) : 0
            const weatherCount = travelDataContext ? Array.from(travelDataContext.weather?.values() || []).reduce((sum, arr) => sum + arr.length, 0) : 0
            
            const compactPrompt = buildCompactTravelAnalysisPrompt(request, travelDataContext)
            const systemPrompt = getCompactSystemInstructions()
            const systemPromptLength = systemPrompt.length
            
            logger.info('OpenAI analysis request started', {
              model: this.model,
              timeout: ProviderConfigs.OPENAI.timeout,
              promptLength: analysisContext.length,
              systemPromptLength: systemPrompt.length,
              compactPromptLength: compactPrompt.length,
              fastMode,
              compactPromptUsed: true,
              estimatedOutputMode: 'fast_core',
              maxCompletionTokens: 3500,
              travelDataContextUsed: !!travelDataContext,
              travelDataRoutesCount: travelDataContext?.routeCandidates?.length || 0,
              travelDataAttractionsCount: attractionsCount,
              travelDataWeatherCount: weatherCount,
            })

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
                      content: systemPrompt,
                    },
                    {
                      role: 'user',
                      content: `${compactPrompt}\n\n${analysisContext}`,
                    },
                  ],
                  response_format: zodResponseFormat(compactAnalysisResponseSchema, 'travel_analysis'),
                  temperature: 0.3,
                  max_completion_tokens: 3500, // Reduced for faster completion
                })
              },
              ProviderConfigs.OPENAI
            )

            const openAIDurationMs = Date.now() - openAIStartTime
            logger.info('OpenAI analysis completed', {
              duration: openAIDurationMs,
              tokensUsed: completion.usage?.total_tokens,
              promptTokens: completion.usage?.prompt_tokens,
              completionTokens: completion.usage?.completion_tokens,
              fastMode,
            })

            const parsed = completion.choices[0].message.parsed as CompactAnalysisResponse

            if (!parsed) {
              throw new Error('Failed to parse AI response')
            }

            // CRITICAL: Normalize recommendations immediately after parsing
            // This ensures clean destinationName (country only) before any downstream processing
            // Fixes: "Portugal - Lisbon → Porto → Coimbra" → destinationName="Portugal", suggestedRoute=["Lisbon", "Porto", "Coimbra"]
            parsed.rankedDestinations = normalizeAllRecommendations(parsed.rankedDestinations) as any
            
            logger.info('Normalized final recommendations', {
              count: parsed.rankedDestinations.length,
              destinationNames: parsed.rankedDestinations.map(d => d.destinationName),
              routes: parsed.rankedDestinations.map(d => (d as any).routeDisplayName || d.suggestedRoute?.join(' → ')),
            })

            // Track OpenAI cost
            costTracker.trackOpenAI('gpt-4o', completion.usage?.total_tokens)

            // Phase 4: AI Pipeline Observability Metrics
            const aiMetrics = {
              sessionId: request.freshRunId || `run-${Date.now()}`,
              timestamp: new Date().toISOString(),
              model: this.model,
              promptTokens: completion.usage?.prompt_tokens,
              completionTokens: completion.usage?.completion_tokens,
              totalCost: ((completion.usage?.prompt_tokens || 0) * 0.0000025) +
                         ((completion.usage?.completion_tokens || 0) * 0.00001),
              destinationsReturned: parsed.rankedDestinations?.length,
              topScore: parsed.rankedDestinations?.[0]?.totalMatchScore,
              globalCandidatesUsed: globalCandidates.length,
              tavilyResultsUsed: tavilyContext?.sources?.length ?? 0,
              candidatePoolSize,
              openAIDurationMs,
            }
            logger.info('AI Pipeline Metrics', aiMetrics)

            // Log diversity metrics
            const countries = parsed.rankedDestinations.map(d => d.destinationName).join(', ')
            const uniqueCountries = new Set(parsed.rankedDestinations.map(d => d.destinationName)).size
            logger.info('OpenAI recommendations diversity', {
              candidatePoolSize,
              finalRecommendationCount: parsed.rankedDestinations.length,
              finalRecommendationCountries: countries,
              uniqueCountries,
              diversityScore: uniqueCountries / Math.max(parsed.rankedDestinations.length, 1),
            })

            // Adapt compact response to full schema
            const fullResponse: TravelAnalysisResponse = {
              ...parsed,
              userConstraints: {
                budget: request.budget || 'moderate',
                travelMonths: request.travelMonths || null,
                interests: request.interests || null,
                travelStyle: request.travelStyle || null,
                pace: request.pace || null,
              },
              rankedDestinations: parsed.rankedDestinations.map(d => ({
                ...d,
                categoryScores: {
                  budgetFit: 8,
                  weatherFit: 8,
                  passportEase: 8,
                  nightlife: 7,
                  nature: 7,
                  transport: 8,
                  hotelValue: 8,
                  safety: 9,
                  flightValue: null,
                },
                passportEase: 'easy',
                nightlifeLevel: 7,
                natureLevel: 7,
                transportLevel: 8,
                hotelValueLevel: 8,
                safetyLevel: 9,
                confidence: parsed.confidence,
                sourceLabels: ['openai', 'compact-schema'],
                dataQuality: 'knowledge-based' as const,
                seasonality: d.seasonality
                  ? { ...d.seasonality, shoulderSeason: null, lowSeason: null, whenToAvoid: null }
                  : null,
                routeRealismScore: 85,
                travelFatigueLevel: 'Medium' as const,
                routeAlternatives: null,
                itineraryMapPlan: null,
                travelStrategyTips: null,
              })),
              scoreBreakdown: 'Scores based on budget fit, weather, transport, and safety',
              reasons: parsed.rankedDestinations.flatMap(d => d.whyRecommended).slice(0, 5),
              dataFreshness: {
                knowledgeBase: 'structured-knowledge',
                providerData: 'live-providers',
                lastUpdated: new Date().toISOString(),
              },
              sourcesUsed: ['openai-gpt4o', 'knowledge-base', 'compact-schema'],
              recommendedRoutes: null,
              nextBestAlternatives: null,
              personalization: null,
              seasonMonthStrategy: null,
            }

            // Add metadata to track OpenAI success
            ;(fullResponse as any).openAIUsed = true
            ;(fullResponse as any).fallbackUsed = false
            ;(fullResponse as any).fallbackReason = 'none'
            ;(fullResponse as any).cacheEligible = true
            ;(fullResponse as any).cacheVersion = ANALYSIS_CACHE_VERSION
            ;(fullResponse as any).openAIDurationMs = openAIDurationMs
            ;(fullResponse as any).systemPromptLength = systemPromptLength
            ;(fullResponse as any).promptTokens = completion.usage?.prompt_tokens ?? null
            ;(fullResponse as any).completionTokens = completion.usage?.completion_tokens ?? null
            ;(fullResponse as any).totalTokens = completion.usage?.total_tokens ?? null
            ;(fullResponse as any).travelDataAttractionsUsed = attractionsCount
            ;(fullResponse as any).travelDataWeatherRecordsUsed = weatherCount

            return fullResponse
        }

        // Use cache or fetch fresh based on bypass flag
        if (bypassCache) {
          analysis = await fetchFresh()
          ;(analysis as any).cacheStatus = 'BYPASSED'
          ;(analysis as any).cachedResultType = null
          logger.info('Travel Analysis Cache: Skipped (bypassed)', {
            openAIUsed: (analysis as any).openAIUsed,
            cacheEligible: (analysis as any).cacheEligible,
            cacheStatus: 'BYPASSED',
          })
        } else {
          // Try to get from cache first
          const cached = await cacheManager.get<TravelAnalysisResponse>(cacheKey, CachePresets.OPENAI_ANALYSIS.namespace)
          if (cached) {
            // Validate cached result
            const validation = this.validateCachedResult(cached, request, routeCandidatePool)
            
            if (validation.valid) {
              analysis = cached
              ;(analysis as any).cacheStatus = 'HIT'
              ;(analysis as any).cachedResultType = 'openai'
              logger.info('Travel Analysis Cache: HIT', {
                cachedResultType: 'openai',
                cacheStatus: 'HIT',
              })
            } else {
              // Reject stale/incompatible cache
              logger.info('Travel Analysis Cache: REJECTED_STALE_OR_INCOMPATIBLE', {
                reason: validation.reason,
                routeCandidateCount: routeCandidatePool.length,
                tripStructure: request.tripStructure,
              })
              
              // Fetch fresh
              analysis = await fetchFresh()
              ;(analysis as any).cacheStatus = 'REJECTED'
              ;(analysis as any).cacheRejectionReason = validation.reason
              
              // Validate and repair analysis
              analysis = await this.validateAndRepairAnalysis(analysis, request, routeCandidatePool, analysisContext)
            }
          } else {
            // Fetch fresh
            analysis = await fetchFresh()
            ;(analysis as any).cacheStatus = 'MISS'
            
            // Validate and repair analysis
            analysis = await this.validateAndRepairAnalysis(analysis, request, routeCandidatePool, analysisContext)
          }
        }
      } catch (aiError) {
        // Determine if this was a timeout or other error
        const errorMessage = aiError instanceof Error ? aiError.message : String(aiError)
        const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('timed out')
        
        // Log the AI provider error clearly
        logger.error('OpenAI provider failed, using fallback recommendations', {
          error: errorMessage,
          errorType: isTimeout ? 'timeout' : 'other',
          errorStack: aiError instanceof Error ? aiError.stack : undefined,
          query: request.query,
          userId: request.userId,
          timeoutMs: isTimeout ? ProviderConfigs.OPENAI.timeout : undefined,
        })

        // Track the error
        errorTracker.trackProviderError('openai', aiError, 'gpt4-analysis', { 
          fallbackUsed: true,
          isTimeout,
          query: request.query,
        })

        // Use fallback recommendations with route candidate pool
        const fallbackAnalysis = this.fallbackBuilder.generateFallbackRecommendations(
          request, 
          scoredDestinations.length > 0 ? scoredDestinations : [], 
          isTimeout,
          routeCandidatePool
        )
        
        // Add metadata to prevent caching fallback as successful OpenAI result
        ;(fallbackAnalysis as any).openAIUsed = false
        ;(fallbackAnalysis as any).fallbackUsed = true
        ;(fallbackAnalysis as any).fallbackReason = isTimeout ? 'timeout' : 'provider_error'
        ;(fallbackAnalysis as any).cacheEligible = false
        ;(fallbackAnalysis as any).cacheStatus = 'SKIPPED_FALLBACK'
        ;(fallbackAnalysis as any).cachedResultType = null
        
        logger.info('Fallback analysis generated', {
          openAIUsed: false,
          fallbackUsed: true,
          fallbackReason: isTimeout ? 'timeout' : 'provider_error',
          cacheEligible: false,
          cacheStatus: 'SKIPPED_FALLBACK',
          routeCandidatePoolUsed: routeCandidatePool.length > 0,
        })
        
        // Apply quality gate to fallback as well
        const { applyConsultantQualityGate, assignDiversityLabels, generateConsultantBrief } = await import('./consultant-quality-gate')
        const fallbackQualityResult = applyConsultantQualityGate(fallbackAnalysis.rankedDestinations, request)
        fallbackAnalysis.rankedDestinations = assignDiversityLabels(fallbackQualityResult.recommendations)
        fallbackAnalysis.topRecommendations = fallbackAnalysis.rankedDestinations.map(d => d.destinationName)
        fallbackAnalysis.querySummary = generateConsultantBrief(
          fallbackAnalysis.rankedDestinations, 
          request, 
          isTimeout ? 'timeout' : 'fallback'
        )
        
        analysis = fallbackAnalysis
      }

      // Add personalization metadata to response
      if (isPersonalized && personalizedWeights.is_personalized) {
        analysis.personalization = {
          isPersonalized: true,
          confidence: personalizedWeights.confidence,
          explanations: personalizationExplanations,
          feedbackCount: userPreferenceProfile?.feedback_count ?? null,
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

        // Step 8.1: Apply user preference learning signals (diversity bonus + recency penalty)
        try {
          const isDev = process.env.NODE_ENV === 'development'
          const reRankingDecisions: Array<{ destination: string; original_rank: number; new_rank: number; reason: string }> = []

          // Fetch user's past analyses to detect repeated destinations (non-blocking)
          let pastDestinations: string[] = []
          if (request.userId) {
            try {
              const { getUserPastDestinations } = await import('../db/preferences')
              pastDestinations = (await getUserPastDestinations(request.userId, 3)) || []
            } catch {
              // Non-critical — continue without past history
            }
          }

          const seenRegions = new Set<string>()
          const adjustedDestinations = analysis.rankedDestinations.map((dest, idx) => {
            let scoreAdjustment = 0
            const reasons: string[] = []

            // Diversity bonus: boost destinations from regions not yet seen in this result set
            const destRegion = (dest as any).region || ''
            if (destRegion && !seenRegions.has(destRegion)) {
              scoreAdjustment += 0.15
              reasons.push(`diversity bonus +0.15 (new region: ${destRegion})`)
              seenRegions.add(destRegion)
            }

            // Recency penalty: if this destination appeared in user's last 3 analyses, penalise
            const wasRecentlySeen = pastDestinations.some(
              past => past.toLowerCase() === dest.destinationName.toLowerCase()
            )
            if (wasRecentlySeen) {
              scoreAdjustment -= 0.20
              reasons.push(`recency penalty -0.20 (seen in last 3 analyses)`)
            }

            if (scoreAdjustment !== 0) {
              const adjustedScore = Math.max(0, Math.min(100, (dest.totalMatchScore || 0) + scoreAdjustment * 100))
              if (isDev) {
                reRankingDecisions.push({
                  destination: dest.destinationName,
                  original_rank: idx + 1,
                  new_rank: idx + 1, // Will be corrected after sort
                  reason: reasons.join('; '),
                })
              }
              return { ...dest, totalMatchScore: adjustedScore }
            }
            return dest
          })

          // Re-sort by adjusted score
          adjustedDestinations.sort((a, b) => (b.totalMatchScore || 0) - (a.totalMatchScore || 0))

          // Fix new_rank after sort
          if (isDev && reRankingDecisions.length > 0) {
            adjustedDestinations.forEach((dest, idx) => {
              const decision = reRankingDecisions.find(d => d.destination === dest.destinationName)
              if (decision) decision.new_rank = idx + 1
            })
            logger.info('ML Re-ranking Decisions', { decisions: reRankingDecisions })
          }

          analysis.rankedDestinations = adjustedDestinations.slice(0, 3)
          analysis.topRecommendations = analysis.rankedDestinations.map(d => d.destinationName)
        } catch (reRankError) {
          logger.warn('Re-ranking signals failed, keeping ML order', { error: reRankError instanceof Error ? reRankError.message : String(reRankError) })
        }
      } catch (mlError) {
        errorTracker.trackMLError(mlError, 'inference', { userId: request.userId })
        logger.error('Travel Analysis Engine: ML inference failed, using baseline', mlError)
        // Fallback: Keep original AI-generated ranking but limit to top 3
        analysis.rankedDestinations = analysis.rankedDestinations.slice(0, 3)
        analysis.topRecommendations = analysis.rankedDestinations.map(d => d.destinationName)
      }

      // Step 9: Optional Claude verification for accuracy (non-blocking, max 3s)
      let claudeVerifierUsed = false
      let claudeVerifierPassed = false
      let claudeVerificationSuccessCount = 0
      let claudeModelUsed: string | null = null
      let claudeVerifierError: string | null = null
      let claudeTimedOut = false
      try {
        const { getClaudeVerifier } = await import('../services/claude-verifier')
        const claudeVerifier = getClaudeVerifier()
        
        if (claudeVerifier.isAvailable()) {
          claudeModelUsed = claudeVerifier.getModel()
          claudeVerifierUsed = true
          logger.info('Claude verification: fire-and-forget (non-blocking)', {
            model: claudeModelUsed,
            destinations: analysis.rankedDestinations.map(d => d.destinationName),
          })

          // Fire-and-forget: launch verification without blocking the pipeline
          Promise.allSettled(
            analysis.rankedDestinations.map(async (dest) => {
              try {
                const verification = await claudeVerifier.verifyRecommendation(
                  dest,
                  request.travelMonths?.length || 7,
                  request.tripStructure || 'single_country_one_city'
                )
                if (verification !== null) {
                  logger.info('Claude verification completed (async)', {
                    destination: dest.destinationName,
                    verified: verification.verified,
                    model: claudeModelUsed,
                  })
                }
              } catch (err) {
                logger.warn('Claude verification failed (async)', {
                  destination: dest.destinationName,
                  error: err instanceof Error ? err.message : String(err),
                })
              }
            })
          ).catch(() => {})

          // Mark as used but not blocking
          claudeVerifierPassed = false
          claudeVerificationSuccessCount = 0
        } else {
          logger.info('Claude verifier skipped by env flag')
        }
      } catch (claudeError) {
        // Claude verification is optional - log but don't fail
        claudeVerifierError = claudeError instanceof Error ? claudeError.message : String(claudeError)
        logger.warn('Claude verification failed - continuing with unverified recommendations', {
          error: claudeVerifierError,
          model: claudeModelUsed,
        })
        errorTracker.trackProviderError('claude', claudeError, 'verification', {
          nonBlocking: true,
          userId: request.userId,
        })
      }

      // Step 9.5: Enforce recommendation diversity
      const { enforceRecommendationDiversity } = await import('./diversity-enforcement')
      const diversityResult = enforceRecommendationDiversity(
        analysis.rankedDestinations,
        {
          request,
          candidatePool: scoredDestinations.slice(0, candidatePoolSize).map(sd => {
            // Convert scored destination to ranked destination format if needed
            return analysis.rankedDestinations.find(rd => rd.destinationId === sd.destinationId) || analysis.rankedDestinations[0]
          }),
          fixedCountry: request.destination,
          routeCandidatePool,
        }
      )

      // Update with diversity-enforced recommendations
      analysis.rankedDestinations = diversityResult.recommendations
      analysis.topRecommendations = diversityResult.recommendations.map(d => d.destinationName)

      // Step 9.6: Apply consultant quality gate
      const { applyConsultantQualityGate, assignDiversityLabels, generateConsultantBrief } = await import('./consultant-quality-gate')
      const qualityResult = applyConsultantQualityGate(analysis.rankedDestinations, request)
      
      // Update with quality-checked recommendations
      analysis.rankedDestinations = assignDiversityLabels(qualityResult.recommendations)
      analysis.topRecommendations = analysis.rankedDestinations.map(d => d.destinationName)
      
      // Generate consultant brief for query summary
      const dataSource = this.openaiAvailable ? 'openai' : 'fallback'
      analysis.querySummary = generateConsultantBrief(analysis.rankedDestinations, request, dataSource)

      logger.info('Travel Analysis Engine: Analysis complete', {
        recommendations: analysis.topRecommendations.length,
        rankedDestinations: analysis.rankedDestinations.length,
        personalized: analysis.personalization?.isPersonalized,
        personalizationConfidence: analysis.personalization?.confidence,
        routeType: routeAnalysis.recommendedRoute.routeType,
        routeScore: routeAnalysis.recommendedRoute.routeScore.totalRouteQuality,
        diversityApplied: diversityResult.diversityApplied,
        diversityScore: diversityResult.diversityScore,
        fixedCountryMode: diversityResult.fixedCountryMode,
        regionSpread: diversityResult.regionSpread,
        mainstreamCount: diversityResult.mainstreamCount,
        uniqueOptionIncluded: diversityResult.uniqueOptionIncluded,
        qualityGatePassed: qualityResult.passed,
        qualityGateRepaired: qualityResult.repaired,
      })

      // Step 10: Record learning event (non-blocking)
      try {
        const recommendationItems = analysis.rankedDestinations.map((dest, index) => ({
          rank: index + 1,
          destinationTitle: dest.destinationName,
          tripType: dest.tripType,
          suggestedRoute: dest.suggestedRoute,
          recommendedNights: dest.recommendedNights,
          totalScore: dest.totalMatchScore,
          routeRealismScore: dest.routeRealismScore,
          travelFatigueLevel: dest.travelFatigueLevel,
          transportLogic: dest.transportLogic,
          warnings: dest.routeWarnings,
          alternatives: dest.routeAlternatives ? [dest.routeAlternatives] : [],
          providerSource: this.openaiAvailable ? 'openai' : 'fallback',
          claudeVerified: false,
          claudeAccuracyNotes: [],
        }))

        const learningEventId = await recordRecommendationEvent(
          request.userId || null,
          null,
          {
            departure: request.departureCity,
            passportCountry: undefined,
            budgetLevel: request.budget,
            tripLength: request.tripLength,
            interests: request.interests,
            tripStructure: request.tripStructure,
          },
          recommendationItems,
          {
            provider: this.openaiAvailable ? 'openai' : 'fallback',
            claudeVerifierUsed: false,
            fallbackUsed: !this.openaiAvailable,
          }
        )

        if (learningEventId) {
          // Add learning metadata to response
          const analysisWithLearning = analysis as any
          analysisWithLearning.learningEventId = learningEventId
          analysisWithLearning.learningEnabled = true
          analysisWithLearning.personalizationApplied = learningContext?.confidenceScore >= 0.5
        }
      } catch (learningError) {
        logger.warn('Failed to record learning event, continuing', { error: learningError instanceof Error ? learningError.message : String(learningError) })
      }

      // Step 11: Finalize analysis with canonical metadata (single source of truth)
      const analysisWithMeta = analysis as any
      const isCacheHit = analysisWithMeta.cacheStatus === 'HIT'
      
      // Calculate attractions and weather counts
      const attractionsCount = routeCandidatePool.reduce((sum, route) => {
        const cities = route.routeCities
        const routeAttractions = getAttractionsForRoute(route.country, cities, request.interests)
        return sum + routeAttractions.length
      }, 0)
      
      const weatherCount = request.travelMonths && request.travelMonths.length > 0
        ? routeCandidatePool.reduce((sum, route) => {
            const cities = route.routeCities
            const routeWeather = getWeatherForRoute(route.country, cities, request.travelMonths!)
            return sum + routeWeather.length
          }, 0)
        : 0
      
      // Prepare inputs for finalization
      const qualityGateInput: QualityGateResult = {
        passed: qualityResult.passed,
        repaired: qualityResult.repaired || false,
        repairedPassed: analysisWithMeta.repairPassed ?? false,
        issues: qualityResult.issues || [],
        scopeValidationPassed: analysisWithMeta.finalScopeValidationPassed ?? true,
        formattingIssues: analysisWithMeta.validationIssuesAfterRepair ?? [],
      }
      
      const claudeInput: ClaudeVerificationResult = {
        used: claudeVerifierUsed,
        passed: claudeVerifierPassed,
        successCount: claudeVerificationSuccessCount,
        totalCount: analysis.rankedDestinations.length,
        error: claudeVerifierError || undefined,
        modelUsed: claudeModelUsed || undefined,
        timedOut: claudeTimedOut,
      }
      
      const routeContextInput: RouteContext = {
        candidateCount: routeCandidatePool.length,
        regionsIncluded: [...new Set(routeCandidatePool.map(r => r.region).filter(Boolean))],
        countriesIncluded: [...new Set(routeCandidatePool.map(r => r.country))],
        attractionsUsed: attractionsCount,
        weatherRecordsUsed: weatherCount,
      }
      
      const cacheInfoInput: CacheInfo = {
        status: analysisWithMeta.cacheStatus || 'MISS',
        eligible: analysisWithMeta.cacheEligible ?? true,
        reason: analysisWithMeta.cacheSkippedReason,
      }
      
      // Call finalization layer - single source of truth
      const finalized = finalizeAnalysisResult({
        analysis,
        request,
        routeContext: routeContextInput,
        qualityGateResult: qualityGateInput,
        claudeResult: claudeInput,
        cacheInfo: cacheInfoInput,
        openAIUsed: (analysis as any).openAIUsed ?? true,
        fallbackUsed: (analysis as any).fallbackUsed ?? false,
      })
      
      // Replace analysis with finalized version
      analysis = finalized.analysis
      const finalMetadata = finalized.metadata
      const displaySummary = finalized.displaySummary
      
      // Log AI Route Comparison Audit
      logger.info('AI Route Comparison Audit', {
        openAIActuallyCalledThisRequest: finalMetadata.openAIActuallyCalledThisRequest,
        aiDecisionMode: finalMetadata.aiDecisionMode,
        userInput: {
          departureCity: request.departureCity,
          tripLength: request.tripLength,
          budget: request.budget,
          travelMonths: request.travelMonths,
          interests: request.interests,
          tripStructure: request.tripStructure,
        },
        candidatesCompared: {
          count: finalMetadata.candidateRoutesComparedCount,
          countries: finalMetadata.candidateCountriesCompared,
          regions: finalMetadata.candidateRegionsCompared,
        },
        finalSelection: {
          countries: finalMetadata.finalCountries,
          routes: finalMetadata.finalRoutes.map(r => r.cities.join(' → ')),
          selectionReason: finalMetadata.finalSelectionReason,
        },
        dataContext: {
          routes: finalMetadata.travelDataRoutesCount,
          attractions: finalMetadata.travelDataAttractionsCount,
          weather: finalMetadata.travelDataWeatherCount,
        },
      })
      
      // Log AI Decision Source
      if (finalMetadata.cacheUsedThisRequest) {
        logger.info('AI Decision Source: cached OpenAI result — OpenAI not called this request', {
          aiDecisionMode: finalMetadata.aiDecisionMode,
          cacheStatus: 'HIT',
        })
      } else {
        logger.info('AI Decision Source: fresh OpenAI analysis — comparing structured candidates', {
          aiDecisionMode: finalMetadata.aiDecisionMode,
          candidatesCompared: finalMetadata.candidateRoutesComparedCount,
          comparisonCompleted: finalMetadata.comparisonCompleted,
        })
      }
      
      // Calculate total duration
      const durationMs = Date.now() - analysisStartTime
      
      // Add additional metadata fields not in finalization layer
      const completeMetadata = {
        ...finalMetadata,
        analysisId: `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        finalized: true,
        cacheStoredStage: 'finalized' as string | null,
        currentRequestOpenAIUsed: isCacheHit ? false : (analysisWithMeta.openAIUsed || false),
        modelUsed: analysisWithMeta.openAIUsed ? this.model : null,
        durationMs,
        openAIDurationMs: isCacheHit ? null : (analysisWithMeta.openAIDurationMs ?? null),
        cachedOpenAIDurationMs: isCacheHit ? (analysisWithMeta.openAIDurationMs ?? null) : null,
        cacheRejectionReason: analysisWithMeta.cacheRejectionReason ?? null,
        cachedResultType: analysisWithMeta.cachedResultType ?? null,
        compactPromptUsed: true,
        systemPromptLength: analysisWithMeta.systemPromptLength ?? null,
        promptTokens: isCacheHit ? null : (analysisWithMeta.promptTokens ?? null),
        completionTokens: isCacheHit ? null : (analysisWithMeta.completionTokens ?? null),
        totalTokens: isCacheHit ? null : (analysisWithMeta.totalTokens ?? null),
        candidatePoolUsed: routeCandidatePool.length > 0,
        candidatePoolCount: routeCandidatePool.length,
        routeIntelligenceDestinationCount: routeAnalysisDestinations.length,
        diversityScore: diversityResult.diversityScore,
        regionSpread: diversityResult.regionSpread,
        mainstreamCount: diversityResult.mainstreamCount,
        uniqueOptionIncluded: diversityResult.uniqueOptionIncluded,
        invalidDestinations: analysisWithMeta.invalidDestinations ?? [],
        replacementsApplied: analysisWithMeta.replacementsApplied ?? [],
        cacheSkippedReason: analysisWithMeta.cacheSkippedReason ?? null,
        analysisSource: analysisWithMeta.analysisSource ?? (isCacheHit ? 'cache_openai' : 'openai_primary'),
        openAIPrimaryUsed: analysisWithMeta.openAIPrimaryUsed ?? true,
        openAIRepairUsed: analysisWithMeta.openAIRepairUsed ?? false,
        repairAttempted: analysisWithMeta.repairAttempted ?? false,
        repairPassed: analysisWithMeta.repairPassed ?? false,
        repairFailedReason: analysisWithMeta.repairFailedReason ?? null,
        repairDurationMs: analysisWithMeta.repairDurationMs ?? null,
        repairPromptTokens: analysisWithMeta.repairPromptTokens ?? null,
        repairCompletionTokens: analysisWithMeta.repairCompletionTokens ?? null,
        repairTotalTokens: analysisWithMeta.repairTotalTokens ?? null,
        validationIssuesBeforeRepair: analysisWithMeta.validationIssuesBeforeRepair ?? [],
        validationIssuesAfterRepair: analysisWithMeta.validationIssuesAfterRepair ?? [],
        deterministicFallbackUsed: analysisWithMeta.deterministicFallbackUsed ?? false,
        candidatePoolUsedAsContext: analysisWithMeta.candidatePoolUsedAsContext ?? (routeCandidatePool.length > 0),
        candidatePoolUsedAsReplacement: analysisWithMeta.candidatePoolUsedAsReplacement ?? false,
        replacementReason: analysisWithMeta.replacementReason ?? null,
        travelDataUsed: routeCandidatePool.some(r => r.sourceType === 'curated_route_knowledge'),
        travelDataRoutesLoaded: routeCandidatePool.filter(r => r.sourceType === 'curated_route_knowledge').length,
        travelDataCandidateRoutesUsed: routeCandidatePool.length,
        travelDataSourceTypes: [...new Set(routeCandidatePool.map(r => r.sourceType).filter(Boolean))],
        travelDataConfidenceLevels: [...new Set(routeCandidatePool.map(r => r.confidenceLevel).filter(Boolean))],
        travelDataFallbackUsed: routeCandidatePool.length > 0 && !routeCandidatePool.some(r => r.sourceType === 'curated_route_knowledge'),
        tavilySearchUsed: tavilyContext?.searchSuccess ?? false,
        tavilySourcesCount: tavilyContext?.sources.length ?? 0,
        priceEstimationUsed: providerData.priceEstimationUsed ?? false,
        priceEstimationConfidence: providerData.priceEstimationConfidence ?? null,
      }
      
      // Validate analysis contract
      const contractResult = validateAnalysisContract({
        request,
        normalizedRequest: request, // Already normalized
        globalCandidates: globalCandidates,
        structuredCandidates: routeCandidatePool.filter(c => c.sourceType !== 'ai_global_knowledge'),
        mergedCandidates: routeCandidatePool,
        finalComparisonInput: routeCandidatePool, // This is what was sent to OpenAI
        finalAnalysis: analysis,
        finalMetadata: completeMetadata,
      })
      
      logger.info('Analysis Contract Check', {
        passed: contractResult.passed,
        issues: contractResult.issues,
        warnings: contractResult.warnings,
        blockingIssues: contractResult.blockingIssues,
      })
      
      // If contract has blocking issues, enforce quality constraints
      if (contractResult.blockingIssues.length > 0) {
        completeMetadata.finalQualityPassed = false
        completeMetadata.consultantQualityScore = Math.min(completeMetadata.consultantQualityScore || 75, 75)
        completeMetadata.consultantQualityGrade = completeMetadata.consultantQualityScore >= 70 ? 'Good' : 'Acceptable'
        ;(completeMetadata as any).analysisContractPassed = false
        ;(completeMetadata as any).analysisContractBlockingIssues = contractResult.blockingIssues
        
        logger.warn('Analysis contract failed - quality constraints enforced', {
          blockingIssues: contractResult.blockingIssues,
          finalQualityPassed: false,
          consultantQualityScore: completeMetadata.consultantQualityScore,
        })
      } else {
        ;(completeMetadata as any).analysisContractPassed = true
        ;(completeMetadata as any).analysisContractBlockingIssues = []
      }
      
      // Google Places enrichment (after OpenAI decision, before cache)
      const googlePlacesEnabled = process.env.ENABLE_GOOGLE_PLACES_ENRICHMENT === 'true'
      const googlePlacesKey = process.env.GOOGLE_PLACES_API_KEY
      let googlePlacesStatus: 'success' | 'disabled' | 'missing_key' | 'failed' | 'timeout' | 'forbidden' | 'partial' = 'disabled'
      let googlePlacesCount = 0
      let googlePlacesErrorCode: number | undefined
      let googlePlacesErrorReason: string | undefined
      let totalAttempted = 0
      let totalSuccessful = 0
      let totalFailed = 0
      
      if (googlePlacesEnabled && googlePlacesKey) {
        logger.info('Google Places enrichment enabled - enriching final recommendations')
        
        try {
          // Enrich each final recommendation
          for (const destination of analysis.rankedDestinations) {
            const routeCities = destination.suggestedRoute || []
            const country = destination.destinationName || '' // Now clean: "Portugal" not "Portugal - Lisbon → Porto"
            
            if (routeCities.length > 0 && country) {
              try {
                const enrichmentResult = await enrichRouteCities(routeCities, country)
                
                // Track aggregated stats
                totalAttempted += enrichmentResult.stats.attemptedRequests
                totalSuccessful += enrichmentResult.stats.successfulRequests
                totalFailed += enrichmentResult.stats.failedRequests
                
                if (enrichmentResult.stats.errorStatus) {
                  googlePlacesErrorCode = enrichmentResult.stats.errorStatus
                  googlePlacesErrorReason = enrichmentResult.stats.errorReason
                }
                
                // Categorize places
                const livePlacesToVisit = enrichmentResult.byCategory['tourist attractions'] || []
                const liveFoodIdeas = enrichmentResult.byCategory['restaurants'] || []
                const liveNatureIdeas = enrichmentResult.byCategory['nature parks'] || []
                const liveCulturalIdeas = enrichmentResult.byCategory['museums'] || []
                
                // Add to destination
                ;(destination as any).livePlacesToVisit = livePlacesToVisit
                ;(destination as any).liveFoodIdeas = liveFoodIdeas
                ;(destination as any).liveNatureIdeas = liveNatureIdeas
                ;(destination as any).liveCulturalIdeas = liveCulturalIdeas
                
                googlePlacesCount += enrichmentResult.places.length
              } catch (destError) {
                logger.warn('Google Places enrichment failed for destination', {
                  country,
                  error: (destError as Error).message,
                })
              }
            }
          }
          
          // Determine final status
          if (googlePlacesCount > 0) {
            googlePlacesStatus = totalFailed > 0 ? 'partial' : 'success'
          } else if (totalFailed > 0 && googlePlacesErrorCode === 403) {
            googlePlacesStatus = 'forbidden'
          } else if (totalFailed > 0) {
            googlePlacesStatus = 'failed'
          } else {
            googlePlacesStatus = 'success'
          }
          
          // Aggregated logging
          logger.info('Google Places enrichment completed', {
            status: googlePlacesStatus,
            totalPlaces: googlePlacesCount,
            attemptedRequests: totalAttempted,
            successfulRequests: totalSuccessful,
            failedRequests: totalFailed,
            errorCode: googlePlacesErrorCode,
            errorReason: googlePlacesErrorReason,
          })
        } catch (error) {
          logger.error('Google Places enrichment failed', error)
          googlePlacesStatus = 'failed'
        }
      } else if (googlePlacesEnabled && !googlePlacesKey) {
        logger.warn('Google Places enrichment enabled but API key missing')
        googlePlacesStatus = 'missing_key'
      }
      
      // Add Google Places metadata
      ;(completeMetadata as any).googlePlacesUsed = googlePlacesCount > 0
      ;(completeMetadata as any).googlePlacesStatus = googlePlacesStatus
      ;(completeMetadata as any).googlePlacesCount = googlePlacesCount
      ;(completeMetadata as any).googlePlacesErrorCode = googlePlacesErrorCode
      ;(completeMetadata as any).googlePlacesErrorReason = googlePlacesErrorReason
      
      // Set displaySummary (metadata set after cache decision)
      ;(analysis as any).displaySummary = displaySummary
      
      // Update querySummary with finalized display summary
      analysis.querySummary = displaySummary.querySummary
      
      // Determine cache eligibility based on finalized quality AND contract
      const qualityPassedOrRepaired =
        completeMetadata.finalQualityPassed ||
        (completeMetadata.consultantQualityScore >= 75 &&
         completeMetadata.repairPassed === true)

      const cacheEligible =
        qualityPassedOrRepaired &&
        completeMetadata.consultantQualityScore >= 75 &&
        completeMetadata.scopeValidationPassed &&
        completeMetadata.openAIUsed &&
        !completeMetadata.fallbackUsed &&
        contractResult.passed &&
        contractResult.blockingIssues.length === 0
      
      // Update completeMetadata with correct cacheEligible
      completeMetadata.cacheEligible = cacheEligible
      
      // Cache SET only after finalization
      if (cacheEligible && !isCacheHit && cacheKey) {
        try {
          await cacheManager.set(cacheKey, analysis, CachePresets.OPENAI_ANALYSIS)
          completeMetadata.cacheStatus = 'SET'
          completeMetadata.cachedResultType = completeMetadata.analysisSource
          completeMetadata.cacheStoredStage = 'finalized'
          logger.info('Travel Analysis Cache: SET (finalized)', {
            cachedResultType: completeMetadata.analysisSource,
            finalQualityPassed: completeMetadata.finalQualityPassed,
            consultantQualityScore: completeMetadata.consultantQualityScore,
            cacheStoredStage: 'finalized',
          })
        } catch (cacheError) {
          logger.warn('Failed to cache finalized analysis', { error: cacheError instanceof Error ? cacheError.message : String(cacheError) })
          completeMetadata.cacheStatus = 'ERROR'
          completeMetadata.cacheSkippedReason = 'cache_write_failed'
          completeMetadata.cacheStoredStage = null
        }
      } else {
        const skipReason = !cacheEligible 
          ? `quality_check_failed (finalQualityPassed=${completeMetadata.finalQualityPassed}, score=${completeMetadata.consultantQualityScore})`
          : isCacheHit 
          ? 'cache_hit'
          : 'no_cache_key'
        completeMetadata.cacheStatus = 'SKIPPED'
        completeMetadata.cacheSkippedReason = skipReason
        completeMetadata.cacheStoredStage = null
        completeMetadata.cacheEligible = false
        logger.info('Travel Analysis Cache: SKIPPED', {
          reason: skipReason,
          finalQualityPassed: completeMetadata.finalQualityPassed,
          consultantQualityScore: completeMetadata.consultantQualityScore,
        })
      }
      
      // Update analysis._meta with final cache metadata
      ;(analysis as any)._meta = completeMetadata
      
      // Log comprehensive final metadata
      logger.info('Travel Analysis Final Metadata (Finalized)', {
        analysisId: completeMetadata.analysisId,
        finalized: true,
        tripLength: completeMetadata.tripLength,
        tripStructure: completeMetadata.tripStructure,
        recommendedRouteType: completeMetadata.recommendedRouteType,
        finalCountries: completeMetadata.finalCountries,
        consultantQualityScore: completeMetadata.consultantQualityScore,
        consultantQualityGrade: completeMetadata.consultantQualityGrade,
        finalQualityPassed: completeMetadata.finalQualityPassed,
        qualityGatePassed: completeMetadata.qualityGatePassed,
        scopeValidationPassed: completeMetadata.scopeValidationPassed,
        claudeVerifierUsed: completeMetadata.claudeVerifierUsed,
        claudeVerifierPassed: completeMetadata.claudeVerifierPassed,
        claudeVerificationSuccessCount: completeMetadata.claudeVerificationSuccessCount,
        cacheStatus: completeMetadata.cacheStatus,
        cacheEligible,
        cacheStoredStage: 'finalized',
        openAIUsed: completeMetadata.openAIUsed,
        currentRequestOpenAIUsed: completeMetadata.currentRequestOpenAIUsed,
        fallbackUsed: completeMetadata.fallbackUsed,
        durationMs: completeMetadata.durationMs,
        travelDataAttractionsUsed: completeMetadata.travelDataAttractionsUsed,
        travelDataWeatherRecordsUsed: completeMetadata.travelDataWeatherRecordsUsed,
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
  private getSystemInstructions(fastMode: boolean = true): string {
    const { buildTravelAnalysisSystemPrompt } = require('./skills')
    return buildTravelAnalysisSystemPrompt(fastMode)
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
    routeAnalysis?: any,
    tavilyContext?: TravelSearchContext | null
  ): string {
    const sections: string[] = []

    sections.push('=== USER REQUEST ===')
    sections.push(`Query: ${request.query}`)
    if (request.destination) sections.push(`Destination: ${request.destination}`)
    if (request.budget) sections.push(`Budget: ${request.budget}`)
    if (request.season) {
      sections.push(`Season Selected: ${request.season}`)
      sections.push(`IMPORTANT: User selected season mode. Generate seasonMonthStrategy with month-by-month options.`)
    }
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
    const flightHotelSource = providerData.priceEstimationUsed
      ? `AI-estimated from Tavily web search (confidence: ${providerData.priceEstimationConfidence ?? 'low'})`
      : 'live API data'
    const weatherSource = providerData.weather?.source === 'api' ? 'live climate data (Open-Meteo)' : 'structured'
    sections.push(`Note: Weather=${weatherSource}, Currency=structured, Visa=knowledge-based, Flights/Hotels=${flightHotelSource}`)
    sections.push('')

    // Flight data summary
    if (providerData.flights && providerData.flights.length > 0) {
      const cheapest = providerData.flights.reduce((min: any, f: any) => f.price < min.price ? f : min, providerData.flights[0])
      const mostExpensive = providerData.flights.reduce((max: any, f: any) => f.price > max.price ? f : max, providerData.flights[0])
      const flightSrc = cheapest.source === 'ai_estimated' ? 'AI-estimated from Tavily web search' : 'live API data'
      sections.push(`Flights: estimated price range $${Math.round(cheapest.price)}–$${Math.round(mostExpensive.price)} USD (round trip)`)
      if (cheapest.source === 'ai_estimated' && providerData.flights.some((f: any) => f.airline && !f.airline.includes('(est.)'))) {
        const airlines = [...new Set(providerData.flights.map((f: any) => f.airline).filter((a: string) => !a.includes('(est.)')))]
        if (airlines.length > 0) sections.push(`  Typical airlines: ${airlines.join(', ')}`)
      }
      sections.push(`  Source: ${flightSrc}`)
      sections.push('')
    }

    // Hotel data summary
    if (providerData.hotels && providerData.hotels.length > 0) {
      const cheapestHotel = providerData.hotels.reduce((min: any, h: any) => h.pricePerNight < min.pricePerNight ? h : min, providerData.hotels[0])
      const mostExpensiveHotel = providerData.hotels.reduce((max: any, h: any) => h.pricePerNight > max.pricePerNight ? h : max, providerData.hotels[0])
      const hotelSrc = cheapestHotel.source === 'ai_estimated' ? 'AI-estimated from Tavily web search' : 'live API data'
      sections.push(`Hotels: estimated price range $${Math.round(cheapestHotel.pricePerNight)}–$${Math.round(mostExpensiveHotel.pricePerNight)}/night`)
      sections.push(`  Source: ${hotelSrc}`)
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

    if (tavilyContext?.searchSuccess) {
      sections.push('=== REAL-TIME WEB RESEARCH ===')
      sections.push('The following data was retrieved live from the web:')
      if (tavilyContext.destinationOverview)
        sections.push(`Destination Overview: ${tavilyContext.destinationOverview}`)
      if (tavilyContext.budgetReality)
        sections.push(`Real Budget Data: ${tavilyContext.budgetReality}`)
      if (tavilyContext.bestTimeToVisit)
        sections.push(`Best Time (real sources): ${tavilyContext.bestTimeToVisit}`)
      if (tavilyContext.currentVisaInfo)
        sections.push(`Visa Info: ${tavilyContext.currentVisaInfo}`)
      if (tavilyContext.safetyAndAdvisories)
        sections.push(`Safety: ${tavilyContext.safetyAndAdvisories}`)
      if (tavilyContext.hiddenGems)
        sections.push(`Local Tips: ${tavilyContext.hiddenGems}`)
      if (tavilyContext.sources.length > 0)
        sections.push(`Sources: ${tavilyContext.sources.slice(0, 3).join(', ')}`)
      sections.push('')
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
      priceEstimationUsed: false,
      priceEstimationConfidence: null as 'high' | 'medium' | 'low' | null,
    }

    // Gather data for top 5 destinations
    for (let i = 0; i < Math.min(5, topDestinations.length); i++) {
      const dest = topDestinations[i]

      try {
        // Flight data: try real Duffel API first, fall back to AI price estimation
        try {
          const origin = departureCity || (query ? this.extractDepartureCity(query) : null) || 'NYC'
          const tripLen = 7

          let flights = await this.flightsProvider.searchFlights(
            origin,
            dest.destinationName,
            new Date().toISOString().split('T')[0]
          )

          // If real provider returned nothing, use AI-estimated pricing
          if (flights.length === 0) {
            const estimate = await estimatePricing(origin, dest.destinationName, budget, tripLen)
            const mid = Math.round((estimate.flightPriceRange.min + estimate.flightPriceRange.max) / 2)
            flights = [
              {
                origin, destination: dest.destinationName,
                departureDate: new Date().toISOString().split('T')[0],
                price: estimate.flightPriceRange.min,
                currency: estimate.flightPriceRange.currency,
                airline: estimate.flightTypicalAirlines[0] || 'Budget carrier (est.)',
                duration: 480, stops: 1, source: 'ai_estimated',
              },
              {
                origin, destination: dest.destinationName,
                departureDate: new Date().toISOString().split('T')[0],
                price: mid,
                currency: estimate.flightPriceRange.currency,
                airline: estimate.flightTypicalAirlines[1] || 'Major carrier (est.)',
                duration: 420, stops: 0, source: 'ai_estimated',
              },
              {
                origin, destination: dest.destinationName,
                departureDate: new Date().toISOString().split('T')[0],
                price: estimate.flightPriceRange.max,
                currency: estimate.flightPriceRange.currency,
                airline: estimate.flightTypicalAirlines[2] || 'Premium carrier (est.)',
                duration: 360, stops: 0, source: 'ai_estimated',
              },
            ] as FlightData[]
            data.priceEstimationUsed = true
            if (!data.priceEstimationConfidence || estimate.confidence === 'high') {
              data.priceEstimationConfidence = estimate.confidence
            }
          }

          if (i === 0) {
            data.flights = flights
          }

          const flightValueScore = this.flightsProvider.getFlightValueScore(flights, budget)
          data.providerScores.set(dest.destinationId, { flightValue: flightValueScore })
        } catch (flightError) {
          logger.error(`Flight provider failed for ${dest.destinationName}`, flightError)
        }

        // Hotel data: try real Hotelbeds API first (cities only), fall back to AI price estimation
        if (dest.destinationType === 'city') {
          try {
            const origin = departureCity || (query ? this.extractDepartureCity(query) : null) || 'NYC'
            let hotels = await this.hotelsProvider.searchHotels(
              dest.destinationName,
              new Date().toISOString().split('T')[0],
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            )

            // If real provider returned nothing, use AI-estimated pricing
            if (hotels.length === 0) {
              const estimate = await estimatePricing(origin, dest.destinationName, budget, 7)
              const midHotel = Math.round((estimate.hotelPriceRange.min + estimate.hotelPriceRange.max) / 2)
              hotels = [
                {
                  name: estimate.hotelTypicalOptions[0] || `${dest.destinationName} budget option (AI est.)`,
                  location: 'City area', city: dest.destinationName, country: dest.destinationName,
                  pricePerNight: estimate.hotelPriceRange.min,
                  currency: estimate.hotelPriceRange.currency,
                  rating: 3.5, reviewCount: 0, amenities: ['WiFi'], source: 'ai_estimated',
                },
                {
                  name: estimate.hotelTypicalOptions[1] || `${dest.destinationName} mid-range hotel (AI est.)`,
                  location: 'City center', city: dest.destinationName, country: dest.destinationName,
                  pricePerNight: midHotel,
                  currency: estimate.hotelPriceRange.currency,
                  rating: 4.0, reviewCount: 0, amenities: ['WiFi', 'Breakfast'], source: 'ai_estimated',
                },
                {
                  name: estimate.hotelTypicalOptions[2] || `${dest.destinationName} boutique hotel (AI est.)`,
                  location: 'Historic district', city: dest.destinationName, country: dest.destinationName,
                  pricePerNight: estimate.hotelPriceRange.max,
                  currency: estimate.hotelPriceRange.currency,
                  rating: 4.5, reviewCount: 0, amenities: ['WiFi', 'Spa', 'Pool'], source: 'ai_estimated',
                },
              ] as HotelData[]
              data.priceEstimationUsed = true
              if (!data.priceEstimationConfidence || estimate.confidence === 'high') {
                data.priceEstimationConfidence = estimate.confidence
              }
            }

            if (i === 0) {
              data.hotels = hotels
            }

            const hotelValueScore = this.hotelsProvider.getHotelValueScore(hotels, budget)
            const existing = data.providerScores.get(dest.destinationId) || {}
            data.providerScores.set(dest.destinationId, { ...existing, hotelValue: hotelValueScore })
          } catch (hotelError) {
            logger.error(`Hotel provider failed for ${dest.destinationName}`, hotelError)
          }
        }

        // Weather/currency/visa are gathered once as a representative sample for the
        // top-ranked destination (not per-destination) — the prompt section they feed
        // is an illustrative summary, not a per-destination breakdown.
        if (i === 0) {
          // Weather for the traveller's first requested month (defaults to the current month)
          const weatherMonth = travelMonths && travelMonths.length > 0 ? travelMonths[0] : new Date().getMonth() + 1
          const weatherDate = new Date(Date.UTC(new Date().getUTCFullYear(), weatherMonth - 1, 15)).toISOString().split('T')[0]
          data.weather = await this.weatherProvider.getWeather(dest.destinationName, weatherDate)

          // Real currency data — convert to the destination's actual local currency,
          // not a hardcoded EUR (previously wrong for every non-Eurozone destination)
          const destCountryCode = dest.destinationType === 'country'
            ? dest.destinationId
            : this.inferCountryFromCity(dest.destinationName)
          const destCurrency = this.currencyProvider.getCurrencyForCountry(destCountryCode)
          data.currency = await this.currencyProvider.getExchangeRate('USD', destCurrency)

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
   * Validate and repair analysis with full metadata tracking
   * Handles validation, OpenAI repair attempt, and deterministic fallback
   */
  private async validateAndRepairAnalysis(
    analysis: TravelAnalysisResponse,
    request: AnalysisRequest,
    routeCandidatePool: RouteCandidate[],
    analysisContext: string
  ): Promise<TravelAnalysisResponse> {
    // Validate final recommendations before caching
    const finalValidation = this.validateFinalRecommendations(analysis, request, routeCandidatePool)
    const validationIssuesBeforeRepair = [...finalValidation.validationIssues]
    
    // Initialize repair metadata
    let repairAttempted = false
    let repairPassed = false
    let repairFailedReason: string | null = null
    let repairDurationMs = 0
    let repairTokens: { prompt: number; completion: number; total: number } | null = null
    let replacementsApplied: string[] = []
    
    if (!finalValidation.valid) {
      // Attempt OpenAI repair before falling back to deterministic replacement
      repairAttempted = true
      const repairResult = await this.repairInvalidOpenAIAnalysis(
        analysis,
        finalValidation.validationIssues,
        request,
        routeCandidatePool,
        analysisContext
      )
      
      repairDurationMs = repairResult.repairDurationMs
      repairTokens = repairResult.repairTokens
      
      if (repairResult.success && repairResult.repairedAnalysis) {
        // Validate repaired result
        const repairedValidation = this.validateFinalRecommendations(
          repairResult.repairedAnalysis,
          request,
          routeCandidatePool
        )
        
        if (repairedValidation.valid) {
          // Repair succeeded
          analysis = repairResult.repairedAnalysis
          repairPassed = true
          ;(analysis as any).analysisSource = 'openai_repaired'
          ;(analysis as any).deterministicFallbackUsed = false
          ;(analysis as any).candidatePoolUsedAsReplacement = false
          
          logger.info('OpenAI repair succeeded', {
            validationIssuesBeforeRepair,
            validationIssuesAfterRepair: repairedValidation.validationIssues,
            repairDurationMs,
            repairTokensUsed: repairTokens?.total,
          })
        } else {
          // Repair failed validation - use deterministic fallback
          repairFailedReason = 'repair_still_invalid'
          const fallbackCountriesBefore = analysis.rankedDestinations.map(d => d.destinationName)
          analysis = this.applyDeterministicFallback(analysis, finalValidation.invalidDestinations, routeCandidatePool)
          const fallbackCountriesAfter = analysis.rankedDestinations.map(d => d.destinationName)
          replacementsApplied = fallbackCountriesBefore
            .map((before, i) => before !== fallbackCountriesAfter[i] ? `${before} → ${fallbackCountriesAfter[i]}` : null)
            .filter(Boolean) as string[]
          
          ;(analysis as any).analysisSource = 'fallback_deterministic'
          ;(analysis as any).deterministicFallbackUsed = true
          ;(analysis as any).candidatePoolUsedAsReplacement = true
          ;(analysis as any).replacementReason = 'repair_failed_validation'
          
          logger.warn('OpenAI repair failed validation, using deterministic fallback', {
            repairValidationIssues: repairedValidation.validationIssues,
            replacementsApplied,
          })
        }
      } else {
        // Repair call failed - use deterministic fallback
        repairFailedReason = 'repair_call_failed'
        const fallbackCountriesBefore = analysis.rankedDestinations.map(d => d.destinationName)
        analysis = this.applyDeterministicFallback(analysis, finalValidation.invalidDestinations, routeCandidatePool)
        const fallbackCountriesAfter = analysis.rankedDestinations.map(d => d.destinationName)
        replacementsApplied = fallbackCountriesBefore
          .map((before, i) => before !== fallbackCountriesAfter[i] ? `${before} → ${fallbackCountriesAfter[i]}` : null)
          .filter(Boolean) as string[]
        
        ;(analysis as any).analysisSource = 'fallback_deterministic'
        ;(analysis as any).deterministicFallbackUsed = true
        ;(analysis as any).candidatePoolUsedAsReplacement = true
        ;(analysis as any).replacementReason = 'repair_call_failed'
        
        logger.warn('OpenAI repair call failed, using deterministic fallback', {
          replacementsApplied,
        })
      }
    } else {
      // Validation passed - no repair needed
      ;(analysis as any).analysisSource = 'openai_primary'
      ;(analysis as any).deterministicFallbackUsed = false
      ;(analysis as any).candidatePoolUsedAsReplacement = false
    }
    
    // Set common metadata
    ;(analysis as any).finalScopeValidationPassed = finalValidation.valid || repairPassed
    ;(analysis as any).invalidDestinations = finalValidation.invalidDestinations
    ;(analysis as any).replacementsApplied = replacementsApplied
    ;(analysis as any).openAIPrimaryUsed = true
    ;(analysis as any).candidatePoolUsedAsContext = routeCandidatePool.length > 0
    ;(analysis as any).openAIRepairUsed = repairPassed
    ;(analysis as any).repairAttempted = repairAttempted
    ;(analysis as any).repairPassed = repairPassed
    ;(analysis as any).repairFailedReason = repairFailedReason
    ;(analysis as any).repairDurationMs = repairDurationMs
    ;(analysis as any).repairPromptTokens = repairTokens?.prompt ?? null
    ;(analysis as any).repairCompletionTokens = repairTokens?.completion ?? null
    ;(analysis as any).repairTotalTokens = repairTokens?.total ?? null
    ;(analysis as any).validationIssuesBeforeRepair = validationIssuesBeforeRepair
    ;(analysis as any).validationIssuesAfterRepair = repairPassed ? [] : validationIssuesBeforeRepair
    
    logger.info('Final recommendation validation and repair flow', {
      initialValidationPassed: finalValidation.valid,
      repairAttempted,
      repairPassed,
      repairFailedReason,
      analysisSource: (analysis as any).analysisSource,
      invalidDestinations: finalValidation.invalidDestinations,
      replacementsApplied,
      finalCountries: analysis.rankedDestinations.map(d => d.destinationName),
    })
    
    // Mark for potential caching later
    if ((analysis as any).analysisSource === 'fallback_deterministic') {
      ;(analysis as any).cacheSkippedReason = 'deterministic_fallback'
      logger.info('Travel Analysis Cache: Will skip (deterministic fallback)', {
        reason: 'deterministic_fallback',
        invalidDestinations: finalValidation.invalidDestinations,
        replacementsApplied,
      })
    }
    
    return analysis
  }

  /**
   * Repair invalid OpenAI analysis by calling OpenAI again with validation issues
   */
  private async repairInvalidOpenAIAnalysis(
    originalAnalysis: TravelAnalysisResponse,
    validationIssues: string[],
    request: AnalysisRequest,
    routeCandidatePool: RouteCandidate[],
    analysisContext: string
  ): Promise<{
    success: boolean
    repairedAnalysis: TravelAnalysisResponse | null
    repairDurationMs: number
    repairTokens: { prompt: number; completion: number; total: number } | null
  }> {
    try {
      if (!this.openai) {
        return { success: false, repairedAnalysis: null, repairDurationMs: 0, repairTokens: null }
      }

      const candidateContext = routeCandidatePool.length > 0
        ? `\n\nCANDIDATE ROUTES (use as strong guidance):\n${routeCandidatePool.map(c => 
            `${c.country}: ${c.routeCities.join(' → ')} (${c.priceTier}, ${c.routeType}, ${c.bestMonths.join(', ')})`
          ).join('\n')}`
        : ''

      const repairPrompt = `You are repairing a travel consultant analysis that failed validation.

ORIGINAL VALIDATION ISSUES:
${validationIssues.map(issue => `- ${issue}`).join('\n')}

CONSTRAINTS TO FIX:
- For ${request.tripLength || 7}-day ${request.budget || 'moderate'} trips from ${request.departureCity || 'departure city'}, avoid long-haul destinations unless explicitly requested
- Trip structure is ${request.tripStructure || 'flexible'} - route type must match
- Each recommendation needs route cities (suggestedRoute with 2+ cities), not just country names
- Include realistic watch-outs and before-booking checks
- Choose destinations mostly from candidate context if provided
- Stay within candidate pool unless you can clearly justify why an alternative is better${candidateContext}

KEEP:
- Your consultant reasoning style
- Honest limitations and assumptions
- Realistic scores and notes
- Route-first thinking

FIX ONLY:
- Replace invalid destinations with valid alternatives from candidate context
- Ensure route shape matches trip structure (${request.tripStructure})
- Add missing required fields (suggestedRoute, recommendedNights, transportLogic)
- Keep recommendations realistic and consultant-grade

Return the same structured schema with fixes applied.`

      const systemPrompt = getCompactSystemInstructions()
      
      logger.info('OpenAI repair request started', {
        model: this.model,
        validationIssues: validationIssues.length,
        candidatePoolSize: routeCandidatePool.length,
        tripStructure: request.tripStructure,
        tripLength: request.tripLength,
        budget: request.budget,
      })

      const repairStartTime = Date.now()
      const completion = await withResilience(
        'gpt4-repair',
        async () => {
          return await this.openai!.beta.chat.completions.parse({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: `${repairPrompt}\n\n${analysisContext}`,
              },
            ],
            response_format: zodResponseFormat(compactAnalysisResponseSchema, 'travel_analysis'),
            temperature: 0.3,
            max_completion_tokens: 3500,
          })
        },
        { ...ProviderConfigs.OPENAI, timeout: 20000 } // 20s timeout for repair
      )

      const repairDurationMs = Date.now() - repairStartTime
      logger.info('OpenAI repair completed', {
        duration: repairDurationMs,
        tokensUsed: completion.usage?.total_tokens,
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
      })

      const parsed = completion.choices[0].message.parsed as CompactAnalysisResponse
      if (!parsed) {
        return { success: false, repairedAnalysis: null, repairDurationMs, repairTokens: null }
      }

      // Track repair cost
      costTracker.trackOpenAI('gpt-4o', completion.usage?.total_tokens)

      // Adapt to full schema
      const repairedResponse: TravelAnalysisResponse = {
        ...parsed,
        userConstraints: {
          budget: request.budget || 'moderate',
          travelMonths: request.travelMonths || null,
          interests: request.interests || null,
          travelStyle: request.travelStyle || null,
          pace: request.pace || null,
        },
        rankedDestinations: parsed.rankedDestinations.map(d => ({
          ...d,
          categoryScores: {
            budgetFit: 8,
            weatherFit: 8,
            passportEase: 8,
            nightlife: 7,
            nature: 7,
            transport: 8,
            hotelValue: 8,
            safety: 9,
            flightValue: null,
          },
          passportEase: 'easy',
          nightlifeLevel: 7,
          natureLevel: 7,
          transportLevel: 8,
          hotelValueLevel: 8,
          safetyLevel: 9,
          confidence: 0.85,
          sourceLabels: ['openai-repaired'],
          dataQuality: 'estimated',
          seasonality: d.seasonality
            ? { ...d.seasonality, shoulderSeason: null, lowSeason: null, whenToAvoid: null }
            : null,
          routeRealismScore: null,
          travelFatigueLevel: null,
          routeAlternatives: null,
          itineraryMapPlan: null,
          travelStrategyTips: null,
        })),
        scoreBreakdown: 'Scores based on budget fit, weather, transport, and safety',
        reasons: parsed.rankedDestinations.flatMap(d => d.whyRecommended).slice(0, 5),
        dataFreshness: {
          knowledgeBase: 'structured-knowledge',
          providerData: 'live-providers',
          lastUpdated: new Date().toISOString(),
        },
        sourcesUsed: ['openai-gpt4o', 'knowledge-base', 'compact-schema'],
        recommendedRoutes: null,
        nextBestAlternatives: null,
        personalization: null,
        seasonMonthStrategy: null,
      }

      return {
        success: true,
        repairedAnalysis: repairedResponse,
        repairDurationMs,
        repairTokens: {
          prompt: completion.usage?.prompt_tokens || 0,
          completion: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        },
      }
    } catch (error) {
      logger.error('OpenAI repair failed', error)
      return { success: false, repairedAnalysis: null, repairDurationMs: 0, repairTokens: null }
    }
  }

  /**
   * Validate final recommendations
   */
  private validateFinalRecommendations(
    analysis: TravelAnalysisResponse,
    request: AnalysisRequest,
    routeCandidatePool: RouteCandidate[]
  ): {
    valid: boolean
    invalidDestinations: string[]
    validationIssues: string[]
  } {
    const invalidDestinations: string[] = []
    const validationIssues: string[] = []

    // If no candidate pool, skip validation
    if (routeCandidatePool.length === 0) {
      return { valid: true, invalidDestinations: [], validationIssues: [] }
    }

    const candidateCountries = new Set(routeCandidatePool.map(c => c.country))
    const rankedDests = analysis.rankedDestinations || []
    const isShortModerateTrip = (request.tripLength || 0) <= 7 && 
      (request.budget === 'low' || request.budget === 'moderate')

    // Check each destination
    for (const dest of rankedDests) {
      const destCountry = dest.destinationName

      // Check if destination is outside candidate pool
      const isOutsidePool = !candidateCountries.has(destCountry)
      const isExplicitlyRequested = request.destination?.includes(destCountry) || 
        request.query?.toLowerCase().includes(destCountry.toLowerCase())

      if (isOutsidePool && !isExplicitlyRequested) {
        // Check if it's a long-haul destination for short moderate trip
        const isLongHaul = this.isLongHaulDestination(destCountry, request.departureCity || '')
        
        if (isShortModerateTrip && isLongHaul) {
          invalidDestinations.push(destCountry)
          validationIssues.push(`${destCountry} is a long-haul destination outside candidate pool for ${request.tripLength}-day ${request.budget} trip from ${request.departureCity}`)
        }
      }
    }

    // Check route type mismatch
    if (request.tripStructure === 'single_country_multi_city') {
      for (const dest of rankedDests) {
        if (!dest.suggestedRoute || dest.suggestedRoute.length < 2) {
          validationIssues.push(`${dest.destinationName} missing multi-city route (trip structure requires multi-city with 2+ cities)`)
        }
      }
    }

    return {
      valid: invalidDestinations.length === 0 && validationIssues.length === 0,
      invalidDestinations,
      validationIssues
    }
  }

  /**
   * Apply deterministic fallback replacement (last resort only after repair fails)
   */
  private applyDeterministicFallback(
    analysis: TravelAnalysisResponse,
    invalidDestinations: string[],
    routeCandidatePool: RouteCandidate[]
  ): TravelAnalysisResponse {
    const fallbackAnalysis = { ...analysis }
    const rankedDests = [...fallbackAnalysis.rankedDestinations]

    for (let i = 0; i < rankedDests.length; i++) {
      const dest = rankedDests[i]
      if (invalidDestinations.includes(dest.destinationName)) {
        // Find replacement from candidate pool
        const replacement = routeCandidatePool.find(c => 
          !rankedDests.some(d => d.destinationName === c.country)
        )
        
        if (replacement) {
          rankedDests[i] = {
            ...dest,
            destinationName: replacement.country,
            destinationSummary: `${replacement.country}: ${replacement.whyCandidateFits}`,
            suggestedRoute: replacement.routeCities,
            whyRecommended: [replacement.whyCandidateFits, replacement.routeLogic],
            bestMonths: replacement.bestMonths,
            estimatedBudgetLevel: replacement.priceTier === 'budget' ? 'low' : 
              replacement.priceTier === 'premium' ? 'high' : 'moderate',
            realisticConsultantNotes: 'Conservative route-based fallback recommendation',
          }
        }
      }
    }

    fallbackAnalysis.rankedDestinations = rankedDests
    return fallbackAnalysis
  }

  /**
   * Validate cached result against current request and candidate pool
   */
  private validateCachedResult(
    cached: TravelAnalysisResponse,
    request: AnalysisRequest,
    routeCandidatePool: RouteCandidate[]
  ): { valid: boolean; reason?: string } {
    // Check if cached result has required version metadata
    const cachedVersion = (cached as any).cacheVersion
    if (cachedVersion !== ANALYSIS_CACHE_VERSION) {
      return { valid: false, reason: 'cache_version_mismatch' }
    }

    // If we have a candidate pool, validate destinations are within scope
    if (routeCandidatePool.length > 0) {
      const candidateCountries = new Set(routeCandidatePool.map(c => c.country))
      const rankedDests = cached.rankedDestinations || []
      
      for (const dest of rankedDests) {
        const destCountry = dest.destinationName
        // Check if destination is outside candidate pool
        if (!candidateCountries.has(destCountry) && !request.destination?.includes(destCountry)) {
          // Check if this is a long-haul destination for short moderate trip
          const isShortModerateTrip = (request.tripLength || 0) <= 7 && 
            (request.budget === 'low' || request.budget === 'moderate')
          const isLongHaul = this.isLongHaulDestination(destCountry, request.departureCity || '')
          
          if (isShortModerateTrip && isLongHaul) {
            return { 
              valid: false, 
              reason: `out_of_scope_destination: ${destCountry} not in candidate pool for short moderate trip` 
            }
          }
        }
      }
    }

    // Check if quality gate failed
    const qualityGatePassed = (cached as any).qualityGatePassed
    if (qualityGatePassed === false) {
      return { valid: false, reason: 'quality_gate_failed' }
    }

    // Check if route type matches trip structure
    const routeType = (cached as any).routeType
    if (request.tripStructure === 'single_country_multi_city' && routeType === 'single-destination') {
      return { valid: false, reason: 'route_type_mismatch' }
    }

    return { valid: true }
  }

  /**
   * Check if destination is long-haul from departure city
   */
  private isLongHaulDestination(destination: string, departureCity: string): boolean {
    const longHaulDestinations = ['Japan', 'China', 'Thailand', 'Vietnam', 'Indonesia', 'Malaysia', 
      'Singapore', 'South Korea', 'Philippines', 'Australia', 'New Zealand', 'USA', 'Canada', 
      'Mexico', 'Brazil', 'Argentina', 'Chile', 'South Africa', 'Kenya', 'Tanzania']
    
    // For European/Middle Eastern departure cities, Asia/Americas/Oceania are long-haul
    const europeanMidEastCities = ['Tel Aviv', 'TLV', 'London', 'Paris', 'Berlin', 'Rome', 
      'Madrid', 'Amsterdam', 'Vienna', 'Prague', 'Budapest', 'Athens', 'Istanbul', 'Dubai']
    
    const isDepartureEuropeOrMidEast = europeanMidEastCities.some(city => 
      departureCity.includes(city) || city.includes(departureCity)
    )
    
    if (isDepartureEuropeOrMidEast) {
      return longHaulDestinations.includes(destination)
    }
    
    return false
  }

  /**
   * Build cache key for analysis results
   */
  private buildCacheKey(request: AnalysisRequest, topDestinations: any[], routeCandidatePool?: RouteCandidate[]): string {
    const destIds = topDestinations.map(d => d.destinationId).slice(0, 5).join(',')
    
    // Include route candidate pool in cache key
    const routeCandidateCount = routeCandidatePool?.length || 0
    const candidateCountries = routeCandidatePool ? [...new Set(routeCandidatePool.map(c => c.country))].sort().join(',') : 'none'
    const candidateSignatures = routeCandidatePool ? routeCandidatePool.map(c => `${c.country}-${c.routeType}`).sort().join(',') : 'none'
    
    const key = [
      ANALYSIS_CACHE_VERSION,
      request.query,
      request.destination || 'any',
      request.departureCity || 'any',
      request.passportCountry || 'any',
      request.budget || 'any',
      request.tripLength || 'any',
      request.tripStructure || 'any',
      request.season || 'any',
      (request.travelMonths || []).sort().join(','),
      (request.interests || []).sort().join(','),
      request.travelStyle || 'any',
      request.pace || 'any',
      request.accommodationPreference || 'any',
      destIds || 'none',
      routeCandidateCount.toString(),
      candidateCountries,
      candidateSignatures,
      // Fresh analysis controls
      request.diversityMode || 'none',
      (request.excludeCountries || []).sort().join(','),
      request.freshRunId || 'none'
    ].join(':')
    
    // Hash to keep key length reasonable
    const cacheKey = Buffer.from(key).toString('base64').substring(0, 100)
    
    logger.info('Travel Analysis Cache Key Built', {
      cacheVersion: ANALYSIS_CACHE_VERSION,
      tripStructure: request.tripStructure,
      interests: request.interests?.length || 0,
      travelMonths: request.travelMonths?.length || 0,
      fixedDestination: request.destination || 'none',
      candidateCount: topDestinations.length,
      routeCandidateCount,
      candidateCountries: candidateCountries === 'none' ? 'none' : candidateCountries.split(',').length,
    })
    
    return cacheKey
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
