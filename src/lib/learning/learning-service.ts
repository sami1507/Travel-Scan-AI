/**
 * AI Learning Service
 * Phase 1: Lightweight learning from recommendation results and user interactions
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const LEARNING_ENABLED = process.env.ENABLE_AI_LEARNING === 'true'
const MIN_SIGNALS_FOR_CONFIDENCE = 5

interface RecommendationInput {
  departure?: string
  passportCountry?: string
  budgetLevel?: string
  currency?: string
  tripLength?: number
  season?: string
  travelMonths?: string[]
  interests?: string[]
  accommodationPreference?: string
  tripStructure?: string
}

interface RecommendationItem {
  rank: number
  destinationTitle?: string
  tripType?: string
  suggestedRoute?: any[]
  recommendedNights?: Record<string, number>
  totalScore?: number
  routeRealismScore?: number
  travelFatigueLevel?: string
  transportLogic?: string
  warnings?: string[]
  alternatives?: any[]
  providerSource?: string
  claudeVerified?: boolean
  claudeAccuracyNotes?: string[]
}

interface ProviderInfo {
  provider: string
  claudeVerifierUsed: boolean
  fallbackUsed: boolean
}

interface FeedbackSignal {
  signalType: 'view' | 'select' | 'save' | 'dismiss' | 'thumbs_up' | 'thumbs_down' | 'details_opened' | 'compare' | 'share'
  signalValue?: Record<string, any>
}

interface UserPreferenceProfile {
  userId: string
  updatedAt: Date
  preferredTripStructures: Record<string, number>
  preferredInterests: Record<string, number>
  preferredBudgetLevel?: string
  fatigueTolerance: string
  routeComplexityPreference: string
  learnedWeights: Record<string, number>
  confidenceScore: number
  signalCount: number
}

interface LearningContext {
  learningContextAvailable: boolean
  confidenceScore: number
  preferredTripStructures?: string[]
  fatigueTolerance?: string
  routeComplexityPreference?: string
}

/**
 * Create input hash for duplicate detection
 */
function createInputHash(input: RecommendationInput): string {
  const normalized = {
    departure: input.departure?.toLowerCase().trim(),
    passportCountry: input.passportCountry?.toLowerCase().trim(),
    budgetLevel: input.budgetLevel?.toLowerCase().trim(),
    tripLength: input.tripLength,
    season: input.season?.toLowerCase().trim(),
    interests: input.interests?.map(i => i.toLowerCase().trim()).sort(),
    tripStructure: input.tripStructure?.toLowerCase().trim(),
  }
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

/**
 * Get Supabase service client
 */
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Record a recommendation event
 */
export async function recordRecommendationEvent(
  userId: string | null,
  sessionId: string | null,
  input: RecommendationInput,
  recommendations: RecommendationItem[],
  providerInfo: ProviderInfo
): Promise<string | null> {
  if (!LEARNING_ENABLED) {
    return null
  }

  try {
    const supabase = getServiceClient()
    const inputHash = createInputHash(input)

    // Insert recommendation event
    const { data: event, error: eventError } = await supabase
      .from('ai_recommendation_events')
      .insert({
        user_id: userId,
        session_id: sessionId,
        input_hash: inputHash,
        departure: input.departure,
        passport_country: input.passportCountry,
        budget_level: input.budgetLevel,
        currency: input.currency,
        trip_length: input.tripLength,
        season: input.season,
        travel_months: input.travelMonths || [],
        interests: input.interests || [],
        accommodation_preference: input.accommodationPreference,
        trip_structure: input.tripStructure,
        provider_used: providerInfo.provider,
        claude_verifier_used: providerInfo.claudeVerifierUsed,
        fallback_used: providerInfo.fallbackUsed,
        recommendation_count: recommendations.length,
        metadata: {},
      })
      .select()
      .single()

    if (eventError) {
      console.error('Failed to record recommendation event:', eventError)
      return null
    }

    // Insert recommendation items
    const items = recommendations.map((rec, index) => ({
      event_id: event.id,
      rank: rec.rank ?? index + 1,
      destination_title: rec.destinationTitle,
      trip_type: rec.tripType,
      suggested_route: rec.suggestedRoute || [],
      recommended_nights: rec.recommendedNights || {},
      total_score: rec.totalScore,
      route_realism_score: rec.routeRealismScore,
      travel_fatigue_level: rec.travelFatigueLevel,
      transport_logic: rec.transportLogic,
      warnings: rec.warnings || [],
      alternatives: rec.alternatives || [],
      provider_source: rec.providerSource,
      claude_verified: rec.claudeVerified || false,
      claude_accuracy_notes: rec.claudeAccuracyNotes || [],
    }))

    const { error: itemsError } = await supabase
      .from('ai_recommendation_items')
      .insert(items)

    if (itemsError) {
      console.error('Failed to record recommendation items:', itemsError)
    }

    return event.id
  } catch (error) {
    console.error('Learning service error:', error)
    return null
  }
}

/**
 * Record a feedback signal
 */
export async function recordFeedbackSignal(
  userId: string,
  eventId: string,
  recommendationItemId: string | null,
  signal: FeedbackSignal
): Promise<boolean> {
  if (!LEARNING_ENABLED) {
    return false
  }

  try {
    const supabase = getServiceClient()

    const { error } = await supabase
      .from('ai_feedback_signals')
      .insert({
        user_id: userId,
        event_id: eventId,
        recommendation_item_id: recommendationItemId,
        signal_type: signal.signalType,
        signal_value: signal.signalValue || {},
      })

    if (error) {
      console.error('Failed to record feedback signal:', error)
      return false
    }

    // Update user preference profile after signal
    await updateUserPreferenceProfile(userId)

    return true
  } catch (error) {
    console.error('Learning service error:', error)
    return false
  }
}

/**
 * Update user preference profile based on feedback signals
 */
export async function updateUserPreferenceProfile(userId: string): Promise<void> {
  if (!LEARNING_ENABLED) {
    return
  }

  try {
    const supabase = getServiceClient()

    // Get all feedback signals for this user
    const { data: signals, error: signalsError } = await supabase
      .from('ai_feedback_signals')
      .select(`
        signal_type,
        signal_value,
        event_id,
        ai_recommendation_events!inner(
          trip_structure,
          interests,
          budget_level,
          trip_length
        ),
        ai_recommendation_items(
          travel_fatigue_level,
          route_realism_score
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (signalsError || !signals) {
      console.error('Failed to fetch signals:', signalsError)
      return
    }

    const signalCount = signals.length

    // Don't build profile until we have enough signals
    if (signalCount < MIN_SIGNALS_FOR_CONFIDENCE) {
      await supabase
        .from('user_preference_profiles')
        .upsert({
          user_id: userId,
          signal_count: signalCount,
          confidence_score: 0,
          updated_at: new Date().toISOString(),
        })
      return
    }

    // Analyze positive signals (save, thumbs_up, select, details_opened)
    const positiveSignals = signals.filter(s =>
      ['save', 'thumbs_up', 'select', 'details_opened'].includes(s.signal_type)
    )

    // Analyze negative signals (dismiss, thumbs_down)
    const negativeSignals = signals.filter(s =>
      ['dismiss', 'thumbs_down'].includes(s.signal_type)
    )

    // Build trip structure preferences
    const tripStructures: Record<string, number> = {}
    positiveSignals.forEach(signal => {
      const event = signal.ai_recommendation_events as any
      if (event?.trip_structure) {
        tripStructures[event.trip_structure] = (tripStructures[event.trip_structure] || 0) + 1
      }
    })

    // Build interest preferences
    const interests: Record<string, number> = {}
    positiveSignals.forEach(signal => {
      const event = signal.ai_recommendation_events as any
      if (event?.interests && Array.isArray(event.interests)) {
        event.interests.forEach((interest: string) => {
          interests[interest] = (interests[interest] || 0) + 1
        })
      }
    })

    // Determine fatigue tolerance
    const fatigueLevels = positiveSignals
      .map(s => s.ai_recommendation_items?.[0]?.travel_fatigue_level)
      .filter(Boolean)
    
    let fatigueTolerance = 'unknown'
    if (fatigueLevels.length >= 3) {
      const lowCount = fatigueLevels.filter(f => f === 'low').length
      const highCount = fatigueLevels.filter(f => f === 'high').length
      if (highCount > lowCount) fatigueTolerance = 'high'
      else if (lowCount > highCount) fatigueTolerance = 'low'
      else fatigueTolerance = 'medium'
    }

    // Determine route complexity preference
    const routeScores = positiveSignals
      .map(s => s.ai_recommendation_items?.[0]?.route_realism_score)
      .filter(Boolean) as number[]
    
    let routeComplexityPreference = 'unknown'
    if (routeScores.length >= 3) {
      const avgScore = routeScores.reduce((a, b) => a + b, 0) / routeScores.length
      if (avgScore >= 0.8) routeComplexityPreference = 'simple'
      else if (avgScore <= 0.5) routeComplexityPreference = 'complex'
      else routeComplexityPreference = 'moderate'
    }

    // Calculate confidence score (0-1)
    const confidenceScore = Math.min(signalCount / 20, 1)

    // Upsert preference profile
    await supabase
      .from('user_preference_profiles')
      .upsert({
        user_id: userId,
        updated_at: new Date().toISOString(),
        preferred_trip_structures: tripStructures,
        preferred_interests: interests,
        fatigue_tolerance: fatigueTolerance,
        route_complexity_preference: routeComplexityPreference,
        learned_weights: {},
        confidence_score: confidenceScore,
        signal_count: signalCount,
      })
  } catch (error) {
    console.error('Failed to update user preference profile:', error)
  }
}

/**
 * Get user preference profile
 */
export async function getUserPreferenceProfile(userId: string): Promise<UserPreferenceProfile | null> {
  if (!LEARNING_ENABLED) {
    return null
  }

  try {
    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('user_preference_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      userId: data.user_id,
      updatedAt: new Date(data.updated_at),
      preferredTripStructures: data.preferred_trip_structures || {},
      preferredInterests: data.preferred_interests || {},
      preferredBudgetLevel: data.preferred_budget_level,
      fatigueTolerance: data.fatigue_tolerance || 'unknown',
      routeComplexityPreference: data.route_complexity_preference || 'unknown',
      learnedWeights: data.learned_weights || {},
      confidenceScore: data.confidence_score || 0,
      signalCount: data.signal_count || 0,
    }
  } catch (error) {
    console.error('Failed to get user preference profile:', error)
    return null
  }
}

/**
 * Get learning context for analysis
 */
export async function getLearningContextForAnalysis(
  userId: string | null,
  currentInput: RecommendationInput
): Promise<LearningContext> {
  if (!LEARNING_ENABLED || !userId) {
    return {
      learningContextAvailable: false,
      confidenceScore: 0,
    }
  }

  try {
    const profile = await getUserPreferenceProfile(userId)

    if (!profile || profile.confidenceScore < 0.25) {
      return {
        learningContextAvailable: false,
        confidenceScore: profile?.confidenceScore || 0,
      }
    }

    // Get top preferred trip structures
    const preferredTripStructures = Object.entries(profile.preferredTripStructures)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([structure]) => structure)

    return {
      learningContextAvailable: true,
      confidenceScore: profile.confidenceScore,
      preferredTripStructures: preferredTripStructures.length > 0 ? preferredTripStructures : undefined,
      fatigueTolerance: profile.fatigueTolerance !== 'unknown' ? profile.fatigueTolerance : undefined,
      routeComplexityPreference: profile.routeComplexityPreference !== 'unknown' ? profile.routeComplexityPreference : undefined,
    }
  } catch (error) {
    console.error('Failed to get learning context:', error)
    return {
      learningContextAvailable: false,
      confidenceScore: 0,
    }
  }
}
