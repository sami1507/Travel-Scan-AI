// Recommendation Ranker - ML-based ranking model for recommendations
import type { RankedDestination } from '../../analysis/schemas'
import type { UserFeatures, ItemFeatures, ContextFeatures } from '../schemas'
import { featureEngineer } from '../feature-engineering'
import { logger } from '../../utils'

/**
 * Simple logistic regression-style scoring for recommendation ranking
 * Uses learned weights from feature importance analysis
 */
export class RecommendationRanker {
  // Learned weights from feature importance (would be trained from data)
  private weights = {
    // User preference alignment (30% total weight)
    user_budget_sensitivity: 0.12,
    user_nightlife_pref: 0.08,
    user_nature_pref: 0.08,
    user_preference_confidence: 0.02,
    
    // Item quality (40% total weight)
    item_total_score: 0.15,
    item_budget_fit: 0.08,
    item_safety: 0.07,
    item_evidence_strength: 0.05,
    item_confidence: 0.05,
    
    // Context fit (20% total weight)
    context_timing_flexibility: 0.05,
    context_budget_flexibility: 0.05,
    context_query_specificity: 0.05,
    context_interest_diversity: 0.05,
    
    // Ranking position (10% total weight)
    item_rank_position: 0.10,
  }

  private bias = 0.5 // Learned bias term

  /**
   * Predict acceptance probability for a recommendation
   */
  predictAcceptance(
    userFeatures: UserFeatures,
    itemFeatures: ItemFeatures,
    contextFeatures: ContextFeatures
  ): number {
    // Normalize features
    const normalized = featureEngineer.normalizeFeatures({
      user: userFeatures,
      item: itemFeatures,
      context: contextFeatures,
    })

    // Calculate weighted sum
    let score = this.bias

    for (const [feature, weight] of Object.entries(this.weights)) {
      const value = normalized[feature] || 0
      score += value * weight
    }

    // Apply sigmoid to get probability
    const probability = 1 / (1 + Math.exp(-score))

    return probability
  }

  /**
   * Rank recommendations using ML predictions
   */
  rankRecommendations(
    destinations: RankedDestination[],
    userFeatures: UserFeatures,
    contextFeatures: ContextFeatures
  ): Array<RankedDestination & { mlScore: number; mlRank: number }> {
    logger.info('ML Ranker: Ranking recommendations', {
      count: destinations.length,
    })

    // Calculate ML scores for each destination
    const scored = destinations.map((dest, index) => {
      const itemFeatures = featureEngineer.extractItemFeatures(dest, index + 1)
      const mlScore = this.predictAcceptance(userFeatures, itemFeatures, contextFeatures)

      return {
        ...dest,
        mlScore,
        mlRank: 0, // Will be set after sorting
      }
    })

    // Sort by ML score
    scored.sort((a, b) => b.mlScore - a.mlScore)

    // Assign ML ranks
    scored.forEach((dest, index) => {
      dest.mlRank = index + 1
    })

    logger.info('ML Ranker: Ranking complete', {
      topScore: scored[0]?.mlScore,
      topDestination: scored[0]?.destinationName,
    })

    return scored
  }

  /**
   * Combine baseline scores with ML predictions
   */
  hybridRank(
    destinations: RankedDestination[],
    userFeatures: UserFeatures,
    contextFeatures: ContextFeatures,
    mlWeight: number = 0.6 // 60% ML, 40% baseline
  ): RankedDestination[] {
    // Get ML rankings
    const mlRanked = this.rankRecommendations(destinations, userFeatures, contextFeatures)

    // Combine baseline and ML scores
    const hybrid = mlRanked.map(dest => {
      const baselineScore = dest.totalMatchScore / 100 // Normalize to 0-1
      const mlScore = dest.mlScore
      const combinedScore = mlWeight * mlScore + (1 - mlWeight) * baselineScore

      return {
        ...dest,
        totalMatchScore: combinedScore * 100, // Scale back to 0-100
      }
    })

    // Sort by combined score
    hybrid.sort((a, b) => b.totalMatchScore - a.totalMatchScore)

    return hybrid
  }

  /**
   * Get feature importance for explainability
   */
  getFeatureImportance(): Array<{ feature: string; importance: number }> {
    const total = Object.values(this.weights).reduce((sum, w) => sum + Math.abs(w), 0)

    return Object.entries(this.weights)
      .map(([feature, weight]) => ({
        feature,
        importance: Math.abs(weight) / total,
      }))
      .sort((a, b) => b.importance - a.importance)
  }

  /**
   * Explain why a recommendation was ranked highly
   */
  explainRanking(
    destination: RankedDestination & { mlScore: number; mlRank: number },
    userFeatures: UserFeatures,
    contextFeatures: ContextFeatures
  ): string[] {
    const itemFeatures = featureEngineer.extractItemFeatures(destination, destination.mlRank || 1)
    const normalized = featureEngineer.normalizeFeatures({
      user: userFeatures,
      item: itemFeatures,
      context: contextFeatures,
    })

    const contributions: Array<{ feature: string; contribution: number }> = []

    for (const [feature, weight] of Object.entries(this.weights)) {
      const value = normalized[feature] || 0
      const contribution = value * weight
      contributions.push({ feature, contribution })
    }

    // Sort by absolute contribution
    contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

    // Generate explanations for top contributors
    const explanations: string[] = []

    for (const { feature, contribution } of contributions.slice(0, 3)) {
      if (Math.abs(contribution) < 0.01) continue

      const featureName = this.getFeatureName(feature)
      const value = normalized[feature] || 0

      if (contribution > 0) {
        explanations.push(`Strong ${featureName} (${(value * 100).toFixed(0)}%)`)
      }
    }

    return explanations
  }

  private getFeatureName(feature: string): string {
    const names: Record<string, string> = {
      item_total_score: 'overall match',
      item_budget_fit: 'budget fit',
      item_safety: 'safety rating',
      item_evidence_strength: 'data quality',
      user_preference_confidence: 'preference alignment',
      context_query_specificity: 'query match',
    }
    return names[feature] || feature.replace(/_/g, ' ')
  }
}

export const recommendationRanker = new RecommendationRanker()
