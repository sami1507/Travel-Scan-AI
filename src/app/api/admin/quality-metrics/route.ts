// Admin API: Product quality metrics computed from real database records
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { logger } from '@/lib/utils'
import type { QualityMetrics } from '@/lib/types/analytics'

export const dynamic = 'force-dynamic'

const SAVE_TYPES = ['save-trip', 'select-destination']
const DISMISSED_TYPES = ['thumbs-down', 'dismiss-recommendation']

const ratio = (part: number, total: number): number | null =>
  total > 0 ? part / total : null

// GET /api/admin/quality-metrics - Product quality metrics from real data
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const supabase = createAdminClient()

    const [feedbackResult, alertsResult, sharedResult, preferencesResult] = await Promise.all([
      supabase.from('user_feedback').select('feedback_type, destination_name, total_score'),
      supabase.from('user_alerts').select('is_read, is_dismissed'),
      supabase.from('shared_content').select('view_count'),
      supabase.from('user_preferences').select('confidence, feedback_count'),
    ])

    for (const result of [feedbackResult, alertsResult, sharedResult, preferencesResult]) {
      if (result.error) {
        logger.error('Quality metrics query failed', result.error)
        throw result.error
      }
    }

    const feedback = (feedbackResult.data || []) as Array<{
      feedback_type: string
      destination_name: string | null
      total_score: number | null
    }>

    // Recommendation quality
    const scored = feedback.filter(f => f.total_score !== null)
    const averageScore = scored.length > 0
      ? scored.reduce((sum, f) => sum + Number(f.total_score), 0) / scored.length
      : null

    const savesByDestination = new Map<string, { saves: number; scores: number[] }>()
    for (const f of feedback) {
      if (!SAVE_TYPES.includes(f.feedback_type) || !f.destination_name) continue
      const entry = savesByDestination.get(f.destination_name) || { saves: 0, scores: [] }
      entry.saves++
      if (f.total_score !== null) entry.scores.push(Number(f.total_score))
      savesByDestination.set(f.destination_name, entry)
    }
    const topDestinations = Array.from(savesByDestination.entries())
      .map(([name, data]) => ({
        name,
        saves: data.saves,
        score: data.scores.length > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : 0,
      }))
      .sort((a, b) => b.saves - a.saves)
      .slice(0, 10)

    // Feedback rates
    const saveTripRate = ratio(
      feedback.filter(f => SAVE_TYPES.includes(f.feedback_type)).length,
      feedback.length
    )
    const dismissalRate = ratio(
      feedback.filter(f => DISMISSED_TYPES.includes(f.feedback_type)).length,
      feedback.length
    )
    const viewDetailsRate = ratio(
      feedback.filter(f => f.feedback_type === 'view-details').length,
      feedback.length
    )

    // Alerts
    const alerts = (alertsResult.data || []) as Array<{ is_read: boolean; is_dismissed: boolean }>
    const readRate = ratio(alerts.filter(a => a.is_read).length, alerts.length)
    const dismissRate = ratio(alerts.filter(a => a.is_dismissed).length, alerts.length)

    // Sharing
    const shared = (sharedResult.data || []) as Array<{ view_count: number }>
    const totalShares = shared.length
    const totalViews = shared.reduce((sum, s) => sum + (s.view_count || 0), 0)
    const avgViewsPerShare = totalShares > 0 ? totalViews / totalShares : null

    // Personalization (learned preference profiles)
    const preferences = (preferencesResult.data || []) as Array<{
      confidence: number | null
      feedback_count: number | null
    }>
    const avgConfidence = preferences.length > 0
      ? preferences.reduce((sum, p) => sum + Number(p.confidence || 0), 0) / preferences.length
      : null
    const avgFeedbackCount = preferences.length > 0
      ? preferences.reduce((sum, p) => sum + (p.feedback_count || 0), 0) / preferences.length
      : 0

    const metrics: QualityMetrics = {
      recommendationQuality: {
        averageScore: averageScore === null ? null : Math.round(averageScore * 10) / 10,
        sampleSize: scored.length,
        topDestinations,
      },
      feedback: {
        saveTripRate,
        dismissalRate,
        viewDetailsRate,
        sampleSize: feedback.length,
      },
      alerts: {
        readRate,
        dismissRate,
        total: alerts.length,
      },
      sharing: {
        totalShares,
        totalViews,
        avgViewsPerShare,
      },
      personalization: {
        avgConfidence,
        totalUsersWithPreferences: preferences.length,
        avgFeedbackCount: Math.round(avgFeedbackCount * 10) / 10,
      },
    }

    return NextResponse.json({ success: true, data: metrics })
  } catch (error) {
    logger.error('Failed to compute quality metrics', error)
    return NextResponse.json(
      { success: false, error: 'Failed to compute quality metrics' },
      { status: 500 }
    )
  }
}
