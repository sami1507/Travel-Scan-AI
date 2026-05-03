// Feedback-to-Quality Loop - Use feedback data to improve recommendations
import { createServerSupabaseClient } from '../supabase/server'

export interface FeedbackInsights {
  destinationPerformance: Map<string, DestinationMetrics>
  categoryWeights: Map<string, number>
  commonIssues: string[]
  improvementOpportunities: string[]
}

export interface DestinationMetrics {
  destinationId: string
  destinationName: string
  saveRate: number
  dismissRate: number
  avgRating: number
  feedbackCount: number
  commonPositives: string[]
  commonNegatives: string[]
}

export class FeedbackQualityLoop {
  /**
   * Analyze feedback data to extract quality insights
   */
  async analyzeFeedback(timeframe: 'week' | 'month' | 'all' = 'month'): Promise<FeedbackInsights> {
    const supabase = await createServerSupabaseClient()
    
    // Calculate date range
    const now = new Date()
    const startDate = timeframe === 'week' 
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : timeframe === 'month'
      ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      : new Date(0)

    // Fetch feedback data
    const { data: feedback, error } = await supabase
      .from('recommendation_feedback')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (error || !feedback) {
      return this.getEmptyInsights()
    }

    // Analyze destination performance
    const destinationPerformance = this.analyzeDestinationPerformance(feedback)

    // Analyze category importance
    const categoryWeights = this.analyzeCategoryWeights(feedback)

    // Identify common issues
    const commonIssues = this.identifyCommonIssues(feedback)

    // Identify improvement opportunities
    const improvementOpportunities = this.identifyImprovements(feedback, destinationPerformance)

    return {
      destinationPerformance,
      categoryWeights,
      commonIssues,
      improvementOpportunities,
    }
  }

  private analyzeDestinationPerformance(feedback: any[]): Map<string, DestinationMetrics> {
    const destMap = new Map<string, DestinationMetrics>()

    // Group feedback by destination
    const grouped = feedback.reduce((acc, fb) => {
      const key = fb.destination_id
      if (!acc[key]) acc[key] = []
      acc[key].push(fb)
      return acc
    }, {} as Record<string, any[]>)

    // Calculate metrics for each destination
    for (const [destId, feedbackList] of Object.entries(grouped)) {
      const list = feedbackList as any[]
      const saves = list.filter(f => f.feedback_type === 'saved').length
      const dismisses = list.filter(f => f.feedback_type === 'dismissed').length
      const ratings = list.filter(f => f.feedback_score).map(f => f.feedback_score)
      
      const saveRate = list.length > 0 ? saves / list.length : 0
      const dismissRate = list.length > 0 ? dismisses / list.length : 0
      const avgRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0

      // Extract common feedback themes
      const positives = list
        .filter(f => f.feedback_type === 'helpful' || f.feedback_type === 'saved')
        .map(f => f.feedback_text)
        .filter(Boolean)

      const negatives = list
        .filter(f => f.feedback_type === 'not_helpful' || f.feedback_type === 'dismissed')
        .map(f => f.feedback_text)
        .filter(Boolean)

      destMap.set(destId, {
        destinationId: destId,
        destinationName: list[0].destination_name,
        saveRate,
        dismissRate,
        avgRating,
        feedbackCount: list.length,
        commonPositives: this.extractThemes(positives),
        commonNegatives: this.extractThemes(negatives),
      })
    }

    return destMap
  }

  private analyzeCategoryWeights(feedback: any[]): Map<string, number> {
    // Analyze which categories correlate with positive feedback
    // This is a simplified version - in production, would use more sophisticated analysis
    const weights = new Map<string, number>()

    weights.set('budgetFit', 1.0)
    weights.set('weatherFit', 0.9)
    weights.set('safety', 0.95)
    weights.set('transport', 0.8)
    weights.set('nightlife', 0.7)
    weights.set('nature', 0.85)

    return weights
  }

  private identifyCommonIssues(feedback: any[]): string[] {
    const issues: string[] = []

    // Analyze negative feedback patterns
    const negatives = feedback.filter(
      f => f.feedback_type === 'not_helpful' || f.feedback_type === 'dismissed'
    )

    if (negatives.length > feedback.length * 0.3) {
      issues.push('High dismiss rate detected - review recommendation relevance')
    }

    const lowRatings = feedback.filter(f => f.feedback_score && f.feedback_score <= 2)
    if (lowRatings.length > feedback.length * 0.2) {
      issues.push('Low satisfaction ratings - review recommendation quality')
    }

    return issues
  }

  private identifyImprovements(
    feedback: any[],
    destPerformance: Map<string, DestinationMetrics>
  ): string[] {
    const opportunities: string[] = []

    // Find high-performing destinations
    const highPerformers = Array.from(destPerformance.values())
      .filter(d => d.saveRate > 0.5 && d.feedbackCount >= 5)
      .sort((a, b) => b.saveRate - a.saveRate)
      .slice(0, 5)

    if (highPerformers.length > 0) {
      opportunities.push(
        `High-performing destinations: ${highPerformers.map(d => d.destinationName).join(', ')}. Analyze their common characteristics.`
      )
    }

    // Find low-performing destinations
    const lowPerformers = Array.from(destPerformance.values())
      .filter(d => d.dismissRate > 0.4 && d.feedbackCount >= 5)
      .sort((a, b) => b.dismissRate - a.dismissRate)
      .slice(0, 3)

    if (lowPerformers.length > 0) {
      opportunities.push(
        `Low-performing destinations: ${lowPerformers.map(d => d.destinationName).join(', ')}. Review ranking criteria.`
      )
    }

    return opportunities
  }

  private extractThemes(texts: string[]): string[] {
    // Simple theme extraction - in production, would use NLP
    const themes = new Set<string>()

    for (const text of texts) {
      if (!text) continue
      const lower = text.toLowerCase()
      
      if (lower.includes('expensive') || lower.includes('cost')) themes.add('cost concerns')
      if (lower.includes('weather') || lower.includes('season')) themes.add('weather/timing')
      if (lower.includes('safe') || lower.includes('security')) themes.add('safety')
      if (lower.includes('transport') || lower.includes('getting around')) themes.add('transportation')
      if (lower.includes('food') || lower.includes('restaurant')) themes.add('dining')
    }

    return Array.from(themes).slice(0, 5)
  }

  private getEmptyInsights(): FeedbackInsights {
    return {
      destinationPerformance: new Map(),
      categoryWeights: new Map(),
      commonIssues: [],
      improvementOpportunities: [],
    }
  }

  /**
   * Generate actionable quality improvement report
   */
  generateQualityReport(insights: FeedbackInsights): string {
    let report = `\n=== FEEDBACK-DRIVEN QUALITY INSIGHTS ===\n\n`

    // Destination performance
    if (insights.destinationPerformance.size > 0) {
      report += `Top Performing Destinations:\n`
      const sorted = Array.from(insights.destinationPerformance.values())
        .sort((a, b) => b.saveRate - a.saveRate)
        .slice(0, 5)

      for (const dest of sorted) {
        report += `  • ${dest.destinationName}: ${(dest.saveRate * 100).toFixed(0)}% save rate, ${dest.feedbackCount} feedback\n`
        if (dest.commonPositives.length > 0) {
          report += `    Positives: ${dest.commonPositives.join(', ')}\n`
        }
      }
      report += `\n`
    }

    // Common issues
    if (insights.commonIssues.length > 0) {
      report += `Issues Detected:\n`
      for (const issue of insights.commonIssues) {
        report += `  ⚠️  ${issue}\n`
      }
      report += `\n`
    }

    // Improvement opportunities
    if (insights.improvementOpportunities.length > 0) {
      report += `Improvement Opportunities:\n`
      for (const opp of insights.improvementOpportunities) {
        report += `  💡 ${opp}\n`
      }
    }

    return report
  }

  /**
   * Get tuning recommendations for scoring engine
   */
  async getScoringTuningRecommendations(): Promise<Map<string, number>> {
    const insights = await this.analyzeFeedback('month')
    
    // Return category weight adjustments based on feedback
    // Weights > 1.0 mean increase importance, < 1.0 mean decrease
    return insights.categoryWeights
  }
}
