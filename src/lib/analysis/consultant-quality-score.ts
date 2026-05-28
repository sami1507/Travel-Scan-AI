import type { TravelAnalysisResponse } from './schemas'

export interface ConsultantQualityScore {
  totalScore: number
  subScores: {
    routeSpecificity: number
    seasonReality: number
    budgetHonesty: number
    diversity: number
    fatigueLogic: number
    userFit: number
    warningQuality: number
    genericLanguagePenalty: number
    dataHonesty: number
  }
  issues: string[]
  recommendations: string[]
  genericPhrases: string[]
}

const GENERIC_PHRASES = [
  'offers diverse cultural experiences',
  'provides vibrant city life',
  'combines historical sites',
  'good weather and fewer crowds',
  'based on your preferences',
  'ideal destination',
  'perfect trip',
  'rich history and beautiful landscapes',
  'perfect for',
  'ideal for',
  'best destination',
  'amazing experience',
  'unforgettable journey',
  'breathtaking views',
  'world-class',
]

export function scoreConsultantQuality(
  analysis: TravelAnalysisResponse,
  request?: {
    query?: string
    budget?: string
    travel_months?: number[]
    interests?: string[]
    tripStructure?: string
    tripLength?: number
    departureCity?: string
  }
): ConsultantQualityScore {
  const issues: string[] = []
  const recommendations: string[] = []
  const genericPhrases: string[] = []

  // Initialize sub-scores
  let routeSpecificity = 0
  let seasonReality = 0
  let budgetHonesty = 0
  let diversity = 0
  let fatigueLogic = 0
  let userFit = 0
  let warningQuality = 0
  let genericLanguagePenalty = 100
  let dataHonesty = 0

  // 1. Route Specificity (0-15 points)
  const destinations = analysis.rankedDestinations || []
  if (destinations.length === 0) {
    issues.push('No destinations provided')
  } else {
    let routeScore = 0
    destinations.slice(0, 3).forEach((dest) => {
      // Check if route includes cities, not just country
      if (dest.suggestedRoute && dest.suggestedRoute.length > 1) {
        routeScore += 3
      } else if (dest.suggestedRoute && dest.suggestedRoute.length === 1) {
        routeScore += 1
        issues.push(`${dest.destinationName}: Route should include multiple cities`)
      } else {
        issues.push(`${dest.destinationName}: Missing route cities`)
      }

      // Check if transport logic is explained
      if (dest.transportLogic && dest.transportLogic.length > 20) {
        routeScore += 2
      } else {
        issues.push(`${dest.destinationName}: Missing transport logic`)
      }
    })
    routeSpecificity = Math.min(15, routeScore)
  }

  // 2. Season Reality (0-10 points)
  destinations.slice(0, 3).forEach((dest) => {
    if (dest.seasonality) {
      if (dest.seasonality.weatherReality && dest.seasonality.weatherReality.length > 10) {
        seasonReality += 2
      }
      if (dest.seasonality.crowdReality && dest.seasonality.crowdReality.length > 10) {
        seasonReality += 2
      }
      if (dest.seasonality.priceReality && dest.seasonality.priceReality.length > 10) {
        seasonReality += 1
      }
    } else {
      issues.push(`${dest.destinationName}: Missing seasonality data`)
    }
  })
  seasonReality = Math.min(10, seasonReality)

  // 3. Budget Honesty (0-10 points)
  destinations.slice(0, 3).forEach((dest) => {
    if (dest.seasonality?.priceReality) {
      budgetHonesty += 3
    }
    if (dest.estimatedBudgetLevel) {
      budgetHonesty += 1
    }
  })
  budgetHonesty = Math.min(10, budgetHonesty)

  // 4. Diversity (0-15 points)
  const countries = new Set(destinations.map((d) => d.destinationName))
  const regions = new Set(
    destinations.map((d) => {
      const name = d.destinationName.toLowerCase()
      if (name.includes('greece') || name.includes('italy') || name.includes('spain')) return 'mediterranean'
      if (name.includes('portugal')) return 'iberia'
      if (name.includes('france')) return 'western-europe'
      if (name.includes('germany') || name.includes('austria') || name.includes('switzerland'))
        return 'central-europe'
      if (name.includes('poland') || name.includes('czech') || name.includes('hungary'))
        return 'eastern-europe'
      if (name.includes('croatia') || name.includes('albania') || name.includes('montenegro'))
        return 'balkans'
      if (name.includes('morocco') || name.includes('egypt')) return 'north-africa'
      if (name.includes('turkey')) return 'middle-east'
      return 'other'
    })
  )

  diversity = regions.size * 5
  if (regions.size >= 3) {
    diversity += 5
  }
  if (destinations.some((d) => d.diversityLabel?.includes('Unique'))) {
    diversity += 5
  } else {
    recommendations.push('Include at least one unique/non-mainstream option')
  }
  diversity = Math.min(15, diversity)

  // 5. Fatigue Logic (0-10 points)
  destinations.slice(0, 3).forEach((dest) => {
    if (dest.travelFatigueLevel) {
      fatigueLogic += 2
    }
    if (dest.transportLogic && dest.transportLogic.length > 20) {
      fatigueLogic += 1
    }
  })
  fatigueLogic = Math.min(10, fatigueLogic)

  // 6. User Fit (0-15 points)
  destinations.slice(0, 3).forEach((dest) => {
    if (dest.whyRecommended && dest.whyRecommended.length >= 2) {
      userFit += 3
    } else {
      issues.push(`${dest.destinationName}: Insufficient explanation of why it fits user`)
    }

    // Check if explanation mentions user interests
    if (request?.interests && request.interests.length > 0) {
      const hasInterestMention = dest.whyRecommended?.some((reason) =>
        request.interests!.some((interest) => reason.toLowerCase().includes(interest.toLowerCase()))
      )
      if (hasInterestMention) {
        userFit += 2
      }
    }
  })
  userFit = Math.min(15, userFit)

  // 7. Warning Quality (0-10 points)
  destinations.slice(0, 3).forEach((dest) => {
    if (dest.possibleDownsides && dest.possibleDownsides.length > 0) {
      warningQuality += 2
    } else {
      issues.push(`${dest.destinationName}: Missing honest downsides/warnings`)
    }

    if (dest.routeWarnings && dest.routeWarnings.length > 0) {
      warningQuality += 1
    }
  })
  warningQuality = Math.min(10, warningQuality)

  // 8. Generic Language Penalty (100 - penalties)
  const allText = [
    analysis.querySummary || '',
    ...destinations.flatMap((d) => d.whyRecommended || []),
    ...destinations.flatMap((d) => d.possibleDownsides || []),
    ...destinations.map((d) => d.destinationSummary || ''),
  ].join(' ')

  GENERIC_PHRASES.forEach((phrase) => {
    const regex = new RegExp(phrase, 'gi')
    const matches = allText.match(regex)
    if (matches) {
      genericPhrases.push(`"${phrase}" (${matches.length}x)`)
      genericLanguagePenalty -= matches.length * 5
    }
  })

  genericLanguagePenalty = Math.max(0, genericLanguagePenalty)

  // 9. Data Honesty (0-15 points)
  // Check if analysis distinguishes between live AI and fallback
  const metadata = analysis as any
  if (metadata.openAIUsed !== undefined || metadata.fallbackUsed !== undefined) {
    dataHonesty += 5
  }

  // Check if warnings/assumptions are present
  if (analysis.warnings && analysis.warnings.length > 0) {
    dataHonesty += 5
  }
  if (analysis.assumptions && analysis.assumptions.length > 0) {
    dataHonesty += 5
  }

  dataHonesty = Math.min(15, dataHonesty)

  // Calculate total score (max 100)
  const rawTotal =
    routeSpecificity +
    seasonReality +
    budgetHonesty +
    diversity +
    fatigueLogic +
    userFit +
    warningQuality +
    genericLanguagePenalty * 0.15 + // Scale down to 15 points max
    dataHonesty

  let totalScore = Math.min(100, Math.max(0, Math.round(rawTotal)))

  // Apply caps based on critical failures
  // metadata already declared above at line 219
  
  // Cap at 60 if destination outside candidate pool
  if (metadata.invalidDestinations && metadata.invalidDestinations.length > 0) {
    totalScore = Math.min(totalScore, 60)
    issues.push(`Destination outside candidate pool - score capped at 60: ${metadata.invalidDestinations.join(', ')}`)
  }
  
  // Cap at 70 if final scope validation failed
  if (metadata.finalScopeValidationPassed === false) {
    totalScore = Math.min(totalScore, 70)
    issues.push('Final scope validation failed - score capped at 70')
  }
  
  // Cap at 75 if deterministic fallback was used (not for openai_repaired)
  if (metadata.analysisSource === 'fallback_deterministic' || 
      (metadata.deterministicFallbackUsed === true && metadata.analysisSource !== 'openai_repaired')) {
    totalScore = Math.min(totalScore, 75)
    issues.push('Deterministic fallback used - score capped at 75')
  }
  
  // Note if repair was used (informational, no penalty)
  if (metadata.openAIRepairUsed === true || metadata.repairPassed === true) {
    // OpenAI repaired results can score high, just note it in metadata
    // No score cap - repair is still OpenAI consultant output
  }
  
  // Cap at 75 if route type mismatches trip structure
  if (request?.tripStructure === 'single_country_multi_city' && metadata.routeType === 'single-destination') {
    totalScore = Math.min(totalScore, 75)
    issues.push('Route type mismatch: expected multi-city but got single-destination')
  }
  
  // Cap at 75 if route score is 0 with multi-city request
  if (request?.tripStructure && request.tripStructure !== 'single_country_one_city' && metadata.routeScore === 0) {
    totalScore = Math.min(totalScore, 75)
    issues.push('Route score is 0 despite multi-city request')
  }
  
  // Cap at 85 if quality gate failed
  if (metadata.qualityGatePassed === false) {
    totalScore = Math.min(totalScore, 85)
    issues.push('Quality gate failed - score capped at 85')
  }
  
  // Subtract points for broken spacing (if detected)
  if (metadata.brokenSpacing === true) {
    totalScore = Math.max(0, totalScore - 10)
    issues.push('Broken spacing detected in output')
  }
  
  // Subtract points if travel data attractions available but not used
  if (metadata.travelDataCandidateRoutesUsed > 0 && metadata.travelDataAttractionsUsed === 0) {
    totalScore = Math.max(0, totalScore - 5)
    issues.push('Travel data attractions available but not used in context')
  }
  
  // Subtract points if travel data weather available but not used
  if (metadata.travelDataCandidateRoutesUsed > 0 && metadata.travelDataWeatherRecordsUsed === 0) {
    totalScore = Math.max(0, totalScore - 5)
    issues.push('Travel data weather records available but not used in context')
  }
  
  // Subtract points for generic phrase count
  if (genericPhrases.length > 0) {
    const penalty = Math.min(15, genericPhrases.length * 3)
    totalScore = Math.max(0, totalScore - penalty)
  }

  // Add recommendations based on scores
  if (routeSpecificity < 10) {
    recommendations.push('Add more specific route cities and transport details')
  }
  if (seasonReality < 7) {
    recommendations.push('Include more season/weather/crowd reality')
  }
  if (diversity < 10) {
    recommendations.push('Increase regional diversity')
  }
  if (warningQuality < 7) {
    recommendations.push('Add more honest downsides and warnings')
  }
  if (genericPhrases.length > 2) {
    recommendations.push('Reduce generic brochure language')
  }

  return {
    totalScore,
    subScores: {
      routeSpecificity,
      seasonReality,
      budgetHonesty,
      diversity,
      fatigueLogic,
      userFit,
      warningQuality,
      genericLanguagePenalty,
      dataHonesty,
    },
    issues,
    recommendations,
    genericPhrases,
  }
}

export function getQualityGrade(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 70) return 'Acceptable'
  if (score >= 60) return 'Needs Improvement'
  return 'Poor'
}
