// Personalized scoring service - adjusts weights based on user preferences
import type { UserPreferenceProfile, PersonalizedWeights } from '../types/preferences'
import type { ScoringWeights } from '../scoring/engine'
import { logger } from '../utils'

/**
 * Default scoring weights (from scoring engine)
 */
const DEFAULT_WEIGHTS: ScoringWeights = {
  budgetFit: 0.20,
  weatherFit: 0.15,
  passportEase: 0.10,
  nightlife: 0.10,
  nature: 0.10,
  transport: 0.10,
  hotelValue: 0.15,
  safety: 0.10,
}

/**
 * Personalized scoring service
 * Adjusts category weights based on user preferences
 */
export class PersonalizedScoringService {
  /**
   * Get personalized weights for a user
   * Returns default weights if no preferences or low confidence
   */
  getPersonalizedWeights(
    preferences?: UserPreferenceProfile
  ): PersonalizedWeights {
    // No preferences = use defaults
    if (!preferences) {
      return {
        ...DEFAULT_WEIGHTS,
        is_personalized: false,
        confidence: 0,
      }
    }

    // Low confidence = use defaults
    const confidence = preferences.confidence || 0
    if (confidence < 0.3) {
      return {
        ...DEFAULT_WEIGHTS,
        is_personalized: false,
        confidence,
      }
    }

    // Build personalized weights
    const weights = { ...DEFAULT_WEIGHTS }

    // Apply explicit preferences (if set)
    if (preferences.explicit_preferences) {
      this.applyExplicitPreferences(weights, preferences.explicit_preferences)
    }

    // Apply inferred preferences (from feedback)
    if (preferences.inferred_preferences) {
      this.applyInferredPreferences(weights, preferences.inferred_preferences, confidence)
    }

    // Normalize weights to sum to 1.0
    this.normalizeWeights(weights)

    return {
      ...weights,
      is_personalized: true,
      confidence,
    }
  }

  /**
   * Apply explicit user preferences to weights
   */
  private applyExplicitPreferences(
    weights: ScoringWeights,
    explicit: NonNullable<UserPreferenceProfile['explicit_preferences']>
  ): void {
    // Nightlife preference (0-10)
    if (explicit.nightlife_preference !== undefined) {
      const factor = explicit.nightlife_preference / 10
      weights.nightlife = 0.05 + (factor * 0.15) // Range: 0.05-0.20
    }

    // Nature preference (0-10)
    if (explicit.nature_preference !== undefined) {
      const factor = explicit.nature_preference / 10
      weights.nature = 0.05 + (factor * 0.15) // Range: 0.05-0.20
    }

    // Safety importance (0-10)
    if (explicit.safety_importance !== undefined) {
      const factor = explicit.safety_importance / 10
      weights.safety = 0.05 + (factor * 0.20) // Range: 0.05-0.25
    }

    // Transport importance (0-10)
    if (explicit.transport_importance !== undefined) {
      const factor = explicit.transport_importance / 10
      weights.transport = 0.05 + (factor * 0.15) // Range: 0.05-0.20
    }

    // Budget sensitivity (0-10)
    if (explicit.budget_sensitivity !== undefined) {
      const factor = explicit.budget_sensitivity / 10
      weights.budgetFit = 0.10 + (factor * 0.20) // Range: 0.10-0.30
    }
  }

  /**
   * Apply inferred preferences from feedback to weights
   */
  private applyInferredPreferences(
    weights: ScoringWeights,
    inferred: NonNullable<UserPreferenceProfile['inferred_preferences']>,
    confidence: number
  ): void {
    const likedCategories = inferred.liked_categories || {}
    const dislikedCategories = inferred.disliked_categories || {}

    // Calculate average scores for categories user liked
    const categoryAverages = this.calculateCategoryAverages(likedCategories, dislikedCategories)

    // Boost weights for high-scoring categories (user cares about these)
    // Reduce weights for low-scoring categories (user doesn't care as much)
    Object.entries(categoryAverages).forEach(([category, avgScore]) => {
      const weightKey = category as keyof ScoringWeights
      if (weightKey in weights) {
        // Only adjust if we have enough data (confidence-weighted)
        const adjustment = ((avgScore - 5) / 10) * 0.1 * confidence
        weights[weightKey] = Math.max(0.05, weights[weightKey] + adjustment)
      }
    })
  }

  /**
   * Calculate average scores for each category
   * Combines liked and disliked signals
   */
  private calculateCategoryAverages(
    liked: Record<string, number>,
    disliked: Record<string, number>
  ): Record<string, number> {
    const averages: Record<string, number> = {}
    const allCategories = new Set([...Object.keys(liked), ...Object.keys(disliked)])

    allCategories.forEach(category => {
      const likedScore = liked[category] || 0
      const dislikedScore = disliked[category] || 0

      // If user liked high scores in this category, boost it
      // If user disliked despite high scores, reduce it
      if (likedScore > 0 && dislikedScore === 0) {
        averages[category] = likedScore
      } else if (dislikedScore > 0 && likedScore === 0) {
        averages[category] = 10 - dislikedScore // Invert
      } else if (likedScore > 0 && dislikedScore > 0) {
        // User has mixed signals, use difference
        averages[category] = (likedScore + (10 - dislikedScore)) / 2
      }
    })

    return averages
  }

  /**
   * Normalize weights to sum to 1.0
   */
  private normalizeWeights(weights: ScoringWeights): void {
    const sum = Object.values(weights).reduce((acc, val) => acc + val, 0)
    if (sum === 0) return

    const keys = Object.keys(weights) as (keyof ScoringWeights)[]
    keys.forEach(key => {
      weights[key] = weights[key] / sum
    })
  }

  /**
   * Explain weight adjustments for transparency
   */
  explainWeights(
    personalizedWeights: PersonalizedWeights,
    preferences?: UserPreferenceProfile
  ): string[] {
    const explanations: string[] = []

    if (!personalizedWeights.is_personalized) {
      explanations.push('Using standard recommendation weights')
      return explanations
    }

    explanations.push('Recommendations personalized based on your feedback')

    // Compare to defaults and explain significant differences
    const diffs = this.compareToDefaults(personalizedWeights)
    
    diffs.forEach(({ category, change, direction }) => {
      if (Math.abs(change) > 0.03) {
        const categoryName = this.getCategoryDisplayName(category)
        if (direction === 'increased') {
          explanations.push(`Prioritizing ${categoryName} based on your preferences`)
        } else {
          explanations.push(`De-emphasizing ${categoryName} based on your preferences`)
        }
      }
    })

    return explanations
  }

  /**
   * Compare personalized weights to defaults
   */
  private compareToDefaults(weights: PersonalizedWeights): Array<{
    category: string
    change: number
    direction: 'increased' | 'decreased'
  }> {
    const diffs: Array<{ category: string; change: number; direction: 'increased' | 'decreased' }> = []

    Object.entries(DEFAULT_WEIGHTS).forEach(([category, defaultWeight]) => {
      const personalizedWeight = weights[category as keyof ScoringWeights]
      const change = personalizedWeight - defaultWeight
      
      if (change !== 0) {
        diffs.push({
          category,
          change,
          direction: change > 0 ? 'increased' : 'decreased',
        })
      }
    })

    return diffs.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  }

  /**
   * Get display name for category
   */
  private getCategoryDisplayName(category: string): string {
    const names: Record<string, string> = {
      budgetFit: 'budget match',
      weatherFit: 'weather conditions',
      passportEase: 'visa requirements',
      nightlife: 'nightlife options',
      nature: 'nature & outdoors',
      transport: 'transportation',
      hotelValue: 'accommodation value',
      safety: 'safety & security',
    }
    return names[category] || category
  }
}

export const personalizedScoringService = new PersonalizedScoringService()
