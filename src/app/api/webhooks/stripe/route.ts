import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/services/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials missing')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 400 }
    )
  }

  const db = getDb()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (!userId) break

        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        let periodStart: string | undefined
        let periodEnd: string | undefined

        if (subscriptionId) {
          const sub = await getStripe().subscriptions.retrieve(subscriptionId) as any
          periodStart = new Date(sub.current_period_start * 1000).toISOString()
          periodEnd = new Date(sub.current_period_end * 1000).toISOString()
        }

        await db.from('user_subscriptions').upsert(
          {
            user_id: userId,
            plan_id: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: 'active',
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        const { data: existingSub } = await db
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (!existingSub) break

        const isActive = sub.status === 'active' || sub.status === 'trialing'

        const subAny = sub as any
        await db.from('user_subscriptions').update({
          status: sub.status as string,
          plan_id: isActive ? 'pro' : 'free',
          current_period_start: new Date(subAny.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subAny.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', customerId)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        await db.from('user_subscriptions').update({
          plan_id: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', customerId)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler error' },
      { status: 500 }
    )
  }
}
