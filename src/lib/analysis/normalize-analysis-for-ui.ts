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

  return {
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
    querySummary: analysis.querySummary || 'Analysis summary not available',
    scoreBreakdown: analysis.scoreBreakdown || 'Score breakdown not available',
    confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0.5,
  }
}

/**
 * Normalize individual destination for safe rendering
 */
function normalizeDestination(dest: RankedDestination): RankedDestination {
  return {
    ...dest,
    // Ensure arrays are never null/undefined
    whyRecommended: Array.isArray(dest.whyRecommended) ? dest.whyRecommended : [],
    possibleDownsides: Array.isArray(dest.possibleDownsides) ? dest.possibleDownsides : [],
    bestMonths: Array.isArray(dest.bestMonths) ? dest.bestMonths : [],
    sourceLabels: Array.isArray(dest.sourceLabels) ? dest.sourceLabels : [],
    
    // Handle nullable route fields
    suggestedRoute: Array.isArray(dest.suggestedRoute) ? dest.suggestedRoute : null,
    recommendedNights: dest.recommendedNights && typeof dest.recommendedNights === 'object' 
      ? dest.recommendedNights 
      : null,
    routeWarnings: Array.isArray(dest.routeWarnings) ? dest.routeWarnings : null,
    
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
