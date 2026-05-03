// API endpoint for running quality evaluations
import { NextRequest, NextResponse } from 'next/server'
import { RecommendationEvaluator } from '@/lib/analysis/evaluator'
import { RecommendationVerifier } from '@/lib/analysis/verifier'
import { FeedbackQualityLoop } from '@/lib/services/feedback-quality-loop'

export const dynamic = 'force-dynamic'

// GET /api/admin/quality-eval - Run quality evaluations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const scenarioId = searchParams.get('scenario')

    const results: any = {}

    // Run recommendation evaluations
    if (type === 'all' || type === 'evaluation') {
      const evaluator = new RecommendationEvaluator()
      const evalResults = await evaluator.runEvaluation(scenarioId || undefined)
      const report = evaluator.generateReport(evalResults)
      
      results.evaluation = {
        results: evalResults,
        report,
        summary: {
          total: evalResults.length,
          passed: evalResults.filter(r => r.passed).length,
          failed: evalResults.filter(r => !r.passed).length,
        },
      }
    }

    // Run feedback analysis
    if (type === 'all' || type === 'feedback') {
      const feedbackLoop = new FeedbackQualityLoop()
      const insights = await feedbackLoop.analyzeFeedback('month')
      const report = feedbackLoop.generateQualityReport(insights)
      
      results.feedback = {
        insights,
        report,
        summary: {
          destinationsAnalyzed: insights.destinationPerformance.size,
          issuesFound: insights.commonIssues.length,
          opportunities: insights.improvementOpportunities.length,
        },
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Quality evaluation error:', error)
    return NextResponse.json(
      { error: 'Failed to run quality evaluation' },
      { status: 500 }
    )
  }
}

// POST /api/admin/quality-eval - Verify a specific analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { analysis } = body

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis data required' },
        { status: 400 }
      )
    }

    const verifier = new RecommendationVerifier()
    const report = verifier.verify(analysis)
    const reportText = verifier.generateReport(report)

    return NextResponse.json({
      verification: report,
      report: reportText,
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify analysis' },
      { status: 500 }
    )
  }
}
