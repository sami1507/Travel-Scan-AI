// User preference types for personalization
import { z } from 'zod'

/**
 * User preference profile
 * Combines explicit preferences and inferred signals from feedback
 */
export interface UserPreferenceProfile {
  user_id: string
  
  // Explicit preferences (user-set)
  explicit_preferences?: {
    budget_sensitivity?: number // 0-10: 0=very flexible, 10=very strict
    nightlife_preference?: number // 0-10: 0=avoid, 10=essential
    nature_preference?: number // 0-10: 0=avoid, 10=essential
    adventure_vs_comfort?: number // 0-10: 0=comfort, 10=adventure
    transport_importance?: number // 0-10: how much they care about transport
    safety_importance?: number // 0-10: how much they care about safety
  }
  
  // Inferred preferences (from feedback)
  inferred_preferences?: {
    preferred_budget_levels?: string[] // ['moderate', 'high']
    preferred_destination_types?: string[] // ['city', 'country']
    liked_categories?: Record<string, number> // { budgetFit: 8.5, weatherFit: 9.2 }
    disliked_categories?: Record<string, number>
    avg_score_threshold?: number // minimum score they typically like
    preferred_months?: number[] // [5, 6, 7, 8] - summer traveler
    preferred_interests?: string[] // ['food', 'culture', 'nature']
  }
  
  // Metadata
  feedback_count?: number
  last_updated?: string
  confidence?: number // 0-1: how confident we are in these preferences
}

export const userPreferenceSchema = z.object({
  explicit_preferences: z.object({
    budget_sensitivity: z.number().min(0).max(10).optional(),
    nightlife_preference: z.number().min(0).max(10).optional(),
    nature_preference: z.number().min(0).max(10).optional(),
    adventure_vs_comfort: z.number().min(0).max(10).optional(),
    transport_importance: z.number().min(0).max(10).optional(),
    safety_importance: z.number().min(0).max(10).optional(),
  }).optional(),
  inferred_preferences: z.object({
    preferred_budget_levels: z.array(z.string()).optional(),
    preferred_destination_types: z.array(z.string()).optional(),
    liked_categories: z.record(z.number()).optional(),
    disliked_categories: z.record(z.number()).optional(),
    avg_score_threshold: z.number().optional(),
    preferred_months: z.array(z.number()).optional(),
    preferred_interests: z.array(z.string()).optional(),
  }).optional(),
})

export type UserPreferenceInput = z.infer<typeof userPreferenceSchema>

/**
 * Personalized scoring weights
 * Adjusts category weights based on user preferences
 */
export interface PersonalizedWeights {
  budgetFit: number
  weatherFit: number
  passportEase: number
  nightlife: number
  nature: number
  transport: number
  hotelValue: number
  safety: number
  is_personalized: boolean
  confidence: number
}

/**
 * Preference signal from feedback
 */
export interface PreferenceSignal {
  category: string
  value: number
  weight: number // how much to trust this signal
  source: 'thumbs-up' | 'thumbs-down' | 'save-trip' | 'dismiss'
}
