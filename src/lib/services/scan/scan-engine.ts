// Scan engine - analyzes changes and generates alerts
import { createAdminClient } from '@/lib/supabase/admin'
import type { IngestionRun, ChangeEvent, ScanResult, Alert } from '@/lib/types'
import { openAIProvider } from '../ai/openai-provider'
import { logger } from '@/lib/utils'
import { createScanResult } from '@/lib/db/scans'

export class ScanEngine {
  async runScan(ingestionRun: IngestionRun, sourceConfigId: string, userId: string): Promise<ScanResult> {
    logger.info('Starting scan', { ingestionRunId: ingestionRun.id })

    try {
      const supabase = createAdminClient()
      
      // Step 1: Fetch change events from this ingestion run
      const { data: changes, error: changesError } = await supabase
        .from('change_events')
        .select('*')
        .eq('ingestion_run_id', ingestionRun.id)

      if (changesError) throw changesError

      const changeEvents = (changes || []) as ChangeEvent[]
      logger.info('Fetched change events', { count: changeEvents.length })

      // Step 2: Get source config for context
      const { data: sourceConfig } = await supabase
        .from('source_configs')
        .select('*')
        .eq('id', sourceConfigId)
        .single()

      const config = sourceConfig as any
      const sourceType: string = (config && config.source_type) || 'unknown'
      const sourceName: string = (config && config.name) || 'Unknown Source'

      const context: Record<string, string> = {
        sourceType,
        sourceName,
      }

      // Step 3: Generate AI summary
      let aiSummary = null
      let insights: string[] = []

      if (changeEvents.length > 0) {
        try {
          const summaryResult = await openAIProvider.summarize(changeEvents, context)
          aiSummary = summaryResult.summary
          insights = summaryResult.insights
        } catch (error) {
          logger.error('AI summarization failed', error)
        }
      }

      // Step 4: Create scan result
      const scanResult = await createScanResult({
        ingestion_run_id: ingestionRun.id,
        source_config_id: sourceConfigId,
        total_changes: changeEvents.length,
        new_records: changeEvents.filter(c => c.change_type === 'new').length,
        modified_records: changeEvents.filter(c => c.change_type === 'modified').length,
        removed_records: changeEvents.filter(c => c.change_type === 'removed').length,
        ai_summary: aiSummary,
        insights,
        metadata: {
          ai_provider: openAIProvider.name,
          scan_duration_ms: Date.now() - new Date(ingestionRun.started_at).getTime(),
        },
      })

      // Step 5: Generate and store alerts
      if (changeEvents.length > 0) {
        await this.generateAlerts(scanResult, changeEvents, context, userId)
      }

      logger.info('Scan completed', { scanResultId: scanResult.id, totalChanges: changeEvents.length })

      return scanResult
    } catch (error) {
      logger.error('Scan failed', error)
      throw error
    }
  }

  private async generateAlerts(
    scanResult: ScanResult,
    changes: ChangeEvent[],
    context: Record<string, any>,
    userId: string
  ): Promise<void> {
    try {
      const supabase = createAdminClient()
      const aiAlerts = await openAIProvider.generateAlerts(changes, context)

      const alerts = aiAlerts.map(alert => ({
        scan_result_id: scanResult.id,
        source_config_id: scanResult.source_config_id,
        user_id: userId,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        change_event_ids: alert.relevantChangeIds,
        is_read: false,
        is_dismissed: false,
        created_at: new Date().toISOString(),
      }))

      if (alerts.length > 0) {
        const { error } = await supabase
          .from('alerts')
          .insert(alerts as any)

        if (error) {
          logger.error('Failed to create alerts', error)
        } else {
          logger.info('Created alerts', { count: alerts.length })
        }
      }
    } catch (error) {
      logger.error('Alert generation failed', error)
      // Don't throw - alerts are important but not critical
    }
  }
}

export const scanEngine = new ScanEngine()
