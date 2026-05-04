// API endpoint for feedback insights
import { NextRequest, NextResponse } from 'next/server'
import { AIFeedbackAnalyzer } from '@/lib/services/ai-feedback-analyzer'
import { FeedbackImprovementLoop } from '@/lib/services/feedback-improvement-loop'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/admin/feedback-insights - Get aggregated feedback insights
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const timeframe = (searchParams.get('timeframe') || 'month') as 'week' | 'month'

    const improvementLoop = new FeedbackImprovementLoop()

    // Get score weight suggestions
    const scoreWeightSuggestions = await improvementLoop.generateScoreWeightSuggestions(timeframe)

    // Get product issue clusters
    const productIssueClusters = await improvementLoop.clusterProductIssues(timeframe)

    // Get top user intent corrections
    const userIntentCorrections = await improvementLoop.getTopIntentCorrections(10)

    // Get common themes from analyzed feedback
    const now = new Date()
    const startDate = timeframe === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const { data: analyzedFeedback } = await supabase
      .from('rich_feedback')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .not('ai_analysis', 'is', null)

    let commonThemes = { negativeThemes: new Map(), positiveThemes: new Map(), affectedDimensions: new Map(), productIssues: new Map() }
    
    if (analyzedFeedback && analyzedFeedback.length > 0) {
      const analyzer = AIFeedbackAnalyzer.getInstance()
      const analyses = analyzedFeedback.map(fb => fb.ai_analysis)
      commonThemes = analyzer.extractCommonThemes(analyses)
    }

    return NextResponse.json({
      scoreWeightSuggestions,
      productIssueClusters: Array.from(productIssueClusters.entries()).map(([issue, data]) => ({
        issue,
        ...data,
      })),
      userIntentCorrections,
      commonNegativeThemes: Array.from(commonThemes.negativeThemes.entries()).map(([theme, count]) => ({
        theme,
        count,
      })),
      commonPositiveThemes: Array.from(commonThemes.positiveThemes.entries()).map(([theme, count]) => ({
        theme,
        count,
      })),
      affectedDimensions: Array.from(commonThemes.affectedDimensions.entries()).map(([dimension, count]) => ({
        dimension,
        count,
      })),
      timeframe,
      analyzedCount: analyzedFeedback?.length || 0,
    })
  } catch (error) {
    console.error('Feedback insights error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback insights' },
      { status: 500 }
    )
  }
}
