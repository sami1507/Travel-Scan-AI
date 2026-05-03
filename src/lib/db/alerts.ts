// Database access layer for alerts
import { createServerSupabaseClient } from '../supabase/server'
import type { Alert } from '../types'
import { logger } from '../utils'

export async function getAlerts(userId: string, filters?: {
  severity?: string
  isRead?: boolean
  limit?: number
}): Promise<Alert[]> {
  try {
    const supabase = await createServerSupabaseClient()
    
    let query = supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)

    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }

    if (filters?.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead)
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 50)

    const { data, error } = await query

    if (error) throw error

    return data as Alert[]
  } catch (error) {
    logger.error('Failed to fetch alerts', error)
    throw error
  }
}

export async function getAlert(id: string, userId: string): Promise<Alert | null> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as Alert
  } catch (error) {
    logger.error('Failed to fetch alert', error, { id })
    throw error
  }
}

export async function markAlertAsRead(id: string, userId: string): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('alerts')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    logger.info('Alert marked as read', { id })
  } catch (error) {
    logger.error('Failed to mark alert as read', error, { id })
    throw error
  }
}

export async function dismissAlert(id: string, userId: string): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('alerts')
      .update({ is_dismissed: true })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    logger.info('Alert dismissed', { id })
  } catch (error) {
    logger.error('Failed to dismiss alert', error, { id })
    throw error
  }
}

export async function getUnreadAlertCount(userId: string): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .eq('is_dismissed', false)

    if (error) throw error

    return count || 0
  } catch (error) {
    logger.error('Failed to get unread alert count', error)
    return 0
  }
}
