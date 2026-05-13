// Recommendation Quality Layer - improves candidate generation, ranking, and filtering
import type { RankedDestination } from '../analysis/schemas'
import type { UserPreferenceProfile } from '../types/preferences'
import { logger } from '../utils'

export interface QualityMetrics {
  relevanceScore: number
  evidenceStrength: number
  distinctiveness: number
  explanationQuality: number
  confidenceCalibration: number
  overallQuality: number
}

export interface RecommendationCandidate extends RankedDestination {
  qualityMetrics: QualityMetrics
  comparisonReason?: string
  filterReason?: string
}

export class RecommendationQualityLayer {
  private readonly MIN_QUALITY_THRESHOLD = 0.6
  private readonly TARGET_RECOMMENDATION_COUNT = 3
  private readonly MIN_DISTINCTIVENESS_SCORE = 0.4

  /**
   * Filter and rank candidates to return only the top 3 strongest recommendations
   */
  async improveRecommendations(
    candidates: RankedDestination[],
    userConstraints: {
      budget?: string
      travelMonths?: number[]
      interests?: string[]
      travelStyle?: string
      pace?: string
    },
    userProfile?: UserPreferenceProfile
  ): Promise<RecommendationCandidate[]> {
    logger.info('Quality Layer: Starting recommendation improvement', {
      candidateCount: candidates.length,
    })

    // Step 1: Calculate quality metrics for each candidate
    const enrichedCandidates = candidates.map(candidate =>
      this.enrichWithQualityMetrics(candidate, userConstraints, userProfile)
    )

    // Step 2: Filter out low-quality recommendations
    const filteredCandidates = enrichedCandidates.filter(candidate => {
      const shouldKeep = this.shouldKeepRecommendation(candidate, userConstraints)
      if (!shouldKeep && candidate.filterReason) {
        logger.info('Quality Layer: Filtered out recommendation', {
          destination: candidate.destinationName,
          reason: candidate.filterReason,
        })
      }
      return shouldKeep
    })

    // Step 3: Ensure distinctiveness - remove too-similar destinations
    const distinctCandidates = this.ensureDistinctiveness(filteredCandidates)

    // Step 4: Re-rank with quality-aware scoring
    const reranked = this.qualityAwareRerank(distinctCandidates, userConstraints, userProfile)

    // Step 5: Return top 3 strongest recommendations
    const topRecommendations = reranked.slice(0, this.TARGET_RECOMMENDATION_COUNT)

    logger.info('Quality Layer: Recommendations improved', {
      original: candidates.length,
      filtered: filteredCandidates.length,
      distinct: distinctCandidates.length,
      final: topRecommendations.length,
    })

    return topRecommendations
  }

  /**
   * Calculate quality metrics for a recommendation
   */
  private enrichWithQualityMetrics(
    candidate: RankedDestination,
    userConstraints: any,
    userProfile?: UserPreferenceProfile
  ): RecommendationCandidate {
    const relevanceScore = this.calculateRelevanceScore(candidate, userConstraints)
    const evidenceStrength = this.calculateEvidenceStrength(candidate)
    const explanationQuality = this.calculateExplanationQuality(candidate)
    const confidenceCalibration = this.calculateConfidenceCalibration(candidate)

    const overallQuality =
      relevanceScore * 0.35 +
      evidenceStrength * 0.25 +
      explanationQuality * 0.2 +
      confidenceCalibration * 0.2

    return {
      ...candidate,
      qualityMetrics: {
        relevanceScore,
        evidenceStrength,
        distinctiveness: 1.0, // Will be calculated later
        explanationQuality,
        confidenceCalibration,
        overallQuality,
      },
    }
  }

  /**
   * Calculate how relevant the recommendation is to user constraints
   */
  private calculateRelevanceScore(candidate: RankedDestination, userConstraints: any): number {
    let score = 0
    let factors = 0

    // Budget fit
    if (userConstraints.budget && candidate.categoryScores) {
      const budgetScore = (candidate.categoryScores.budgetFit || 0) / 10
      score += budgetScore
      factors++
    }

    // Weather/timing fit
    if (userConstraints.travelMonths && userConstraints.travelMonths.length > 0 && candidate.bestMonths) {
      const hasGoodMonth = candidate.bestMonths.some(month =>
        userConstraints.travelMonths.includes(month)
      )
      score += hasGoodMonth ? 1.0 : 0.3
      factors++
    }

    // Interest alignment
    if (userConstraints.interests && userConstraints.interests.length > 0) {
      const interestScore = this.calculateInterestAlignment(
        candidate,
        userConstraints.interests
      )
      score += interestScore
      factors++
    }

    // Safety consideration
    if (candidate.categoryScores.safety < 5) {
      score *= 0.8 // Penalty for low safety
    }

    return factors > 0 ? score / factors : 0.5
  }

  /**
   * Calculate interest alignment score
   */
  private calculateInterestAlignment(candidate: RankedDestination, interests: string[]): number {
    const interestMap: Record<string, keyof typeof candidate.categoryScores> = {
      nightlife: 'nightlife',
      nature: 'nature',
      culture: 'nature', // Approximate
      adventure: 'nature',
      relaxation: 'nature',
    }

    let alignmentScore = 0
    let matchedInterests = 0

    for (const interest of interests) {
      const scoreKey = interestMap[interest.toLowerCase()]
      if (scoreKey && candidate.categoryScores[scoreKey]) {
        alignmentScore += candidate.categoryScores[scoreKey] / 10
        matchedInterests++
      }
    }

    return matchedInterests > 0 ? alignmentScore / matchedInterests : 0.5
  }

  /**
   * Calculate evidence strength based on data quality and sources
   */
  private calculateEvidenceStrength(candidate: RankedDestination): number {
    let strength = 0

    // Data quality factor
    if (candidate.dataQuality === 'knowledge-based') {
      strength += 0.4
    } else if (candidate.dataQuality === 'estimated') {
      strength += 0.2
    }

    // Source diversity
    const uniqueSources = new Set(candidate.sourceLabels)
    strength += Math.min(uniqueSources.size * 0.15, 0.3)

    // Reason quality (specific vs generic)
    const specificReasons = candidate.whyRecommended.filter(
      reason => reason.length > 30 && !this.isGenericReason(reason)
    )
    strength += Math.min(specificReasons.length * 0.1, 0.3)

    return Math.min(strength, 1.0)
  }

  /**
   * Check if a reason is too generic
   */
  private isGenericReason(reason: string): boolean {
    const genericPhrases = [
      'great destination',
      'popular choice',
      'good option',
      'worth visiting',
      'nice place',
      'interesting location',
    ]
    return genericPhrases.some(phrase => reason.toLowerCase().includes(phrase))
  }

  /**
   * Calculate explanation quality
   */
  private calculateExplanationQuality(candidate: RankedDestination): number {
    let quality = 0

    // Check for specific reasons
    const hasSpecificReasons = candidate.whyRecommended.length >= 2
    if (hasSpecificReasons) quality += 0.4

    // Check for balanced view (reasons + downsides)
    const hasDownsides = candidate.possibleDownsides.length > 0
    if (hasDownsides) quality += 0.3

    // Check for evidence-backed reasons (mentions scores, data, etc.)
    const evidenceBacked = candidate.whyRecommended.some(reason =>
      /\d+|score|data|based on|according to/i.test(reason)
    )
    if (evidenceBacked) quality += 0.3

    return quality
  }

  /**
   * Calculate confidence calibration (is confidence realistic?)
   */
  private calculateConfidenceCalibration(candidate: RankedDestination): number {
    let calibration = 1.0

    // Penalize overconfidence with weak evidence
    if (candidate.confidence > 0.8 && candidate.dataQuality !== 'knowledge-based') {
      calibration -= 0.3
    }

    // Penalize overconfidence with few sources
    if (candidate.confidence > 0.7 && candidate.sourceLabels.length < 2) {
      calibration -= 0.2
    }

    // Penalize overconfidence with low category scores
    const avgCategoryScore =
      Object.values(candidate.categoryScores).reduce((sum, score) => sum + (score || 0), 0) /
      Object.keys(candidate.categoryScores).length
    if (candidate.confidence > 0.8 && avgCategoryScore < 6) {
      calibration -= 0.2
    }

    return Math.max(calibration, 0)
  }

  /**
   * Decide if a recommendation should be kept
   */
  private shouldKeepRecommendation(
    candidate: RecommendationCandidate,
    userConstraints: any
  ): boolean {
    // Filter 1: Overall quality threshold
    if (candidate.qualityMetrics.overallQuality < this.MIN_QUALITY_THRESHOLD) {
      candidate.filterReason = 'Overall quality below threshold'
      return false
    }

    // Filter 2: Budget mismatch
    if (userConstraints.budget) {
      const budgetScore = candidate.categoryScores.budgetFit
      if (budgetScore < 4 && userConstraints.budget !== 'luxury') {
        candidate.filterReason = 'Poor budget fit'
        return false
      }
    }

    // Filter 3: Seasonal mismatch
    if (userConstraints.travelMonths && userConstraints.travelMonths.length > 0 && candidate.bestMonths) {
      const hasAnyGoodMonth = candidate.bestMonths.some(month =>
        userConstraints.travelMonths.includes(month)
      )
      if (!hasAnyGoodMonth && candidate.possibleDownsides?.length === 0) {
        candidate.filterReason = 'Poor seasonal fit without warnings'
        return false
      }
    }

    // Filter 4: Safety concerns without warnings
    if (candidate.categoryScores?.safety < 4 && candidate.possibleDownsides?.length === 0) {
      candidate.filterReason = 'Low safety without adequate warnings'
      return false
    }

    // Filter 5: Weak evidence
    if (candidate.qualityMetrics.evidenceStrength < 0.3) {
      candidate.filterReason = 'Insufficient evidence strength'
      return false
    }

    return true
  }

  /**
   * Ensure recommendations are distinct from each other
   */
  private ensureDistinctiveness(
    candidates: RecommendationCandidate[]
  ): RecommendationCandidate[] {
    const distinct: RecommendationCandidate[] = []
    const seen = new Set<string>()

    for (const candidate of candidates) {
      // Check if too similar to already selected recommendations
      const isTooSimilar = distinct.some(existing => {
        const similarity = this.calculateSimilarity(candidate, existing)
        return similarity > 0.7
      })

      if (!isTooSimilar) {
        const distinctivenessScore = this.calculateDistinctivenessScore(candidate, distinct)
        candidate.qualityMetrics.distinctiveness = distinctivenessScore
        distinct.push(candidate)
      } else {
        candidate.filterReason = 'Too similar to higher-ranked recommendation'
      }
    }

    return distinct
  }

  /**
   * Calculate similarity between two destinations
   */
  private calculateSimilarity(
    dest1: RecommendationCandidate,
    dest2: RecommendationCandidate
  ): number {
    // Same destination
    if (dest1.destinationId === dest2.destinationId) return 1.0

    // Same country (for cities)
    if (
      dest1.destinationType === 'city' &&
      dest2.destinationType === 'city' &&
      dest1.destinationId.split('-')[0] === dest2.destinationId.split('-')[0]
    ) {
      return 0.6
    }

    // Similar category scores
    const scoreKeys = Object.keys(dest1.categoryScores) as Array<keyof typeof dest1.categoryScores>
    let scoreSimilarity = 0
    for (const key of scoreKeys) {
      const score1 = dest1.categoryScores[key] || 0
      const score2 = dest2.categoryScores[key] || 0
      scoreSimilarity += 1 - Math.abs(score1 - score2) / 10
    }
    scoreSimilarity /= scoreKeys.length

    return scoreSimilarity * 0.4
  }

  /**
   * Calculate how distinct a candidate is from existing selections
   */
  private calculateDistinctivenessScore(
    candidate: RecommendationCandidate,
    existing: RecommendationCandidate[]
  ): number {
    if (existing.length === 0) return 1.0

    const similarities = existing.map(e => this.calculateSimilarity(candidate, e))
    const avgSimilarity = similarities.reduce((sum, s) => sum + s, 0) / similarities.length

    return 1 - avgSimilarity
  }

  /**
   * Re-rank with quality-aware scoring
   */
  private qualityAwareRerank(
    candidates: RecommendationCandidate[],
    userConstraints: any,
    userProfile?: UserPreferenceProfile
  ): RecommendationCandidate[] {
    return candidates
      .map(candidate => {
        // Combine original score with quality metrics
        const qualityBoost = candidate.qualityMetrics.overallQuality * 10
        const adjustedScore = candidate.totalMatchScore * 0.7 + qualityBoost * 0.3

        return {
          ...candidate,
          totalMatchScore: adjustedScore,
        }
      })
      .sort((a, b) => {
        // Primary: adjusted score
        if (Math.abs(a.totalMatchScore - b.totalMatchScore) > 2) {
          return b.totalMatchScore - a.totalMatchScore
        }
        // Secondary: quality metrics
        return b.qualityMetrics.overallQuality - a.qualityMetrics.overallQuality
      })
  }
}

export const recommendationQualityLayer = new RecommendationQualityLayer()
