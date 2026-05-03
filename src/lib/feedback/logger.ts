// Feedback logger - foundation for future learning
import { createAdminClient } from '../supabase/admin'
import { logger } from '../utils'
import type {
  UserFeedback,
  TripSave,
  DestinationSelection,
  RecommendationDismissal,
  FeedbackStats,
} from './types'

export class FeedbackLogger {
  /**
   * Log user feedback
   */
  async logFeedback(feedback: Omit<UserFeedback, 'id' | 'timestamp'>): Promise<void> {
    try {
      const supabase = createAdminClient()

      const feedbackRecord: any = {
        ...feedback,
        timestamp: new Date().toISOString(),
      }

      const { error } = await supabase.from('user_feedback').insert(feedbackRecord as any)

      if (error) {
        logger.error('Failed to log feedback', error)
      } else {
        logger.info('Feedback logged', { type: feedback.feedbackType, targetId: feedback.targetId })
      }
    } catch (error) {
      logger.error('Feedback logging error', error)
    }
  }

  /**
   * Log trip save
   */
  async logTripSave(tripSave: Omit<TripSave, 'id' | 'savedAt'>): Promise<void> {
    try {
      const supabase = createAdminClient()

      const record: any = {
        ...tripSave,
        saved_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('trip_saves').insert(record as any)

      if (error) {
        logger.error('Failed to log trip save', error)
      } else {
        logger.info('Trip save logged', { destination: tripSave.destinationName })
      }
    } catch (error) {
      logger.error('Trip save logging error', error)
    }
  }

  /**
   * Log destination selection
   */
  async logDestinationSelection(
    selection: Omit<DestinationSelection, 'id' | 'selectedAt'>
  ): Promise<void> {
    try {
      const supabase = createAdminClient()

      const record: any = {
        ...selection,
        selected_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('destination_selections').insert(record as any)

      if (error) {
        logger.error('Failed to log destination selection', error)
      } else {
        logger.info('Destination selection logged', { destination: selection.destinationName })
      }
    } catch (error) {
      logger.error('Destination selection logging error', error)
    }
  }

  /**
   * Log recommendation dismissal
   */
  async logRecommendationDismissal(
    dismissal: Omit<RecommendationDismissal, 'id' | 'dismissedAt'>
  ): Promise<void> {
    try {
      const supabase = createAdminClient()

      const record: any = {
        ...dismissal,
        dismissed_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('recommendation_dismissals').insert(record as any)

      if (error) {
        logger.error('Failed to log recommendation dismissal', error)
      } else {
        logger.info('Recommendation dismissal logged', { destination: dismissal.destinationName })
      }
    } catch (error) {
      logger.error('Recommendation dismissal logging error', error)
    }
  }

  /**
   * Get feedback stats for user
   */
  async getFeedbackStats(userId: string): Promise<FeedbackStats> {
    try {
      const supabase = createAdminClient()

      const { data: feedback, error: feedbackError } = await supabase
        .from('user_feedback')
        .select('feedback_type, timestamp')
        .eq('user_id', userId)

      const { data: saves, error: savesError } = await supabase
        .from('trip_saves')
        .select('id')
        .eq('user_id', userId)

      const { data: selections, error: selectionsError } = await supabase
        .from('destination_selections')
        .select('id')
        .eq('user_id', userId)

      const { data: dismissals, error: dismissalsError } = await supabase
        .from('recommendation_dismissals')
        .select('id')
        .eq('user_id', userId)

      if (feedbackError || savesError || selectionsError || dismissalsError) {
        logger.error('Failed to get feedback stats')
      }

      const feedbackList = (feedback || []) as any[]
      const thumbsUp = feedbackList.filter(f => f.feedback_type === 'thumbs_up').length
      const thumbsDown = feedbackList.filter(f => f.feedback_type === 'thumbs_down').length

      return {
        userId,
        totalFeedback: feedbackList.length,
        thumbsUp,
        thumbsDown,
        tripsSaved: (saves || []).length,
        destinationsSelected: (selections || []).length,
        recommendationsDismissed: (dismissals || []).length,
        lastFeedbackAt: feedbackList[0]?.timestamp,
      }
    } catch (error) {
      logger.error('Failed to get feedback stats', error)
      return {
        userId,
        totalFeedback: 0,
        thumbsUp: 0,
        thumbsDown: 0,
        tripsSaved: 0,
        destinationsSelected: 0,
        recommendationsDismissed: 0,
      }
    }
  }
}

export const feedbackLogger = new FeedbackLogger()
