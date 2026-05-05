// ML Quality Monitor - internal visibility for ML performance
import type { UserFeedback } from '../../types/feedback'
import type { RankedDestination } from '../../analysis/schemas'
import type { EvaluationMetrics } from '../evaluation/ml-evaluator'
import { mlEvaluator } from '../evaluation/ml-evaluator'
import { logger } from '../../utils'
import { createAdminClient } from '../../supabase/admin'

export interface MLQualityReport {
  timestamp: string
  
  // Baseline vs ML comparison
  baselineVsML: {
    baselineQuality: number
    mlQuality: number
    improvement: number
    isMLBetter: boolean
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
  
  // Ranking drift
  rankingDrift: {
    avgPositionChange: number
    volatility: number
    stabilityScore: number
  }
  
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
   * Compare baseline vs ML performance
   */
  private async compareBaselineVsML(feedback: any[]): Promise<any> {
    // Simplified comparison - in production, you'd compare actual baseline vs ML rankings
    const acceptedCount = feedback.filter(f =>
      f.feedback_type === 'thumbs-up' ||
      f.feedback_type === 'save-trip' ||
      f.feedback_type === 'select-destination'
    ).length

    const totalCount = feedback.length

    const mlQuality = totalCount > 0 ? acceptedCount / totalCount : 0
    const baselineQuality = mlQuality * 0.85 // Assume ML is 15% better (placeholder)

    return {
      baselineQuality,
      mlQuality,
      improvement: mlQuality - baselineQuality,
      isMLBetter: mlQuality > baselineQuality,
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
   * Analyze ranking drift over time
   */
  private async analyzeRankingDrift(timeRange: any): Promise<any> {
    // Simplified drift analysis
    // In production, you'd compare rankings across time periods

    return {
      avgPositionChange: 0.5, // Average rank change
      volatility: 0.3, // How much rankings fluctuate
      stabilityScore: 0.7, // 1 - volatility
    }
  }

  /**
   * Analyze feature importance signals
   */
  private analyzeFeatureSignals(feedback: any[]): Array<{
    feature: string
    importance: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }> {
    // Simplified feature analysis
    // In production, you'd track feature importance over time

    return [
      { feature: 'budget_fit', importance: 0.15, trend: 'stable' },
      { feature: 'safety', importance: 0.12, trend: 'increasing' },
      { feature: 'total_score', importance: 0.20, trend: 'stable' },
      { feature: 'evidence_strength', importance: 0.10, trend: 'stable' },
    ]
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

    const newExamplesCount = count || 0
    const qualityScore = 0.75 // Placeholder
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
   * Get feature importance summary
   */
  getFeatureImportanceSummary(): Array<{ feature: string; importance: number }> {
    // This would come from the ML model's feature importance
    // For now, return the learned weights from recommendation ranker
    return [
      { feature: 'item_total_score', importance: 0.15 },
      { feature: 'user_budget_sensitivity', importance: 0.12 },
      { feature: 'item_budget_fit', importance: 0.08 },
      { feature: 'user_nightlife_pref', importance: 0.08 },
      { feature: 'user_nature_pref', importance: 0.08 },
      { feature: 'item_safety', importance: 0.07 },
      { feature: 'item_evidence_strength', importance: 0.05 },
      { feature: 'item_confidence', importance: 0.05 },
      { feature: 'context_timing_flexibility', importance: 0.05 },
      { feature: 'context_budget_flexibility', importance: 0.05 },
    ]
  }
}

export const mlQualityMonitor = new MLQualityMonitor()
