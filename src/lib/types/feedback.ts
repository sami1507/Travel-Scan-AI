// Feedback types for user interaction tracking
import { z } from 'zod'

export type FeedbackType = 
  | 'thumbs-up'
  | 'thumbs-down'
  | 'save-trip'
  | 'select-destination'
  | 'dismiss-recommendation'
  | 'view-details'

export interface UserFeedback {
  id: string
  user_id: string
  session_id: string
  feedback_type: FeedbackType
  analysis_id?: string
  destination_id?: string
  destination_name?: string
  recommendation_rank?: number
  total_score?: number
  category_scores?: Record<string, number>
  query_context?: {
    query: string
    budget?: string
    travel_months?: number[]
    interests?: string[]
  }
  feedback_metadata?: Record<string, any>
  created_at: string
}

export const feedbackSchema = z.object({
  feedback_type: z.enum([
    'thumbs-up',
    'thumbs-down',
    'save-trip',
    'select-destination',
    'dismiss-recommendation',
    'view-details',
  ]),
  analysis_id: z.string().optional(),
  destination_id: z.string().optional(),
  destination_name: z.string().optional(),
  recommendation_rank: z.number().optional(),
  total_score: z.number().optional(),
  category_scores: z.record(z.number()).optional(),
  query_context: z.object({
    query: z.string(),
    budget: z.string().optional(),
    travel_months: z.array(z.number()).optional(),
    interests: z.array(z.string()).optional(),
  }).optional(),
  feedback_metadata: z.record(z.any()).optional(),
})

export type FeedbackInput = z.infer<typeof feedbackSchema>

// Analytics-ready feedback aggregation types
export interface FeedbackStats {
  destination_id: string
  destination_name: string
  thumbs_up_count: number
  thumbs_down_count: number
  save_count: number
  select_count: number
  dismiss_count: number
  view_count: number
  total_interactions: number
  positive_rate: number // (thumbs_up + save + select) / total
}

export interface UserPreferenceSignal {
  user_id: string
  preferred_budget_levels: string[]
  preferred_months: number[]
  preferred_interests: string[]
  highly_rated_destinations: string[]
  dismissed_destinations: string[]
  interaction_count: number
  last_interaction: string
}
