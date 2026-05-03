// Database access layer for user feedback
import { createAdminClient } from '../supabase/admin'
import type { UserFeedback, FeedbackInput } from '../types/feedback'
import { logger } from '../utils'

/**
 * Create a new feedback entry
 */
export async function createFeedback(
  userId: string,
  sessionId: string,
  feedbackData: FeedbackInput
): Promise<UserFeedback> {
  const supabase = createAdminClient()

  const feedback: any = {
    user_id: userId,
    session_id: sessionId,
    feedback_type: feedbackData.feedback_type,
    analysis_id: feedbackData.analysis_id,
    destination_id: feedbackData.destination_id,
    destination_name: feedbackData.destination_name,
    recommendation_rank: feedbackData.recommendation_rank,
    total_score: feedbackData.total_score,
    category_scores: feedbackData.category_scores,
    query_context: feedbackData.query_context as any,
    feedback_metadata: feedbackData.feedback_metadata,
  }

  const { data, error } = await supabase
    .from('user_feedback')
    .insert(feedback as any)
    .select()
    .single()

  if (error) {
    logger.error('Failed to create feedback', error)
    throw error
  }

  if (!data) {
    throw new Error('No data returned from feedback insert')
  }

  const feedbackResult = data as any

  logger.info('Feedback created', {
    id: feedbackResult.id,
    type: feedbackData.feedback_type,
    destination: feedbackData.destination_name,
  })

  return feedbackResult as UserFeedback
}

/**
 * Get feedback for a specific user
 */
export async function getUserFeedback(
  userId: string,
  limit: number = 100
): Promise<UserFeedback[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('user_feedback')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('Failed to get user feedback', error)
    throw error
  }

  return (data || []) as UserFeedback[]
}

/**
 * Get feedback for a specific destination
 */
export async function getDestinationFeedback(
  destinationId: string,
  limit: number = 100
): Promise<UserFeedback[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('user_feedback')
    .select('*')
    .eq('destination_id', destinationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('Failed to get destination feedback', error)
    throw error
  }

  return (data || []) as UserFeedback[]
}

/**
 * Get feedback statistics for a destination
 */
export async function getDestinationFeedbackStats(
  destinationId: string
): Promise<{
  thumbs_up: number
  thumbs_down: number
  saves: number
  selects: number
  dismissals: number
  views: number
  total: number
}> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('user_feedback')
    .select('feedback_type')
    .eq('destination_id', destinationId)

  if (error) {
    logger.error('Failed to get destination feedback stats', error)
    throw error
  }

  const stats = {
    thumbs_up: 0,
    thumbs_down: 0,
    saves: 0,
    selects: 0,
    dismissals: 0,
    views: 0,
    total: data?.length || 0,
  }

  data?.forEach((item: any) => {
    switch (item.feedback_type) {
      case 'thumbs-up':
        stats.thumbs_up++
        break
      case 'thumbs-down':
        stats.thumbs_down++
        break
      case 'save-trip':
        stats.saves++
        break
      case 'select-destination':
        stats.selects++
        break
      case 'dismiss-recommendation':
        stats.dismissals++
        break
      case 'view-details':
        stats.views++
        break
    }
  })

  return stats
}
