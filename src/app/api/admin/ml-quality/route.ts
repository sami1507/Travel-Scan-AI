// Admin API: ML Quality Monitoring
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { mlQualityMonitor } from '@/lib/ml/monitoring/ml-quality-monitor'
import { mlEvaluator } from '@/lib/ml/evaluation/ml-evaluator'
import { evaluationScenarios } from '@/lib/ml/evaluation/evaluation-scenarios'
import { logger } from '@/lib/utils'
import { requireAdmin } from '@/lib/auth/admin-guard'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ml-quality
 * Get ML quality monitoring report
 */
export async function GET(request: Request) {
  try {
    // Require admin authentication
    const authError = await requireAdmin()
    if (authError) return authError

    // Get time range from query params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Generate quality report
    const report = await mlQualityMonitor.generateQualityReport({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    })

    // Get feature importance
    const featureImportance = mlQualityMonitor.getFeatureImportanceSummary()

    // Get evaluation scenario status
    const scenarioStatus = evaluationScenarios.map(s => ({
      id: s.scenarioId,
      name: s.name,
      description: s.description,
      testCaseCount: s.testCases.length,
    }))

    logger.info('Admin: ML quality report generated', {
      timeRange: { start: startDate, end: endDate },
    })

    return NextResponse.json({
      report,
      featureImportance,
      scenarioStatus,
      metadata: {
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days,
        },
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('Failed to generate ML quality report', error)
    return NextResponse.json(
      { error: 'Failed to generate ML quality report' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/ml-quality/evaluate
 * Run evaluation scenarios
 */
export async function POST(request: Request) {
  try {
    // Require admin authentication
    const authError = await requireAdmin()
    if (authError) return authError

    const body = await request.json()
    const { scenarioIds } = body

    // Get scenarios to run
    const scenariosToRun = scenarioIds
      ? evaluationScenarios.filter(s => scenarioIds.includes(s.scenarioId))
      : evaluationScenarios

    logger.info('Admin: Running evaluation scenarios', {
      scenarioCount: scenariosToRun.length,
    })

    // Note: In production, you would run actual evaluations
    // For now, return a placeholder response
    const results = scenariosToRun.map(s => ({
      scenarioId: s.scenarioId,
      name: s.name,
      status: 'pending',
      message: 'Evaluation scenarios require full analysis engine integration',
    }))

    return NextResponse.json({
      results,
      metadata: {
        scenariosRun: scenariosToRun.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('Failed to run evaluation scenarios', error)
    return NextResponse.json(
      { error: 'Failed to run evaluation scenarios' },
      { status: 500 }
    )
  }
}
