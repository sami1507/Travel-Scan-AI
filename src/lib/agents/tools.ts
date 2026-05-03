// Agent tools for accessing travel data
import { createAdminClient } from '../supabase/admin'
import { logger } from '../utils'
import type { NormalizedRecord, ChangeEvent } from '../types'

export class TravelDataTools {
  /**
   * Get the latest normalized travel records
   */
  async getLatestRecords(limit: number = 50): Promise<NormalizedRecord[]> {
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
      logger.error('Failed to fetch latest records', error)
      return []
    }
  }

  /**
   * Get recent change events
   */
  async getRecentChangeEvents(limit: number = 100): Promise<ChangeEvent[]> {
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
      logger.error('Failed to fetch recent change events', error)
      return []
    }
  }

  /**
   * Get change events by type
   */
  async getChangeEventsByType(changeType: 'new' | 'modified' | 'removed', limit: number = 50): Promise<ChangeEvent[]> {
    try {
      const supabase = createAdminClient()
      
      const { data, error } = await supabase
        .from('change_events')
        .select('*')
        .eq('change_type', changeType)
        .order('detected_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []) as ChangeEvent[]
    } catch (error) {
      logger.error('Failed to fetch change events by type', error)
      return []
    }
  }

  /**
   * Get records by source config ID
   */
  async getRecordsBySource(sourceConfigId: string, limit: number = 50): Promise<NormalizedRecord[]> {
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
   * Summarize change events for agent context
   */
  summarizeChanges(changes: ChangeEvent[]): string {
    if (changes.length === 0) return 'No recent changes detected.'

    const newCount = changes.filter(c => c.change_type === 'new').length
    const modifiedCount = changes.filter(c => c.change_type === 'modified').length
    const removedCount = changes.filter(c => c.change_type === 'removed').length

    const summary = [
      `Total changes: ${changes.length}`,
      `New records: ${newCount}`,
      `Modified records: ${modifiedCount}`,
      `Removed records: ${removedCount}`,
    ]

    return summary.join('\n')
  }

  /**
   * Extract key fields from records for agent analysis
   */
  extractRecordSummary(records: NormalizedRecord[]): string {
    if (records.length === 0) return 'No records available.'

    const summary = records.slice(0, 10).map((record, idx) => {
      return `${idx + 1}. ID: ${record.id}, External ID: ${record.external_id}, Type: ${record.record_type}, Created: ${record.created_at}`
    })

    return summary.join('\n')
  }
}

export const travelDataTools = new TravelDataTools()
