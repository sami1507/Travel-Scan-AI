// API route for submitting user feedback
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createFeedback } from '@/lib/db/feedback'
import { feedbackSchema } from '@/lib/types/feedback'
import { logger } from '@/lib/utils'
import { randomUUID } from 'crypto'

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

    logger.info('Feedback submitted successfully', {
      userId: user.id,
      feedbackType: validatedData.feedback_type,
      destinationId: validatedData.destination_id,
    })

    return response
  } catch (error) {
    logger.error('Feedback submission failed', error)

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid feedback data', details: error.message },
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

    // Get user feedback (placeholder for future analytics)
    return NextResponse.json(
      { message: 'Feedback retrieval endpoint - future implementation' },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Feedback retrieval failed', error)
    return NextResponse.json(
      { error: 'Failed to retrieve feedback' },
      { status: 500 }
    )
  }
}
