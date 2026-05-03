// Preference inference service - learns from user feedback
import type { UserFeedback } from '../types/feedback'
import type { UserPreferenceProfile, PreferenceSignal } from '../types/preferences'
import { logger } from '../utils'

/**
 * Infer user preferences from feedback history
 */
export class PreferenceInferenceService {
  /**
   * Build preference profile from user's feedback history
   */
  inferPreferences(feedbackHistory: UserFeedback[]): UserPreferenceProfile['inferred_preferences'] {
    if (feedbackHistory.length === 0) {
      return undefined
    }

    const signals = this.extractSignals(feedbackHistory)
    
    return {
      preferred_budget_levels: this.inferBudgetLevels(feedbackHistory),
      preferred_destination_types: this.inferDestinationTypes(feedbackHistory),
      liked_categories: this.inferLikedCategories(signals.positive),
      disliked_categories: this.inferDislikedCategories(signals.negative),
      avg_score_threshold: this.inferScoreThreshold(feedbackHistory),
      preferred_months: this.inferPreferredMonths(feedbackHistory),
      preferred_interests: this.inferPreferredInterests(feedbackHistory),
    }
  }

  /**
   * Extract positive and negative signals from feedback
   */
  private extractSignals(feedbackHistory: UserFeedback[]): {
    positive: PreferenceSignal[]
    negative: PreferenceSignal[]
  } {
    const positive: PreferenceSignal[] = []
    const negative: PreferenceSignal[] = []

    feedbackHistory.forEach(feedback => {
      if (!feedback.category_scores) return

      const weight = this.getSignalWeight(feedback.feedback_type)
      const isPositive = ['thumbs-up', 'save-trip', 'select-destination'].includes(feedback.feedback_type)
      const targetArray = isPositive ? positive : negative

      Object.entries(feedback.category_scores).forEach(([category, value]) => {
        targetArray.push({
          category,
          value: value as number,
          weight,
          source: feedback.feedback_type as any,
        })
      })
    })

    return { positive, negative }
  }

  /**
   * Get signal weight based on feedback type
   * save-trip = strongest signal, view-details = weakest
   */
  private getSignalWeight(feedbackType: string): number {
    const weights: Record<string, number> = {
      'save-trip': 1.0,
      'thumbs-up': 0.8,
      'select-destination': 0.5,
      'thumbs-down': 0.8,
      'dismiss-recommendation': 1.0,
      'view-details': 0.3,
    }
    return weights[feedbackType] || 0.5
  }

  /**
   * Infer preferred budget levels from positive feedback
   */
  private inferBudgetLevels(feedbackHistory: UserFeedback[]): string[] {
    const budgetCounts: Record<string, number> = {}

    feedbackHistory
      .filter(f => ['thumbs-up', 'save-trip'].includes(f.feedback_type))
      .forEach(feedback => {
        const budget = feedback.query_context?.budget
        if (budget) {
          budgetCounts[budget] = (budgetCounts[budget] || 0) + 1
        }
      })

    return Object.entries(budgetCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([budget]) => budget)
  }

  /**
   * Infer preferred destination types (city vs country)
   */
  private inferDestinationTypes(feedbackHistory: UserFeedback[]): string[] {
    const typeCounts: Record<string, number> = {}

    feedbackHistory
      .filter(f => ['thumbs-up', 'save-trip'].includes(f.feedback_type))
      .forEach(feedback => {
        // Would need destination type in feedback metadata
        // For now, return empty array
      })

    return []
  }

  /**
   * Calculate average category scores from positive signals
   */
  private inferLikedCategories(positiveSignals: PreferenceSignal[]): Record<string, number> {
    const categoryTotals: Record<string, { sum: number; weightSum: number }> = {}

    positiveSignals.forEach(signal => {
      if (!categoryTotals[signal.category]) {
        categoryTotals[signal.category] = { sum: 0, weightSum: 0 }
      }
      categoryTotals[signal.category].sum += signal.value * signal.weight
      categoryTotals[signal.category].weightSum += signal.weight
    })

    const averages: Record<string, number> = {}
    Object.entries(categoryTotals).forEach(([category, { sum, weightSum }]) => {
      if (weightSum > 0) {
        averages[category] = sum / weightSum
      }
    })

    return averages
  }

  /**
   * Calculate average category scores from negative signals
   */
  private inferDislikedCategories(negativeSignals: PreferenceSignal[]): Record<string, number> {
    const categoryTotals: Record<string, { sum: number; weightSum: number }> = {}

    negativeSignals.forEach(signal => {
      if (!categoryTotals[signal.category]) {
        categoryTotals[signal.category] = { sum: 0, weightSum: 0 }
      }
      categoryTotals[signal.category].sum += signal.value * signal.weight
      categoryTotals[signal.category].weightSum += signal.weight
    })

    const averages: Record<string, number> = {}
    Object.entries(categoryTotals).forEach(([category, { sum, weightSum }]) => {
      if (weightSum > 0) {
        averages[category] = sum / weightSum
      }
    })

    return averages
  }

  /**
   * Infer minimum score threshold user typically likes
   */
  private inferScoreThreshold(feedbackHistory: UserFeedback[]): number | undefined {
    const likedScores = feedbackHistory
      .filter(f => ['thumbs-up', 'save-trip'].includes(f.feedback_type))
      .map(f => f.total_score)
      .filter((score): score is number => score !== undefined && score !== null)

    if (likedScores.length === 0) return undefined

    // Return 10th percentile of liked scores (conservative threshold)
    const sorted = likedScores.sort((a, b) => a - b)
    const index = Math.floor(sorted.length * 0.1)
    return sorted[index]
  }

  /**
   * Infer preferred travel months from positive feedback
   */
  private inferPreferredMonths(feedbackHistory: UserFeedback[]): number[] {
    const monthCounts: Record<number, number> = {}

    feedbackHistory
      .filter(f => ['thumbs-up', 'save-trip'].includes(f.feedback_type))
      .forEach(feedback => {
        const months = feedback.query_context?.travel_months || []
        months.forEach(month => {
          monthCounts[month] = (monthCounts[month] || 0) + 1
        })
      })

    return Object.entries(monthCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([month]) => parseInt(month))
  }

  /**
   * Infer preferred interests from positive feedback
   */
  private inferPreferredInterests(feedbackHistory: UserFeedback[]): string[] {
    const interestCounts: Record<string, number> = {}

    feedbackHistory
      .filter(f => ['thumbs-up', 'save-trip'].includes(f.feedback_type))
      .forEach(feedback => {
        const interests = feedback.query_context?.interests || []
        interests.forEach(interest => {
          interestCounts[interest] = (interestCounts[interest] || 0) + 1
        })
      })

    return Object.entries(interestCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([interest]) => interest)
  }

  /**
   * Calculate confidence in inferred preferences
   * Based on amount and consistency of feedback
   */
  calculateConfidence(feedbackHistory: UserFeedback[]): number {
    const count = feedbackHistory.length

    // Need at least 3 feedback events for any confidence
    if (count < 3) return 0

    // Confidence increases with feedback count, plateaus at 20
    const countFactor = Math.min(count / 20, 1)

    // Check consistency: ratio of positive to total feedback
    const positiveCount = feedbackHistory.filter(f =>
      ['thumbs-up', 'save-trip', 'select-destination'].includes(f.feedback_type)
    ).length

    const consistencyFactor = positiveCount / count

    // Combined confidence (0-1)
    return countFactor * 0.7 + consistencyFactor * 0.3
  }
}

export const preferenceInferenceService = new PreferenceInferenceService()
