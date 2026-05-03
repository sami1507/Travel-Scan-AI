// Core ingestion engine with change detection
import { createAdminClient } from '@/lib/supabase/admin'
import type { SourceConfig, IngestionRun, NormalizedRecord, ChangeEvent } from '@/lib/types'
import { getProvider } from '@/lib/providers'
import { logger, generateContentHash, deepDiff } from '@/lib/utils'
import { createIngestionRun, updateIngestionRun } from '@/lib/db/scans'
import { updateSourceConfigRunStatus } from '@/lib/db/sources'

export class IngestionEngine {
  async runIngestion(sourceConfig: SourceConfig): Promise<IngestionRun> {
    logger.info('Starting ingestion', { sourceConfigId: sourceConfig.id, type: sourceConfig.source_type })

    // Create ingestion run record
    const ingestionRun = await createIngestionRun(sourceConfig.id)

    try {
      // Step 1: Fetch data from provider
      const provider = getProvider(sourceConfig.source_type)
      const response = await provider.fetch(sourceConfig)

      if (!response.success) {
        throw new Error(response.error || 'Provider fetch failed')
      }

      // Step 2: Validate data
      if (!provider.validate(response.data)) {
        throw new Error('Provider data validation failed')
      }

      // Step 3: Store raw payload
      await this.storeRawPayload(ingestionRun.id, sourceConfig.id, response.data)

      // Step 4: Normalize records
      const normalizedRecords = provider.normalize(response.data, sourceConfig, ingestionRun.id)
      logger.info('Normalized records', { count: normalizedRecords.length })

      // Step 5: Detect changes and store records
      const changeStats = await this.detectAndStoreChanges(normalizedRecords, sourceConfig.id, ingestionRun.id)

      // Step 6: Update ingestion run with results
      const completedRun = await updateIngestionRun(ingestionRun.id, {
        status: 'success',
        completed_at: new Date().toISOString(),
        records_fetched: normalizedRecords.length,
        records_new: changeStats.new,
        records_changed: changeStats.modified,
        records_removed: changeStats.removed,
      })

      // Update source config status
      await updateSourceConfigRunStatus(sourceConfig.id, true)

      logger.info('Ingestion completed successfully', {
        sourceConfigId: sourceConfig.id,
        runId: ingestionRun.id,
        stats: changeStats,
      })

      return completedRun
    } catch (error) {
      logger.error('Ingestion failed', error, { sourceConfigId: sourceConfig.id })

      // Update ingestion run with error
      await updateIngestionRun(ingestionRun.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : String(error),
      })

      // Update source config status
      await updateSourceConfigRunStatus(
        sourceConfig.id,
        false,
        error instanceof Error ? error.message : String(error)
      )

      throw error
    }
  }

  private async storeRawPayload(ingestionRunId: string, sourceConfigId: string, payload: any): Promise<void> {
    const supabase = createAdminClient()
    const payloadHash = generateContentHash(payload)

    const { error } = await supabase
      .from('raw_payloads')
      .insert({
        ingestion_run_id: ingestionRunId,
        source_config_id: sourceConfigId,
        payload,
        payload_hash: payloadHash,
        fetched_at: new Date().toISOString(),
      } as any)

    if (error) {
      logger.error('Failed to store raw payload', error)
      throw error
    }
  }

  private async detectAndStoreChanges(
    newRecords: NormalizedRecord[],
    sourceConfigId: string,
    ingestionRunId: string
  ): Promise<{ new: number; modified: number; removed: number }> {
    const supabase = createAdminClient()
    let newCount = 0
    let modifiedCount = 0
    let removedCount = 0

    // Get existing records for this source
    const { data: existingRecords, error: fetchError } = await supabase
      .from('normalized_records')
      .select('*')
      .eq('source_config_id', sourceConfigId)

    if (fetchError) {
      logger.error('Failed to fetch existing records', fetchError)
      throw fetchError
    }

    const existingMap = new Map(
      (existingRecords || []).map((r: any) => [r.external_id, r])
    )

    const newExternalIds = new Set(newRecords.map(r => r.external_id))

    // Process new and modified records
    for (const newRecord of newRecords) {
      const existing: any = existingMap.get(newRecord.external_id)

      if (!existing) {
        // New record
        await this.insertRecord(newRecord)
        await this.createChangeEvent(newRecord, 'new', ingestionRunId, null, newRecord.content)
        newCount++
      } else if (existing.content_hash !== newRecord.content_hash) {
        // Modified record
        await this.updateRecord(newRecord)
        await this.createSnapshot(existing.id, existing.content, existing.content_hash)
        await this.createChangeEvent(newRecord, 'modified', ingestionRunId, existing.content, newRecord.content)
        modifiedCount++
      }
    }

    // Detect removed records
    for (const [externalId, existing] of existingMap) {
      if (!newExternalIds.has(externalId)) {
        await this.createChangeEvent(existing as any, 'removed', ingestionRunId, (existing as any).content, {})
        removedCount++
      }
    }

    logger.info('Change detection completed', { newCount, modifiedCount, removedCount })

    return { new: newCount, modified: modifiedCount, removed: removedCount }
  }

  private async insertRecord(record: NormalizedRecord): Promise<void> {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('normalized_records')
      .insert(record as any)

    if (error) {
      logger.error('Failed to insert record', error)
      throw error
    }
  }

  private async updateRecord(record: NormalizedRecord): Promise<void> {
    const supabase = createAdminClient()
    const updates = {
      content: record.content,
      content_hash: record.content_hash,
      metadata: record.metadata,
      updated_at: new Date().toISOString(),
    }
    
    const { error } = await supabase
      .from('normalized_records')
      // @ts-expect-error - Supabase type inference issue with dynamic updates
      .update(updates)
      .eq('source_config_id', record.source_config_id)
      .eq('external_id', record.external_id)

    if (error) {
      logger.error('Failed to update record', error)
      throw error
    }
  }

  private async createSnapshot(recordId: string, content: any, contentHash: string): Promise<void> {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('record_snapshots')
      .insert({
        normalized_record_id: recordId,
        content,
        content_hash: contentHash,
        snapshot_at: new Date().toISOString(),
      } as any)

    if (error) {
      logger.error('Failed to create snapshot', error)
      // Don't throw - snapshots are nice to have but not critical
    }
  }

  private async createChangeEvent(
    record: NormalizedRecord,
    changeType: 'new' | 'modified' | 'removed',
    ingestionRunId: string,
    previousContent: any,
    newContent: any
  ): Promise<void> {
    const supabase = createAdminClient()
    const diff = changeType === 'modified' ? deepDiff(previousContent, newContent) : {}

    const { error } = await supabase
      .from('change_events')
      .insert({
        normalized_record_id: record.id,
        ingestion_run_id: ingestionRunId,
        change_type: changeType,
        previous_content: previousContent,
        new_content: newContent,
        diff,
        detected_at: new Date().toISOString(),
      } as any)

    if (error) {
      logger.error('Failed to create change event', error)
      throw error
    }
  }
}

export const ingestionEngine = new IngestionEngine()
