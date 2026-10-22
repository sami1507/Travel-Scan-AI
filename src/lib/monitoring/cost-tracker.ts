// Cost Monitoring and Usage Tracking
// Usage events are persisted to Supabase (ai_usage_metrics) so they survive
// serverless cold starts; in-memory arrays are a per-instance fallback for reads.
import { logger } from '../utils'
import { createAdminClient } from '../supabase/admin'

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

    this.persist(metric)

    logger.info('Cost: Tracked usage', {
      provider,
      operation,
      cost: cost.toFixed(4),
    })
  }

  /**
   * Persist a usage metric to Supabase (best-effort, fire-and-forget)
   */
  private persist(metric: UsageMetric) {
    try {
      const supabase = createAdminClient()
      void Promise.resolve(
        supabase.from('ai_usage_metrics').insert({
          provider: metric.provider,
          operation: metric.operation,
          count: metric.count,
          estimated_cost: metric.estimatedCost,
          created_at: metric.timestamp,
        } as any)
      ).catch(persistError => {
        logger.warn('Cost tracker: failed to persist metric', {
          error: persistError instanceof Error ? persistError.message : String(persistError),
        })
      })
    } catch {
      // Admin client unavailable (missing env) — memory-only mode
    }
  }

  /**
   * Load metrics from persisted storage, falling back to in-memory on failure
   */
  private async loadMetrics(limit: number = 10000): Promise<UsageMetric[]> {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('ai_usage_metrics')
        .select('provider, operation, count, estimated_cost, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map((row: any) => ({
        provider: row.provider,
        operation: row.operation,
        count: row.count,
        estimatedCost: Number(row.estimated_cost),
        timestamp: row.created_at,
      }))
    } catch (error) {
      logger.warn('Cost tracker: DB read failed, using in-memory fallback', {
        error: error instanceof Error ? error.message : String(error),
      })
      return this.metrics
    }
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
  async getCostSummary(): Promise<CostSummary[]> {
    const metrics = await this.loadMetrics()
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    const summaryMap = new Map<string, CostSummary>()

    metrics.forEach(metric => {
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
  async getTotalCost(): Promise<{ total: number; last24Hours: number; lastHour: number }> {
    const metrics = await this.loadMetrics()
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    let total = 0
    let last24Hours = 0
    let lastHour = 0

    metrics.forEach(metric => {
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
  async getMostExpensiveOperations(limit: number = 10): Promise<Array<{
    provider: string
    operation: string
    totalCost: number
    callCount: number
  }>> {
    const metrics = await this.loadMetrics()
    const operationCosts = new Map<string, { cost: number; count: number }>()

    metrics.forEach(metric => {
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
  async checkCostThreshold(thresholdUSD: number, periodHours: number = 24): Promise<boolean> {
    const metrics = await this.loadMetrics()
    const now = Date.now()
    const cutoff = now - periodHours * 60 * 60 * 1000

    const periodCost = metrics
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
