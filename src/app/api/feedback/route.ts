// API route for submitting user feedback
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createFeedback, getUserFeedback } from '@/lib/db/feedback'
import { feedbackSchema } from '@/lib/types/feedback'
import { ZodError } from 'zod'
import { logger } from '@/lib/utils'
import { randomUUID } from 'crypto'
import { signalTracker } from '@/lib/ml/improvement/signal-tracker'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = feedbackSchema.parse(body)

    // Get or create session ID from cookies
    const sessionId = request.cookies.get('session_id')?.value || randomUUID()

    // Create feedback entry
    const feedback = await createFeedback(
      user.id,
      sessionId,
      validatedData
    )

    // Set session ID cookie if new
    const response = NextResponse.json(
      { success: true, feedback },
      { status: 201 }
    )

    if (!request.cookies.get('session_id')) {
      response.cookies.set('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    }

    // Track improvement signal
    try {
      signalTracker.trackUserSignal(feedback)
    } catch (signalError) {
      logger.error('Failed to track improvement signal', signalError)
      // Don't fail the request if signal tracking fails
    }

    logger.info('Feedback submitted successfully', {
      userId: user.id,
      feedbackType: validatedData.feedback_type,
      destinationId: validatedData.destination_id,
    })

    return response
  } catch (error) {
    logger.error('Feedback submission failed', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid feedback data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100') || 100, 1), 500)

    const feedback = await getUserFeedback(user.id, limit)

    return NextResponse.json({ feedback }, { status: 200 })
  } catch (error) {
    logger.error('Feedback retrieval failed', error)
    return NextResponse.json(
      { error: 'Failed to retrieve feedback' },
      { status: 500 }
    )
  }
}
