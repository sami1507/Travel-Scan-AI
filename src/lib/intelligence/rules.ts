// Rules layer - deterministic logic to reduce hallucination
import type { TravelMetrics, OpportunityMetrics, RiskMetrics } from './metrics'

export interface RuleOutput {
  isSignificant: boolean
  category: 'opportunity' | 'risk' | 'monitoring' | 'mixed'
  severity: 'info' | 'important' | 'urgent'
  recommendationStrength: 'weak' | 'moderate' | 'strong'
  confidenceAdjustment: number // -0.3 to 0
  reasons: string[]
}

export class TravelRulesEngine {
  /**
   * Apply rules to determine if a signal is significant
   */
  evaluateSignificance(
    metrics: TravelMetrics,
    opportunityMetrics: OpportunityMetrics,
    riskMetrics: RiskMetrics
  ): RuleOutput {
    const reasons: string[] = []
    let isSignificant = false
    let category: 'opportunity' | 'risk' | 'monitoring' | 'mixed' = 'monitoring'
    let severity: 'info' | 'important' | 'urgent' = 'info'
    let recommendationStrength: 'weak' | 'moderate' | 'strong' = 'weak'
    let confidenceAdjustment = 0

    // Rule 1: Price change threshold
    if (metrics.priceChangePercentage !== null) {
      if (Math.abs(metrics.priceChangePercentage) > 15) {
        isSignificant = true
        severity = 'urgent'
        reasons.push(`Price changed by ${metrics.priceChangePercentage.toFixed(1)}%`)
      } else if (Math.abs(metrics.priceChangePercentage) > 5) {
        isSignificant = true
        severity = 'important'
        reasons.push(`Price changed by ${metrics.priceChangePercentage.toFixed(1)}%`)
      }
    }

    // Rule 2: Opportunity score threshold
    if (opportunityMetrics.score > 0.6) {
      isSignificant = true
      category = 'opportunity'
      recommendationStrength = opportunityMetrics.strength === 'strong' ? 'strong' : 'moderate'
      reasons.push(`Strong opportunity detected (score: ${opportunityMetrics.score.toFixed(2)})`)
    } else if (opportunityMetrics.score > 0.3) {
      isSignificant = true
      category = 'opportunity'
      recommendationStrength = 'moderate'
      reasons.push(`Moderate opportunity detected (score: ${opportunityMetrics.score.toFixed(2)})`)
    }

    // Rule 3: Risk score threshold
    if (riskMetrics.score > 0.6) {
      isSignificant = true
      category = category === 'opportunity' ? 'mixed' : 'risk'
      severity = riskMetrics.severity === 'high' ? 'urgent' : 'important'
      recommendationStrength = 'strong'
      reasons.push(`High risk detected (score: ${riskMetrics.score.toFixed(2)})`)
    } else if (riskMetrics.score > 0.3) {
      isSignificant = true
      category = category === 'opportunity' ? 'mixed' : 'risk'
      severity = 'important'
      reasons.push(`Moderate risk detected (score: ${riskMetrics.score.toFixed(2)})`)
    }

    // Rule 4: Source confidence adjustment
    if (metrics.sourceConfidence < 0.5) {
      confidenceAdjustment -= 0.2
      recommendationStrength = 'weak'
      reasons.push('Source confidence is low - recommendation strength reduced')
    } else if (metrics.sourceConfidence < 0.7) {
      confidenceAdjustment -= 0.1
      reasons.push('Source confidence is moderate')
    }

    // Rule 5: Data completeness adjustment
    if (metrics.dataCompleteness < 0.6) {
      confidenceAdjustment -= 0.2
      recommendationStrength = 'weak'
      reasons.push('Data completeness is low - confidence reduced')
    } else if (metrics.dataCompleteness < 0.8) {
      confidenceAdjustment -= 0.1
      reasons.push('Data completeness is moderate')
    }

    // Rule 6: High volatility warning
    if (metrics.volatilityScore > 0.7) {
      severity = severity === 'info' ? 'important' : severity
      reasons.push('High volatility detected - monitor closely')
    }

    return {
      isSignificant,
      category,
      severity,
      recommendationStrength,
      confidenceAdjustment: Math.max(confidenceAdjustment, -0.3),
      reasons,
    }
  }

  /**
   * Determine if evidence supports a high confidence conclusion
   */
  validateEvidenceStrength(
    evidenceCount: number,
    sourceConfidence: number,
    dataCompleteness: number
  ): {
    isStrong: boolean
    maxAllowedConfidence: 'low' | 'medium' | 'high'
    gaps: string[]
  } {
    const gaps: string[] = []

    if (evidenceCount < 2) {
      gaps.push('Insufficient evidence - fewer than 2 data points')
    }

    if (sourceConfidence < 0.6) {
      gaps.push('Source confidence below acceptable threshold')
    }

    if (dataCompleteness < 0.7) {
      gaps.push('Data completeness below acceptable threshold')
    }

    const isStrong = gaps.length === 0 && evidenceCount >= 3

    let maxAllowedConfidence: 'low' | 'medium' | 'high' = 'high'
    if (gaps.length >= 2 || evidenceCount < 2) {
      maxAllowedConfidence = 'low'
    } else if (gaps.length === 1 || evidenceCount < 3) {
      maxAllowedConfidence = 'medium'
    }

    return {
      isStrong,
      maxAllowedConfidence,
      gaps,
    }
  }
}

export const rulesEngine = new TravelRulesEngine()
