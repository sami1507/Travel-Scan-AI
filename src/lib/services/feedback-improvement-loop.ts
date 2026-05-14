// Feedback Improvement Loop - Uses analyzed feedback to improve recommendations
import { createServerSupabaseClient } from '../supabase/server'
import type { FeedbackAnalysis } from './ai-feedback-analyzer'
import type { RichFeedbackData } from '@/components/travel/rich-feedback-dialog'

export interface PreferenceAdjustment {
  userId: string
  adjustments: {
    budgetWeight?: number
    safetyWeight?: number
    nightlifeWeight?: number
    routeComplexityPreference?: 'simple' | 'complex'
    destinationTypePreference?: 'nature' | 'cities' | 'mixed'
  }
  reason: string
  confidence: number
}

export interface ScoreWeightSuggestion {
  category: string
  currentWeight: number
  suggestedWeight: number
  reason: string
  feedbackCount: number
  confidence: number
  sampleFeedbackIds: string[]
}

export class FeedbackImprovementLoop {
  /**
   * Apply user-level preference adjustments based on feedback
   */
  async applyUserPreferenceAdjustments(
    userId: string,
    feedbackData: RichFeedbackData,
    analysis: FeedbackAnalysis
  ): Promise<void> {
    const supabase = await createServerSupabaseClient()

    // Build preference adjustments
    const adjustments: any = {}

    // Apply preference corrections from feedback
    if (feedbackData.preferenceCorrections.budgetImportance) {
      adjustments.budgetWeight = feedbackData.preferenceCorrections.budgetImportance === 'increase' ? 1.2 : 0.8
    }

    if (feedbackData.preferenceCorrections.safetyImportance) {
      adjustments.safetyWeight = feedbackData.preferenceCorrections.safetyImportance === 'increase' ? 1.2 : 0.8
    }

    if (feedbackData.preferenceCorrections.routeComplexity) {
      adjustments.routeComplexityPreference = feedbackData.preferenceCorrections.routeComplexity === 'simpler' ? 'simple' : 'complex'
    }

    if (feedbackData.preferenceCorrections.destinationType) {
      adjustments.destinationTypePreference = feedbackData.preferenceCorrections.destinationType
    }

    // Only apply if there are adjustments
    if (Object.keys(adjustments).length === 0) return

    // Update user preferences
    const { error } = await supabase
      .from('user_preference_profiles')
      .upsert({
        user_id: userId,
        preference_adjustments: adjustments,
        last_feedback_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (error) {
      console.error('Failed to apply preference adjustments:', error)
    }
  }

  /**
   * Generate score weight adjustment suggestions (requires aggregation)
   */
  async generateScoreWeightSuggestions(
    timeframe: 'week' | 'month' = 'month'
  ): Promise<ScoreWeightSuggestion[]> {
    const supabase = await createServerSupabaseClient()

    // Calculate date range
    const now = new Date()
    const startDate = timeframe === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch analyzed feedback
    const { data: feedback, error } = await supabase
      .from('rich_feedback')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .not('ai_analysis', 'is', null)

    if (error || !feedback || feedback.length < 10) {
      // Need at least 10 feedback items to suggest changes
      return []
    }

    // Analyze affected dimensions
    const dimensionIssues = new Map<string, { count: number; feedbackIds: string[] }>()

    for (const fb of feedback) {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      if (analysis.sentiment === 'negative' || analysis.sentiment === 'very_negative') {
        for (const dimension of analysis.affectedDimensions) {
          const current = dimensionIssues.get(dimension) || { count: 0, feedbackIds: [] }
          current.count++
          current.feedbackIds.push(fb.id)
          dimensionIssues.set(dimension, current)
        }
      }
    }

    // Generate suggestions for dimensions with >20% negative feedback
    const suggestions: ScoreWeightSuggestion[] = []
    const threshold = feedback.length * 0.2

    for (const [dimension, data] of dimensionIssues.entries()) {
      if (data.count >= threshold) {
        const category = this.mapDimensionToScoreCategory(dimension)
        if (category) {
          suggestions.push({
            category,
            currentWeight: 1.0,
            suggestedWeight: 1.2, // Increase weight for problematic dimensions
            reason: `${data.count} negative feedback items (${((data.count / feedback.length) * 100).toFixed(1)}%) mention ${dimension} issues`,
            feedbackCount: data.count,
            confidence: Math.min(data.count / feedback.length, 0.9),
            sampleFeedbackIds: data.feedbackIds.slice(0, 5),
          })
        }
      }
    }

    // Store suggestions in database
    if (suggestions.length > 0) {
      await this.storeSuggestions(suggestions)
    }

    return suggestions
  }

  /**
   * Cluster product issues for admin review
   */
  async clusterProductIssues(
    timeframe: 'week' | 'month' = 'month'
  ): Promise<Map<string, { count: number; severity: string; samples: string[] }>> {
    const supabase = await createServerSupabaseClient()

    const now = new Date()
    const startDate = timeframe === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const { data: feedback, error } = await supabase
      .from('rich_feedback')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .not('ai_analysis', 'is', null)

    if (error || !feedback) {
      return new Map()
    }

    const clusters = new Map<string, { count: number; severity: string; samples: string[] }>()

    for (const fb of feedback) {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      if (analysis.productIssue.hasIssue && analysis.productIssue.issueType) {
        const issueType = analysis.productIssue.issueType
        const current = clusters.get(issueType) || { count: 0, severity: 'low', samples: [] }
        current.count++
        current.severity = this.maxSeverity(current.severity, analysis.productIssue.severity || 'low')
        if (current.samples.length < 5) {
          current.samples.push(fb.id)
        }
        clusters.set(issueType, current)
      }
    }

    return clusters
  }

  /**
   * Get top user intent corrections
   */
  async getTopIntentCorrections(limit: number = 10): Promise<Array<{
    correction: string
    count: number
    examples: string[]
  }>> {
    const supabase = await createServerSupabaseClient()

    const { data: feedback, error } = await supabase
      .from('rich_feedback')
      .select('*')
      .not('ai_analysis', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error || !feedback) {
      return []
    }

    const corrections = new Map<string, { count: number; examples: string[] }>()

    for (const fb of feedback) {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      if (analysis.userIntentSignal.preferenceShift && analysis.userIntentSignal.specificRequest) {
        const request = analysis.userIntentSignal.specificRequest
        const current = corrections.get(request) || { count: 0, examples: [] }
        current.count++
        if (current.examples.length < 3) {
          current.examples.push(fb.comment || '')
        }
        corrections.set(request, current)
      }
    }

    return Array.from(corrections.entries())
      .map(([correction, data]) => ({ correction, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  private mapDimensionToScoreCategory(dimension: string): string | null {
    const mapping: Record<string, string> = {
      budget: 'budgetFit',
      weather: 'weatherFit',
      safety: 'safety',
      activities: 'nightlife',
      route_complexity: 'transport',
      destination_type: 'nature',
      timing: 'weatherFit',
      value: 'hotelValue',
    }
    return mapping[dimension] || null
  }

  private maxSeverity(a: string, b: string): string {
    const order = { low: 1, medium: 2, high: 3 }
    return (order[a as keyof typeof order] || 0) > (order[b as keyof typeof order] || 0) ? a : b
  }

  private async storeSuggestions(suggestions: ScoreWeightSuggestion[]): Promise<void> {
    const supabase = await createServerSupabaseClient()

    for (const suggestion of suggestions) {
      await supabase.from('score_weight_suggestions').insert({
        score_category: suggestion.category,
        current_weight: suggestion.currentWeight,
        suggested_weight: suggestion.suggestedWeight,
        adjustment_reason: suggestion.reason,
        feedback_count: suggestion.feedbackCount,
        confidence: suggestion.confidence,
        sample_feedback_ids: suggestion.sampleFeedbackIds,
      })
    }
  }
}
