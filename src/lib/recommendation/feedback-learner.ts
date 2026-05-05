// Feedback Learning System - learns from user feedback to improve recommendations
import type { UserFeedback } from '../types/feedback'
import { logger } from '../utils'

export interface FeedbackPattern {
  pattern: string
  frequency: number
  sentiment: 'positive' | 'negative'
  category: 'budget' | 'timing' | 'interests' | 'safety' | 'accommodation' | 'route' | 'general'
  confidence: number
}

export interface FeedbackInsights {
  positivePatterns: FeedbackPattern[]
  negativePatterns: FeedbackPattern[]
  preferenceAdjustments: Record<string, number>
  rankingAdjustments: Record<string, number>
  confidenceLevel: number
  sampleSize: number
}

export class FeedbackLearner {
  /**
   * Analyze feedback history to extract learning patterns
   */
  analyzeFeedbackPatterns(feedbackHistory: UserFeedback[]): FeedbackInsights {
    logger.info('Feedback Learner: Analyzing patterns', {
      feedbackCount: feedbackHistory.length,
    })

    const positivePatterns: FeedbackPattern[] = []
    const negativePatterns: FeedbackPattern[] = []
    const preferenceAdjustments: Record<string, number> = {}
    const rankingAdjustments: Record<string, number> = {}

    // Analyze thumbs up/down patterns
    const thumbsUpFeedback = feedbackHistory.filter(f => f.feedback_type === 'thumbs-up')
    const thumbsDownFeedback = feedbackHistory.filter(f => f.feedback_type === 'thumbs-down')

    // Extract positive patterns
    if (thumbsUpFeedback.length >= 2) {
      const budgetPattern = this.analyzeBudgetPattern(thumbsUpFeedback, 'positive')
      if (budgetPattern) positivePatterns.push(budgetPattern)

      const interestPattern = this.analyzeInterestPattern(thumbsUpFeedback, 'positive')
      if (interestPattern) positivePatterns.push(interestPattern)

      const timingPattern = this.analyzeTimingPattern(thumbsUpFeedback, 'positive')
      if (timingPattern) positivePatterns.push(timingPattern)
    }

    // Extract negative patterns
    if (thumbsDownFeedback.length >= 2) {
      const budgetPattern = this.analyzeBudgetPattern(thumbsDownFeedback, 'negative')
      if (budgetPattern) negativePatterns.push(budgetPattern)

      const interestPattern = this.analyzeInterestPattern(thumbsDownFeedback, 'negative')
      if (interestPattern) negativePatterns.push(interestPattern)

      const timingPattern = this.analyzeTimingPattern(thumbsDownFeedback, 'negative')
      if (timingPattern) negativePatterns.push(timingPattern)
    }

    // Analyze rich feedback comments for deeper insights
    const richFeedback = feedbackHistory.filter(
      f => f.feedback_metadata?.comment
    )
    if (richFeedback.length > 0) {
      const commentPatterns = this.analyzeCommentPatterns(richFeedback)
      positivePatterns.push(...commentPatterns.positive)
      negativePatterns.push(...commentPatterns.negative)
    }

    // Calculate preference adjustments
    if (positivePatterns.length > 0 || negativePatterns.length > 0) {
      preferenceAdjustments.budget = this.calculateBudgetAdjustment(
        positivePatterns,
        negativePatterns
      )
      preferenceAdjustments.safety = this.calculateSafetyAdjustment(
        positivePatterns,
        negativePatterns
      )
      preferenceAdjustments.nightlife = this.calculateInterestAdjustment(
        positivePatterns,
        negativePatterns,
        'nightlife'
      )
      preferenceAdjustments.nature = this.calculateInterestAdjustment(
        positivePatterns,
        negativePatterns,
        'nature'
      )
    }

    // Calculate ranking adjustments (aggregate signals only)
    if (feedbackHistory.length >= 10) {
      rankingAdjustments.highRankPreference = this.calculateHighRankPreference(feedbackHistory)
      rankingAdjustments.evidenceWeightPreference = this.calculateEvidenceWeightPreference(
        feedbackHistory
      )
    }

    const confidenceLevel = this.calculateConfidenceLevel(feedbackHistory.length)

    return {
      positivePatterns,
      negativePatterns,
      preferenceAdjustments,
      rankingAdjustments,
      confidenceLevel,
      sampleSize: feedbackHistory.length,
    }
  }

  /**
   * Analyze budget patterns in feedback
   */
  private analyzeBudgetPattern(
    feedback: UserFeedback[],
    sentiment: 'positive' | 'negative'
  ): FeedbackPattern | null {
    const budgetCounts: Record<string, number> = {}

    for (const f of feedback) {
      if (f.query_context?.budget) {
        const budget = f.query_context.budget
        budgetCounts[budget] = (budgetCounts[budget] || 0) + 1
      }
    }

    const dominantBudget = Object.entries(budgetCounts).sort((a, b) => b[1] - a[1])[0]

    if (dominantBudget && dominantBudget[1] >= 2) {
      return {
        pattern: `User ${sentiment === 'positive' ? 'prefers' : 'dislikes'} ${dominantBudget[0]} budget recommendations`,
        frequency: dominantBudget[1],
        sentiment,
        category: 'budget',
        confidence: Math.min(dominantBudget[1] / feedback.length, 1.0),
      }
    }

    return null
  }

  /**
   * Analyze interest patterns in feedback
   */
  private analyzeInterestPattern(
    feedback: UserFeedback[],
    sentiment: 'positive' | 'negative'
  ): FeedbackPattern | null {
    const interestCounts: Record<string, number> = {}

    for (const f of feedback) {
      if (f.query_context?.interests) {
        for (const interest of f.query_context.interests) {
          interestCounts[interest] = (interestCounts[interest] || 0) + 1
        }
      }
    }

    const dominantInterest = Object.entries(interestCounts).sort((a, b) => b[1] - a[1])[0]

    if (dominantInterest && dominantInterest[1] >= 2) {
      return {
        pattern: `User ${sentiment === 'positive' ? 'enjoys' : 'avoids'} ${dominantInterest[0]} destinations`,
        frequency: dominantInterest[1],
        sentiment,
        category: 'interests',
        confidence: Math.min(dominantInterest[1] / feedback.length, 1.0),
      }
    }

    return null
  }

  /**
   * Analyze timing patterns in feedback
   */
  private analyzeTimingPattern(
    feedback: UserFeedback[],
    sentiment: 'positive' | 'negative'
  ): FeedbackPattern | null {
    const seasonCounts: Record<string, number> = {}

    for (const f of feedback) {
      if (f.query_context?.travel_months && f.query_context.travel_months.length > 0) {
        const season = this.getSeasonFromMonths(f.query_context.travel_months)
        seasonCounts[season] = (seasonCounts[season] || 0) + 1
      }
    }

    const dominantSeason = Object.entries(seasonCounts).sort((a, b) => b[1] - a[1])[0]

    if (dominantSeason && dominantSeason[1] >= 2) {
      return {
        pattern: `User ${sentiment === 'positive' ? 'prefers' : 'avoids'} ${dominantSeason[0]} travel`,
        frequency: dominantSeason[1],
        sentiment,
        category: 'timing',
        confidence: Math.min(dominantSeason[1] / feedback.length, 1.0),
      }
    }

    return null
  }

  /**
   * Analyze comment patterns for deeper insights
   */
  private analyzeCommentPatterns(richFeedback: UserFeedback[]): {
    positive: FeedbackPattern[]
    negative: FeedbackPattern[]
  } {
    const positive: FeedbackPattern[] = []
    const negative: FeedbackPattern[] = []

    const keywords = {
      budget: ['expensive', 'cheap', 'affordable', 'price', 'cost', 'budget'],
      timing: ['season', 'weather', 'timing', 'month', 'time of year'],
      interests: ['boring', 'exciting', 'interesting', 'activities', 'things to do'],
      safety: ['safe', 'dangerous', 'security', 'risk'],
      accommodation: ['hotel', 'apartment', 'rental', 'stay', 'accommodation'],
      route: ['route', 'itinerary', 'too much', 'rushed', 'relaxed'],
    }

    for (const [category, terms] of Object.entries(keywords)) {
      let positiveCount = 0
      let negativeCount = 0

      for (const f of richFeedback) {
        const comment = (f.feedback_metadata?.comment as string)?.toLowerCase() || ''
        const hasKeyword = terms.some(term => comment.includes(term))

        if (hasKeyword) {
          // Simple sentiment detection
          const hasPositive = /good|great|love|perfect|excellent|amazing/.test(comment)
          const hasNegative = /bad|poor|hate|terrible|awful|wrong/.test(comment)

          if (hasPositive) positiveCount++
          if (hasNegative) negativeCount++
        }
      }

      if (positiveCount >= 2) {
        positive.push({
          pattern: `User appreciates ${category} aspects`,
          frequency: positiveCount,
          sentiment: 'positive',
          category: category as any,
          confidence: Math.min(positiveCount / richFeedback.length, 1.0),
        })
      }

      if (negativeCount >= 2) {
        negative.push({
          pattern: `User has concerns about ${category}`,
          frequency: negativeCount,
          sentiment: 'negative',
          category: category as any,
          confidence: Math.min(negativeCount / richFeedback.length, 1.0),
        })
      }
    }

    return { positive, negative }
  }

  /**
   * Calculate budget adjustment based on patterns
   */
  private calculateBudgetAdjustment(
    positive: FeedbackPattern[],
    negative: FeedbackPattern[]
  ): number {
    const budgetPositive = positive.filter(p => p.category === 'budget')
    const budgetNegative = negative.filter(p => p.category === 'budget')

    if (budgetPositive.length === 0 && budgetNegative.length === 0) return 0

    const positiveWeight = budgetPositive.reduce((sum, p) => sum + p.confidence, 0)
    const negativeWeight = budgetNegative.reduce((sum, p) => sum + p.confidence, 0)

    return (positiveWeight - negativeWeight) * 0.5 // Conservative adjustment
  }

  /**
   * Calculate safety adjustment based on patterns
   */
  private calculateSafetyAdjustment(
    positive: FeedbackPattern[],
    negative: FeedbackPattern[]
  ): number {
    const safetyNegative = negative.filter(p => p.category === 'safety')

    if (safetyNegative.length === 0) return 0

    const negativeWeight = safetyNegative.reduce((sum, p) => sum + p.confidence, 0)

    return negativeWeight * 0.3 // Boost safety importance if user has concerns
  }

  /**
   * Calculate interest adjustment
   */
  private calculateInterestAdjustment(
    positive: FeedbackPattern[],
    negative: FeedbackPattern[],
    interest: string
  ): number {
    const interestPositive = positive.filter(
      p => p.category === 'interests' && p.pattern.toLowerCase().includes(interest)
    )
    const interestNegative = negative.filter(
      p => p.category === 'interests' && p.pattern.toLowerCase().includes(interest)
    )

    if (interestPositive.length === 0 && interestNegative.length === 0) return 0

    const positiveWeight = interestPositive.reduce((sum, p) => sum + p.confidence, 0)
    const negativeWeight = interestNegative.reduce((sum, p) => sum + p.confidence, 0)

    return (positiveWeight - negativeWeight) * 0.4
  }

  /**
   * Calculate high-rank preference (do users prefer top recommendations?)
   */
  private calculateHighRankPreference(feedback: UserFeedback[]): number {
    const rankedFeedback = feedback.filter(f => f.recommendation_rank !== undefined)

    if (rankedFeedback.length < 5) return 0

    const topRankPositive = rankedFeedback.filter(
      f => f.recommendation_rank! <= 3 && f.feedback_type === 'thumbs-up'
    ).length

    const lowRankPositive = rankedFeedback.filter(
      f => f.recommendation_rank! > 3 && f.feedback_type === 'thumbs-up'
    ).length

    return topRankPositive > lowRankPositive * 2 ? 0.2 : 0
  }

  /**
   * Calculate evidence weight preference
   */
  private calculateEvidenceWeightPreference(feedback: UserFeedback[]): number {
    // This would analyze if users prefer recommendations with stronger evidence
    // For now, return neutral
    return 0
  }

  /**
   * Calculate confidence level based on sample size
   */
  private calculateConfidenceLevel(sampleSize: number): number {
    if (sampleSize < 3) return 0.1
    if (sampleSize < 5) return 0.3
    if (sampleSize < 10) return 0.5
    if (sampleSize < 20) return 0.7
    return 0.9
  }

  /**
   * Get season from months
   */
  private getSeasonFromMonths(months: number[]): string {
    const avgMonth = months.reduce((sum, m) => sum + m, 0) / months.length

    if (avgMonth >= 3 && avgMonth <= 5) return 'spring'
    if (avgMonth >= 6 && avgMonth <= 8) return 'summer'
    if (avgMonth >= 9 && avgMonth <= 11) return 'fall'
    return 'winter'
  }
}

export const feedbackLearner = new FeedbackLearner()
