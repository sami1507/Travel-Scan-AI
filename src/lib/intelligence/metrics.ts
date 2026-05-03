// Deterministic metrics layer - compute scores before agent analysis
import type { NormalizedRecord, ChangeEvent } from '../types'

export interface TravelMetrics {
  priceChangePercentage: number | null
  volatilityScore: number // 0-1
  opportunityScore: number // 0-1
  riskScore: number // 0-1
  sourceConfidence: number // 0-1
  dataCompleteness: number // 0-1
}

export interface OpportunityMetrics {
  score: number // 0-1
  category: 'price_drop' | 'availability_increase' | 'favorable_conditions' | 'none'
  strength: 'weak' | 'moderate' | 'strong'
  evidence: string[]
}

export interface RiskMetrics {
  score: number // 0-1
  category: 'price_spike' | 'availability_drop' | 'adverse_conditions' | 'none'
  severity: 'low' | 'medium' | 'high'
  evidence: string[]
}

export class TravelMetricsEngine {
  /**
   * Calculate price change percentage from change events
   */
  calculatePriceChange(previousContent: any, newContent: any): number | null {
    const prevPrice = this.extractPrice(previousContent)
    const newPrice = this.extractPrice(newContent)

    if (prevPrice === null || newPrice === null) return null

    return ((newPrice - prevPrice) / prevPrice) * 100
  }

  /**
   * Calculate volatility score based on change frequency
   */
  calculateVolatilityScore(changes: ChangeEvent[]): number {
    if (changes.length === 0) return 0

    const modifiedCount = changes.filter(c => c.change_type === 'modified').length
    const totalCount = changes.length

    // High volatility if many modifications
    return Math.min(modifiedCount / totalCount, 1)
  }

  /**
   * Calculate opportunity score
   */
  calculateOpportunityScore(changes: ChangeEvent[]): OpportunityMetrics {
    const evidence: string[] = []
    let score = 0

    const priceDrops = changes.filter(c => {
      const priceChange = this.calculatePriceChange(c.previous_content, c.new_content)
      return priceChange !== null && priceChange < -5 // 5% drop threshold
    })

    if (priceDrops.length > 0) {
      score += 0.5
      evidence.push(`${priceDrops.length} price drop(s) detected`)
    }

    const newRecords = changes.filter(c => c.change_type === 'new')
    if (newRecords.length > 5) {
      score += 0.3
      evidence.push(`${newRecords.length} new options available`)
    }

    const category = score > 0.5 ? 'price_drop' : score > 0.3 ? 'availability_increase' : 'none'
    const strength = score > 0.7 ? 'strong' : score > 0.4 ? 'moderate' : 'weak'

    return {
      score: Math.min(score, 1),
      category,
      strength,
      evidence,
    }
  }

  /**
   * Calculate risk score
   */
  calculateRiskScore(changes: ChangeEvent[]): RiskMetrics {
    const evidence: string[] = []
    let score = 0

    const priceSpikes = changes.filter(c => {
      const priceChange = this.calculatePriceChange(c.previous_content, c.new_content)
      return priceChange !== null && priceChange > 10 // 10% increase threshold
    })

    if (priceSpikes.length > 0) {
      score += 0.6
      evidence.push(`${priceSpikes.length} price spike(s) detected`)
    }

    const removedRecords = changes.filter(c => c.change_type === 'removed')
    if (removedRecords.length > 3) {
      score += 0.4
      evidence.push(`${removedRecords.length} options removed`)
    }

    const category = score > 0.5 ? 'price_spike' : score > 0.3 ? 'availability_drop' : 'none'
    const severity = score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low'

    return {
      score: Math.min(score, 1),
      category,
      severity,
      evidence,
    }
  }

  /**
   * Calculate source confidence based on data freshness and completeness
   */
  calculateSourceConfidence(records: NormalizedRecord[]): number {
    if (records.length === 0) return 0

    const now = new Date()
    const recentRecords = records.filter(r => {
      const age = now.getTime() - new Date(r.created_at).getTime()
      return age < 24 * 60 * 60 * 1000 // 24 hours
    })

    const freshnessScore = recentRecords.length / records.length
    const completenessScore = records.filter(r => r.content && Object.keys(r.content).length > 0).length / records.length

    return (freshnessScore + completenessScore) / 2
  }

  /**
   * Calculate data completeness
   */
  calculateDataCompleteness(records: NormalizedRecord[]): number {
    if (records.length === 0) return 0

    const requiredFields = ['external_id', 'record_type', 'content']
    const completeRecords = records.filter(r => {
      return requiredFields.every(field => r[field as keyof NormalizedRecord])
    })

    return completeRecords.length / records.length
  }

  /**
   * Extract price from content object
   */
  private extractPrice(content: any): number | null {
    if (!content) return null

    // Try common price field names
    const priceFields = ['price', 'amount', 'cost', 'rate', 'value']
    for (const field of priceFields) {
      if (typeof content[field] === 'number') return content[field]
      if (typeof content[field] === 'string') {
        const parsed = parseFloat(content[field])
        if (!isNaN(parsed)) return parsed
      }
    }

    return null
  }

  /**
   * Compute all metrics for a dataset
   */
  computeMetrics(records: NormalizedRecord[], changes: ChangeEvent[]): TravelMetrics {
    const sampleChange = changes[0]
    const priceChange = sampleChange
      ? this.calculatePriceChange(sampleChange.previous_content, sampleChange.new_content)
      : null

    return {
      priceChangePercentage: priceChange,
      volatilityScore: this.calculateVolatilityScore(changes),
      opportunityScore: this.calculateOpportunityScore(changes).score,
      riskScore: this.calculateRiskScore(changes).score,
      sourceConfidence: this.calculateSourceConfidence(records),
      dataCompleteness: this.calculateDataCompleteness(records),
    }
  }
}

export const metricsEngine = new TravelMetricsEngine()
