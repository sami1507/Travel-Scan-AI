import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key, { apiVersion: '2026-05-27.dahlia' })
  }
  return _stripe
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://travelscan.vercel.app'

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  customerId?: string
): Promise<string> {
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: `${APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${APP_URL}/pricing`,
    metadata: { userId },
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 7,
    },
  }

  if (customerId) {
    params.customer = customerId
  } else {
    params.customer_email = userEmail
  }

  const session = await getStripe().checkout.sessions.create(params)
  return session.url!
}

export async function createBillingPortalSession(customerId: string): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${APP_URL}/dashboard`,
  })
  return session.url
}
