import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/services/stripe'
import { getUserSubscription } from '@/lib/services/subscription'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sub = await getUserSubscription(user.id)
    const url = await createCheckoutSession(
      user.id,
      user.email ?? '',
      sub.stripeCustomerId
    )

    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
