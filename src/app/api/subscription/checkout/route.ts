import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/services/stripe'
import { getUserSubscription } from '@/lib/services/subscription'
import { logger } from '@/lib/utils'

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
    logger.error('Checkout session creation failed', error)
    return NextResponse.json(
      { error: 'Failed to start checkout. Please try again.' },
      { status: 500 }
    )
  }
}
