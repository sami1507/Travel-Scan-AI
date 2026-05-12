/**
 * Admin Learning Insights API
 * Provides aggregated learning metrics for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(request: NextRequest) {
  // Require admin access
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const supabase = getServiceClient()

    // Total recommendation events
    const { count: totalEvents } = await supabase
      .from('ai_recommendation_events')
      .select('*', { count: 'exact', head: true })

    // Fallback activation rate
    const { count: fallbackEvents } = await supabase
      .from('ai_recommendation_events')
      .select('*', { count: 'exact', head: true })
      .eq('fallback_used', true)

    const fallbackRate = totalEvents && totalEvents > 0
      ? (fallbackEvents || 0) / totalEvents
      : 0

    // Average route realism score
    const { data: routeScores } = await supabase
      .from('ai_recommendation_items')
      .select('route_realism_score')
      .not('route_realism_score', 'is', null)

    const avgRouteScore = routeScores && routeScores.length > 0
      ? routeScores.reduce((sum, item) => sum + (item.route_realism_score || 0), 0) / routeScores.length
      : 0

    // Fatigue distribution
    const { data: fatigueData } = await supabase
      .from('ai_recommendation_items')
      .select('travel_fatigue_level')
      .not('travel_fatigue_level', 'is', null)

    const fatigueDistribution: Record<string, number> = {}
    fatigueData?.forEach(item => {
      const level = item.travel_fatigue_level || 'unknown'
      fatigueDistribution[level] = (fatigueDistribution[level] || 0) + 1
    })

    // Most saved trip structures (from positive feedback)
    const { data: savedStructures } = await supabase
      .from('ai_feedback_signals')
      .select(`
        signal_type,
        ai_recommendation_events!inner(trip_structure)
      `)
      .in('signal_type', ['save', 'thumbs_up'])

    const tripStructureCounts: Record<string, number> = {}
    savedStructures?.forEach((signal: any) => {
      const structure = signal.ai_recommendation_events?.trip_structure
      if (structure) {
        tripStructureCounts[structure] = (tripStructureCounts[structure] || 0) + 1
      }
    })

    const topTripStructures = Object.entries(tripStructureCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([structure, count]) => ({ structure, count }))

    // Most dismissed fatigue levels
    const { data: dismissedFatigue } = await supabase
      .from('ai_feedback_signals')
      .select(`
        signal_type,
        ai_recommendation_items!inner(travel_fatigue_level)
      `)
      .in('signal_type', ['dismiss', 'thumbs_down'])

    const dismissedFatigueCounts: Record<string, number> = {}
    dismissedFatigue?.forEach((signal: any) => {
      const level = signal.ai_recommendation_items?.travel_fatigue_level
      if (level) {
        dismissedFatigueCounts[level] = (dismissedFatigueCounts[level] || 0) + 1
      }
    })

    // Top interests from positive feedback
    const { data: positiveInterests } = await supabase
      .from('ai_feedback_signals')
      .select(`
        signal_type,
        ai_recommendation_events!inner(interests)
      `)
      .in('signal_type', ['save', 'thumbs_up', 'select'])

    const interestCounts: Record<string, number> = {}
    positiveInterests?.forEach((signal: any) => {
      const interests = signal.ai_recommendation_events?.interests
      if (Array.isArray(interests)) {
        interests.forEach((interest: string) => {
          interestCounts[interest] = (interestCounts[interest] || 0) + 1
        })
      }
    })

    const topInterests = Object.entries(interestCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([interest, count]) => ({ interest, count }))

    // Positive vs negative feedback rate
    const { count: positiveFeedback } = await supabase
      .from('ai_feedback_signals')
      .select('*', { count: 'exact', head: true })
      .in('signal_type', ['save', 'thumbs_up', 'select', 'details_opened'])

    const { count: negativeFeedback } = await supabase
      .from('ai_feedback_signals')
      .select('*', { count: 'exact', head: true })
      .in('signal_type', ['dismiss', 'thumbs_down'])

    const totalFeedback = (positiveFeedback || 0) + (negativeFeedback || 0)
    const positiveFeedbackRate = totalFeedback > 0
      ? (positiveFeedback || 0) / totalFeedback
      : 0

    // Personalization readiness rate
    const { count: totalProfiles } = await supabase
      .from('user_preference_profiles')
      .select('*', { count: 'exact', head: true })

    const { count: readyProfiles } = await supabase
      .from('user_preference_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('confidence_score', 0.25)

    const personalizationReadinessRate = totalProfiles && totalProfiles > 0
      ? (readyProfiles || 0) / totalProfiles
      : 0

    return NextResponse.json({
      success: true,
      data: {
        totalRecommendationEvents: totalEvents || 0,
        fallbackActivationRate: fallbackRate,
        averageRouteRealismScore: avgRouteScore,
        fatigueDistribution,
        mostSavedTripStructures: topTripStructures,
        mostDismissedFatigueLevels: Object.entries(dismissedFatigueCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([level, count]) => ({ level, count })),
        topInterestsFromPositiveFeedback: topInterests,
        positiveFeedbackRate,
        negativeFeedbackRate: 1 - positiveFeedbackRate,
        personalizationReadinessRate,
        totalUserProfiles: totalProfiles || 0,
        readyForPersonalization: readyProfiles || 0,
      },
    })
  } catch (error) {
    console.error('Admin learning insights API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
