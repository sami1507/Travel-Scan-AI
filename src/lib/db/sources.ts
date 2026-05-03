// Database access layer for source_configs
import { createServerSupabaseClient } from '../supabase/server'
import type { SourceConfig } from '../types'
import { sourceConfigSchema, createSourceConfigSchema, updateSourceConfigSchema } from '../schemas'
import { logger } from '../utils'

export async function getSourceConfigs(userId: string): Promise<SourceConfig[]> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('source_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data as SourceConfig[]
  } catch (error) {
    logger.error('Failed to fetch source configs', error)
    throw error
  }
}

export async function getSourceConfig(id: string, userId: string): Promise<SourceConfig | null> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('source_configs')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data as SourceConfig
  } catch (error) {
    logger.error('Failed to fetch source config', error, { id })
    throw error
  }
}

export async function createSourceConfig(input: any): Promise<SourceConfig> {
  try {
    // Validate input
    const validated = createSourceConfigSchema.parse(input)
    
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('source_configs')
      .insert(validated)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('No data returned from insert')

    logger.info('Source config created', { id: data.id, type: data.source_type })
    
    return data as SourceConfig
  } catch (error) {
    logger.error('Failed to create source config', error)
    throw error
  }
}

export async function updateSourceConfig(
  id: string,
  userId: string,
  updates: any
): Promise<SourceConfig> {
  try {
    // Validate updates
    const validated = updateSourceConfigSchema.parse(updates)
    
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('source_configs')
      .update(validated)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('No data returned from update')

    logger.info('Source config updated', { id: data.id })
    
    return data as SourceConfig
  } catch (error) {
    logger.error('Failed to update source config', error, { id })
    throw error
  }
}

export async function deleteSourceConfig(id: string, userId: string): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('source_configs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    logger.info('Source config deleted', { id })
  } catch (error) {
    logger.error('Failed to delete source config', error, { id })
    throw error
  }
}

export async function getActiveSourceConfigs(): Promise<SourceConfig[]> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('source_configs')
      .select('*')
      .eq('status', 'active')
      .order('last_run_at', { ascending: true, nullsFirst: true })

    if (error) throw error

    return data as SourceConfig[]
  } catch (error) {
    logger.error('Failed to fetch active source configs', error)
    throw error
  }
}

export async function updateSourceConfigRunStatus(
  id: string,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const updates: any = {
      last_run_at: new Date().toISOString(),
    }

    if (success) {
      updates.last_success_at = new Date().toISOString()
      updates.last_error = null
      updates.status = 'active'
    } else {
      updates.last_error = error || 'Unknown error'
      updates.status = 'error'
    }

    const { error: updateError } = await supabase
      .from('source_configs')
      .update(updates)
      .eq('id', id)

    if (updateError) throw updateError

    logger.info('Source config run status updated', { id, success })
  } catch (err) {
    logger.error('Failed to update source config run status', err, { id })
    throw err
  }
}
