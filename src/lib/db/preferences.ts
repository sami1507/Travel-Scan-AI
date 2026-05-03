// Database access layer for user preferences
import { createAdminClient } from '../supabase/admin'
import type { UserPreferenceProfile, UserPreferenceInput } from '../types/preferences'
import { logger } from '../utils'

/**
 * Get user preference profile
 */
export async function getUserPreferences(userId: string): Promise<UserPreferenceProfile | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences found, return null
      return null
    }
    logger.error('Failed to get user preferences', error)
    throw error
  }

  return data as UserPreferenceProfile
}

/**
 * Create or update user preferences
 */
export async function upsertUserPreferences(
  userId: string,
  preferences: UserPreferenceInput,
  inferredPreferences?: any,
  feedbackCount?: number,
  confidence?: number
): Promise<UserPreferenceProfile> {
  const supabase = createAdminClient()

  const record: any = {
    user_id: userId,
    explicit_preferences: preferences.explicit_preferences,
    inferred_preferences: inferredPreferences || preferences.inferred_preferences,
    feedback_count: feedbackCount,
    confidence,
    last_updated: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(record, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    logger.error('Failed to upsert user preferences', error)
    throw error
  }

  if (!data) {
    throw new Error('No data returned from preferences upsert')
  }

  const result = data as any

  logger.info('User preferences updated', {
    userId,
    confidence,
    feedbackCount,
  })

  return result as UserPreferenceProfile
}

/**
 * Update inferred preferences from feedback
 */
export async function updateInferredPreferences(
  userId: string,
  inferredPreferences: any,
  feedbackCount: number,
  confidence: number
): Promise<UserPreferenceProfile> {
  const supabase = createAdminClient()

  // Get existing preferences
  const existing = await getUserPreferences(userId)

  const record: any = {
    user_id: userId,
    explicit_preferences: existing?.explicit_preferences || null,
    inferred_preferences: inferredPreferences,
    feedback_count: feedbackCount,
    confidence,
    last_updated: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(record, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    logger.error('Failed to update inferred preferences', error)
    throw error
  }

  if (!data) {
    throw new Error('No data returned from inferred preferences update')
  }

  const result = data as any

  logger.info('Inferred preferences updated', {
    userId,
    confidence,
    feedbackCount,
  })

  return result as UserPreferenceProfile
}

/**
 * Delete user preferences
 */
export async function deleteUserPreferences(userId: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('user_preferences')
    .delete()
    .eq('user_id', userId)

  if (error) {
    logger.error('Failed to delete user preferences', error)
    throw error
  }

  logger.info('User preferences deleted', { userId })
}
