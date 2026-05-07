// Shadow Mode and A/B Comparison Infrastructure
import type { RankedDestination } from '../../analysis/schemas'
import type { ComparisonResult } from './baseline-ml-comparator'
import { baselineMLComparator } from './baseline-ml-comparator'
import { logger } from '../../utils'

export interface ShadowModeConfig {
  enabled: boolean
  sampleRate: number // 0-1, what % of requests to compare
  logComparisons: boolean
  storeComparisons: boolean
}

export interface ShadowModeResult {
  comparisonId: string
  timestamp: string
  userId?: string
  query: string
  comparison: ComparisonResult
  servedSystem: 'baseline' | 'ml'
  servedRecommendations: RankedDestination[]
}

export interface ABTestConfig {
  enabled: boolean
  mlTrafficPercent: number // 0-100, what % gets ML
  baselineTrafficPercent: number // 0-100, what % gets baseline
  controlGroup: boolean // If true, some users always get baseline
}

class ShadowModeManager {
  private config: ShadowModeConfig = {
    enabled: true,
    sampleRate: 1.0, // Compare 100% of requests internally
    logComparisons: true,
    storeComparisons: true,
  }

  private abConfig: ABTestConfig = {
    enabled: false, // Disabled by default for safety
    mlTrafficPercent: 100, // When enabled, 100% get ML (can adjust for gradual rollout)
    baselineTrafficPercent: 0,
    controlGroup: false,
  }

  private comparisons: ShadowModeResult[] = []
  private readonly MAX_COMPARISONS = 1000

  /**
   * Run shadow mode comparison
   * Always serves ML to user, but compares with baseline internally
   */
  async runShadowComparison(
    baselineRecs: RankedDestination[],
    mlRecs: RankedDestination[],
    context: {
      userId?: string
      query: string
    }
  ): Promise<ShadowModeResult | null> {
    if (!this.config.enabled) {
      return null
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      return null
    }

    try {
      // Run comparison
      const comparison = baselineMLComparator.compare(baselineRecs, mlRecs, 3)

      const result: ShadowModeResult = {
        comparisonId: this.generateComparisonId(),
        timestamp: new Date().toISOString(),
        userId: context.userId,
        query: context.query,
        comparison,
        servedSystem: 'ml', // Always serve ML in shadow mode
        servedRecommendations: mlRecs.slice(0, 3),
      }

      // Log comparison
      if (this.config.logComparisons) {
        logger.info('Shadow Mode Comparison', {
          comparisonId: result.comparisonId,
          winner: comparison.winner,
          topMatch: comparison.metrics.topRecommendationMatch,
          scoreDiff: comparison.metrics.scoreDifference.toFixed(3),
        })
      }

      // Store comparison
      if (this.config.storeComparisons) {
        this.storeComparison(result)
      }

      return result
    } catch (error) {
      logger.error('Shadow mode comparison failed', error)
      return null
    }
  }

  /**
   * Determine which system to serve based on A/B config
   * Returns 'ml' or 'baseline'
   */
  determineServingSystem(userId?: string): 'ml' | 'baseline' {
    if (!this.abConfig.enabled) {
      return 'ml' // Default to ML when A/B testing disabled
    }

    // Control group logic (consistent assignment per user)
    if (this.abConfig.controlGroup && userId) {
      const hash = this.hashUserId(userId)
      const isControl = hash < 0.2 // 20% control group always gets baseline
      if (isControl) {
        return 'baseline'
      }
    }

    // Random assignment based on traffic percentages
    const random = Math.random() * 100
    if (random < this.abConfig.mlTrafficPercent) {
      return 'ml'
    } else {
      return 'baseline'
    }
  }

  /**
   * Get comparison statistics
   */
  getComparisonStats(): {
    totalComparisons: number
    mlWins: number
    baselineWins: number
    ties: number
    avgScoreDifference: number
    avgRankingOverlap: number
    topRecommendationMatchRate: number
  } {
    if (this.comparisons.length === 0) {
      return {
        totalComparisons: 0,
        mlWins: 0,
        baselineWins: 0,
        ties: 0,
        avgScoreDifference: 0,
        avgRankingOverlap: 0,
        topRecommendationMatchRate: 0,
      }
    }

    const mlWins = this.comparisons.filter(c => c.comparison.winner === 'ml').length
    const baselineWins = this.comparisons.filter(c => c.comparison.winner === 'baseline').length
    const ties = this.comparisons.filter(c => c.comparison.winner === 'tie').length

    const avgScoreDifference = this.comparisons.reduce(
      (sum, c) => sum + c.comparison.metrics.scoreDifference,
      0
    ) / this.comparisons.length

    const avgRankingOverlap = this.comparisons.reduce(
      (sum, c) => sum + c.comparison.metrics.rankingOverlap,
      0
    ) / this.comparisons.length

    const topMatches = this.comparisons.filter(
      c => c.comparison.metrics.topRecommendationMatch
    ).length
    const topRecommendationMatchRate = topMatches / this.comparisons.length

    return {
      totalComparisons: this.comparisons.length,
      mlWins,
      baselineWins,
      ties,
      avgScoreDifference,
      avgRankingOverlap,
      topRecommendationMatchRate,
    }
  }

  /**
   * Get recent comparisons
   */
  getRecentComparisons(limit: number = 50): ShadowModeResult[] {
    return this.comparisons.slice(-limit).reverse()
  }

  /**
   * Clear comparison history
   */
  clearComparisons() {
    this.comparisons = []
  }

  /**
   * Update shadow mode configuration
   */
  updateConfig(config: Partial<ShadowModeConfig>) {
    this.config = { ...this.config, ...config }
    logger.info('Shadow mode config updated', this.config)
  }

  /**
   * Update A/B test configuration
   */
  updateABConfig(config: Partial<ABTestConfig>) {
    this.abConfig = { ...this.abConfig, ...config }
    logger.info('A/B test config updated', this.abConfig)
  }

  /**
   * Get current configurations
   */
  getConfig() {
    return {
      shadowMode: this.config,
      abTest: this.abConfig,
    }
  }

  // Private methods

  private storeComparison(result: ShadowModeResult) {
    this.comparisons.push(result)
    if (this.comparisons.length > this.MAX_COMPARISONS) {
      this.comparisons.shift()
    }
  }

  private generateComparisonId(): string {
    return `cmp_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  private hashUserId(userId: string): number {
    // Simple hash function to consistently assign users
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash % 100) / 100 // Return 0-1
  }
}

// Singleton instance
export const shadowModeManager = new ShadowModeManager()
