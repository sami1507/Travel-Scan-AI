/**
 * Final Recommendation Normalization
 * Ensures clean destinationName (country only) and proper route separation
 * Must run before contract validation, Google Places enrichment, and UI response
 */

export interface RecommendationToNormalize {
  destinationName?: string
  title?: string
  suggestedRoute?: string[] | string
  routeDisplayName?: string
  whyChosen?: string
  whyBetterThanAlternatives?: string
  watchOut?: string
  bestFor?: string
  summary?: string
  [key: string]: any
}

/**
 * Normalize a single final recommendation
 * Guarantees clean destinationName (country only) and proper route separation
 */
export function normalizeFinalRecommendation(
  recommendation: RecommendationToNormalize
): RecommendationToNormalize {
  if (!recommendation) return recommendation

  let destinationName = recommendation.destinationName || recommendation.title || ''
  let suggestedRoute = recommendation.suggestedRoute || []
  let routeDisplayName = recommendation.routeDisplayName || ''

  // Convert suggestedRoute to array if string
  if (typeof suggestedRoute === 'string') {
    suggestedRoute = suggestedRoute
      .split(/[,→]/)
      .map(s => s.trim())
      .filter(Boolean)
  }

  // Extract country and route from dirty destinationName
  // Examples:
  // "Portugal - Lisbon → Porto → Coimbra" → country="Portugal", route=["Lisbon", "Porto", "Coimbra"]
  // "Italy - Rome → Florence → Bologna" → country="Italy", route=["Rome", "Florence", "Bologna"]
  if (destinationName.includes(' - ') || destinationName.includes('→')) {
    // Split by " - " to separate country from route
    const parts = destinationName.split(' - ')
    const country = parts[0].trim()
    const routePart = parts.slice(1).join(' - ').trim()

    // Extract cities from route part
    if (routePart && routePart.includes('→')) {
      const cities = routePart
        .split('→')
        .map(s => s.trim())
        .filter(Boolean)

      if (cities.length > 0) {
        suggestedRoute = cities
        routeDisplayName = cities.join(' → ')
      }
    }

    destinationName = country
  }

  // If destinationName still contains →, extract route
  if (destinationName.includes('→')) {
    const cities = destinationName
      .split('→')
      .map(s => s.trim())
      .filter(Boolean)

    if (cities.length > 1) {
      // First part is likely country
      destinationName = cities[0]
      suggestedRoute = cities
      routeDisplayName = cities.join(' → ')
    }
  }

  // Clean destinationName - remove any remaining route separators
  destinationName = destinationName
    .replace(/→/g, '')
    .replace(/\s+-\s+/g, '')
    .trim()
    .replace(/\s+/g, ' ')

  // Ensure routeDisplayName is set if suggestedRoute exists
  if (Array.isArray(suggestedRoute) && suggestedRoute.length > 0 && !routeDisplayName) {
    routeDisplayName = suggestedRoute.join(' → ')
  }

  // Normalize text fields
  const normalizedRec = {
    ...recommendation,
    destinationName,
    suggestedRoute: Array.isArray(suggestedRoute) ? suggestedRoute : [],
    routeDisplayName,
  }

  // Normalize all text fields
  return normalizeRecommendationTextFields(normalizedRec)
}

/**
 * Normalize text fields to fix broken spacing and formatting
 */
export function normalizeRecommendationTextFields(
  recommendation: RecommendationToNormalize
): RecommendationToNormalize {
  const textFields = [
    'destinationName',
    'title',
    'routeDisplayName',
    'whyChosen',
    'whyBetterThanAlternatives',
    'watchOut',
    'bestFor',
    'summary',
    'routeLogic',
    'transportationTips',
  ]

  const normalized = { ...recommendation }

  for (const field of textFields) {
    if (typeof normalized[field] === 'string') {
      normalized[field] = normalizeText(normalized[field])
    }
  }

  // Normalize nested arrays of strings
  if (Array.isArray(normalized.suggestedRoute)) {
    normalized.suggestedRoute = normalized.suggestedRoute.map(city =>
      typeof city === 'string' ? normalizeText(city) : city
    )
  }

  return normalized
}

/**
 * Normalize a single text string
 */
function normalizeText(text: string): string {
  if (!text) return text

  return (
    text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Normalize route separators
      .replace(/\s*→\s*/g, ' → ')
      .replace(/\s*-\s*/g, ' - ')
      // Trim
      .trim()
  )
}

/**
 * Normalize all recommendations in an analysis
 */
export function normalizeAllRecommendations(
  recommendations: RecommendationToNormalize[]
): RecommendationToNormalize[] {
  if (!Array.isArray(recommendations)) return []
  return recommendations.map(rec => normalizeFinalRecommendation(rec))
}
