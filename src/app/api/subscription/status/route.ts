import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserSubscription } from '@/lib/services/subscription'
import { logger } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await getUserSubscription(user.id)
    return NextResponse.json(subscription)
  } catch (error) {
    logger.error('Failed to load subscription status', error)
    return NextResponse.json(
      { error: 'Failed to load subscription status.' },
      { status: 500 }
    )
  }
}
