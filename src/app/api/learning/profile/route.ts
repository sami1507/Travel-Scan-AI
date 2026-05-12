/**
 * Learning Profile API
 * Returns user's learning profile and preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserPreferenceProfile } from '@/lib/learning/learning-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user preference profile
    const profile = await getUserPreferenceProfile(user.id)

    if (!profile) {
      return NextResponse.json({
        success: true,
        profile: null,
        message: 'No learning profile yet. Keep using TravelScan to build your personalized profile!',
      })
    }

    // Get top preferred trip structures
    const topTripStructures = Object.entries(profile.preferredTripStructures)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([structure]) => structure)

    // Get top preferred interests
    const topInterests = Object.entries(profile.preferredInterests)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([interest]) => interest)

    return NextResponse.json({
      success: true,
      profile: {
        signalCount: profile.signalCount,
        confidenceScore: profile.confidenceScore,
        preferredTripStructures: topTripStructures,
        preferredInterests: topInterests,
        fatigueTolerance: profile.fatigueTolerance,
        routeComplexityPreference: profile.routeComplexityPreference,
        learnedWeights: profile.learnedWeights,
        updatedAt: profile.updatedAt,
      },
    })
  } catch (error) {
    console.error('Learning profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
