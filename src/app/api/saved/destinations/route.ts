// API route for saving and managing destinations
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

    const destinations = await SavedItemsService.getSavedDestinations(user.id)
    return NextResponse.json({ destinations })
  } catch (error) {
    console.error('Get saved destinations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch destinations' },
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
    const { destination, sourceAnalysisId } = body

    if (!destination) {
      return NextResponse.json(
        { error: 'Missing destination data' },
        { status: 400 }
      )
    }

    const savedDestination = await SavedItemsService.saveDestination(
      user.id,
      destination,
      sourceAnalysisId
    )

    return NextResponse.json({ destination: savedDestination })
  } catch (error) {
    console.error('Save destination error:', error)
    return NextResponse.json(
      { error: 'Failed to save destination' },
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

    const updatedDestination = await SavedItemsService.updateDestination(id, updates)
    return NextResponse.json({ destination: updatedDestination })
  } catch (error) {
    console.error('Update destination error:', error)
    return NextResponse.json(
      { error: 'Failed to update destination' },
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
        { error: 'Missing destination ID' },
        { status: 400 }
      )
    }

    await SavedItemsService.deleteDestination(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete destination error:', error)
    return NextResponse.json(
      { error: 'Failed to delete destination' },
      { status: 500 }
    )
  }
}
