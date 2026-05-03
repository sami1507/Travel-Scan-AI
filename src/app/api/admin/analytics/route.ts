// Admin analytics API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { analyticsDataAccess } from '@/lib/analytics/data-access'
import { logger } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined

    logger.info('Admin analytics requested', { userId: user.id, type })

    let data: any

    switch (type) {
      case 'overview':
        data = await analyticsDataAccess.getOverview(dateRange)
        break
      case 'destinations':
        const limit = parseInt(searchParams.get('limit') || '20')
        data = await analyticsDataAccess.getTopDestinations(limit)
        break
      case 'recommendations':
        data = await analyticsDataAccess.getRecommendationPerformance()
        break
      case 'feedback':
        data = await analyticsDataAccess.getFeedbackInsights()
        break
      case 'search':
        data = await analyticsDataAccess.getSearchInsights()
        break
      case 'personalization':
        data = await analyticsDataAccess.getPersonalizationInsights()
        break
      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      type,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Admin analytics API error', error)

    const errorMessage = error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      { status: 500 }
    )
  }
}
