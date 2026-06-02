/**
 * Final Analysis Result Finalizer
 * 
 * Single source of truth for:
 * - tripLength
 * - tripStructure
 * - recommendedRouteType
 * - consultantQualityScore
 * - consultantQualityGrade
 * - qualityGatePassed/finalQualityPassed
 * - finalCountries
 * - finalRoutes
 * - data usage counts
 * - user-facing summary text
 * 
 * This must be called AFTER:
 * - OpenAI primary result
 * - validation
 * - repair if needed
 * - ML/ranking
 * - diversity enforcement
 * - quality gate
 * - Claude verification
 * 
 * This must be called BEFORE:
 * - cache SET
 * - UI rendering
 */

import { AnalysisRequest } from './engine'
import { TravelAnalysisResponse } from './schemas'
import { logger } from '../utils'

export interface QualityGateResult {
  passed: boolean
  repaired: boolean
  repairedPassed?: boolean
  issues: string[]
  scopeValidationPassed: boolean
  formattingIssues: string[]
}

export interface ClaudeVerificationResult {
  used: boolean
  passed: boolean
  successCount: number
  totalCount: number
  error?: string
  modelUsed?: string
  timedOut?: boolean
}

export interface RouteContext {
  candidateCount: number
  regionsIncluded: string[]
  countriesIncluded: string[]
  attractionsUsed: number
  weatherRecordsUsed: number
}

export interface CacheInfo {
  status: 'HIT' | 'MISS' | 'BYPASSED' | 'ERROR'
  eligible: boolean
  reason?: string
}

export interface FinalizedAnalysis {
  analysis: TravelAnalysisResponse
  metadata: FinalMetadata
  displaySummary: DisplaySummary
}

export interface FinalMetadata {
  // Request context
  tripLength?: number
  tripStructure: string
  requestedDestination?: string
  
  // Route intelligence
  recommendedRouteType: 'single-destination' | '2-city' | '3-city' | 'multi-city'
  finalCountries: string[]
  finalRoutes: Array<{
    country: string
    cities: string[]
    nights?: number[]
  }>
  
  // Quality assessment
  consultantQualityScore: number
  consultantQualityGrade: 'Excellent' | 'Good' | 'Acceptable' | 'Needs Review'
  qualityGatePassed: boolean
  finalQualityPassed: boolean
  scopeValidationPassed: boolean
  
  // Data usage
  travelDataAttractionsUsed: number
  travelDataWeatherRecordsUsed: number
  travelDataRoutesUsed: number
  
  // Verification
  claudeVerifierUsed: boolean
  claudeVerifierPassed: boolean
  claudeVerificationSuccessCount: number
  claudeModelUsed?: string
  claudeVerifierError?: string
  
  // Cache
  cacheStatus: string
  cacheEligible: boolean
  openAIUsed: boolean
  fallbackUsed: boolean
}

export interface DisplaySummary {
  querySummary: string
  tripLengthText: string
  routeTypeText: string
  confidenceLabel: string
}

/**
 * Finalize analysis result with canonical metadata
 */
export function finalizeAnalysisResult({
  analysis,
  request,
  routeContext,
  qualityGateResult,
  claudeResult,
  cacheInfo,
}: {
  analysis: TravelAnalysisResponse
  request: AnalysisRequest
  routeContext: RouteContext
  qualityGateResult: QualityGateResult
  claudeResult: ClaudeVerificationResult
  cacheInfo: CacheInfo
}): FinalizedAnalysis {
  
  // STEP 1: Compute final routes and countries
  const finalRoutes = computeFinalRoutes(analysis)
  const finalCountries = [...new Set(finalRoutes.map(r => r.country))]
  
  // STEP 2: Compute canonical routeType from actual routes
  const recommendedRouteType = computeRouteType(finalRoutes, request.tripStructure)
  
  // STEP 3: Compute honest quality score
  const { score: consultantQualityScore, grade: consultantQualityGrade, finalQualityPassed } = 
    computeHonestQualityScore({
      qualityGateResult,
      claudeResult,
      recommendedRouteType,
      tripStructure: request.tripStructure,
      finalRoutes,
    })
  
  // STEP 4: Build display summary
  const displaySummary = buildDisplaySummary({
    request,
    recommendedRouteType,
    consultantQualityGrade,
    finalQualityPassed,
  })
  
  // STEP 5: Build final metadata
  const metadata: FinalMetadata = {
    // Request context
    tripLength: request.tripLength,
    tripStructure: request.tripStructure || 'single_country_multi_city',
    requestedDestination: request.destination,
    
    // Route intelligence
    recommendedRouteType,
    finalCountries,
    finalRoutes,
    
    // Quality assessment
    consultantQualityScore,
    consultantQualityGrade,
    qualityGatePassed: qualityGateResult.passed,
    finalQualityPassed,
    scopeValidationPassed: qualityGateResult.scopeValidationPassed,
    
    // Data usage
    travelDataAttractionsUsed: routeContext.attractionsUsed,
    travelDataWeatherRecordsUsed: routeContext.weatherRecordsUsed,
    travelDataRoutesUsed: routeContext.candidateCount,
    
    // Verification
    claudeVerifierUsed: claudeResult.used,
    claudeVerifierPassed: claudeResult.passed,
    claudeVerificationSuccessCount: claudeResult.successCount,
    claudeModelUsed: claudeResult.modelUsed,
    claudeVerifierError: claudeResult.error,
    
    // Cache
    cacheStatus: cacheInfo.status,
    cacheEligible: cacheInfo.eligible,
    openAIUsed: true,
    fallbackUsed: false,
  }
  
  // STEP 6: Update analysis with finalized metadata
  const finalizedAnalysis = {
    ...analysis,
    _meta: metadata,
  }
  
  logger.info('Analysis finalized', {
    tripLength: metadata.tripLength,
    tripStructure: metadata.tripStructure,
    recommendedRouteType: metadata.recommendedRouteType,
    finalCountries: metadata.finalCountries,
    consultantQualityScore: metadata.consultantQualityScore,
    consultantQualityGrade: metadata.consultantQualityGrade,
    finalQualityPassed: metadata.finalQualityPassed,
    cacheEligible: metadata.cacheEligible,
  })
  
  return {
    analysis: finalizedAnalysis,
    metadata,
    displaySummary,
  }
}

/**
 * Compute final routes from analysis
 */
function computeFinalRoutes(analysis: TravelAnalysisResponse): Array<{
  country: string
  cities: string[]
  nights?: number[]
}> {
  const routes: Array<{ country: string; cities: string[]; nights?: number[] }> = []
  
  for (const dest of analysis.rankedDestinations || []) {
    const cities = dest.suggestedRoute || []
    const nights = dest.recommendedNights
    
    if (cities.length > 0) {
      routes.push({
        country: dest.destinationName || 'Unknown',
        cities,
        nights: Array.isArray(nights) && nights.length > 0 ? nights : undefined,
      })
    }
  }
  
  return routes
}

/**
 * Compute canonical routeType from actual final routes
 */
function computeRouteType(
  finalRoutes: Array<{ country: string; cities: string[] }>,
  tripStructure?: string
): 'single-destination' | '2-city' | '3-city' | 'multi-city' {
  if (finalRoutes.length === 0) {
    return 'single-destination'
  }
  
  // Get the first route (primary recommendation)
  const primaryRoute = finalRoutes[0]
  const cityCount = primaryRoute.cities.length
  
  // If tripStructure is single_country_one_city, return single-destination
  if (tripStructure === 'single_country_one_city') {
    return 'single-destination'
  }
  
  // Compute based on actual city count
  if (cityCount === 1) {
    return 'single-destination'
  } else if (cityCount === 2) {
    return '2-city'
  } else if (cityCount === 3) {
    return '3-city'
  } else {
    return 'multi-city'
  }
}

/**
 * Compute honest quality score based on actual quality gate results
 */
function computeHonestQualityScore({
  qualityGateResult,
  claudeResult,
  recommendedRouteType,
  tripStructure,
  finalRoutes,
}: {
  qualityGateResult: QualityGateResult
  claudeResult: ClaudeVerificationResult
  recommendedRouteType: string
  tripStructure?: string
  finalRoutes: Array<{ country: string; cities: string[] }>
}): {
  score: number
  grade: 'Excellent' | 'Good' | 'Acceptable' | 'Needs Review'
  finalQualityPassed: boolean
} {
  let score = 100
  let finalQualityPassed = false
  
  // Rule 1: If quality gate passed initially
  if (qualityGateResult.passed) {
    finalQualityPassed = true
    score = 100
  }
  // Rule 2: If quality gate failed but was repaired
  else if (qualityGateResult.repaired) {
    // If repaired output was re-verified and passed
    if (qualityGateResult.repairedPassed) {
      finalQualityPassed = true
      score = 90 // Good but not perfect
    } else {
      // Repaired but not verified clean
      finalQualityPassed = false
      score = 80 // Acceptable
    }
  }
  // Rule 3: If quality gate failed and not repaired
  else {
    finalQualityPassed = false
    score = 70 // Needs review
  }
  
  // Penalty: Formatting issues detected
  if (qualityGateResult.formattingIssues.length > 0) {
    score = Math.max(score - 5, 60)
  }
  
  // Penalty: RouteType mismatch with tripStructure
  if (tripStructure === 'single_country_multi_city' && recommendedRouteType === 'single-destination') {
    score = Math.min(score, 75)
    finalQualityPassed = false
  }
  
  // Penalty: Scope validation failed
  if (!qualityGateResult.scopeValidationPassed) {
    score = Math.min(score, 75)
    finalQualityPassed = false
  }
  
  // Penalty: Claude verification timed out
  if (claudeResult.used && claudeResult.timedOut) {
    score = Math.min(score, 85)
  }
  
  // Penalty: No usable routes
  if (finalRoutes.length === 0) {
    score = Math.min(score, 60)
    finalQualityPassed = false
  }
  
  // Determine grade
  let grade: 'Excellent' | 'Good' | 'Acceptable' | 'Needs Review'
  
  if (!finalQualityPassed) {
    // Never Excellent if finalQualityPassed=false
    if (score >= 80) {
      grade = 'Good'
    } else if (score >= 70) {
      grade = 'Acceptable'
    } else {
      grade = 'Needs Review'
    }
  } else {
    // finalQualityPassed=true
    if (score >= 95) {
      grade = 'Excellent'
    } else if (score >= 85) {
      grade = 'Good'
    } else if (score >= 70) {
      grade = 'Acceptable'
    } else {
      grade = 'Needs Review'
    }
  }
  
  return { score, grade, finalQualityPassed }
}

/**
 * Build user-facing display summary
 */
function buildDisplaySummary({
  request,
  recommendedRouteType,
  consultantQualityGrade,
  finalQualityPassed,
}: {
  request: AnalysisRequest
  recommendedRouteType: string
  consultantQualityGrade: string
  finalQualityPassed: boolean
}): DisplaySummary {
  
  // Trip length text
  const tripLengthText = request.tripLength 
    ? `${request.tripLength}-day`
    : 'multi-city'
  
  // Route type text
  const routeTypeText = recommendedRouteType
  
  // Trip structure text
  const tripStructureText = request.tripStructure === 'single_country_one_city'
    ? 'single-city'
    : request.tripStructure === 'single_country_multi_city'
    ? 'single-country multi-city'
    : 'multi-country'
  
  // Query summary
  const querySummary = request.tripLength
    ? `Because you want a ${tripLengthText} ${tripStructureText} trip`
    : `Because you want a ${tripStructureText} trip`
  
  // Confidence label
  const confidenceLabel = finalQualityPassed
    ? consultantQualityGrade === 'Excellent' ? 'High Confidence' : 'Good Confidence'
    : 'Review Recommended'
  
  return {
    querySummary,
    tripLengthText,
    routeTypeText,
    confidenceLabel,
  }
}
