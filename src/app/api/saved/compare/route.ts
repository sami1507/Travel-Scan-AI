// API route for comparison sessions
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SavedItemsService } from '@/lib/services/saved-items'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const comparisons = await SavedItemsService.getComparisons(user.id)
    return NextResponse.json({ comparisons })
  } catch (error) {
    console.error('Get comparisons error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comparisons' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, itemA, itemB, itemAId, itemBId } = body

    if (!type || !itemA || !itemB || !itemAId || !itemBId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const comparison = await SavedItemsService.createComparison(
      user.id,
      type,
      itemA,
      itemB,
      itemAId,
      itemBId
    )

    return NextResponse.json({ comparison })
  } catch (error) {
    console.error('Create comparison error:', error)
    return NextResponse.json(
      { error: 'Failed to create comparison' },
      { status: 500 }
    )
  }
}
