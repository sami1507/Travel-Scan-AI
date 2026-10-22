// Admin API: ML Quality Monitoring
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { mlQualityMonitor } from '@/lib/ml/monitoring/ml-quality-monitor'
import { mlEvaluator } from '@/lib/ml/evaluation/ml-evaluator'
import { evaluationScenarios } from '@/lib/ml/evaluation/evaluation-scenarios'
import { travelAnalysisEngine } from '@/lib/analysis/engine'
import type { RankedDestination } from '@/lib/analysis/schemas'
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured; evaluation scenarios cannot run' },
        { status: 503 }
      )
    }

    logger.info('Admin: Running evaluation scenarios', {
      scenarioCount: scenariosToRun.length,
    })

    // Run each test case through the real analysis engine
    const analyzeFunction = async (input: any): Promise<RankedDestination[]> => {
      const analysis = await travelAnalysisEngine.analyze({
        query: input.query,
        budget: input.budget === 'low' ? 'budget' : input.budget,
        travelMonths: input.travelMonths,
        interests: input.interests,
        travelStyle: input.travelStyle,
        pace: input.pace,
        tripLength: input.tripDuration,
        forceFresh: true,
      })
      return analysis.rankedDestinations || []
    }

    const evaluationResults = await mlEvaluator.runEvaluationScenarios(
      scenariosToRun,
      analyzeFunction
    )

    const results = scenariosToRun.map(s => {
      const result = evaluationResults.get(s.scenarioId)
      return {
        scenarioId: s.scenarioId,
        name: s.name,
        status: result ? (result.passed ? 'passed' : 'failed') : 'error',
        metrics: result?.metrics || null,
      }
    })

    return NextResponse.json({
      results,
      metadata: {
        scenariosRun: scenariosToRun.length,
        scenariosPassed: results.filter(r => r.status === 'passed').length,
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
