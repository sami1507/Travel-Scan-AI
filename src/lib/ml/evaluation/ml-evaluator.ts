// ML Evaluation Layer - measures whether ML is improving quality
import type { RankedDestination } from '../../analysis/schemas'
import type { UserFeedback } from '../../types/feedback'
import { logger } from '../../utils'

export interface EvaluationMetrics {
  // Ranking quality
  rankingAccuracy: number // How often top-ranked items are accepted
  ndcg: number // Normalized Discounted Cumulative Gain
  mrr: number // Mean Reciprocal Rank
  
  // Recommendation quality
  acceptanceRate: number
  dismissalRate: number
  averageRank: number // Average rank of accepted recommendations
  
  // Confidence calibration
  confidenceCalibration: number // How well confidence predicts acceptance
  overconfidenceRate: number
  underconfidenceRate: number
  
  // Overall quality
  overallQuality: number
}

export interface ComparisonResult {
  baselineMetrics: EvaluationMetrics
  mlMetrics: EvaluationMetrics
  improvement: {
    rankingAccuracy: number
    acceptanceRate: number
    confidenceCalibration: number
    overallQuality: number
  }
  isMLBetter: boolean
  confidence: number
}

export interface EvaluationScenario {
  scenarioId: string
  name: string
  description: string
  userContext: any
  expectedBehavior: string
  testCases: Array<{
    input: any
    expectedTopDestinations: string[]
    minimumAcceptanceRate: number
  }>
}

export class MLEvaluator {
  /**
   * Evaluate ranking quality from feedback
   */
  evaluateRankingQuality(
    recommendations: RankedDestination[],
    feedback: UserFeedback[]
  ): EvaluationMetrics {
    const acceptedFeedback = feedback.filter(
      f => f.feedback_type === 'thumbs-up' || 
           f.feedback_type === 'save-trip' || 
           f.feedback_type === 'select-destination'
    )
    
    const dismissedFeedback = feedback.filter(
      f => f.feedback_type === 'thumbs-down' || 
           f.feedback_type === 'dismiss-recommendation'
    )

    // Ranking accuracy: % of accepted items in top 3
    const top3Accepted = acceptedFeedback.filter(f => 
      f.recommendation_rank && f.recommendation_rank <= 3
    ).length
    const rankingAccuracy = acceptedFeedback.length > 0
      ? top3Accepted / acceptedFeedback.length
      : 0

    // NDCG (simplified)
    const ndcg = this.calculateNDCG(recommendations, feedback)

    // MRR (Mean Reciprocal Rank)
    const mrr = this.calculateMRR(acceptedFeedback)

    // Acceptance and dismissal rates
    const totalInteractions = feedback.length
    const acceptanceRate = totalInteractions > 0
      ? acceptedFeedback.length / totalInteractions
      : 0
    const dismissalRate = totalInteractions > 0
      ? dismissedFeedback.length / totalInteractions
      : 0

    // Average rank of accepted recommendations
    const rankedAccepted = acceptedFeedback.filter(f => f.recommendation_rank)
    const averageRank = rankedAccepted.length > 0
      ? rankedAccepted.reduce((sum, f) => sum + (f.recommendation_rank || 0), 0) / rankedAccepted.length
      : 0

    // Confidence calibration
    const { calibration, overconfidence, underconfidence } = 
      this.evaluateConfidenceCalibration(recommendations, feedback)

    // Overall quality score
    const overallQuality = 
      rankingAccuracy * 0.3 +
      acceptanceRate * 0.25 +
      ndcg * 0.2 +
      calibration * 0.15 +
      (1 - dismissalRate) * 0.1

    return {
      rankingAccuracy,
      ndcg,
      mrr,
      acceptanceRate,
      dismissalRate,
      averageRank,
      confidenceCalibration: calibration,
      overconfidenceRate: overconfidence,
      underconfidenceRate: underconfidence,
      overallQuality,
    }
  }

  /**
   * Compare baseline vs ML-enhanced system
   */
  async compareBaselineVsML(
    baselineRecommendations: RankedDestination[],
    mlRecommendations: RankedDestination[],
    feedback: UserFeedback[]
  ): Promise<ComparisonResult> {
    logger.info('ML Evaluator: Comparing baseline vs ML', {
      baselineCount: baselineRecommendations.length,
      mlCount: mlRecommendations.length,
      feedbackCount: feedback.length,
    })

    // Evaluate baseline
    const baselineMetrics = this.evaluateRankingQuality(
      baselineRecommendations,
      feedback
    )

    // Evaluate ML
    const mlMetrics = this.evaluateRankingQuality(
      mlRecommendations,
      feedback
    )

    // Calculate improvements
    const improvement = {
      rankingAccuracy: mlMetrics.rankingAccuracy - baselineMetrics.rankingAccuracy,
      acceptanceRate: mlMetrics.acceptanceRate - baselineMetrics.acceptanceRate,
      confidenceCalibration: mlMetrics.confidenceCalibration - baselineMetrics.confidenceCalibration,
      overallQuality: mlMetrics.overallQuality - baselineMetrics.overallQuality,
    }

    // Determine if ML is better
    const isMLBetter = improvement.overallQuality > 0.05 // 5% improvement threshold

    // Calculate confidence in comparison
    const confidence = this.calculateComparisonConfidence(
      baselineMetrics,
      mlMetrics,
      feedback.length
    )

    logger.info('ML Evaluator: Comparison complete', {
      isMLBetter,
      overallImprovement: improvement.overallQuality,
      confidence,
    })

    return {
      baselineMetrics,
      mlMetrics,
      improvement,
      isMLBetter,
      confidence,
    }
  }

  /**
   * Run evaluation scenarios
   */
  async runEvaluationScenarios(
    scenarios: EvaluationScenario[],
    analyzeFunction: (input: any) => Promise<RankedDestination[]>
  ): Promise<Map<string, { passed: boolean; metrics: EvaluationMetrics }>> {
    const results = new Map<string, { passed: boolean; metrics: EvaluationMetrics }>()

    for (const scenario of scenarios) {
      logger.info('ML Evaluator: Running scenario', { scenarioId: scenario.scenarioId })

      let totalPassed = 0
      const allMetrics: EvaluationMetrics[] = []

      for (const testCase of scenario.testCases) {
        try {
          const recommendations = await analyzeFunction(testCase.input)
          
          // Check if expected destinations are in top results
          const topDestinations = recommendations.slice(0, 3).map(r => r.destinationName)
          const hasExpected = testCase.expectedTopDestinations.some(expected =>
            topDestinations.includes(expected)
          )

          if (hasExpected) totalPassed++

          // Calculate metrics (simulated feedback)
          const metrics = this.evaluateRankingQuality(recommendations, [])
          allMetrics.push(metrics)
        } catch (error) {
          logger.error('ML Evaluator: Test case failed', error)
        }
      }

      // Aggregate metrics
      const avgMetrics = this.aggregateMetrics(allMetrics)
      const passed = totalPassed / scenario.testCases.length >= 0.7 // 70% pass rate

      results.set(scenario.scenarioId, { passed, metrics: avgMetrics })
    }

    return results
  }

  /**
   * Calculate NDCG (Normalized Discounted Cumulative Gain)
   */
  private calculateNDCG(
    recommendations: RankedDestination[],
    feedback: UserFeedback[]
  ): number {
    if (recommendations.length === 0 || feedback.length === 0) return 0

    // Create relevance scores from feedback
    const relevanceMap = new Map<string, number>()
    for (const f of feedback) {
      if (f.destination_id) {
        const relevance = 
          f.feedback_type === 'select-destination' ? 3 :
          f.feedback_type === 'save-trip' ? 2 :
          f.feedback_type === 'thumbs-up' ? 1 :
          f.feedback_type === 'thumbs-down' ? -1 :
          0
        relevanceMap.set(f.destination_id, relevance)
      }
    }

    // Calculate DCG
    let dcg = 0
    for (let i = 0; i < Math.min(recommendations.length, 10); i++) {
      const relevance = relevanceMap.get(recommendations[i].destinationId) || 0
      dcg += relevance / Math.log2(i + 2) // i+2 because log2(1) = 0
    }

    // Calculate ideal DCG
    const relevances = Array.from(relevanceMap.values()).sort((a, b) => b - a)
    let idcg = 0
    for (let i = 0; i < Math.min(relevances.length, 10); i++) {
      idcg += relevances[i] / Math.log2(i + 2)
    }

    return idcg > 0 ? dcg / idcg : 0
  }

  /**
   * Calculate MRR (Mean Reciprocal Rank)
   */
  private calculateMRR(acceptedFeedback: UserFeedback[]): number {
    if (acceptedFeedback.length === 0) return 0

    const reciprocalRanks = acceptedFeedback
      .filter(f => f.recommendation_rank)
      .map(f => 1 / (f.recommendation_rank || 1))

    return reciprocalRanks.length > 0
      ? reciprocalRanks.reduce((sum, rr) => sum + rr, 0) / reciprocalRanks.length
      : 0
  }

  /**
   * Evaluate confidence calibration
   */
  private evaluateConfidenceCalibration(
    recommendations: RankedDestination[],
    feedback: UserFeedback[]
  ): { calibration: number; overconfidence: number; underconfidence: number } {
    const feedbackMap = new Map<string, boolean>()
    for (const f of feedback) {
      if (f.destination_id) {
        feedbackMap.set(
          f.destination_id,
          f.feedback_type === 'thumbs-up' || 
          f.feedback_type === 'save-trip' || 
          f.feedback_type === 'select-destination'
        )
      }
    }

    let totalCalibrationError = 0
    let overconfidentCount = 0
    let underconfidentCount = 0
    let count = 0

    for (const rec of recommendations) {
      const wasAccepted = feedbackMap.get(rec.destinationId)
      if (wasAccepted !== undefined) {
        const predicted = rec.confidence
        const actual = wasAccepted ? 1 : 0
        const error = Math.abs(predicted - actual)
        totalCalibrationError += error

        if (predicted > actual + 0.2) overconfidentCount++
        if (predicted < actual - 0.2) underconfidentCount++

        count++
      }
    }

    return {
      calibration: count > 0 ? 1 - (totalCalibrationError / count) : 0,
      overconfidence: count > 0 ? overconfidentCount / count : 0,
      underconfidence: count > 0 ? underconfidentCount / count : 0,
    }
  }

  /**
   * Calculate comparison confidence
   */
  private calculateComparisonConfidence(
    baseline: EvaluationMetrics,
    ml: EvaluationMetrics,
    sampleSize: number
  ): number {
    // Higher confidence with more samples
    let confidence = Math.min(sampleSize / 100, 1.0)

    // Higher confidence with larger differences
    const difference = Math.abs(ml.overallQuality - baseline.overallQuality)
    confidence *= Math.min(difference * 5, 1.0)

    return confidence
  }

  /**
   * Aggregate metrics
   */
  private aggregateMetrics(metrics: EvaluationMetrics[]): EvaluationMetrics {
    if (metrics.length === 0) {
      return {
        rankingAccuracy: 0,
        ndcg: 0,
        mrr: 0,
        acceptanceRate: 0,
        dismissalRate: 0,
        averageRank: 0,
        confidenceCalibration: 0,
        overconfidenceRate: 0,
        underconfidenceRate: 0,
        overallQuality: 0,
      }
    }

    const sum = (key: keyof EvaluationMetrics) =>
      metrics.reduce((s, m) => s + m[key], 0) / metrics.length

    return {
      rankingAccuracy: sum('rankingAccuracy'),
      ndcg: sum('ndcg'),
      mrr: sum('mrr'),
      acceptanceRate: sum('acceptanceRate'),
      dismissalRate: sum('dismissalRate'),
      averageRank: sum('averageRank'),
      confidenceCalibration: sum('confidenceCalibration'),
      overconfidenceRate: sum('overconfidenceRate'),
      underconfidenceRate: sum('underconfidenceRate'),
      overallQuality: sum('overallQuality'),
    }
  }
}

export const mlEvaluator = new MLEvaluator()
