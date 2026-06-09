import { createClient } from '@supabase/supabase-js'

export interface UserSubscription {
  plan: 'free' | 'pro' | 'explorer'
  status: 'active' | 'canceled' | 'past_due'
  analysesUsed: number
  analysesLimit: number | null
  canAnalyze: boolean
  resetDate: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: string
}

const FREE_LIMIT = 3

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials missing')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function getResetDate(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return next.toISOString().slice(0, 10)
}

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const db = getDb()
  const month = getCurrentMonth()

  const [subRes, usageRes] = await Promise.all([
    db
      .from('user_subscriptions')
      .select('plan_id, status, stripe_customer_id, stripe_subscription_id, cancel_at_period_end, current_period_end')
      .eq('user_id', userId)
      .maybeSingle(),
    db
      .from('usage_tracking')
      .select('analyses_count')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle(),
  ])

  const sub = subRes.data as {
    plan_id: string
    status: string
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    cancel_at_period_end: boolean | null
    current_period_end: string | null
  } | null

  const usage = usageRes.data as { analyses_count: number } | null

  const plan = (sub?.plan_id ?? 'free') as 'free' | 'pro' | 'explorer'
  const status = (sub?.status ?? 'active') as 'active' | 'canceled' | 'past_due'
  const analysesUsed = usage?.analyses_count ?? 0
  const isUnlimited = plan !== 'free'
  const analysesLimit = isUnlimited ? null : FREE_LIMIT
  const canAnalyze = status === 'active' && (isUnlimited || analysesUsed < FREE_LIMIT)

  return {
    plan,
    status,
    analysesUsed,
    analysesLimit,
    canAnalyze,
    resetDate: getResetDate(),
    stripeCustomerId: sub?.stripe_customer_id ?? undefined,
    stripeSubscriptionId: sub?.stripe_subscription_id ?? undefined,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? undefined,
    currentPeriodEnd: sub?.current_period_end ?? undefined,
  }
}

export async function incrementAnalysisUsage(userId: string): Promise<void> {
  const db = getDb()
  const month = getCurrentMonth()

  const { data: existing } = await db
    .from('usage_tracking')
    .select('analyses_count')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()

  const currentCount = (existing as { analyses_count: number } | null)?.analyses_count ?? 0

  await db.from('usage_tracking').upsert(
    {
      user_id: userId,
      month,
      analyses_count: currentCount + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,month' }
  )
}

export async function canUserAnalyze(userId: string): Promise<{
  allowed: boolean
  reason?: 'limit_reached' | 'subscription_inactive'
  analysesUsed: number
  analysesLimit: number | null
}> {
  const sub = await getUserSubscription(userId)

  if (sub.status !== 'active') {
    return {
      allowed: false,
      reason: 'subscription_inactive',
      analysesUsed: sub.analysesUsed,
      analysesLimit: sub.analysesLimit,
    }
  }

  if (sub.analysesLimit !== null && sub.analysesUsed >= sub.analysesLimit) {
    return {
      allowed: false,
      reason: 'limit_reached',
      analysesUsed: sub.analysesUsed,
      analysesLimit: sub.analysesLimit,
    }
  }

  return {
    allowed: true,
    analysesUsed: sub.analysesUsed,
    analysesLimit: sub.analysesLimit,
  }
}
