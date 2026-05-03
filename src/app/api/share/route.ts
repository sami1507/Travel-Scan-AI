// API routes for sharing
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ShareService } from '@/lib/services/alerts'

export const dynamic = 'force-dynamic'

// POST /api/share - Create shared content
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentType, contentData, isPublic, expiresInDays } = body

    const sharedContent = await ShareService.createShare(
      user.id,
      contentType,
      contentData,
      { isPublic, expiresInDays }
    )

    return NextResponse.json({ sharedContent })
  } catch (error) {
    console.error('Create share error:', error)
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    )
  }
}

// GET /api/share?token=xxx - Get shared content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const sharedContent = await ShareService.getSharedContent(token)

    if (!sharedContent) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    return NextResponse.json({ sharedContent })
  } catch (error) {
    console.error('Get shared content error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shared content' },
      { status: 500 }
    )
  }
}

// DELETE /api/share/:id - Delete shared content
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('id')

    if (!shareId) {
      return NextResponse.json({ error: 'Share ID required' }, { status: 400 })
    }

    await ShareService.deleteShare(shareId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete share error:', error)
    return NextResponse.json(
      { error: 'Failed to delete share' },
      { status: 500 }
    )
  }
}
