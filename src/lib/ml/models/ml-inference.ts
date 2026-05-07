// ML Inference Layer - Production-safe inference with fallback
import type { RankedDestination } from '../../analysis/schemas'
import type { UserPreferenceProfile } from '../../types/preferences'
import type { UserFeedback } from '../../types/feedback'
import { recommendationRanker } from './recommendation-ranker'
import { accommodationRecommender, type AccommodationRecommendation } from './accommodation-recommender'
import { featureEngineer } from '../feature-engineering'
import { recommendationQualityLayer } from '../../recommendation/quality-layer'
import { pairwiseRanker } from '../../recommendation/pairwise-ranker'
import { shadowModeManager } from '../comparison/shadow-mode'
import { logger } from '../../utils'

export interface MLInferenceResult {
  rankedRecommendations: RankedDestination[]
  accommodationRecommendations: Map<string, AccommodationRecommendation>
  mlUsed: boolean
  fallbackReason?: string
  top3Recommendations: RankedDestination[]
  rankingExplanations: string[]
  comparisonId?: string // Shadow mode comparison ID if enabled
}

export class MLInferenceEngine {
  private mlEnabled = true
  private mlWeight = 0.6 // 60% ML, 40% baseline

  /**
   * Run ML inference with graceful fallback
   */
  async infer(
    destinations: RankedDestination[],
    userProfile: UserPreferenceProfile | null,
    feedbackHistory: UserFeedback[],
    queryContext: {
      query: string
      budget?: string
      travelMonths?: number[]
      interests?: string[]
      travelStyle?: string
      pace?: string
      tripDuration?: number
    }
  ): Promise<MLInferenceResult> {
    logger.info('ML Inference: Starting inference', {
      destinationCount: destinations.length,
      mlEnabled: this.mlEnabled,
    })

    try {
      // Extract features
      const userFeatures = featureEngineer.extractUserFeatures(userProfile, feedbackHistory)
      const contextFeatures = featureEngineer.extractContextFeatures(queryContext)

      let rankedRecommendations: RankedDestination[]
      let mlUsed = false
      let fallbackReason: string | undefined

      // Try ML ranking
      if (this.mlEnabled && destinations.length > 0) {
        try {
          rankedRecommendations = recommendationRanker.hybridRank(
            destinations,
            userFeatures,
            contextFeatures,
            this.mlWeight
          )
          mlUsed = true
          logger.info('ML Inference: ML ranking successful')
        } catch (error) {
          logger.error('ML Inference: ML ranking failed, using fallback', error)
          rankedRecommendations = destinations
          fallbackReason = 'ML ranking unavailable'
        }
      } else {
        rankedRecommendations = destinations
        fallbackReason = this.mlEnabled ? 'No destinations to rank' : 'ML disabled'
      }

      // Apply quality layer to get top 3
      const qualityFiltered = await recommendationQualityLayer.improveRecommendations(
        rankedRecommendations,
        {
          budget: queryContext.budget,
          travelMonths: queryContext.travelMonths,
          interests: queryContext.interests,
          travelStyle: queryContext.travelStyle,
          pace: queryContext.pace,
        },
        userProfile || undefined
      )

      // Apply pairwise ranking for final ordering
      const pairwiseRanked = pairwiseRanker.pairwiseRank(
        qualityFiltered.slice(0, 5), // Top 5 candidates
        {
          budget: queryContext.budget,
          travelMonths: queryContext.travelMonths,
          interests: queryContext.interests,
          travelStyle: queryContext.travelStyle,
          pace: queryContext.pace,
        }
      )

      // Get top 3 strongest recommendations
      const top3Recommendations = pairwiseRanked.slice(0, 3)

      // Run shadow mode comparison (baseline vs ML)
      let comparisonId: string | undefined
      if (mlUsed && destinations.length > 0) {
        try {
          const shadowResult = await shadowModeManager.runShadowComparison(
            destinations.slice(0, 3), // Baseline (original ranking)
            top3Recommendations, // ML (after quality layer + pairwise)
            {
              userId: queryContext.query, // Use query as identifier for now
              query: queryContext.query,
            }
          )
          if (shadowResult) {
            comparisonId = shadowResult.comparisonId
          }
        } catch (error) {
          logger.error('ML Inference: Shadow mode comparison failed', error)
          // Continue without comparison
        }
      }

      // Generate accommodation recommendations for top 3
      const accommodationRecommendations = new Map<string, AccommodationRecommendation>()
      for (const dest of top3Recommendations) {
        try {
          const accomRec = accommodationRecommender.recommendAccommodationType(dest, {
            budget: queryContext.budget,
            travelMonths: queryContext.travelMonths,
            travelStyle: queryContext.travelStyle,
            pace: queryContext.pace,
            tripDuration: queryContext.tripDuration,
          })
          accommodationRecommendations.set(dest.destinationId, accomRec)
        } catch (error) {
          logger.error('ML Inference: Accommodation recommendation failed', error)
          // Continue without accommodation recommendation
        }
      }

      // Generate ranking explanations
      const rankingExplanations = top3Recommendations.map((dest, index) => {
        const rankingReason = (dest as any).rankingReason || 'High overall match score'
        return `#${index + 1}: ${dest.destinationName} - ${rankingReason}`
      })

      logger.info('ML Inference: Inference complete', {
        mlUsed,
        top3Count: top3Recommendations.length,
        accommodationCount: accommodationRecommendations.size,
      })

      return {
        rankedRecommendations,
        accommodationRecommendations,
        mlUsed,
        fallbackReason,
        top3Recommendations,
        rankingExplanations,
        comparisonId,
      }
    } catch (error) {
      logger.error('ML Inference: Critical error, using fallback', error)

      // Complete fallback - return original destinations
      return {
        rankedRecommendations: destinations,
        accommodationRecommendations: new Map(),
        mlUsed: false,
        fallbackReason: 'ML inference error',
        top3Recommendations: destinations.slice(0, 3),
        rankingExplanations: destinations.slice(0, 3).map((d, i) => 
          `#${i + 1}: ${d.destinationName} - Baseline ranking`
        ),
      }
    }
  }

  /**
   * Enable or disable ML inference
   */
  setMLEnabled(enabled: boolean): void {
    this.mlEnabled = enabled
    logger.info('ML Inference: ML enabled status changed', { enabled })
  }

  /**
   * Set ML weight for hybrid ranking
   */
  setMLWeight(weight: number): void {
    this.mlWeight = Math.max(0, Math.min(1, weight))
    logger.info('ML Inference: ML weight changed', { weight: this.mlWeight })
  }

  /**
   * Get current ML status
   */
  getStatus(): { enabled: boolean; weight: number } {
    return {
      enabled: this.mlEnabled,
      weight: this.mlWeight,
    }
  }
}

export const mlInferenceEngine = new MLInferenceEngine()
