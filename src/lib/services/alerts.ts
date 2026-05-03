// Alert and notification services
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface UserAlert {
  id: string
  user_id: string
  alert_type: 'score_improvement' | 'route_improvement' | 'timing_change' | 'weather_change' | 'budget_change' | 'value_opportunity' | 'recommendation_update'
  title: string
  message: string
  trigger_reason?: string
  destination_id?: string
  destination_name?: string
  route_id?: string
  saved_analysis_id?: string
  severity: 'low' | 'medium' | 'high'
  is_read: boolean
  is_dismissed: boolean
  change_details?: Record<string, any>
  action_url?: string
  action_label?: string
  created_at: string
  read_at?: string
  dismissed_at?: string
}

export interface UserNotification {
  id: string
  user_id: string
  notification_type: 'alert' | 'recommendation_update' | 'route_change' | 'saved_item_update' | 'system_message'
  title: string
  message: string
  alert_id?: string
  is_read: boolean
  priority: 'low' | 'normal' | 'high'
  created_at: string
  read_at?: string
}

export interface SharedContent {
  id: string
  user_id: string
  content_type: 'analysis' | 'route' | 'destination' | 'comparison'
  content_data: Record<string, any>
  share_token: string
  is_public: boolean
  expires_at?: string
  view_count: number
  created_at: string
  last_viewed_at?: string
}

export class AlertService {
  // Create alert
  static async createAlert(
    userId: string,
    alertData: Partial<UserAlert>
  ): Promise<UserAlert> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('user_alerts')
      .insert({
        user_id: userId,
        ...alertData,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Get user alerts
  static async getUserAlerts(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<UserAlert[]> {
    const supabase = await createServerSupabaseClient()
    
    let query = supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })

    if (options?.unreadOnly) {
      query = query.eq('is_read', false)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  // Mark alert as read
  static async markAsRead(alertId: string): Promise<void> {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('user_alerts')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', alertId)

    if (error) throw error
  }

  // Dismiss alert
  static async dismissAlert(alertId: string): Promise<void> {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('user_alerts')
      .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
      .eq('id', alertId)

    if (error) throw error
  }

  // Get unread count
  static async getUnreadCount(userId: string): Promise<number> {
    const supabase = await createServerSupabaseClient()
    
    const { count, error } = await supabase
      .from('user_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .eq('is_dismissed', false)

    if (error) throw error
    return count || 0
  }
}

export class NotificationService {
  // Create notification
  static async createNotification(
    userId: string,
    notificationData: Partial<UserNotification>
  ): Promise<UserNotification> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        ...notificationData,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Get user notifications
  static async getUserNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<UserNotification[]> {
    const supabase = await createServerSupabaseClient()
    
    let query = supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (options?.unreadOnly) {
      query = query.eq('is_read', false)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw error
  }

  // Mark all as read
  static async markAllAsRead(userId: string): Promise<void> {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
  }
}

export class ShareService {
  // Create shared content
  static async createShare(
    userId: string,
    contentType: SharedContent['content_type'],
    contentData: Record<string, any>,
    options?: { isPublic?: boolean; expiresInDays?: number }
  ): Promise<SharedContent> {
    const supabase = await createServerSupabaseClient()
    
    const shareToken = this.generateShareToken()
    const expiresAt = options?.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined

    const { data, error } = await supabase
      .from('shared_content')
      .insert({
        user_id: userId,
        content_type: contentType,
        content_data: contentData,
        share_token: shareToken,
        is_public: options?.isPublic || false,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Get shared content by token
  static async getSharedContent(shareToken: string): Promise<SharedContent | null> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('shared_content')
      .select('*')
      .eq('share_token', shareToken)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // Increment view count
    if (data) {
      await supabase
        .from('shared_content')
        .update({
          view_count: data.view_count + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', data.id)
    }

    return data
  }

  // Get user's shared content
  static async getUserShares(userId: string): Promise<SharedContent[]> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('shared_content')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Delete shared content
  static async deleteShare(shareId: string): Promise<void> {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('shared_content')
      .delete()
      .eq('id', shareId)

    if (error) throw error
  }

  // Generate share token
  private static generateShareToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }
}
