/**
 * Diversity Enforcement
 * Guarantees final 3 recommendations are meaningfully diverse
 */

import type { RankedDestination } from './schemas'
import type { AnalysisRequest } from './engine'
import { logger } from '../utils'

export interface DiversityContext {
  request: AnalysisRequest
  candidatePool?: RankedDestination[]
  fixedCountry?: string
}

export interface DiversityResult {
  recommendations: RankedDestination[]
  diversityApplied: boolean
  diversityScore: number
  preDiversityCountries: string[]
  postDiversityCountries: string[]
  fixedCountryMode: boolean
}

/**
 * Enforce recommendation diversity in final results
 */
export function enforceRecommendationDiversity(
  recommendations: RankedDestination[],
  context: DiversityContext
): DiversityResult {
  const { request, candidatePool, fixedCountry } = context
  
  // Track original countries
  const preDiversityCountries = recommendations.slice(0, 3).map(r => r.destinationName)
  
  // Check if user selected a fixed country
  const userFixedCountry = fixedCountry || request.destination
  const fixedCountryMode = !!userFixedCountry
  
  // If fixed country mode, don't enforce country diversity
  if (fixedCountryMode) {
    logger.info('Diversity enforcement: Fixed country mode', {
      fixedCountry: userFixedCountry,
      recommendations: preDiversityCountries.join(', '),
    })
    
    return {
      recommendations: recommendations.slice(0, 3),
      diversityApplied: false,
      diversityScore: 1.0,
      preDiversityCountries,
      postDiversityCountries: preDiversityCountries,
      fixedCountryMode: true,
    }
  }
  
  // Ensure we have at least 3 recommendations
  if (recommendations.length < 3) {
    logger.warn('Diversity enforcement: Insufficient recommendations', {
      count: recommendations.length,
    })
    
    return {
      recommendations,
      diversityApplied: false,
      diversityScore: 0,
      preDiversityCountries,
      postDiversityCountries: recommendations.map(r => r.destinationName),
      fixedCountryMode: false,
    }
  }
  
  // Check current diversity
  const uniqueCountries = new Set(preDiversityCountries)
  const currentDiversityScore = uniqueCountries.size / 3
  
  // If already diverse, no enforcement needed
  if (currentDiversityScore >= 0.9) {
    logger.info('Diversity enforcement: Already diverse', {
      countries: preDiversityCountries.join(', '),
      diversityScore: currentDiversityScore,
    })
    
    return {
      recommendations: recommendations.slice(0, 3),
      diversityApplied: false,
      diversityScore: currentDiversityScore,
      preDiversityCountries,
      postDiversityCountries: preDiversityCountries,
      fixedCountryMode: false,
    }
  }
  
  // Apply diversity enforcement
  const diversified = applyDiversityLogic(
    recommendations,
    candidatePool || recommendations,
    request
  )
  
  const postDiversityCountries = diversified.map(r => r.destinationName)
  const finalDiversityScore = new Set(postDiversityCountries).size / 3
  
  logger.info('Diversity enforcement: Applied', {
    preDiversity: preDiversityCountries.join(', '),
    postDiversity: postDiversityCountries.join(', '),
    diversityScore: finalDiversityScore,
    improved: finalDiversityScore > currentDiversityScore,
  })
  
  return {
    recommendations: diversified,
    diversityApplied: true,
    diversityScore: finalDiversityScore,
    preDiversityCountries,
    postDiversityCountries,
    fixedCountryMode: false,
  }
}

/**
 * Apply diversity logic to select 3 diverse recommendations
 */
function applyDiversityLogic(
  recommendations: RankedDestination[],
  candidatePool: RankedDestination[],
  request: AnalysisRequest
): RankedDestination[] {
  const selected: RankedDestination[] = []
  const usedCountries = new Set<string>()
  const usedRegions = new Set<string>()
  
  // Step 1: Keep the top recommendation (Best Overall)
  if (recommendations[0]) {
    selected.push(recommendations[0])
    usedCountries.add(recommendations[0].destinationName)
    usedRegions.add(getRegion(recommendations[0].destinationName))
  }
  
  // Step 2: Find Best Value alternative (different country, lower budget tendency)
  const bestValue = findBestValue(recommendations, usedCountries, request)
  if (bestValue) {
    selected.push(bestValue)
    usedCountries.add(bestValue.destinationName)
    usedRegions.add(getRegion(bestValue.destinationName))
  } else {
    // Fallback: next best from different country
    const nextBest = recommendations.find(r => !usedCountries.has(r.destinationName))
    if (nextBest) {
      selected.push(nextBest)
      usedCountries.add(nextBest.destinationName)
      usedRegions.add(getRegion(nextBest.destinationName))
    }
  }
  
  // Step 3: Find Unique/Less Obvious alternative (different country and region if possible)
  const unique = findUnique(recommendations, candidatePool, usedCountries, usedRegions, request)
  if (unique) {
    selected.push(unique)
  } else {
    // Fallback: any remaining from different country
    const remaining = recommendations.find(r => !usedCountries.has(r.destinationName))
    if (remaining) {
      selected.push(remaining)
    } else if (selected.length < 3 && recommendations.length >= 3) {
      // Last resort: include duplicate but log warning
      selected.push(recommendations[2])
      logger.warn('Diversity enforcement: Could not find 3 unique countries, including duplicate')
    }
  }
  
  // Ensure we have exactly 3
  while (selected.length < 3 && recommendations.length > selected.length) {
    selected.push(recommendations[selected.length])
  }
  
  return selected
}

/**
 * Find best value alternative (different country, budget-friendly)
 */
function findBestValue(
  recommendations: RankedDestination[],
  usedCountries: Set<string>,
  request: AnalysisRequest
): RankedDestination | null {
  // Look for recommendations with:
  // - Different country
  // - Good score (within 15 points of top)
  // - Budget-friendly indicators
  
  const topScore = recommendations[0]?.totalMatchScore || 0
  const minScore = topScore - 15
  
  for (const rec of recommendations.slice(1)) {
    if (usedCountries.has(rec.destinationName)) continue
    if (rec.totalMatchScore < minScore) continue
    
    // Check if budget-friendly
    const isBudgetFriendly = 
      rec.whyRecommended?.some(r => 
        r.toLowerCase().includes('value') ||
        r.toLowerCase().includes('budget') ||
        r.toLowerCase().includes('affordable') ||
        r.toLowerCase().includes('cheaper')
      ) ||
      rec.destinationName.toLowerCase().includes('hungary') ||
      rec.destinationName.toLowerCase().includes('czech') ||
      rec.destinationName.toLowerCase().includes('poland') ||
      rec.destinationName.toLowerCase().includes('romania') ||
      rec.destinationName.toLowerCase().includes('bulgaria')
    
    if (isBudgetFriendly || request.budget === 'low' || request.budget === 'moderate') {
      return rec
    }
  }
  
  // If no budget-friendly found, return next best from different country
  return recommendations.find(r => 
    !usedCountries.has(r.destinationName) &&
    r.totalMatchScore >= minScore
  ) || null
}

/**
 * Find unique/less obvious alternative (different country and region)
 */
function findUnique(
  recommendations: RankedDestination[],
  candidatePool: RankedDestination[],
  usedCountries: Set<string>,
  usedRegions: Set<string>,
  request: AnalysisRequest
): RankedDestination | null {
  // Look for recommendations with:
  // - Different country
  // - Different region if possible
  // - Reasonable score (within 20 points of top)
  // - Less mainstream
  
  const topScore = recommendations[0]?.totalMatchScore || 0
  const minScore = topScore - 20
  
  // Try from recommendations first
  for (const rec of recommendations.slice(1)) {
    if (usedCountries.has(rec.destinationName)) continue
    if (rec.totalMatchScore < minScore) continue
    
    const region = getRegion(rec.destinationName)
    if (!usedRegions.has(region) && isLessMainstream(rec.destinationName)) {
      return rec
    }
  }
  
  // Try from candidate pool
  for (const rec of candidatePool) {
    if (usedCountries.has(rec.destinationName)) continue
    if (rec.totalMatchScore < minScore) continue
    
    const region = getRegion(rec.destinationName)
    if (!usedRegions.has(region) && isLessMainstream(rec.destinationName)) {
      return rec
    }
  }
  
  // Fallback: any from different country and region
  for (const rec of recommendations.slice(1)) {
    if (usedCountries.has(rec.destinationName)) continue
    const region = getRegion(rec.destinationName)
    if (!usedRegions.has(region)) {
      return rec
    }
  }
  
  return null
}

/**
 * Get region for a country
 */
function getRegion(country: string): string {
  const countryLower = country.toLowerCase()
  
  // Mediterranean
  if (['italy', 'greece', 'spain', 'portugal', 'cyprus', 'malta'].some(c => countryLower.includes(c))) {
    return 'mediterranean'
  }
  
  // Balkans
  if (['croatia', 'slovenia', 'albania', 'montenegro', 'serbia', 'bosnia'].some(c => countryLower.includes(c))) {
    return 'balkans'
  }
  
  // Central Europe
  if (['austria', 'czech', 'hungary', 'poland', 'slovakia'].some(c => countryLower.includes(c))) {
    return 'central-europe'
  }
  
  // Eastern Europe
  if (['romania', 'bulgaria', 'ukraine', 'moldova'].some(c => countryLower.includes(c))) {
    return 'eastern-europe'
  }
  
  // Caucasus
  if (['georgia', 'armenia', 'azerbaijan'].some(c => countryLower.includes(c))) {
    return 'caucasus'
  }
  
  // Middle East
  if (['turkey', 'jordan', 'lebanon', 'israel'].some(c => countryLower.includes(c))) {
    return 'middle-east'
  }
  
  // Western Europe
  if (['france', 'germany', 'belgium', 'netherlands', 'switzerland'].some(c => countryLower.includes(c))) {
    return 'western-europe'
  }
  
  // Nordic
  if (['sweden', 'norway', 'denmark', 'finland', 'iceland'].some(c => countryLower.includes(c))) {
    return 'nordic'
  }
  
  return 'other'
}

/**
 * Check if country is less mainstream
 */
function isLessMainstream(country: string): boolean {
  const countryLower = country.toLowerCase()
  
  // Mainstream destinations
  const mainstream = ['italy', 'france', 'spain', 'greece', 'portugal', 'united kingdom']
  if (mainstream.some(c => countryLower.includes(c))) {
    return false
  }
  
  // Less obvious but realistic
  const lessObvious = [
    'romania', 'bulgaria', 'albania', 'montenegro', 'slovenia',
    'croatia', 'serbia', 'georgia', 'armenia', 'cyprus',
    'czech', 'hungary', 'poland', 'slovakia', 'austria'
  ]
  
  return lessObvious.some(c => countryLower.includes(c))
}
