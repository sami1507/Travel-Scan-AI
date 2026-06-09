/**
 * Consultant Quality Gate
 * Ensures analysis output meets professional consultant standards
 */

import type { RankedDestination } from './schemas'
import type { AnalysisRequest } from './engine'
import { logger } from '../utils'
import { normalizeRecommendation } from './text-normalization'

// Banned generic phrases that sound scripted
const GENERIC_PHRASES = [
  /offers? diverse cultural experiences?/i,
  /provides? vibrant city life/i,
  /combines? historical sites?/i,
  /ideal weather conditions? and fewer crowds/i,
  /based on your preferences and budget/i,
  /good value accommodation/i,
  /rich history and beautiful landscapes?/i,
  /offers? a perfect/i,
  /provides? an? excellent/i,
  /combines? the best of/i,
  /perfect for travelers?/i,
  /ideal destination for/i,
]

export interface QualityGateResult {
  passed: boolean
  issues: string[]
  repaired: boolean
  recommendations: RankedDestination[]
}

/**
 * Check and repair analysis output quality
 */
export function applyConsultantQualityGate(
  recommendations: RankedDestination[],
  request: AnalysisRequest
): QualityGateResult {
  const issues: string[] = []
  let repaired = false

  // Normalize spacing/text BEFORE checks — prevents false positives from OpenAI whitespace
  const normalizedRecs = recommendations.map(rec => normalizeRecommendation(rec))

  // Check for generic phrases
  normalizedRecs.forEach((rec, index) => {
    const textToCheck = [
      rec.destinationSummary || '',
      ...rec.whyRecommended,
      rec.realisticConsultantNotes || '',
    ].join(' ')

    GENERIC_PHRASES.forEach(pattern => {
      if (pattern.test(textToCheck)) {
        issues.push(`Recommendation ${index + 1} (${rec.destinationName}): Contains generic phrase matching ${pattern}`)
      }
    })

    // Check for concrete route
    if (!rec.suggestedRoute || rec.suggestedRoute.length === 0) {
      issues.push(`Recommendation ${index + 1}: Missing concrete route`)
    }

    // Check for honest limitations
    if (!rec.possibleDownsides || rec.possibleDownsides.length === 0) {
      issues.push(`Recommendation ${index + 1}: Missing honest limitations`)
    }
  })

  // Repair if issues found
  let repairedRecommendations = normalizedRecs
  if (issues.length > 0) {
    logger.warn('Consultant quality gate found issues', {
      issueCount: issues.length,
      issues: issues.slice(0, 5), // Log first 5
    })

    repairedRecommendations = normalizedRecs.map((rec, index) => {
      return repairRecommendation(rec, request, index)
    })
    repaired = true
  }

  const passed = issues.length === 0

  logger.info('Consultant quality gate applied', {
    passed,
    issueCount: issues.length,
    repaired,
  })

  return {
    passed,
    issues,
    repaired,
    recommendations: repairedRecommendations,
  }
}

/**
 * Repair a single recommendation to meet consultant standards
 */
function repairRecommendation(
  rec: RankedDestination,
  request: AnalysisRequest,
  index: number
): RankedDestination {
  const repaired = { ...rec }

  // Fix broken spacing
  if (repaired.destinationSummary) {
    repaired.destinationSummary = normalizeText(repaired.destinationSummary)
  }
  repaired.whyRecommended = repaired.whyRecommended.map(normalizeText)
  if (repaired.realisticConsultantNotes) {
    repaired.realisticConsultantNotes = normalizeText(repaired.realisticConsultantNotes)
  }

  // Replace generic summary with consultant-grade description
  if (repaired.destinationSummary && isGeneric(repaired.destinationSummary)) {
    repaired.destinationSummary = generateConsultantSummary(repaired, request, index)
  }

  // Ensure concrete route
  if (!repaired.suggestedRoute || repaired.suggestedRoute.length === 0) {
    repaired.suggestedRoute = [repaired.destinationName]
  }

  // Ensure honest limitations
  if (!repaired.possibleDownsides || repaired.possibleDownsides.length === 0) {
    repaired.possibleDownsides = generateHonestLimitations(repaired, request)
  }

  // Replace generic whyRecommended with specific reasons
  repaired.whyRecommended = repaired.whyRecommended.map(reason => {
    if (isGeneric(reason)) {
      return generateSpecificReason(repaired, request, index)
    }
    return reason
  })

  return repaired
}

/**
 * Check if text contains generic phrases
 */
function isGeneric(text: string): boolean {
  return GENERIC_PHRASES.some(pattern => pattern.test(text))
}

/**
 * Normalize text to fix spacing issues
 */
function normalizeText(text: string): string {
  return text
    .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
    .trim()
}

/**
 * Generate consultant-grade summary
 */
function generateConsultantSummary(
  rec: RankedDestination,
  request: AnalysisRequest,
  index: number
): string {
  const route = rec.suggestedRoute && rec.suggestedRoute.length > 1
    ? rec.suggestedRoute.join(' → ')
    : rec.destinationName

  const label = index === 0 ? 'strongest match' : index === 1 ? 'best value alternative' : 'unique but realistic option'

  const interests = request.interests && request.interests.length > 0
    ? request.interests.slice(0, 2).join(' and ')
    : 'your interests'

  return `${route} is your ${label} for ${interests}, with ${rec.transportLogic || 'good transport connections'} and ${rec.travelFatigueLevel || 'moderate'} fatigue.`
}

/**
 * Generate specific reason based on data
 */
function generateSpecificReason(
  rec: RankedDestination,
  request: AnalysisRequest,
  index: number
): string {
  const score = rec.totalMatchScore

  if (score >= 80) {
    return `Strong match (${score}/100) for your ${request.tripStructure?.replace(/_/g, ' ') || 'trip'} requirements`
  } else if (score >= 70) {
    return `Good fit (${score}/100) with some tradeoffs on ${request.budget || 'budget'} and timing`
  } else if (score >= 60) {
    return `Acceptable compromise (${score}/100) - realistic but not perfect for all criteria`
  } else {
    return `Moderate fit (${score}/100) - best available option given constraints`
  }
}

/**
 * Generate honest limitations
 */
function generateHonestLimitations(
  rec: RankedDestination,
  request: AnalysisRequest
): string[] {
  const limitations: string[] = []

  // Check score
  if (rec.totalMatchScore < 70) {
    limitations.push('Not a perfect match for all your criteria')
  }

  // Check season
  if (request.travelMonths && request.travelMonths.length > 0) {
    const month = request.travelMonths[0]
    if (month >= 6 && month <= 8) {
      limitations.push('Summer means higher prices and crowds')
    } else if (month >= 12 || month <= 2) {
      limitations.push('Winter weather may limit some activities')
    }
  }

  // Check fatigue
  if (rec.travelFatigueLevel === 'High') {
    limitations.push('Fast-paced itinerary with frequent moves')
  }

  // Default if none found
  if (limitations.length === 0) {
    limitations.push('Book accommodation early for best prices')
  }

  return limitations.slice(0, 2) // Max 2 limitations
}

/**
 * Generate diversity labels for recommendations
 */
export function assignDiversityLabels(
  recommendations: RankedDestination[]
): RankedDestination[] {
  return recommendations.map((rec, index) => {
    const label = index === 0 
      ? 'Best Overall'
      : index === 1
      ? 'Best Value'
      : 'Unique Discovery'

    return {
      ...rec,
      diversityLabel: label,
    }
  })
}

/**
 * Generate consultant brief for analysis summary
 */
export function generateConsultantBrief(
  recommendations: RankedDestination[],
  request: AnalysisRequest,
  dataSource: 'openai' | 'fallback' | 'timeout'
): string {
  const tripLength = request.tripLength || 7
  const tripStructure = request.tripStructure?.replace(/_/g, ' ') || 'trip'
  const interests = request.interests && request.interests.length > 0
    ? request.interests.slice(0, 3).join(', ')
    : 'your interests'
  const departure = request.departureCity || 'your location'

  const countries = recommendations.map(r => r.destinationName).join(', ')
  
  const topScore = recommendations[0]?.totalMatchScore || 0
  const scoreNote = topScore >= 80
    ? 'strong matches'
    : topScore >= 70
    ? 'good options with tradeoffs'
    : topScore >= 60
    ? 'acceptable compromises'
    : 'best available options given constraints'

  const dataNote = dataSource === 'timeout'
    ? ' (Live AI took too long, so this is a conservative knowledge-based estimate.)'
    : dataSource === 'fallback'
    ? ' (Live AI unavailable, showing knowledge-based estimate.)'
    : ''

  let structureNote = ''
  if (request.tripStructure === 'single_country_multi_city' && !request.destination) {
    structureNote = ` Since no fixed country was selected, I'm comparing 3 countries, each with a realistic internal multi-city route.`
  }

  return `Because you want a ${tripLength}-day ${tripStructure} from ${departure} with ${interests}, I compared routes that are realistic to reach, connect, and explore. Your ${scoreNote} are ${countries}.${structureNote}${dataNote}`
}
