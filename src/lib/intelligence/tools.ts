// Evidence-based data access tools
import { createAdminClient } from '../supabase/admin'
import { logger } from '../utils'
import type { NormalizedRecord, ChangeEvent, SourceConfig } from '../types'
import { metricsEngine, type TravelMetrics, type OpportunityMetrics, type RiskMetrics } from './metrics'

export interface StructuredTravelData {
  records: NormalizedRecord[]
  changes: ChangeEvent[]
  metrics: TravelMetrics
  opportunityMetrics: OpportunityMetrics
  riskMetrics: RiskMetrics
  sources: SourceConfig[]
}

export class IntelligenceDataTools {
  /**
   * Get latest normalized travel records with limit
   */
  async getLatestNormalizedTravelRecords(limit: number = 100): Promise<NormalizedRecord[]> {
    try {
      const supabase = createAdminClient()
      
      const { data, error } = await supabase
        .from('normalized_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []) as NormalizedRecord[]
    } catch (error) {
      logger.error('Failed to fetch normalized records', error)
      return []
    }
  }

  /**
   * Get recent change events with limit
   */
  async getRecentChangeEvents(limit: number = 200): Promise<ChangeEvent[]> {
    try {
      const supabase = createAdminClient()
      
      const { data, error } = await supabase
        .from('change_events')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []) as ChangeEvent[]
    } catch (error) {
      logger.error('Failed to fetch change events', error)
      return []
    }
  }

  /**
   * Get travel opportunity metrics (computed deterministically)
   */
  async getTravelOpportunityMetrics(changes: ChangeEvent[]): Promise<OpportunityMetrics> {
    return metricsEngine.calculateOpportunityScore(changes)
  }

  /**
   * Get travel risk metrics (computed deterministically)
   */
  async getTravelRiskMetrics(changes: ChangeEvent[]): Promise<RiskMetrics> {
    return metricsEngine.calculateRiskScore(changes)
  }

  /**
   * Get source confidence summary
   */
  async getSourceConfidenceSummary(): Promise<{
    totalSources: number
    activeSources: number
    averageConfidence: number
    sources: Array<{ id: string; name: string; confidence: number }>
  }> {
    try {
      const supabase = createAdminClient()
      
      const { data: sources, error } = await supabase
        .from('source_configs')
        .select('*')

      if (error) throw error

      const sourceConfigs = (sources || []) as SourceConfig[]
      const activeSources = sourceConfigs.filter(s => s.is_active)

      // Get records for each source to calculate confidence
      const sourceConfidences = await Promise.all(
        sourceConfigs.map(async (source) => {
          const { data: records } = await supabase
            .from('normalized_records')
            .select('*')
            .eq('source_config_id', source.id)
            .limit(50)

          const confidence = metricsEngine.calculateSourceConfidence((records || []) as NormalizedRecord[])

          return {
            id: source.id,
            name: source.name,
            confidence,
          }
        })
      )

      const averageConfidence = sourceConfidences.length > 0
        ? sourceConfidences.reduce((sum, s) => sum + s.confidence, 0) / sourceConfidences.length
        : 0

      return {
        totalSources: sourceConfigs.length,
        activeSources: activeSources.length,
        averageConfidence,
        sources: sourceConfidences,
      }
    } catch (error) {
      logger.error('Failed to get source confidence summary', error)
      return {
        totalSources: 0,
        activeSources: 0,
        averageConfidence: 0,
        sources: [],
      }
    }
  }

  /**
   * Get all structured data for intelligence analysis
   */
  async getStructuredTravelData(options?: {
    recordLimit?: number
    changeLimit?: number
    sourceConfigId?: string
  }): Promise<StructuredTravelData> {
    const recordLimit = options?.recordLimit || 100
    const changeLimit = options?.changeLimit || 200

    // Fetch data
    const records = options?.sourceConfigId
      ? await this.getRecordsBySource(options.sourceConfigId, recordLimit)
      : await this.getLatestNormalizedTravelRecords(recordLimit)

    const changes = await this.getRecentChangeEvents(changeLimit)

    // Compute metrics
    const metrics = metricsEngine.computeMetrics(records, changes)
    const opportunityMetrics = await this.getTravelOpportunityMetrics(changes)
    const riskMetrics = await this.getTravelRiskMetrics(changes)

    // Get sources
    const sources = await this.getSources()

    return {
      records,
      changes,
      metrics,
      opportunityMetrics,
      riskMetrics,
      sources,
    }
  }

  /**
   * Get records by source config ID
   */
  private async getRecordsBySource(sourceConfigId: string, limit: number): Promise<NormalizedRecord[]> {
    try {
      const supabase = createAdminClient()
      
      const { data, error } = await supabase
        .from('normalized_records')
        .select('*')
        .eq('source_config_id', sourceConfigId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []) as NormalizedRecord[]
    } catch (error) {
      logger.error('Failed to fetch records by source', error)
      return []
    }
  }

  /**
   * Get all sources
   */
  private async getSources(): Promise<SourceConfig[]> {
    try {
      const supabase = createAdminClient()
      
      const { data, error } = await supabase
        .from('source_configs')
        .select('*')

      if (error) throw error

      return (data || []) as SourceConfig[]
    } catch (error) {
      logger.error('Failed to fetch sources', error)
      return []
    }
  }
}

export const intelligenceDataTools = new IntelligenceDataTools()
