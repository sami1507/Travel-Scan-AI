'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Zap } from 'lucide-react'
import type { UserSubscription } from '@/lib/services/subscription'

export function UsageIndicator() {
  const [sub, setSub] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subscription/status')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setSub(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/30 p-4 animate-pulse">
        <div className="h-3 bg-muted rounded w-3/4 mb-3" />
        <div className="h-2 bg-muted rounded w-full mb-2" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    )
  }

  if (!sub) return null

  if (sub.plan === 'pro' || sub.plan === 'explorer') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold text-sm mb-1">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Pro Plan — Unlimited analyses
        </div>
        <button
          className="text-xs text-green-600 dark:text-green-500 hover:underline mt-0.5 text-left"
          onClick={async () => {
            const res = await fetch('/api/subscription/portal', { method: 'POST' })
            if (res.ok) {
              const { url } = await res.json()
              if (url) window.location.href = url
            }
          }}
        >
          Manage subscription →
        </button>
      </div>
    )
  }

  const used = sub.analysesUsed
  const limit = sub.analysesLimit ?? 3
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const remaining = Math.max(0, limit - used)

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Free Plan</span>
        <span className="text-xs text-muted-foreground">{used} of {limit} used</span>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-destructive' : pct >= 66 ? 'bg-warning' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {remaining === 0 ? (
        <p className="text-xs text-destructive font-medium mb-2">No analyses remaining this month</p>
      ) : (
        <p className="text-xs text-muted-foreground mb-2">{remaining} analysis{remaining !== 1 ? 'es' : ''} left • resets {sub.resetDate}</p>
      )}

      <Link href="/dashboard/pricing" className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
        <Zap className="h-3.5 w-3.5" />
        Upgrade to Pro for unlimited →
      </Link>
    </div>
  )
}
