/**
 * Learning Feedback API
 * Records user feedback signals for AI learning
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { recordFeedbackSignal } from '@/lib/learning/learning-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const feedbackSchema = z.object({
  eventId: z.string().uuid().optional().nullable(),
  recommendationItemId: z.string().uuid().optional().nullable(),
  signalType: z.enum([
    'view',
    'select',
    'save',
    'dismiss',
    'thumbs_up',
    'thumbs_down',
    'details_opened',
    'compare',
    'share',
    'itinerary_map_opened',
    'itinerary_stop_selected',
    'itinerary_day_plan_opened',
    'travel_strategy_tip_opened',
    'travel_strategy_tip_selected',
    'season_month_option_selected',
    'negotiation_email_copied',
    'extra_fee_warning_viewed',
    'alternative_airport_selected',
  ]),
  signalValue: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest) {
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

    // Parse and validate request
    const body = await request.json()
    const validation = feedbackSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { eventId, recommendationItemId, signalType, signalValue } = validation.data

    // Record feedback signal
    const success = await recordFeedbackSignal(
      user.id,
      eventId || null,
      recommendationItemId || null,
      {
        signalType,
        signalValue,
      }
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record feedback signal' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
    })
  } catch (error) {
    console.error('Learning feedback API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
