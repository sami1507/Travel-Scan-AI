// Feature Engineering Layer - extracts and normalizes features for ML
import type { UserPreferenceProfile } from '../types/preferences'
import type { UserFeedback } from '../types/feedback'
import type { RankedDestination } from '../analysis/schemas'
import type { UserFeatures, ItemFeatures, ContextFeatures } from './schemas'
import { logger } from '../utils'

export class FeatureEngineer {
  /**
   * Extract user features from profile and feedback history
   */
  extractUserFeatures(
    userProfile: UserPreferenceProfile | null,
    feedbackHistory: UserFeedback[]
  ): UserFeatures {
    const features: UserFeatures = {
      // Explicit preferences from profile (UserPreferenceProfile uses numeric preferences, not enums)
      explicitBudget: this.inferBudgetFromSensitivity(userProfile?.explicit_preferences?.budget_sensitivity),
      explicitInterests: userProfile?.inferred_preferences?.preferred_interests || [],
      explicitTravelStyle: undefined, // Not directly stored in UserPreferenceProfile
      explicitPace: undefined, // Not directly stored in UserPreferenceProfile

      // Inferred preferences
      inferredBudgetSensitivity: this.calculateBudgetSensitivity(feedbackHistory),
      inferredNightlifePreference: this.calculateInterestPreference(feedbackHistory, 'nightlife'),
      inferredNaturePreference: this.calculateInterestPreference(feedbackHistory, 'nature'),
      inferredSafetyImportance: this.calculateSafetyImportance(feedbackHistory),
      inferredAccommodationPreference: this.inferAccommodationPreference(feedbackHistory),

      // Historical interaction features
      totalFeedbackCount: feedbackHistory.length,
      thumbsUpCount: feedbackHistory.filter(f => f.feedback_type === 'thumbs-up').length,
      thumbsDownCount: feedbackHistory.filter(f => f.feedback_type === 'thumbs-down').length,
      savedTripsCount: feedbackHistory.filter(f => f.feedback_type === 'save-trip').length,
      dismissedCount: feedbackHistory.filter(f => f.feedback_type === 'dismiss-recommendation').length,
      viewedDetailsCount: feedbackHistory.filter(f => f.feedback_type === 'view-details').length,

      // Preference confidence
      preferenceConfidence: this.calculatePreferenceConfidence(feedbackHistory),
      feedbackRecency: this.calculateFeedbackRecency(feedbackHistory),
    }

    return features
  }

  /**
   * Extract item features from destination recommendation
   */
  extractItemFeatures(
    destination: RankedDestination,
    rank: number,
    routeQuality?: {
      coherence: number
      transferSimplicity: number
      transportConvenience: number
      budgetEfficiency: number
      seasonalCompatibility: number
      destinationSynergy: number
      fatiguePenalty: number
      totalRouteQuality: number
    }
  ): ItemFeatures {
    const features: ItemFeatures = {
      // Destination identity
      destinationId: destination.destinationId,
      destinationName: destination.destinationName,
      destinationType: destination.destinationType,

      // Score features
      totalMatchScore: destination.totalMatchScore,
      budgetFitScore: destination.categoryScores.budgetFit,
      weatherFitScore: destination.categoryScores.weatherFit,
      passportEaseScore: destination.categoryScores.passportEase,
      nightlifeScore: destination.categoryScores.nightlife,
      natureScore: destination.categoryScores.nature,
      transportScore: destination.categoryScores.transport,
      hotelValueScore: destination.categoryScores.hotelValue,
      safetyScore: destination.categoryScores.safety,
      flightValueScore: destination.categoryScores.flightValue,

      // Route quality features
      routeCoherence: routeQuality?.coherence,
      routeTransferSimplicity: routeQuality?.transferSimplicity,
      routeTransportConvenience: routeQuality?.transportConvenience,
      routeBudgetEfficiency: routeQuality?.budgetEfficiency,
      routeSeasonalCompatibility: routeQuality?.seasonalCompatibility,
      routeDestinationSynergy: routeQuality?.destinationSynergy,
      routeFatiguePenalty: routeQuality?.fatiguePenalty,
      totalRouteQuality: routeQuality?.totalRouteQuality,

      // Accommodation features
      hotelValueLevel: destination.hotelValueLevel,
      apartmentSuitability: this.estimateApartmentSuitability(destination),
      rentalSuitability: this.estimateRentalSuitability(destination),

      // Evidence quality
      dataQuality: destination.dataQuality,
      sourceCount: destination.sourceLabels.length,
      evidenceStrength: this.calculateEvidenceStrength(destination),
      confidence: destination.confidence,

      // Ranking position
      recommendationRank: rank,
    }

    return features
  }

  /**
   * Extract context features from query and constraints
   */
  extractContextFeatures(queryContext: {
    query: string
    budget?: string
    travelMonths?: number[]
    interests?: string[]
    travelStyle?: string
    pace?: string
  }): ContextFeatures {
    const features: ContextFeatures = {
      // Timing context
      travelMonths: queryContext.travelMonths,
      seasonalContext: this.inferSeason(queryContext.travelMonths),
      isFlexibleTiming: !queryContext.travelMonths || queryContext.travelMonths.length > 3,

      // Budget context
      budgetLevel: (queryContext.budget as any) || 'moderate',
      budgetFlexibility: this.inferBudgetFlexibility(queryContext.query),

      // Interest context
      primaryInterests: queryContext.interests,
      interestDiversity: this.calculateInterestDiversity(queryContext.interests),

      // Query complexity
      queryLength: queryContext.query.length,
      querySpecificity: this.calculateQuerySpecificity(queryContext.query),
      hasExplicitDestination: this.hasExplicitDestination(queryContext.query),

      // Contradiction indicators
      hasContradictions: this.detectContradictions(queryContext),
      contradictionScore: this.calculateContradictionScore(queryContext),
    }

    return features
  }

  /**
   * Normalize features for ML consumption
   */
  normalizeFeatures(features: {
    user: UserFeatures
    item: ItemFeatures
    context: ContextFeatures
  }): Record<string, number> {
    const normalized: Record<string, number> = {}

    // User features (normalized to 0-1)
    normalized.user_budget_sensitivity = features.user.inferredBudgetSensitivity || 0.5
    normalized.user_nightlife_pref = features.user.inferredNightlifePreference || 0.5
    normalized.user_nature_pref = features.user.inferredNaturePreference || 0.5
    normalized.user_safety_importance = features.user.inferredSafetyImportance || 0.5
    normalized.user_feedback_count = Math.min(features.user.totalFeedbackCount / 50, 1.0)
    normalized.user_thumbs_up_rate = features.user.totalFeedbackCount > 0
      ? features.user.thumbsUpCount / features.user.totalFeedbackCount
      : 0.5
    normalized.user_preference_confidence = features.user.preferenceConfidence

    // Item features (normalized to 0-1)
    normalized.item_total_score = features.item.totalMatchScore / 100
    normalized.item_budget_fit = features.item.budgetFitScore / 10
    normalized.item_weather_fit = features.item.weatherFitScore / 10
    normalized.item_nightlife = features.item.nightlifeScore / 10
    normalized.item_nature = features.item.natureScore / 10
    normalized.item_safety = features.item.safetyScore / 10
    normalized.item_hotel_value = features.item.hotelValueScore / 10
    normalized.item_evidence_strength = features.item.evidenceStrength
    normalized.item_confidence = features.item.confidence
    normalized.item_rank_position = 1 / features.item.recommendationRank // Higher rank = higher value

    // Route features (if available)
    if (features.item.totalRouteQuality !== undefined) {
      normalized.item_route_quality = features.item.totalRouteQuality / 100
      normalized.item_route_coherence = (features.item.routeCoherence || 0) / 10
      normalized.item_route_fatigue = (features.item.routeFatiguePenalty || 10) / 10
    }

    // Context features
    normalized.context_budget_flexibility = features.context.budgetFlexibility
    normalized.context_timing_flexibility = features.context.isFlexibleTiming ? 1.0 : 0.0
    normalized.context_query_specificity = features.context.querySpecificity
    normalized.context_interest_diversity = features.context.interestDiversity
    normalized.context_has_contradictions = features.context.hasContradictions ? 1.0 : 0.0

    return normalized
  }

  // Private helper methods

  private inferBudgetFromSensitivity(sensitivity?: number): 'low' | 'moderate' | 'high' | 'luxury' | undefined {
    if (sensitivity === undefined) return undefined
    if (sensitivity <= 3) return 'low'
    if (sensitivity <= 6) return 'moderate'
    if (sensitivity <= 8) return 'high'
    return 'luxury'
  }

  private calculateBudgetSensitivity(feedback: UserFeedback[]): number {
    const budgetRelatedFeedback = feedback.filter(f => 
      f.feedback_metadata?.comment?.toLowerCase().includes('expensive') ||
      f.feedback_metadata?.comment?.toLowerCase().includes('cheap') ||
      f.feedback_metadata?.comment?.toLowerCase().includes('budget')
    )

    if (budgetRelatedFeedback.length === 0) return 0.5

    const negativeBudgetFeedback = budgetRelatedFeedback.filter(f =>
      f.feedback_type === 'thumbs-down' ||
      f.feedback_metadata?.comment?.toLowerCase().includes('too expensive')
    )

    return negativeBudgetFeedback.length / budgetRelatedFeedback.length
  }

  private calculateInterestPreference(feedback: UserFeedback[], interest: string): number {
    const interestFeedback = feedback.filter(f =>
      f.query_context?.interests?.some(i => i.toLowerCase().includes(interest))
    )

    if (interestFeedback.length === 0) return 0.5

    const positiveFeedback = interestFeedback.filter(f =>
      f.feedback_type === 'thumbs-up' || f.feedback_type === 'save-trip'
    )

    return positiveFeedback.length / interestFeedback.length
  }

  private calculateSafetyImportance(feedback: UserFeedback[]): number {
    const safetyMentions = feedback.filter(f =>
      f.feedback_metadata?.comment?.toLowerCase().includes('safe') ||
      f.feedback_metadata?.comment?.toLowerCase().includes('danger') ||
      f.feedback_metadata?.comment?.toLowerCase().includes('security')
    )

    return Math.min(safetyMentions.length / 10, 1.0)
  }

  private inferAccommodationPreference(feedback: UserFeedback[]): 'hotel' | 'apartment' | 'mixed' {
    const hotelMentions = feedback.filter(f =>
      f.feedback_metadata?.comment?.toLowerCase().includes('hotel')
    ).length

    const apartmentMentions = feedback.filter(f =>
      f.feedback_metadata?.comment?.toLowerCase().includes('apartment') ||
      f.feedback_metadata?.comment?.toLowerCase().includes('rental')
    ).length

    if (apartmentMentions > hotelMentions * 1.5) return 'apartment'
    if (hotelMentions > apartmentMentions * 1.5) return 'hotel'
    return 'mixed'
  }

  private calculatePreferenceConfidence(feedback: UserFeedback[]): number {
    if (feedback.length < 3) return 0.1
    if (feedback.length < 5) return 0.3
    if (feedback.length < 10) return 0.5
    if (feedback.length < 20) return 0.7
    return 0.9
  }

  private calculateFeedbackRecency(feedback: UserFeedback[]): number | undefined {
    if (feedback.length === 0) return undefined

    const mostRecent = feedback.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    const daysSince = (Date.now() - new Date(mostRecent.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return Math.floor(daysSince)
  }

  private estimateApartmentSuitability(destination: RankedDestination): number {
    // Apartments are more suitable for longer stays, families, and budget-conscious travelers
    let suitability = 5 // Base score

    // Higher for cities
    if (destination.destinationType === 'city') suitability += 2

    // Higher for good transport (easier to navigate)
    if (destination.categoryScores.transport >= 7) suitability += 1

    // Higher for budget-conscious
    if (destination.categoryScores.budgetFit >= 7) suitability += 1

    // Lower for luxury destinations
    if (destination.estimatedBudgetLevel === 'luxury') suitability -= 2

    return Math.max(0, Math.min(10, suitability))
  }

  private estimateRentalSuitability(destination: RankedDestination): number {
    // Rentals are suitable for nature destinations, longer stays, families
    let suitability = 5 // Base score

    // Higher for nature destinations
    if (destination.categoryScores.nature >= 7) suitability += 2

    // Higher for relaxed pace (implied by lower nightlife)
    if (destination.categoryScores.nightlife <= 5) suitability += 1

    // Higher for good transport
    if (destination.categoryScores.transport >= 6) suitability += 1

    return Math.max(0, Math.min(10, suitability))
  }

  private calculateEvidenceStrength(destination: RankedDestination): number {
    let strength = 0

    // Data quality
    if (destination.dataQuality === 'knowledge-based') strength += 0.4
    else if (destination.dataQuality === 'estimated') strength += 0.2

    // Source diversity
    strength += Math.min(destination.sourceLabels.length * 0.15, 0.3)

    // Reason quality
    const specificReasons = destination.whyRecommended.filter(r => r.length > 30)
    strength += Math.min(specificReasons.length * 0.1, 0.3)

    return Math.min(strength, 1.0)
  }

  private inferSeason(months?: number[]): 'spring' | 'summer' | 'fall' | 'winter' | undefined {
    if (!months || months.length === 0) return undefined

    const avgMonth = months.reduce((sum, m) => sum + m, 0) / months.length

    if (avgMonth >= 3 && avgMonth <= 5) return 'spring'
    if (avgMonth >= 6 && avgMonth <= 8) return 'summer'
    if (avgMonth >= 9 && avgMonth <= 11) return 'fall'
    return 'winter'
  }

  private inferBudgetFlexibility(query: string): number {
    const flexiblePhrases = ['flexible', 'around', 'approximately', 'roughly', 'about']
    const strictPhrases = ['exactly', 'must', 'maximum', 'limit', 'strict']

    const hasFlexible = flexiblePhrases.some(p => query.toLowerCase().includes(p))
    const hasStrict = strictPhrases.some(p => query.toLowerCase().includes(p))

    if (hasFlexible && !hasStrict) return 0.8
    if (hasStrict && !hasFlexible) return 0.2
    return 0.5
  }

  private calculateInterestDiversity(interests?: string[]): number {
    if (!interests || interests.length === 0) return 0
    if (interests.length === 1) return 0.2
    if (interests.length === 2) return 0.5
    if (interests.length === 3) return 0.7
    return 1.0
  }

  private calculateQuerySpecificity(query: string): number {
    let specificity = 0

    // Length indicates detail
    if (query.length > 100) specificity += 0.3
    else if (query.length > 50) specificity += 0.2
    else if (query.length > 20) specificity += 0.1

    // Specific keywords
    const specificKeywords = ['want', 'need', 'looking for', 'prefer', 'must have', 'specifically']
    const hasSpecific = specificKeywords.some(k => query.toLowerCase().includes(k))
    if (hasSpecific) specificity += 0.3

    // Numbers indicate specificity
    if (/\d+/.test(query)) specificity += 0.2

    // Proper nouns (capitalized words) indicate specific places
    const capitalizedWords = query.match(/[A-Z][a-z]+/g) || []
    if (capitalizedWords.length > 0) specificity += 0.2

    return Math.min(specificity, 1.0)
  }

  private hasExplicitDestination(query: string): boolean {
    // Simple heuristic: check for capitalized words that might be place names
    const capitalizedWords = query.match(/[A-Z][a-z]+/g) || []
    return capitalizedWords.length > 0
  }

  private detectContradictions(context: any): boolean {
    // Check for obvious contradictions
    if (context.budget === 'low' && context.interests?.includes('luxury')) return true
    if (context.pace === 'relaxed' && context.interests?.includes('adventure')) return true
    if (context.travelMonths?.length > 6) return true // Too broad timing
    return false
  }

  private calculateContradictionScore(context: any): number {
    let score = 0

    // Budget vs interests contradiction
    if (context.budget === 'low' && context.interests?.includes('luxury')) score += 0.5
    if (context.budget === 'luxury' && context.interests?.includes('budget')) score += 0.5

    // Pace vs interests contradiction
    if (context.pace === 'relaxed' && context.interests?.includes('adventure')) score += 0.3
    if (context.pace === 'fast' && context.interests?.includes('relaxation')) score += 0.3

    // Timing contradiction (too broad)
    if (context.travelMonths?.length > 6) score += 0.2

    return Math.min(score, 1.0)
  }
}

export const featureEngineer = new FeatureEngineer()
