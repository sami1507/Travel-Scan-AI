// Database access layer for ingestion runs and scan results
import { createServerSupabaseClient } from '../supabase/server'
import type { IngestionRun, ScanResult } from '../types'
import { logger } from '../utils'

export async function getIngestionRuns(sourceConfigId?: string, limit: number = 50): Promise<IngestionRun[]> {
  try {
    const supabase = await createServerSupabaseClient()
    
    let query = supabase
      .from('ingestion_runs')
      .select('*')

    if (sourceConfigId) {
      query = query.eq('source_config_id', sourceConfigId)
    }

    query = query
      .order('started_at', { ascending: false })
      .limit(limit)

    const { data, error } = await query

    if (error) throw error

    return data as IngestionRun[]
  } catch (error) {
    logger.error('Failed to fetch ingestion runs', error)
    throw error
  }
}

export async function getIngestionRun(id: string): Promise<IngestionRun | null> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('ingestion_runs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as IngestionRun
  } catch (error) {
    logger.error('Failed to fetch ingestion run', error, { id })
    throw error
  }
}

export async function createIngestionRun(sourceConfigId: string): Promise<IngestionRun> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('ingestion_runs')
      .insert({
        source_config_id: sourceConfigId,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('No data returned from insert')

    logger.info('Ingestion run created', { id: data.id, sourceConfigId })
    
    return data as IngestionRun
  } catch (error) {
    logger.error('Failed to create ingestion run', error)
    throw error
  }
}

export async function updateIngestionRun(
  id: string,
  updates: Partial<IngestionRun>
): Promise<IngestionRun> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('ingestion_runs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('No data returned from update')

    logger.info('Ingestion run updated', { id, status: updates.status })
    
    return data as IngestionRun
  } catch (error) {
    logger.error('Failed to update ingestion run', error, { id })
    throw error
  }
}

export async function getScanResults(sourceConfigId?: string, limit: number = 50): Promise<ScanResult[]> {
  try {
    const supabase = await createServerSupabaseClient()
    
    let query = supabase
      .from('scan_results')
      .select('*')

    if (sourceConfigId) {
      query = query.eq('source_config_id', sourceConfigId)
    }

    query = query
      .order('scan_completed_at', { ascending: false })
      .limit(limit)

    const { data, error } = await query

    if (error) throw error

    return data as ScanResult[]
  } catch (error) {
    logger.error('Failed to fetch scan results', error)
    throw error
  }
}

export async function createScanResult(scanResult: Partial<ScanResult>): Promise<ScanResult> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('scan_results')
      .insert({
        ...scanResult,
        scan_completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('No data returned from insert')

    logger.info('Scan result created', { id: data.id, totalChanges: data.total_changes })
    
    return data as ScanResult
  } catch (error) {
    logger.error('Failed to create scan result', error)
    throw error
  }
}
