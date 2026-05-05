// Accommodation Type Recommender - ML + rules for hotel vs apartment vs rental
import type { RankedDestination } from '../../analysis/schemas'
import { logger } from '../../utils'

export type AccommodationType = 'hotel' | 'apartment' | 'vacation-rental' | 'aparthotel' | 'short-term-stay'

export interface AccommodationRecommendation {
  primaryType: AccommodationType
  secondaryType?: AccommodationType
  confidence: number
  reasons: string[]
  suitabilityScores: Record<AccommodationType, number>
  dataQuality: 'strong' | 'moderate' | 'weak'
}

export class AccommodationRecommender {
  /**
   * Recommend accommodation type based on trip characteristics
   */
  recommendAccommodationType(
    destination: RankedDestination,
    tripContext: {
      budget?: string
      travelMonths?: number[]
      travelStyle?: string
      pace?: string
      tripDuration?: number // days
    }
  ): AccommodationRecommendation {
    logger.info('Accommodation Recommender: Analyzing accommodation type', {
      destination: destination.destinationName,
      budget: tripContext.budget,
      travelStyle: tripContext.travelStyle,
    })

    // Calculate suitability scores for each type
    const suitabilityScores: Record<AccommodationType, number> = {
      hotel: this.calculateHotelSuitability(destination, tripContext),
      apartment: this.calculateApartmentSuitability(destination, tripContext),
      'vacation-rental': this.calculateVacationRentalSuitability(destination, tripContext),
      aparthotel: this.calculateAparthotelSuitability(destination, tripContext),
      'short-term-stay': this.calculateShortTermStaySuitability(destination, tripContext),
    }

    // Sort by suitability
    const sorted = Object.entries(suitabilityScores)
      .sort((a, b) => b[1] - a[1])
      .map(([type, score]) => ({ type: type as AccommodationType, score }))

    const primaryType = sorted[0].type
    const secondaryType = sorted[1].score > 0.6 ? sorted[1].type : undefined

    // Calculate confidence
    const confidence = this.calculateConfidence(sorted[0].score, sorted[1].score, destination)

    // Generate reasons
    const reasons = this.generateReasons(primaryType, destination, tripContext)

    // Determine data quality
    const dataQuality = this.assessDataQuality(destination)

    return {
      primaryType,
      secondaryType,
      confidence,
      reasons,
      suitabilityScores,
      dataQuality,
    }
  }

  /**
   * Calculate hotel suitability (0-1)
   */
  private calculateHotelSuitability(
    destination: RankedDestination,
    context: any
  ): number {
    let score = 0.5 // Base score

    // Hotels are good for short trips
    if (context.tripDuration && context.tripDuration <= 3) score += 0.2

    // Hotels are good for luxury budgets
    if (context.budget === 'luxury' || context.budget === 'high') score += 0.15

    // Hotels are good for fast-paced trips
    if (context.pace === 'fast') score += 0.1

    // Hotels are good for business/solo travel
    if (context.travelStyle === 'solo') score += 0.05

    // Hotels are good for high nightlife destinations
    if (destination.categoryScores.nightlife >= 7) score += 0.1

    // Hotels have good service (implied by hotel value score)
    if (destination.categoryScores.hotelValue >= 7) score += 0.1

    return Math.min(score, 1.0)
  }

  /**
   * Calculate apartment suitability (0-1)
   */
  private calculateApartmentSuitability(
    destination: RankedDestination,
    context: any
  ): number {
    let score = 0.4 // Base score

    // Apartments are good for longer stays
    if (context.tripDuration && context.tripDuration >= 5) score += 0.2

    // Apartments are good for budget-conscious travelers
    if (context.budget === 'low' || context.budget === 'moderate') score += 0.15

    // Apartments are good for families
    if (context.travelStyle === 'family') score += 0.15

    // Apartments are good for cities (easier to navigate)
    if (destination.destinationType === 'city') score += 0.1

    // Apartments are good for good transport (can cook, shop)
    if (destination.categoryScores.transport >= 7) score += 0.1

    // Apartments are good for relaxed pace
    if (context.pace === 'relaxed') score += 0.05

    return Math.min(score, 1.0)
  }

  /**
   * Calculate vacation rental suitability (0-1)
   */
  private calculateVacationRentalSuitability(
    destination: RankedDestination,
    context: any
  ): number {
    let score = 0.3 // Base score

    // Rentals are great for long stays
    if (context.tripDuration && context.tripDuration >= 7) score += 0.25

    // Rentals are great for nature destinations
    if (destination.categoryScores.nature >= 7) score += 0.2

    // Rentals are great for families and groups
    if (context.travelStyle === 'family' || context.travelStyle === 'friends') score += 0.15

    // Rentals are good for relaxed pace
    if (context.pace === 'relaxed' || context.pace === 'moderate') score += 0.1

    // Rentals are good for budget-conscious (for groups)
    if (context.budget === 'moderate') score += 0.05

    return Math.min(score, 1.0)
  }

  /**
   * Calculate aparthotel suitability (0-1)
   */
  private calculateAparthotelSuitability(
    destination: RankedDestination,
    context: any
  ): number {
    let score = 0.4 // Base score

    // Aparthotels are good for medium stays
    if (context.tripDuration && context.tripDuration >= 4 && context.tripDuration <= 10) score += 0.2

    // Aparthotels are good for moderate budgets
    if (context.budget === 'moderate' || context.budget === 'high') score += 0.15

    // Aparthotels are good for couples
    if (context.travelStyle === 'couple') score += 0.1

    // Aparthotels are good for cities
    if (destination.destinationType === 'city') score += 0.1

    // Aparthotels balance service and space
    if (destination.categoryScores.hotelValue >= 6) score += 0.05

    return Math.min(score, 1.0)
  }

  /**
   * Calculate short-term stay suitability (0-1)
   */
  private calculateShortTermStaySuitability(
    destination: RankedDestination,
    context: any
  ): number {
    let score = 0.3 // Base score

    // Short-term stays are good for very long trips
    if (context.tripDuration && context.tripDuration >= 14) score += 0.3

    // Short-term stays are good for budget travelers
    if (context.budget === 'low') score += 0.2

    // Short-term stays are good for solo travelers
    if (context.travelStyle === 'solo') score += 0.1

    // Short-term stays are good for cities with good transport
    if (destination.destinationType === 'city' && destination.categoryScores.transport >= 7) {
      score += 0.1
    }

    return Math.min(score, 1.0)
  }

  /**
   * Calculate confidence in recommendation
   */
  private calculateConfidence(
    topScore: number,
    secondScore: number,
    destination: RankedDestination
  ): number {
    // Higher confidence if clear winner
    const scoreDifference = topScore - secondScore
    let confidence = 0.5 + scoreDifference * 0.5

    // Higher confidence if we have good data
    if (destination.dataQuality === 'knowledge-based') confidence += 0.1
    if (destination.categoryScores.hotelValue >= 7) confidence += 0.1

    // Lower confidence if data is weak
    if (destination.dataQuality === 'demo' || destination.dataQuality === 'estimated') {
      confidence -= 0.2
    }

    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Generate reasons for recommendation
   */
  private generateReasons(
    type: AccommodationType,
    destination: RankedDestination,
    context: any
  ): string[] {
    const reasons: string[] = []

    if (type === 'hotel') {
      if (context.tripDuration && context.tripDuration <= 3) {
        reasons.push('Hotels are ideal for short stays with full service')
      }
      if (context.budget === 'luxury' || context.budget === 'high') {
        reasons.push('Hotels offer premium amenities for your budget')
      }
      if (destination.categoryScores.nightlife >= 7) {
        reasons.push('Hotels provide convenient access to nightlife')
      }
    } else if (type === 'apartment') {
      if (context.tripDuration && context.tripDuration >= 5) {
        reasons.push('Apartments offer better value for longer stays')
      }
      if (context.travelStyle === 'family') {
        reasons.push('Apartments provide space and kitchen facilities for families')
      }
      if (destination.categoryScores.transport >= 7) {
        reasons.push('Good public transport makes apartment living convenient')
      }
    } else if (type === 'vacation-rental') {
      if (context.tripDuration && context.tripDuration >= 7) {
        reasons.push('Vacation rentals are cost-effective for week-long stays')
      }
      if (destination.categoryScores.nature >= 7) {
        reasons.push('Rentals offer immersive experience in nature destinations')
      }
      if (context.travelStyle === 'family' || context.travelStyle === 'friends') {
        reasons.push('Rentals provide privacy and space for groups')
      }
    } else if (type === 'aparthotel') {
      if (context.tripDuration && context.tripDuration >= 4) {
        reasons.push('Aparthotels balance hotel service with apartment space')
      }
      if (context.budget === 'moderate') {
        reasons.push('Aparthotels offer good value with flexibility')
      }
    } else if (type === 'short-term-stay') {
      if (context.tripDuration && context.tripDuration >= 14) {
        reasons.push('Short-term stays are economical for extended trips')
      }
      if (context.budget === 'low') {
        reasons.push('Short-term stays maximize budget efficiency')
      }
    }

    return reasons
  }

  /**
   * Assess data quality for accommodation recommendations
   */
  private assessDataQuality(destination: RankedDestination): 'strong' | 'moderate' | 'weak' {
    if (destination.dataQuality === 'knowledge-based' && destination.categoryScores.hotelValue >= 7) {
      return 'strong'
    }
    if (destination.dataQuality === 'knowledge-based' || destination.categoryScores.hotelValue >= 5) {
      return 'moderate'
    }
    return 'weak'
  }
}

export const accommodationRecommender = new AccommodationRecommender()
