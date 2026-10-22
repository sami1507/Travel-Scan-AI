// ML Quality Monitor - internal visibility for recommendation quality.
// NOTE: the "ML" layer is a static heuristic ranker (no trained model), and no
// historical baseline is persisted — comparison sections are null until real
// baseline data exists.
import type { UserFeedback } from '../../types/feedback'
import type { RankedDestination } from '../../analysis/schemas'
import type { EvaluationMetrics } from '../evaluation/ml-evaluator'
import { mlEvaluator } from '../evaluation/ml-evaluator'
import { recommendationRanker } from '../models/recommendation-ranker'
import { logger } from '../../utils'
import { createAdminClient } from '../../supabase/admin'

export interface MLQualityReport {
  timestamp: string

  // Current-system quality measured from real feedback.
  // baselineQuality is null: no pre-ML baseline output is persisted, so no
  // honest comparison can be computed yet.
  baselineVsML: {
    baselineQuality: number | null
    mlQuality: number
    improvement: number | null
    isMLBetter: boolean | null
  }

  // Acceptance patterns
  topAcceptedPatterns: Array<{
    pattern: string
    frequency: number
    avgRank: number
  }>

  topRejectedPatterns: Array<{
    pattern: string
    frequency: number
    avgRank: number
  }>

  // Ranking drift — null: historical rankings are not persisted, so drift
  // cannot be computed honestly yet.
  rankingDrift: {
    avgPositionChange: number
    volatility: number
    stabilityScore: number
  } | null
  
  // Feature signals
  featureSignals: Array<{
    feature: string
    importance: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }>
  
  // Retraining readiness
  retrainingReadiness: {
    newExamplesCount: number
    qualityScore: number
    isReady: boolean
    recommendation: string
  }
  
  // Common mismatches
  commonMismatches: Array<{
    mismatchType: string
    frequency: number
    examples: string[]
  }>
}

export interface RankingDriftIndicator {
  destinationId: string
  destinationName: string
  previousRank: number
  currentRank: number
  positionChange: number
  reason: string
}

export class MLQualityMonitor {
  /**
   * Generate comprehensive ML quality report
   */
  async generateQualityReport(
    timeRange: { start: string; end: string }
  ): Promise<MLQualityReport> {
    logger.info('ML Quality Monitor: Generating quality report', timeRange)

    const supabase = createAdminClient()

    // Fetch feedback in time range
    const { data: feedbackData } = await supabase
      .from('user_feedback')
      .select('*')
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end)

    const feedback = (feedbackData || []) as any[]

    // Baseline vs ML comparison
    const baselineVsML = await this.compareBaselineVsML(feedback)

    // Acceptance patterns
    const topAcceptedPatterns = this.analyzeAcceptancePatterns(feedback, true)
    const topRejectedPatterns = this.analyzeAcceptancePatterns(feedback, false)

    // Ranking drift
    const rankingDrift = await this.analyzeRankingDrift(timeRange)

    // Feature signals
    const featureSignals = this.analyzeFeatureSignals(feedback)

    // Retraining readiness
    const retrainingReadiness = await this.assessRetrainingReadiness()

    // Common mismatches
    const commonMismatches = this.identifyCommonMismatches(feedback)

    return {
      timestamp: new Date().toISOString(),
      baselineVsML,
      topAcceptedPatterns,
      topRejectedPatterns,
      rankingDrift,
      featureSignals,
      retrainingReadiness,
      commonMismatches,
    }
  }

  /**
   * Report current-system quality from real feedback.
   * No persisted pre-ML baseline exists, so baseline fields are null —
   * do not fabricate a comparison.
   */
  private async compareBaselineVsML(feedback: any[]): Promise<MLQualityReport['baselineVsML']> {
    const acceptedCount = feedback.filter(f =>
      f.feedback_type === 'thumbs-up' ||
      f.feedback_type === 'save-trip' ||
      f.feedback_type === 'select-destination'
    ).length

    const totalCount = feedback.length
    const mlQuality = totalCount > 0 ? acceptedCount / totalCount : 0

    return {
      baselineQuality: null,
      mlQuality,
      improvement: null,
      isMLBetter: null,
    }
  }

  /**
   * Analyze acceptance patterns
   */
  private analyzeAcceptancePatterns(
    feedback: any[],
    accepted: boolean
  ): Array<{ pattern: string; frequency: number; avgRank: number }> {
    const targetTypes = accepted
      ? ['thumbs-up', 'save-trip', 'select-destination']
      : ['thumbs-down', 'dismiss-recommendation']

    const targetFeedback = feedback.filter(f => targetTypes.includes(f.feedback_type))

    // Group by destination characteristics
    const patterns = new Map<string, { count: number; ranks: number[] }>()

    for (const f of targetFeedback) {
      // Extract patterns from query context
      const budget = f.query_context?.budget || 'unknown'
      const interests = f.query_context?.interests?.join(', ') || 'none'
      const pattern = `Budget: ${budget}, Interests: ${interests}`

      if (!patterns.has(pattern)) {
        patterns.set(pattern, { count: 0, ranks: [] })
      }

      const data = patterns.get(pattern)!
      data.count++
      if (f.recommendation_rank) {
        data.ranks.push(f.recommendation_rank)
      }
    }

    // Convert to array and sort by frequency
    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.count,
        avgRank: data.ranks.length > 0
          ? data.ranks.reduce((sum, r) => sum + r, 0) / data.ranks.length
          : 0,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
  }

  /**
   * Ranking drift over time — not computable: historical rankings are not
   * persisted. Returns null rather than fabricating numbers.
   */
  private async analyzeRankingDrift(timeRange: any): Promise<MLQualityReport['rankingDrift']> {
    return null
  }

  /**
   * Feature signals from the static heuristic ranker's actual weights.
   * Trend is always 'stable' because the weights are fixed (no training).
   */
  private analyzeFeatureSignals(feedback: any[]): Array<{
    feature: string
    importance: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }> {
    return recommendationRanker.getFeatureImportance()
      .slice(0, 10)
      .map(({ feature, importance }) => ({
        feature,
        importance: Math.round(importance * 100) / 100,
        trend: 'stable' as const,
      }))
  }

  /**
   * Assess retraining readiness
   */
  private async assessRetrainingReadiness(): Promise<any> {
    const supabase = createAdminClient()

    // Count high-quality training examples
    const { count } = await supabase
      .from('ml_training_examples')
      .select('*', { count: 'exact', head: true })
      .gte('quality_score', 0.7)

    // Average quality across all stored examples
    const { data: qualityRows } = await supabase
      .from('ml_training_examples')
      .select('quality_score')

    const scores = (qualityRows || []) as Array<{ quality_score: number }>
    const qualityScore = scores.length > 0
      ? scores.reduce((sum, r) => sum + Number(r.quality_score), 0) / scores.length
      : 0

    const newExamplesCount = count || 0
    const isReady = newExamplesCount >= 1000

    return {
      newExamplesCount,
      qualityScore,
      isReady,
      recommendation: isReady
        ? 'Ready for retraining with sufficient high-quality examples'
        : `Need ${1000 - newExamplesCount} more high-quality examples`,
    }
  }

  /**
   * Identify common mismatches
   */
  private identifyCommonMismatches(feedback: any[]): Array<{
    mismatchType: string
    frequency: number
    examples: string[]
  }> {
    const mismatches = new Map<string, string[]>()

    // Analyze negative feedback for mismatch patterns
    const negativeFeedback = feedback.filter(f =>
      f.feedback_type === 'thumbs-down' || f.feedback_type === 'dismiss-recommendation'
    )

    for (const f of negativeFeedback) {
      const comment = f.feedback_metadata?.comment?.toLowerCase() || ''

      // Detect mismatch types
      if (comment.includes('expensive') || comment.includes('budget')) {
        if (!mismatches.has('budget-mismatch')) mismatches.set('budget-mismatch', [])
        mismatches.get('budget-mismatch')!.push(f.destination_name || 'unknown')
      }

      if (comment.includes('weather') || comment.includes('season')) {
        if (!mismatches.has('seasonal-mismatch')) mismatches.set('seasonal-mismatch', [])
        mismatches.get('seasonal-mismatch')!.push(f.destination_name || 'unknown')
      }

      if (comment.includes('not what') || comment.includes('wrong')) {
        if (!mismatches.has('relevance-mismatch')) mismatches.set('relevance-mismatch', [])
        mismatches.get('relevance-mismatch')!.push(f.destination_name || 'unknown')
      }
    }

    return Array.from(mismatches.entries())
      .map(([mismatchType, examples]) => ({
        mismatchType,
        frequency: examples.length,
        examples: examples.slice(0, 5), // Top 5 examples
      }))
      .sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * Track ranking drift indicators
   */
  async trackRankingDrift(
    previousRankings: RankedDestination[],
    currentRankings: RankedDestination[]
  ): Promise<RankingDriftIndicator[]> {
    const indicators: RankingDriftIndicator[] = []

    // Create maps for quick lookup
    const previousMap = new Map(
      previousRankings.map((r, i) => [r.destinationId, i + 1])
    )
    const currentMap = new Map(
      currentRankings.map((r, i) => [r.destinationId, i + 1])
    )

    // Compare rankings
    for (const dest of currentRankings) {
      const previousRank = previousMap.get(dest.destinationId)
      const currentRank = currentMap.get(dest.destinationId)!

      if (previousRank) {
        const positionChange = previousRank - currentRank

        if (Math.abs(positionChange) >= 2) {
          indicators.push({
            destinationId: dest.destinationId,
            destinationName: dest.destinationName,
            previousRank,
            currentRank,
            positionChange,
            reason: positionChange > 0 ? 'Improved ranking' : 'Decreased ranking',
          })
        }
      }
    }

    return indicators.sort((a, b) => Math.abs(b.positionChange) - Math.abs(a.positionChange))
  }

  /**
   * Get feature weight summary from the static heuristic ranker
   */
  getFeatureImportanceSummary(): Array<{ feature: string; importance: number }> {
    return recommendationRanker.getFeatureImportance()
  }
}

export const mlQualityMonitor = new MLQualityMonitor()
