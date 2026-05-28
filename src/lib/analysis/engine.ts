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

// Analysis cache version - increment to invalidate all cached results after algorithm changes
const ANALYSIS_CACHE_VERSION = 'consultant-v7-openai-primary-2026-05-28'
import { withResilience, ProviderConfigs } from '../providers/provider-resilience'
import { getLearningContextForAnalysis, recordRecommendationEvent } from '../learning/learning-service'
import { compactAnalysisResponseSchema, CompactAnalysisResponse } from './compact-schema'
import { buildCompactTravelAnalysisPrompt, getCompactSystemInstructions, TravelDataContext } from './compact-prompt'
import { buildRouteCandidatePool, filterCandidatesByRequest, RouteCandidate } from './route-candidate-pool'
import { getAttractionsForRoute, getWeatherForRoute } from '../travel-data/travel-data-loader'

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
        logger.warn('Failed to load learning context, continuing without it', error)
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
      if (scoredDestinations.length === 0) {
        logger.info('Knowledge retrieval returned 0, building route candidate pool')
        const allCandidates = buildRouteCandidatePool(request)
        routeCandidatePool = filterCandidatesByRequest(allCandidates, request)
        
        logger.info('Route candidate pool built', {
          routeCandidatePoolBuilt: true,
          routeCandidateCount: routeCandidatePool.length,
          candidateRegions: [...new Set(routeCandidatePool.map(c => c.region))],
          candidateCountries: [...new Set(routeCandidatePool.map(c => c.country))],
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
      let routeAnalysisDestinations = scoredDestinations.slice(0, 10).map(dest => ({
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
      }))

      // If knowledge retrieval returned 0 but we have route candidates, use them
      if (routeAnalysisDestinations.length === 0 && routeCandidatePool.length > 0) {
        routeAnalysisDestinations = routeCandidatePool.map(candidate => ({
          destinationId: candidate.id,
          destinationName: candidate.country,
          destinationType: 'country' as const,
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
          suggestedRoute: candidate.routeCities,
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
        routeAnalysis
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

            // Track OpenAI cost
            costTracker.trackOpenAI('gpt-4o', completion.usage?.total_tokens)

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
              
              // Cache only if valid (openai_primary or openai_repaired)
              const canCache = ((analysis as any).analysisSource === 'openai_primary' || (analysis as any).analysisSource === 'openai_repaired') &&
                (analysis as any).cacheEligible && (analysis as any).openAIUsed && !(analysis as any).fallbackUsed
              
              if (canCache) {
                await cacheManager.set(cacheKey, analysis, CachePresets.OPENAI_ANALYSIS)
                ;(analysis as any).cachedResultType = (analysis as any).analysisSource === 'openai_repaired' ? 'openai_repaired' : 'openai'
                logger.info('Travel Analysis Cache: SET (after rejection)', {
                  cachedResultType: (analysis as any).cachedResultType,
                  analysisSource: (analysis as any).analysisSource,
                  openAIUsed: true,
                  fallbackUsed: false,
                  cacheStatus: 'SET',
                })
              } else if ((analysis as any).analysisSource === 'fallback_deterministic') {
                ;(analysis as any).cacheSkippedReason = 'deterministic_fallback'
                logger.info('Travel Analysis Cache: SKIPPED_FALLBACK', {
                  reason: 'deterministic_fallback',
                  invalidDestinations: finalValidation.invalidDestinations,
                  replacementsApplied,
                })
              }
            }
          } else {
            // Fetch fresh
            analysis = await fetchFresh()
            ;(analysis as any).cacheStatus = 'MISS'
            
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
            
            // Cache only if valid (openai_primary or openai_repaired)
            const canCache = ((analysis as any).analysisSource === 'openai_primary' || (analysis as any).analysisSource === 'openai_repaired') &&
              (analysis as any).cacheEligible && (analysis as any).openAIUsed && !(analysis as any).fallbackUsed
            
            if (canCache) {
              await cacheManager.set(cacheKey, analysis, CachePresets.OPENAI_ANALYSIS)
              ;(analysis as any).cacheStatus = 'SET'
              ;(analysis as any).cachedResultType = (analysis as any).analysisSource === 'openai_repaired' ? 'openai_repaired' : 'openai'
              logger.info('Travel Analysis Cache: SET', {
                cachedResultType: (analysis as any).cachedResultType,
                analysisSource: (analysis as any).analysisSource,
                openAIUsed: true,
                fallbackUsed: false,
                cacheStatus: 'SET',
              })
            } else if ((analysis as any).analysisSource === 'fallback_deterministic') {
              ;(analysis as any).cacheSkippedReason = 'deterministic_fallback'
              ;(analysis as any).cachedResultType = null
              logger.info('Travel Analysis Cache: SKIPPED_FALLBACK', {
                reason: 'deterministic_fallback',
                invalidDestinations: finalValidation.invalidDestinations,
                replacementsApplied,
              })
            } else {
              ;(analysis as any).cachedResultType = null
              logger.info('Travel Analysis Cache: SKIPPED (not eligible)', {
                openAIUsed: (analysis as any).openAIUsed,
                fallbackUsed: (analysis as any).fallbackUsed,
                cacheEligible: (analysis as any).cacheEligible,
                cacheStatus: 'MISS',
              })
            }
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
        const fallbackAnalysis = this.generateFallbackRecommendations(
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

      // Step 9: Optional Claude verification for accuracy (non-blocking)
      let claudeVerifierUsed = false
      let claudeVerifierPassed = false
      let claudeVerificationSuccessCount = 0
      let claudeModelUsed: string | null = null
      let claudeVerifierError: string | null = null
      try {
        const { getClaudeVerifier } = await import('../services/claude-verifier')
        const claudeVerifier = getClaudeVerifier()
        
        if (claudeVerifier.isAvailable()) {
          claudeModelUsed = claudeVerifier.getModel()
          logger.info('Running Claude accuracy verification on recommendations', {
            model: claudeModelUsed,
          })
          claudeVerifierUsed = true
          
          // Verify each recommendation in parallel with error handling
          const verificationPromises = analysis.rankedDestinations.map(async (dest) => {
            try {
              const verification = await claudeVerifier.verifyRecommendation(
                dest,
                request.travelMonths?.length || 7,
                request.tripStructure || 'single_country_one_city'
              )
              // Only count as success if verification returned a valid result (not null)
              if (verification !== null) {
                claudeVerificationSuccessCount++
              }
              return claudeVerifier.applyVerification(dest, verification)
            } catch (err) {
              logger.warn('Claude verification failed for destination', {
                destination: dest.destinationName,
                error: err instanceof Error ? err.message : String(err),
              })
              return dest // Return original if verification fails
            }
          })
          
          const verifiedDestinations = await Promise.all(verificationPromises)
          analysis.rankedDestinations = verifiedDestinations
          
          if (claudeVerificationSuccessCount > 0) {
            claudeVerifierPassed = true
            logger.info('Claude verification completed', {
              successCount: claudeVerificationSuccessCount,
              totalCount: analysis.rankedDestinations.length,
              model: claudeModelUsed,
            })
          } else {
            claudeVerifierError = 'all_verifications_failed'
            logger.warn('Claude verification failed for all recommendations - continuing with unverified', {
              model: claudeModelUsed,
              error: claudeVerifierError,
            })
          }
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
        personalized: analysis.personalization.isPersonalized,
        personalizationConfidence: analysis.personalization.confidence,
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
        logger.warn('Failed to record learning event, continuing', learningError)
      }

      // Step 11: Score consultant quality and add complete metadata
      try {
        const { scoreConsultantQuality } = await import('./consultant-quality-score')
        const qualityScore = scoreConsultantQuality(analysis, {
          query: request.query,
          budget: request.budget,
          travel_months: request.travelMonths,
          interests: request.interests,
          tripStructure: request.tripStructure,
          tripLength: request.tripLength,
          departureCity: request.departureCity,
        })

        // Calculate total duration
        const durationMs = Date.now() - analysisStartTime

        // Add complete analysis metadata
        const analysisWithMeta = analysis as any
        const isCacheHit = analysisWithMeta.cacheStatus === 'HIT'
        const isCacheRejected = analysisWithMeta.cacheStatus === 'REJECTED'
        
        analysisWithMeta._meta = {
          analysisId: `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          // For cache hits, openAIUsed refers to whether OpenAI was used to create the cached result
          openAIUsed: analysisWithMeta.openAIUsed || false,
          // currentRequestOpenAIUsed indicates if OpenAI was called in THIS request
          currentRequestOpenAIUsed: isCacheHit ? false : (analysisWithMeta.openAIUsed || false),
          fallbackUsed: analysisWithMeta.fallbackUsed || false,
          fallbackReason: analysisWithMeta.fallbackReason || null,
          modelUsed: analysisWithMeta.openAIUsed ? this.model : null,
          durationMs,
          // For cache hits, openAIDurationMs should be null for current request
          openAIDurationMs: isCacheHit ? null : (analysisWithMeta.openAIDurationMs ?? null),
          // Store original cached duration if available
          cachedOpenAIDurationMs: isCacheHit ? (analysisWithMeta.openAIDurationMs ?? null) : null,
          cacheStatus: analysisWithMeta.cacheStatus || 'UNKNOWN',
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
          recommendedRouteType: routeAnalysis.recommendedRoute.routeType,
          diversityScore: diversityResult.diversityScore,
          regionSpread: diversityResult.regionSpread,
          mainstreamCount: diversityResult.mainstreamCount,
          uniqueOptionIncluded: diversityResult.uniqueOptionIncluded,
          claudeVerifierUsed,
          claudeVerifierPassed,
          claudeVerificationSuccessCount,
          claudeModelUsed,
          claudeVerifierError,
          consultantQualityScore: qualityScore.totalScore,
          consultantQualityGrade: qualityScore.totalScore >= 90 ? 'Excellent' : qualityScore.totalScore >= 80 ? 'Good' : qualityScore.totalScore >= 70 ? 'Acceptable' : 'Needs Improvement',
          consultantQualityIssues: qualityScore.issues,
          consultantQualityRecommendations: qualityScore.recommendations,
          genericPhraseCount: qualityScore.genericPhrases.length,
          genericPhrases: qualityScore.genericPhrases,
          routeCompletenessScore: (analysis.rankedDestinations.filter((d: any) => d.suggestedRoute && d.suggestedRoute.length > 1).length / Math.max(1, analysis.rankedDestinations.length)) * 100,
          scoreHonestyPassed: qualityResult.passed,
          finalScopeValidationPassed: analysisWithMeta.finalScopeValidationPassed ?? true,
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
          travelDataAttractionsUsed: analysisWithMeta.travelDataAttractionsUsed ?? 0,
          travelDataWeatherRecordsUsed: analysisWithMeta.travelDataWeatherRecordsUsed ?? 0,
          travelDataSourceTypes: [...new Set(routeCandidatePool.map(r => r.sourceType).filter(Boolean))],
          travelDataConfidenceLevels: [...new Set(routeCandidatePool.map(r => r.confidenceLevel).filter(Boolean))],
          travelDataFallbackUsed: routeCandidatePool.length > 0 && !routeCandidatePool.some(r => r.sourceType === 'curated_route_knowledge'),
        }

        // Log comprehensive final metadata
        const source = analysisWithMeta.openAIUsed ? 'openai' : analysisWithMeta.fallbackUsed ? 'fallback' : analysisWithMeta.cacheStatus === 'HIT' ? 'cache' : 'unknown'
        logger.info('Travel Analysis Final Metadata', {
          analysisId: analysisWithMeta._meta.analysisId,
          source,
          openAIUsed: analysisWithMeta._meta.openAIUsed,
          currentRequestOpenAIUsed: analysisWithMeta._meta.currentRequestOpenAIUsed,
          fallbackUsed: analysisWithMeta._meta.fallbackUsed,
          fallbackReason: analysisWithMeta._meta.fallbackReason,
          modelUsed: analysisWithMeta._meta.modelUsed,
          durationMs: analysisWithMeta._meta.durationMs,
          openAIDurationMs: analysisWithMeta._meta.openAIDurationMs,
          cachedOpenAIDurationMs: analysisWithMeta._meta.cachedOpenAIDurationMs,
          systemPromptLength: analysisWithMeta._meta.systemPromptLength,
          promptTokens: analysisWithMeta._meta.promptTokens,
          completionTokens: analysisWithMeta._meta.completionTokens,
          totalTokens: analysisWithMeta._meta.totalTokens,
          cacheStatus: analysisWithMeta._meta.cacheStatus,
          cacheRejectionReason: analysisWithMeta._meta.cacheRejectionReason,
          cachedResultType: analysisWithMeta._meta.cachedResultType,
          cacheSkippedReason: analysisWithMeta._meta.cacheSkippedReason,
          finalScopeValidationPassed: analysisWithMeta._meta.finalScopeValidationPassed,
          invalidDestinations: analysisWithMeta._meta.invalidDestinations,
          replacementsApplied: analysisWithMeta._meta.replacementsApplied,
          consultantQualityScore: analysisWithMeta._meta.consultantQualityScore,
          consultantQualityGrade: analysisWithMeta._meta.consultantQualityGrade,
          genericPhraseCount: analysisWithMeta._meta.genericPhraseCount,
          regionSpread: analysisWithMeta._meta.regionSpread,
          uniqueOptionIncluded: analysisWithMeta._meta.uniqueOptionIncluded,
          candidatePoolUsed: analysisWithMeta._meta.candidatePoolUsed,
          candidatePoolCount: analysisWithMeta._meta.candidatePoolCount,
          routeIntelligenceDestinationCount: analysisWithMeta._meta.routeIntelligenceDestinationCount,
          recommendedRouteType: analysisWithMeta._meta.recommendedRouteType,
          analysisSource: analysisWithMeta._meta.analysisSource,
          openAIPrimaryUsed: analysisWithMeta._meta.openAIPrimaryUsed,
          openAIRepairUsed: analysisWithMeta._meta.openAIRepairUsed,
          repairAttempted: analysisWithMeta._meta.repairAttempted,
          repairPassed: analysisWithMeta._meta.repairPassed,
          repairFailedReason: analysisWithMeta._meta.repairFailedReason,
          repairDurationMs: analysisWithMeta._meta.repairDurationMs,
          repairTotalTokens: analysisWithMeta._meta.repairTotalTokens,
          validationIssuesBeforeRepair: analysisWithMeta._meta.validationIssuesBeforeRepair,
          validationIssuesAfterRepair: analysisWithMeta._meta.validationIssuesAfterRepair,
          deterministicFallbackUsed: analysisWithMeta._meta.deterministicFallbackUsed,
          candidatePoolUsedAsContext: analysisWithMeta._meta.candidatePoolUsedAsContext,
          candidatePoolUsedAsReplacement: analysisWithMeta._meta.candidatePoolUsedAsReplacement,
          replacementReason: analysisWithMeta._meta.replacementReason,
          travelDataUsed: analysisWithMeta._meta.travelDataUsed,
          travelDataRoutesLoaded: analysisWithMeta._meta.travelDataRoutesLoaded,
          travelDataCandidateRoutesUsed: analysisWithMeta._meta.travelDataCandidateRoutesUsed,
          travelDataAttractionsUsed: analysisWithMeta._meta.travelDataAttractionsUsed,
          travelDataWeatherRecordsUsed: analysisWithMeta._meta.travelDataWeatherRecordsUsed,
          travelDataSourceTypes: analysisWithMeta._meta.travelDataSourceTypes,
          travelDataConfidenceLevels: analysisWithMeta._meta.travelDataConfidenceLevels,
          travelDataFallbackUsed: analysisWithMeta._meta.travelDataFallbackUsed,
          finalCountries: analysis.rankedDestinations.map((d: any) => d.destinationName),
          finalRoutes: analysis.rankedDestinations.map((d: any) => d.suggestedRoute?.join(' → ') || d.destinationName),
        })
      } catch (qualityError) {
        logger.warn('Failed to score consultant quality, continuing', qualityError)
      }

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
    routeAnalysis?: any
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
        })),
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
  private generateFallbackRecommendations(
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
        travelStyle: request.travelStyle,
        pace: request.pace,
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
      whenToAvoid: isPeak ? `Avoid ${this.getMonthName(month)} if you dislike crowds and high prices` : undefined,
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
    const daysPerCity = route.cities.map((city: string, idx: number) => {
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
