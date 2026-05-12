// API endpoint for intelligence signals processing
import { NextRequest, NextResponse } from 'next/server'
import { FeedbackIntelligenceSignals } from '@/lib/services/feedback-intelligence-signals'
import { requireAdmin } from '@/lib/auth/admin-guard'

export const dynamic = 'force-dynamic'

// GET /api/admin/intelligence-signals - Extract and view intelligence signals
export async function GET(request: NextRequest) {
  // Require admin authentication
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const timeframe = (searchParams.get('timeframe') || 'week') as 'day' | 'week' | 'month'

    const intelligenceService = new FeedbackIntelligenceSignals()
    const signals = await intelligenceService.extractSignals(timeframe)

    // Group by signal type
    const grouped = {
      recommendation_quality: signals.filter(s => s.signalType === 'recommendation_quality'),
      personalization: signals.filter(s => s.signalType === 'personalization'),
      explanation: signals.filter(s => s.signalType === 'explanation'),
      product_insight: signals.filter(s => s.signalType === 'product_insight'),
    }

    // Calculate summary stats
    const summary = {
      total: signals.length,
      critical: signals.filter(s => s.priority === 'critical').length,
      high: signals.filter(s => s.priority === 'high').length,
      medium: signals.filter(s => s.priority === 'medium').length,
      actionable: signals.filter(s => s.actionable).length,
    }

    return NextResponse.json({
      signals,
      grouped,
      summary,
      timeframe,
    })
  } catch (error) {
    console.error('Intelligence signals error:', error)
    return NextResponse.json(
      { error: 'Failed to extract intelligence signals' },
      { status: 500 }
    )
  }
}

// POST /api/admin/intelligence-signals - Apply intelligence signals
export async function POST(request: NextRequest) {
  // Require admin authentication
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()
    const { timeframe = 'week', autoApply = false } = body

    const intelligenceService = new FeedbackIntelligenceSignals()
    const signals = await intelligenceService.extractSignals(timeframe as any)

    if (!autoApply) {
      return NextResponse.json({
        message: 'Signals extracted but not applied (set autoApply: true to apply)',
        signalCount: signals.length,
      })
    }

    const result = await intelligenceService.applySignals(signals)

    return NextResponse.json({
      message: 'Intelligence signals processed',
      ...result,
    })
  } catch (error) {
    console.error('Apply signals error:', error)
    return NextResponse.json(
      { error: 'Failed to apply intelligence signals' },
      { status: 500 }
    )
  }
}
