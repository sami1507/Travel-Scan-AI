// Cost Monitoring and Usage Tracking
import { logger } from '../utils'

export interface UsageMetric {
  provider: string
  operation: string
  count: number
  estimatedCost: number
  timestamp: string
}

export interface CostSummary {
  provider: string
  totalCalls: number
  estimatedCost: number
  last24Hours: number
  lastHour: number
}

// Estimated costs (in USD) - update these based on actual pricing
const COST_ESTIMATES = {
  'openai-gpt4': 0.03, // per request (rough estimate)
  'openai-gpt4-turbo': 0.01,
  'duffel-search': 0.005, // per search
  'hotelbeds-search': 0.005,
  'google-maps-route': 0.005,
  'supabase-query': 0.0001, // negligible but tracked
}

class CostTracker {
  private metrics: UsageMetric[] = []
  private readonly MAX_METRICS = 10000 // Keep last 10k metrics

  /**
   * Track API usage
   */
  track(provider: string, operation: string, estimatedCost?: number) {
    const cost = estimatedCost ?? this.getEstimatedCost(provider, operation)
    
    const metric: UsageMetric = {
      provider,
      operation,
      count: 1,
      estimatedCost: cost,
      timestamp: new Date().toISOString(),
    }

    this.metrics.push(metric)
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift()
    }

    logger.info('Cost: Tracked usage', {
      provider,
      operation,
      cost: cost.toFixed(4),
    })
  }

  /**
   * Track OpenAI usage
   */
  trackOpenAI(model: string, tokens?: number) {
    const operation = `openai-${model}`
    let cost = COST_ESTIMATES['openai-gpt4']
    
    // Adjust cost based on tokens if provided
    if (tokens) {
      // Rough estimate: $0.03 per 1K tokens for GPT-4
      cost = (tokens / 1000) * 0.03
    }

    this.track('openai', operation, cost)
  }

  /**
   * Track provider usage
   */
  trackProvider(provider: string, operation: string) {
    const key = `${provider}-${operation}` as keyof typeof COST_ESTIMATES
    const cost = COST_ESTIMATES[key] || 0.001
    this.track(provider, operation, cost)
  }

  /**
   * Track expensive operations
   */
  trackExpensiveOperation(operation: string, estimatedCost: number) {
    this.track('system', operation, estimatedCost)
  }

  /**
   * Get cost summary by provider
   */
  getCostSummary(): CostSummary[] {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    const summaryMap = new Map<string, CostSummary>()

    this.metrics.forEach(metric => {
      const timestamp = new Date(metric.timestamp).getTime()
      
      if (!summaryMap.has(metric.provider)) {
        summaryMap.set(metric.provider, {
          provider: metric.provider,
          totalCalls: 0,
          estimatedCost: 0,
          last24Hours: 0,
          lastHour: 0,
        })
      }

      const summary = summaryMap.get(metric.provider)!
      summary.totalCalls += metric.count
      summary.estimatedCost += metric.estimatedCost

      if (timestamp > oneDayAgo) {
        summary.last24Hours += metric.count
      }
      if (timestamp > oneHourAgo) {
        summary.lastHour += metric.count
      }
    })

    return Array.from(summaryMap.values()).sort((a, b) => b.estimatedCost - a.estimatedCost)
  }

  /**
   * Get total estimated cost
   */
  getTotalCost(): { total: number; last24Hours: number; lastHour: number } {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    let total = 0
    let last24Hours = 0
    let lastHour = 0

    this.metrics.forEach(metric => {
      const timestamp = new Date(metric.timestamp).getTime()
      total += metric.estimatedCost

      if (timestamp > oneDayAgo) {
        last24Hours += metric.estimatedCost
      }
      if (timestamp > oneHourAgo) {
        lastHour += metric.estimatedCost
      }
    })

    return { total, last24Hours, lastHour }
  }

  /**
   * Get usage by operation
   */
  getUsageByOperation(provider?: string): Record<string, number> {
    const usage: Record<string, number> = {}

    this.metrics
      .filter(m => !provider || m.provider === provider)
      .forEach(metric => {
        const key = `${metric.provider}:${metric.operation}`
        usage[key] = (usage[key] || 0) + metric.count
      })

    return usage
  }

  /**
   * Get most expensive operations
   */
  getMostExpensiveOperations(limit: number = 10): Array<{
    provider: string
    operation: string
    totalCost: number
    callCount: number
  }> {
    const operationCosts = new Map<string, { cost: number; count: number }>()

    this.metrics.forEach(metric => {
      const key = `${metric.provider}:${metric.operation}`
      if (!operationCosts.has(key)) {
        operationCosts.set(key, { cost: 0, count: 0 })
      }
      const data = operationCosts.get(key)!
      data.cost += metric.estimatedCost
      data.count += metric.count
    })

    return Array.from(operationCosts.entries())
      .map(([key, data]) => {
        const [provider, operation] = key.split(':')
        return {
          provider,
          operation,
          totalCost: data.cost,
          callCount: data.count,
        }
      })
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit)
  }

  /**
   * Check if cost threshold exceeded
   */
  checkCostThreshold(thresholdUSD: number, periodHours: number = 24): boolean {
    const now = Date.now()
    const cutoff = now - periodHours * 60 * 60 * 1000

    const periodCost = this.metrics
      .filter(m => new Date(m.timestamp).getTime() > cutoff)
      .reduce((sum, m) => sum + m.estimatedCost, 0)

    if (periodCost > thresholdUSD) {
      logger.warn('Cost: Threshold exceeded', {
        threshold: thresholdUSD,
        actual: periodCost.toFixed(2),
        period: `${periodHours}h`,
      })
      return true
    }

    return false
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanDays: number = 30) {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    this.metrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff)
  }

  /**
   * Get estimated cost for operation
   */
  private getEstimatedCost(provider: string, operation: string): number {
    const key = `${provider}-${operation}` as keyof typeof COST_ESTIMATES
    return COST_ESTIMATES[key] || 0.001 // Default to $0.001
  }
}

// Singleton instance
export const costTracker = new CostTracker()

// Auto-cleanup every day
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    costTracker.clearOldMetrics(30)
  }, 24 * 60 * 60 * 1000)
}
