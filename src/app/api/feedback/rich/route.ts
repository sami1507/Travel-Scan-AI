// API endpoint for rich feedback submission and analysis
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AIFeedbackAnalyzer } from '@/lib/services/ai-feedback-analyzer'
import { FeedbackImprovementLoop } from '@/lib/services/feedback-improvement-loop'
import type { RichFeedbackData } from '@/components/travel/rich-feedback-dialog'

export const dynamic = 'force-dynamic'

// POST /api/feedback/rich - Submit rich feedback
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      feedbackData,
      destination,
      userConstraints,
      queryText,
      destinationRank,
      routeData,
    } = body as {
      feedbackData: RichFeedbackData
      destination: any
      userConstraints: any
      queryText: string
      destinationRank: number
      routeData?: any
    }

    // Store feedback
    const { data: feedback, error: insertError } = await supabase
      .from('rich_feedback')
      .insert({
        user_id: user.id,
        feedback_type: feedbackData.feedbackType,
        selected_reasons: feedbackData.selectedReasons,
        comment: feedbackData.comment,
        destination_id: destination.destinationId,
        destination_name: destination.destinationName,
        destination_rank: destinationRank,
        total_match_score: destination.totalMatchScore,
        score_breakdown: destination.categoryScores,
        why_recommended: destination.whyRecommended,
        route_data: routeData,
        user_constraints: userConstraints,
        personalization_applied: true,
        preference_corrections: feedbackData.preferenceCorrections,
        query_text: queryText,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert feedback:', insertError)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    // Trigger async AI analysis (don't block response)
    analyzeFeedbackAsync(feedback.id, {
      feedbackData,
      destination,
      userConstraints,
      queryText,
      destinationRank,
    }, user.id).catch(err => console.error('Async analysis error:', err))

    return NextResponse.json({ success: true, feedbackId: feedback.id })
  } catch (error) {
    console.error('Rich feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    )
  }
}

// Async function to analyze feedback and apply improvements
async function analyzeFeedbackAsync(
  feedbackId: string,
  context: any,
  userId: string
): Promise<void> {
  const analyzer = AIFeedbackAnalyzer.getInstance()
  const improvementLoop = new FeedbackImprovementLoop()
  const supabase = await createServerSupabaseClient()

  try {
    // Analyze feedback
    const analysis = await analyzer.analyze(context)

    // Store analysis
    await supabase
      .from('rich_feedback')
      .update({
        ai_analysis: analysis,
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', feedbackId)

    // Apply user-level preference adjustments
    await improvementLoop.applyUserPreferenceAdjustments(
      userId,
      context.feedbackData,
      analysis
    )

    // Note: Product-level improvements (score weights, insights) are aggregated
    // separately via scheduled jobs, not applied immediately
  } catch (error) {
    console.error('Failed to analyze feedback:', error)
  }
}
