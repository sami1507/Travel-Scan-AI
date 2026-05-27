// UI normalization layer for analysis responses
// Ensures frontend components never crash on null/undefined fields

import type { TravelAnalysisResponse, RankedDestination } from './schemas'

/**
 * Normalize analysis response for safe UI rendering
 * Handles both full and compact analysis responses
 */
export function normalizeAnalysisForUI(analysis: TravelAnalysisResponse | null | undefined): TravelAnalysisResponse {
  if (!analysis) {
    return createEmptyAnalysis()
  }

  // Safely extract _meta if it exists
  const rawMeta = (analysis as any)._meta
  const normalizedMeta = normalizeMeta(rawMeta)

  const normalized = {
    ...analysis,
    // Ensure arrays are never null/undefined
    rankedDestinations: normalizeDestinations(analysis.rankedDestinations || []),
    topRecommendations: Array.isArray(analysis.topRecommendations) ? analysis.topRecommendations : [],
    warnings: Array.isArray(analysis.warnings) ? analysis.warnings : [],
    assumptions: Array.isArray(analysis.assumptions) ? analysis.assumptions : [],
    reasons: Array.isArray(analysis.reasons) ? analysis.reasons : [],
    sourcesUsed: Array.isArray(analysis.sourcesUsed) ? analysis.sourcesUsed : [],
    
    // Ensure objects have safe defaults
    userConstraints: analysis.userConstraints || {
      budget: 'moderate',
      travelMonths: null,
      interests: null,
      travelStyle: null,
      pace: null,
    },
    
    dataFreshness: analysis.dataFreshness || {
      knowledgeBase: 'unknown',
      providerData: 'unknown',
      lastUpdated: new Date().toISOString(),
    },
    
    // Handle nullable heavy fields from compact schema
    recommendedRoutes: analysis.recommendedRoutes || null,
    nextBestAlternatives: analysis.nextBestAlternatives || null,
    personalization: analysis.personalization || null,
    seasonMonthStrategy: analysis.seasonMonthStrategy || null,
    
    // Ensure required fields have defaults
    querySummary: typeof analysis.querySummary === 'string' ? analysis.querySummary : 'Analysis summary not available',
    scoreBreakdown: typeof analysis.scoreBreakdown === 'string' ? analysis.scoreBreakdown : 'Score breakdown not available',
    confidence: typeof analysis.confidence === 'number' && isFinite(analysis.confidence) ? analysis.confidence : 0.5,
  }

  // Attach normalized _meta
  ;(normalized as any)._meta = normalizedMeta
  
  // Preserve backend metadata flags for compatibility
  ;(normalized as any).openAIUsed = normalizedMeta.openAIUsed
  ;(normalized as any).fallbackUsed = normalizedMeta.fallbackUsed
  ;(normalized as any).fallbackReason = normalizedMeta.fallbackReason

  return normalized
}

/**
 * Normalize _meta object for safe rendering
 */
function normalizeMeta(meta: any): any {
  if (!meta || typeof meta !== 'object') {
    return {
      analysisId: null,
      openAIUsed: false,
      fallbackUsed: false,
      fallbackReason: null,
      modelUsed: null,
      durationMs: null,
      openAIDurationMs: null,
      systemPromptLength: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      cacheStatus: null,
      cachedResultType: null,
      consultantQualityScore: null,
      genericPhraseCount: null,
      regionSpread: null,
      uniqueOptionIncluded: false,
    }
  }

  return {
    analysisId: meta.analysisId || null,
    openAIUsed: Boolean(meta.openAIUsed),
    fallbackUsed: Boolean(meta.fallbackUsed),
    fallbackReason: meta.fallbackReason || null,
    modelUsed: meta.modelUsed || null,
    durationMs: typeof meta.durationMs === 'number' && isFinite(meta.durationMs) ? meta.durationMs : null,
    openAIDurationMs: typeof meta.openAIDurationMs === 'number' && isFinite(meta.openAIDurationMs) ? meta.openAIDurationMs : null,
    systemPromptLength: typeof meta.systemPromptLength === 'number' && isFinite(meta.systemPromptLength) ? meta.systemPromptLength : null,
    promptTokens: typeof meta.promptTokens === 'number' && isFinite(meta.promptTokens) ? meta.promptTokens : null,
    completionTokens: typeof meta.completionTokens === 'number' && isFinite(meta.completionTokens) ? meta.completionTokens : null,
    totalTokens: typeof meta.totalTokens === 'number' && isFinite(meta.totalTokens) ? meta.totalTokens : null,
    cacheStatus: meta.cacheStatus || null,
    cachedResultType: meta.cachedResultType || null,
    consultantQualityScore: typeof meta.consultantQualityScore === 'number' && isFinite(meta.consultantQualityScore) ? meta.consultantQualityScore : null,
    genericPhraseCount: typeof meta.genericPhraseCount === 'number' && isFinite(meta.genericPhraseCount) ? meta.genericPhraseCount : null,
    regionSpread: typeof meta.regionSpread === 'number' && isFinite(meta.regionSpread) ? meta.regionSpread : null,
    uniqueOptionIncluded: Boolean(meta.uniqueOptionIncluded),
  }
}

/**
 * Normalize individual destination for safe rendering
 */
function normalizeDestination(dest: RankedDestination): RankedDestination {
  if (!dest || typeof dest !== 'object') {
    return createEmptyDestination()
  }

  // Handle suggestedRoute which might be string or array
  let normalizedRoute: string[] = []
  const routeValue = (dest as any).suggestedRoute
  if (Array.isArray(routeValue)) {
    normalizedRoute = routeValue.filter(r => typeof r === 'string')
  } else if (typeof routeValue === 'string') {
    normalizedRoute = routeValue.split(',').map(s => s.trim()).filter(Boolean)
  }

  // Handle bestMonths which must be valid month numbers
  let normalizedMonths: number[] = []
  if (Array.isArray(dest.bestMonths)) {
    normalizedMonths = dest.bestMonths.filter(m => typeof m === 'number' && m >= 1 && m <= 12)
  }

  return {
    ...dest,
    // Ensure arrays are never null/undefined
    whyRecommended: Array.isArray(dest.whyRecommended) ? dest.whyRecommended.filter(r => typeof r === 'string') : [],
    possibleDownsides: Array.isArray(dest.possibleDownsides) ? dest.possibleDownsides.filter(d => typeof d === 'string') : [],
    bestMonths: normalizedMonths,
    sourceLabels: Array.isArray(dest.sourceLabels) ? dest.sourceLabels.filter(l => typeof l === 'string') : [],
    
    // Handle nullable route fields
    suggestedRoute: normalizedRoute,
    recommendedNights: dest.recommendedNights && typeof dest.recommendedNights === 'object' && !Array.isArray(dest.recommendedNights)
      ? dest.recommendedNights 
      : {},
    routeWarnings: Array.isArray(dest.routeWarnings) ? dest.routeWarnings.filter(w => typeof w === 'string') : [],
    
    // Handle nullable text fields from compact schema
    destinationSummary: dest.destinationSummary || null,
    diversityLabel: dest.diversityLabel || null,
    realisticConsultantNotes: dest.realisticConsultantNotes || null,
    transportLogic: dest.transportLogic || null,
    routeAlternatives: dest.routeAlternatives || null,
    
    // Handle nullable heavy fields from compact schema
    itineraryMapPlan: dest.itineraryMapPlan || null,
    travelStrategyTips: dest.travelStrategyTips || null,
    seasonality: dest.seasonality || null,
    
    // Ensure required fields have defaults
    destinationId: dest.destinationId || `dest-${Date.now()}`,
    destinationName: dest.destinationName || 'Unknown Destination',
    destinationType: dest.destinationType || 'country',
    totalMatchScore: typeof dest.totalMatchScore === 'number' ? dest.totalMatchScore : 0,
    estimatedBudgetLevel: dest.estimatedBudgetLevel || 'moderate',
    passportEase: dest.passportEase || 'unknown',
    confidence: typeof dest.confidence === 'number' ? dest.confidence : 0.5,
    dataQuality: dest.dataQuality || 'estimated',
    
    // Ensure category scores exist
    categoryScores: dest.categoryScores || {
      budgetFit: 5,
      weatherFit: 5,
      passportEase: 5,
      nightlife: 5,
      nature: 5,
      transport: 5,
      hotelValue: 5,
      safety: 5,
      flightValue: null,
    },
    
    // Ensure numeric fields have defaults
    nightlifeLevel: typeof dest.nightlifeLevel === 'number' ? dest.nightlifeLevel : 5,
    natureLevel: typeof dest.natureLevel === 'number' ? dest.natureLevel : 5,
    transportLevel: typeof dest.transportLevel === 'number' ? dest.transportLevel : 5,
    hotelValueLevel: typeof dest.hotelValueLevel === 'number' ? dest.hotelValueLevel : 5,
    safetyLevel: typeof dest.safetyLevel === 'number' ? dest.safetyLevel : 5,
    
    // Handle nullable route-specific fields
    tripType: dest.tripType || null,
    routeRealismScore: dest.routeRealismScore || null,
    travelFatigueLevel: dest.travelFatigueLevel || null,
  }
}

/**
 * Normalize array of destinations
 */
function normalizeDestinations(destinations: RankedDestination[]): RankedDestination[] {
  if (!Array.isArray(destinations)) {
    return []
  }
  
  return destinations.map(normalizeDestination)
}

/**
 * Create empty analysis for error states
 */
function createEmptyAnalysis(): TravelAnalysisResponse {
  return {
    querySummary: 'No analysis available',
    userConstraints: {
      budget: 'moderate',
      travelMonths: null,
      interests: null,
      travelStyle: null,
      pace: null,
    },
    topRecommendations: [],
    rankedDestinations: [],
    scoreBreakdown: 'No score breakdown available',
    reasons: [],
    warnings: ['Analysis data is not available'],
    assumptions: [],
    dataFreshness: {
      knowledgeBase: 'unknown',
      providerData: 'unknown',
      lastUpdated: new Date().toISOString(),
    },
    confidence: 0,
    sourcesUsed: [],
    recommendedRoutes: null,
    nextBestAlternatives: null,
    personalization: null,
    seasonMonthStrategy: null,
  }
}

/**
 * Check if analysis has compact schema (heavy fields are null)
 */
export function isCompactAnalysis(analysis: TravelAnalysisResponse): boolean {
  return (
    analysis.seasonMonthStrategy === null &&
    analysis.rankedDestinations.length > 0 &&
    analysis.rankedDestinations[0].itineraryMapPlan === null
  )
}

/**
 * Get display message for missing compact fields
 */
export function getCompactFieldMessage(fieldName: string): string {
  const messages: Record<string, string> = {
    seasonMonthStrategy: 'Detailed month-by-month strategy is not generated in fast mode.',
    itineraryMapPlan: 'Map route details are not available for this result.',
    travelStrategyTips: 'Detailed strategy tips can be generated later.',
  }
  
  return messages[fieldName] || 'This detailed information is not available in fast mode.'
}

/**
 * Create empty destination for error states
 */
function createEmptyDestination(): RankedDestination {
  return {
    destinationId: `dest-${Date.now()}`,
    destinationName: 'Unknown Destination',
    destinationType: 'country',
    destinationSummary: null,
    diversityLabel: null,
    totalMatchScore: 0,
    estimatedBudgetLevel: 'moderate',
    passportEase: 'unknown',
    confidence: 0,
    dataQuality: 'estimated',
    categoryScores: {
      budgetFit: 5,
      weatherFit: 5,
      passportEase: 5,
      nightlife: 5,
      nature: 5,
      transport: 5,
      hotelValue: 5,
      safety: 5,
      flightValue: null,
    },
    nightlifeLevel: 5,
    natureLevel: 5,
    transportLevel: 5,
    hotelValueLevel: 5,
    safetyLevel: 5,
    whyRecommended: [],
    possibleDownsides: [],
    bestMonths: [],
    sourceLabels: [],
    suggestedRoute: [],
    recommendedNights: {},
    routeWarnings: [],
    realisticConsultantNotes: null,
    transportLogic: null,
    routeAlternatives: null,
    itineraryMapPlan: null,
    travelStrategyTips: null,
    seasonality: null,
    tripType: null,
    routeRealismScore: null,
    travelFatigueLevel: null,
  }
}
