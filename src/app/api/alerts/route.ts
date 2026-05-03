// API routes for alerts and notifications
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AlertService, NotificationService } from '@/lib/services/alerts'

export const dynamic = 'force-dynamic'

// GET /api/alerts - Get user alerts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const alerts = await AlertService.getUserAlerts(user.id, { unreadOnly, limit })
    const unreadCount = await AlertService.getUnreadCount(user.id)

    return NextResponse.json({ alerts, unreadCount })
  } catch (error) {
    console.error('Get alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

// PATCH /api/alerts/:id - Mark alert as read or dismiss
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { alertId, action } = body

    if (action === 'read') {
      await AlertService.markAsRead(alertId)
    } else if (action === 'dismiss') {
      await AlertService.dismissAlert(alertId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update alert error:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}
