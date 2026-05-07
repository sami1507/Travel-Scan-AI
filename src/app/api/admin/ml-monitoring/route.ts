// Admin API - ML Monitoring and Comparison
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { shadowModeManager } from '@/lib/ml/comparison/shadow-mode'
import { retrainingManager } from '@/lib/ml/retraining/retraining-manager'
import { signalTracker } from '@/lib/ml/improvement/signal-tracker'
import { logger } from '@/lib/utils'
import { errorTracker } from '@/lib/monitoring/error-tracker'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ml-monitoring
 * Get ML monitoring metrics, comparison stats, and retraining readiness
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get shadow mode comparison statistics
    const comparisonStats = shadowModeManager.getComparisonStats()
    const recentComparisons = shadowModeManager.getRecentComparisons(20)
    const shadowConfig = shadowModeManager.getConfig()

    // Get retraining readiness status
    const retrainingStatus = await retrainingManager.checkRetrainingReadiness()
    const currentModel = retrainingManager.getCurrentModel()
    const modelHistory = retrainingManager.getModelHistory()
    const dataSnapshots = retrainingManager.getDataSnapshots()
    const retrainingRecommendations = retrainingManager.getRetrainingRecommendations()

    // Get improvement signals
    const signalAggregation = signalTracker.getSignalAggregation(24) // Last 24 hours
    const improvementSignals = signalTracker.getImprovementSignalsForRetraining()

    // Calculate ML health status
    const mlHealth = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unknown',
      issues: [] as string[],
    }

    if (!currentModel) {
      mlHealth.status = 'unknown'
      mlHealth.issues.push('No trained model deployed')
    } else if (comparisonStats.totalComparisons > 10) {
      const mlWinRate = comparisonStats.mlWins / comparisonStats.totalComparisons
      if (mlWinRate < 0.4) {
        mlHealth.status = 'degraded'
        mlHealth.issues.push(`ML win rate low: ${(mlWinRate * 100).toFixed(1)}%`)
      }
    }

    if (signalAggregation.globalSignals.bySeverity.high > 5) {
      mlHealth.status = 'degraded'
      mlHealth.issues.push(`${signalAggregation.globalSignals.bySeverity.high} high-severity quality issues`)
    }

    return NextResponse.json({
      mlHealth,
      comparison: {
        stats: comparisonStats,
        recentComparisons: recentComparisons.map(c => ({
          comparisonId: c.comparisonId,
          timestamp: c.timestamp,
          winner: c.comparison.winner,
          winnerReason: c.comparison.winnerReason,
          metrics: c.comparison.metrics,
          differences: c.comparison.differences,
        })),
        config: shadowConfig,
      },
      retraining: {
        status: retrainingStatus,
        currentModel: currentModel ? {
          version: currentModel.version,
          trainingDate: currentModel.trainingDate,
          status: currentModel.status,
          metrics: currentModel.evaluationMetrics,
        } : null,
        modelHistory: modelHistory.map(m => ({
          version: m.version,
          trainingDate: m.trainingDate,
          status: m.status,
          metrics: m.evaluationMetrics,
        })),
        dataSnapshots: dataSnapshots.map(s => ({
          snapshotId: s.snapshotId,
          createdAt: s.createdAt,
          exampleCount: s.exampleCount,
          dataQuality: s.dataQuality,
        })),
        recommendations: retrainingRecommendations,
      },
      signals: {
        aggregation: signalAggregation,
        improvementSignals: {
          userPreferenceUpdateCount: improvementSignals.userPreferenceUpdates.length,
          globalQualityIssueCount: improvementSignals.globalQualityIssues.length,
          featureImportanceHints: improvementSignals.featureImportanceHints.slice(0, 10),
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('ML monitoring API error', error)
    errorTracker.trackRouteError('/api/admin/ml-monitoring', error)
    return NextResponse.json(
      { error: 'Failed to fetch ML monitoring metrics' },
      { status: 500 }
    )
  }
}
