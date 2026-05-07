// Baseline vs ML Comparison Layer
import type { RankedDestination } from '../../analysis/schemas'
import { logger } from '../../utils'

export interface ComparisonMetrics {
  // Ranking comparison
  rankingOverlap: number // How many destinations appear in both top-N
  rankingCorrelation: number // Spearman correlation of rankings
  topRecommendationMatch: boolean // Do both systems recommend the same #1?
  
  // Quality comparison
  baselineAvgScore: number
  mlAvgScore: number
  scoreDifference: number
  
  // Diversity comparison
  baselineDiversity: number
  mlDiversity: number
  
  // Confidence comparison
  baselineAvgConfidence: number
  mlAvgConfidence: number
}

export interface ComparisonResult {
  timestamp: string
  baselineRecommendations: RankedDestination[]
  mlRecommendations: RankedDestination[]
  metrics: ComparisonMetrics
  winner: 'baseline' | 'ml' | 'tie'
  winnerReason: string
  differences: string[]
}

export class BaselineMLComparator {
  /**
   * Compare baseline and ML recommendation systems
   */
  compare(
    baselineRecs: RankedDestination[],
    mlRecs: RankedDestination[],
    topN: number = 3
  ): ComparisonResult {
    const baselineTop = baselineRecs.slice(0, topN)
    const mlTop = mlRecs.slice(0, topN)

    // Calculate metrics
    const metrics = this.calculateMetrics(baselineTop, mlTop)
    
    // Determine winner
    const { winner, reason } = this.determineWinner(metrics, baselineTop, mlTop)
    
    // Identify key differences
    const differences = this.identifyDifferences(baselineTop, mlTop)

    const result: ComparisonResult = {
      timestamp: new Date().toISOString(),
      baselineRecommendations: baselineTop,
      mlRecommendations: mlTop,
      metrics,
      winner,
      winnerReason: reason,
      differences,
    }

    logger.info('Baseline vs ML Comparison', {
      winner,
      rankingOverlap: metrics.rankingOverlap,
      scoreDiff: metrics.scoreDifference.toFixed(3),
    })

    return result
  }

  /**
   * Calculate comparison metrics
   */
  private calculateMetrics(
    baseline: RankedDestination[],
    ml: RankedDestination[]
  ): ComparisonMetrics {
    // Ranking overlap
    const baselineIds = new Set(baseline.map(r => r.destinationId))
    const mlIds = new Set(ml.map(r => r.destinationId))
    const overlap = baseline.filter(r => mlIds.has(r.destinationId)).length
    const rankingOverlap = baseline.length > 0 ? overlap / baseline.length : 0

    // Top recommendation match
    const topRecommendationMatch = baseline.length > 0 && ml.length > 0
      ? baseline[0].destinationId === ml[0].destinationId
      : false

    // Average scores
    const baselineAvgScore = this.averageScore(baseline)
    const mlAvgScore = this.averageScore(ml)
    const scoreDifference = mlAvgScore - baselineAvgScore

    // Diversity (unique countries in top recommendations)
    const baselineDiversity = this.calculateDiversity(baseline)
    const mlDiversity = this.calculateDiversity(ml)

    // Average confidence
    const baselineAvgConfidence = this.averageConfidence(baseline)
    const mlAvgConfidence = this.averageConfidence(ml)

    // Ranking correlation (simplified Spearman)
    const rankingCorrelation = this.calculateRankingCorrelation(baseline, ml)

    return {
      rankingOverlap,
      rankingCorrelation,
      topRecommendationMatch,
      baselineAvgScore,
      mlAvgScore,
      scoreDifference,
      baselineDiversity,
      mlDiversity,
      baselineAvgConfidence,
      mlAvgConfidence,
    }
  }

  /**
   * Determine which system performed better
   */
  private determineWinner(
    metrics: ComparisonMetrics,
    baseline: RankedDestination[],
    ml: RankedDestination[]
  ): { winner: 'baseline' | 'ml' | 'tie'; reason: string } {
    const reasons: string[] = []
    let mlPoints = 0
    let baselinePoints = 0

    // Score comparison (most important)
    if (metrics.scoreDifference > 0.05) {
      mlPoints += 3
      reasons.push(`ML has higher avg score (+${metrics.scoreDifference.toFixed(2)})`)
    } else if (metrics.scoreDifference < -0.05) {
      baselinePoints += 3
      reasons.push(`Baseline has higher avg score (+${Math.abs(metrics.scoreDifference).toFixed(2)})`)
    }

    // Confidence comparison
    if (metrics.mlAvgConfidence > metrics.baselineAvgConfidence + 0.05) {
      mlPoints += 2
      reasons.push('ML has higher confidence')
    } else if (metrics.baselineAvgConfidence > metrics.mlAvgConfidence + 0.05) {
      baselinePoints += 2
      reasons.push('Baseline has higher confidence')
    }

    // Diversity comparison
    if (metrics.mlDiversity > metrics.baselineDiversity) {
      mlPoints += 1
      reasons.push('ML has better diversity')
    } else if (metrics.baselineDiversity > metrics.mlDiversity) {
      baselinePoints += 1
      reasons.push('Baseline has better diversity')
    }

    // Determine winner
    if (mlPoints > baselinePoints) {
      return { winner: 'ml', reason: reasons.join('; ') }
    } else if (baselinePoints > mlPoints) {
      return { winner: 'baseline', reason: reasons.join('; ') }
    } else {
      return { winner: 'tie', reason: 'Both systems performed similarly' }
    }
  }

  /**
   * Identify key differences between systems
   */
  private identifyDifferences(
    baseline: RankedDestination[],
    ml: RankedDestination[]
  ): string[] {
    const differences: string[] = []

    // Top recommendation difference
    if (baseline.length > 0 && ml.length > 0) {
      if (baseline[0].destinationId !== ml[0].destinationId) {
        differences.push(
          `Top pick differs: Baseline=${baseline[0].destinationName}, ML=${ml[0].destinationName}`
        )
      }
    }

    // Destinations only in baseline
    const mlIds = new Set(ml.map(r => r.destinationId))
    const onlyBaseline = baseline.filter(r => !mlIds.has(r.destinationId))
    if (onlyBaseline.length > 0) {
      differences.push(
        `Only in baseline: ${onlyBaseline.map(r => r.destinationName).join(', ')}`
      )
    }

    // Destinations only in ML
    const baselineIds = new Set(baseline.map(r => r.destinationId))
    const onlyML = ml.filter(r => !baselineIds.has(r.destinationId))
    if (onlyML.length > 0) {
      differences.push(
        `Only in ML: ${onlyML.map(r => r.destinationName).join(', ')}`
      )
    }

    // Ranking order differences
    const commonIds = baseline
      .filter(r => mlIds.has(r.destinationId))
      .map(r => r.destinationId)
    
    if (commonIds.length > 1) {
      const baselineOrder = commonIds.map(id => 
        baseline.findIndex(r => r.destinationId === id)
      )
      const mlOrder = commonIds.map(id => 
        ml.findIndex(r => r.destinationId === id)
      )
      
      const hasReordering = baselineOrder.some((pos, i) => pos !== mlOrder[i])
      if (hasReordering) {
        differences.push('ML reordered common recommendations')
      }
    }

    return differences
  }

  // Helper methods

  private averageScore(recs: RankedDestination[]): number {
    if (recs.length === 0) return 0
    return recs.reduce((sum, r) => sum + r.totalMatchScore, 0) / recs.length
  }

  private averageConfidence(recs: RankedDestination[]): number {
    if (recs.length === 0) return 0
    return recs.reduce((sum, r) => sum + r.confidence, 0) / recs.length
  }

  private calculateDiversity(recs: RankedDestination[]): number {
    // Diversity = number of unique countries / total recommendations
    const countries = new Set(
      recs.map(r => r.destinationId.split('-')[0]) // Extract country code
    )
    return recs.length > 0 ? countries.size / recs.length : 0
  }

  private calculateRankingCorrelation(
    baseline: RankedDestination[],
    ml: RankedDestination[]
  ): number {
    // Simplified Spearman correlation for common destinations
    const commonIds = baseline
      .filter(r => ml.some(m => m.destinationId === r.destinationId))
      .map(r => r.destinationId)

    if (commonIds.length < 2) return 0

    const baselineRanks = commonIds.map(id => 
      baseline.findIndex(r => r.destinationId === id)
    )
    const mlRanks = commonIds.map(id => 
      ml.findIndex(r => r.destinationId === id)
    )

    // Calculate rank differences
    const rankDiffs = baselineRanks.map((rank, i) => 
      Math.abs(rank - mlRanks[i])
    )
    const avgDiff = rankDiffs.reduce((sum, d) => sum + d, 0) / rankDiffs.length

    // Convert to correlation (0 = no correlation, 1 = perfect correlation)
    const maxDiff = commonIds.length - 1
    return maxDiff > 0 ? 1 - (avgDiff / maxDiff) : 1
  }
}

// Singleton instance
export const baselineMLComparator = new BaselineMLComparator()
