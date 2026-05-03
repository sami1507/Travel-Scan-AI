// API route for saving and managing routes
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

    const routes = await SavedItemsService.getSavedRoutes(user.id)
    return NextResponse.json({ routes })
  } catch (error) {
    console.error('Get saved routes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
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
    const { route, sourceAnalysisId } = body

    if (!route) {
      return NextResponse.json(
        { error: 'Missing route data' },
        { status: 400 }
      )
    }

    const savedRoute = await SavedItemsService.saveRoute(
      user.id,
      route,
      sourceAnalysisId
    )

    return NextResponse.json({ route: savedRoute })
  } catch (error) {
    console.error('Save route error:', error)
    return NextResponse.json(
      { error: 'Failed to save route' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, updates } = body

    if (!id || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const updatedRoute = await SavedItemsService.updateRoute(id, updates)
    return NextResponse.json({ route: updatedRoute })
  } catch (error) {
    console.error('Update route error:', error)
    return NextResponse.json(
      { error: 'Failed to update route' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing route ID' },
        { status: 400 }
      )
    }

    await SavedItemsService.deleteRoute(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete route error:', error)
    return NextResponse.json(
      { error: 'Failed to delete route' },
      { status: 500 }
    )
  }
}
