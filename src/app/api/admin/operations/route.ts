// Admin API - Operational Metrics
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { errorTracker } from '@/lib/monitoring/error-tracker'
import { costTracker } from '@/lib/monitoring/cost-tracker'
import { cacheManager } from '@/lib/cache/cache-manager'
import { logger } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/operations
 * Get operational metrics (errors, costs, cache stats)
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

    // Get error statistics
    const errorStats = errorTracker.getErrorStats()
    const recentErrors = errorTracker.getRecentErrors(50)

    // Get cost statistics
    const costSummary = costTracker.getCostSummary()
    const totalCost = costTracker.getTotalCost()
    const expensiveOps = costTracker.getMostExpensiveOperations(10)

    // Get cache statistics
    const cacheStats = cacheManager.getStats()
    const cacheEnabled = cacheManager.isEnabled()

    // Build operational health summary
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'critical',
      issues: [] as string[],
    }

    // Check for critical issues
    if (errorStats.lastHour > 50) {
      health.status = 'critical'
      health.issues.push(`High error rate: ${errorStats.lastHour} errors in last hour`)
    } else if (errorStats.lastHour > 20) {
      health.status = 'degraded'
      health.issues.push(`Elevated error rate: ${errorStats.lastHour} errors in last hour`)
    }

    if (totalCost.lastHour > 10) {
      health.status = health.status === 'critical' ? 'critical' : 'degraded'
      health.issues.push(`High cost rate: $${totalCost.lastHour.toFixed(2)} in last hour`)
    }

    if (!cacheEnabled) {
      health.issues.push('Cache is disabled - costs may be higher')
    }

    return NextResponse.json({
      health,
      errors: {
        stats: errorStats,
        recent: recentErrors.map(e => ({
          message: e.message,
          severity: e.severity,
          provider: e.context.provider,
          operation: e.context.operation,
          timestamp: e.timestamp,
        })),
      },
      costs: {
        total: totalCost,
        byProvider: costSummary,
        expensive: expensiveOps,
      },
      cache: {
        enabled: cacheEnabled,
        stats: cacheStats,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Admin operations API error', error)
    errorTracker.trackRouteError('/api/admin/operations', error)
    return NextResponse.json(
      { error: 'Failed to fetch operational metrics' },
      { status: 500 }
    )
  }
}
