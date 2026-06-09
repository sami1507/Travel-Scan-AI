'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Zap, Shield, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UserSubscription } from '@/lib/services/subscription'

const FREE_FEATURES = ['3 analyses per month', 'Basic route recommendations', 'Standard destinations']
const PRO_FEATURES = ['Unlimited analyses', 'Real-time web research (Tavily)', 'Price alerts & notifications', 'Save & compare unlimited trips', 'Priority AI processing']
const EXPLORER_FEATURES = ['Everything in Pro', 'Multi-trip workspace', 'Travel partner sharing', 'Export to PDF', 'Early access to new features']

export default function PricingPage() {
  const [sub, setSub] = useState<UserSubscription | null>(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetch('/api/subscription/status')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setSub(data))
      .catch(() => {})
      .finally(() => setLoadingSub(false))
  }, [])

  const handleUpgrade = async () => {
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/subscription/checkout', { method: 'POST' })
      if (res.ok) {
        const { url } = await res.json()
        if (url) window.location.href = url
      }
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/subscription/portal', { method: 'POST' })
      if (res.ok) {
        const { url } = await res.json()
        if (url) window.location.href = url
      }
    } finally {
      setPortalLoading(false)
    }
  }

  const isPro = sub?.plan === 'pro' || sub?.plan === 'explorer'

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-bold mb-6">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          PRICING
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Simple, honest pricing</h1>
        <p className="text-lg text-muted-foreground">No hidden fees. No commitment. Cancel anytime.</p>

        {!loadingSub && sub && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm">
            <span className="text-muted-foreground">Current plan:</span>
            <span className="font-semibold capitalize">{sub.plan}</span>
            {isPro && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* Free */}
        <div className="rounded-2xl border border-border bg-card p-8">
          <h3 className="text-xl font-bold mb-1">Free</h3>
          <p className="text-muted-foreground text-sm mb-6">For curious travelers</p>
          <div className="text-4xl font-bold mb-8">
            $0<span className="text-lg font-normal text-muted-foreground">/mo</span>
          </div>
          <ul className="space-y-3 mb-8">
            {FREE_FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {sub?.plan === 'free' ? (
            <Button variant="outline" className="w-full" disabled>
              Current Plan
            </Button>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              Free Plan
            </Button>
          )}
          {!loadingSub && sub?.plan === 'free' && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              {sub.analysesUsed} of {sub.analysesLimit} analyses used this month
            </p>
          )}
        </div>

        {/* Pro */}
        <div
          className="rounded-2xl p-8 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(255,133,51,0.08) 0%, hsl(var(--card)) 100%)',
            border: '2px solid hsl(22,100%,62%)',
            boxShadow: '0 0 30px rgba(255,133,51,0.12)',
          }}
        >
          <div
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold text-white rounded-full px-4 py-1 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
          >
            MOST POPULAR
          </div>

          <h3 className="text-xl font-bold mb-1">Pro</h3>
          <p className="text-muted-foreground text-sm mb-6">For serious travelers</p>
          <div className="text-4xl font-bold mb-8">
            $9<span className="text-lg font-normal text-muted-foreground">/mo</span>
          </div>
          <ul className="space-y-3 mb-8">
            {PRO_FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {isPro ? (
            <>
              <Button
                className="w-full font-bold text-white border-0"
                style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                onClick={handlePortal}
                disabled={portalLoading}
              >
                {portalLoading ? 'Loading...' : 'Manage Subscription →'}
              </Button>
              {sub?.cancelAtPeriodEnd && (
                <p className="text-xs text-orange-500 text-center mt-2">
                  Cancels on {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'period end'}
                </p>
              )}
            </>
          ) : (
            <>
              <Button
                className="w-full h-11 font-bold text-white border-0"
                style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                onClick={handleUpgrade}
                disabled={checkoutLoading}
              >
                <Zap className="h-4 w-4 mr-2" />
                {checkoutLoading ? 'Loading...' : 'Start Pro Trial'}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">7-day free trial</p>
            </>
          )}
        </div>

        {/* Explorer */}
        <div className="rounded-2xl border border-border bg-card p-8">
          <h3 className="text-xl font-bold mb-1">Explorer</h3>
          <p className="text-muted-foreground text-sm mb-6">For travel power users</p>
          <div className="text-4xl font-bold mb-8">
            $19<span className="text-lg font-normal text-muted-foreground">/mo</span>
          </div>
          <ul className="space-y-3 mb-8">
            {EXPLORER_FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" disabled>
            Coming Soon
          </Button>
        </div>
      </div>

      {/* Trust badges */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span>Secured by Stripe</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Cancel anytime, no penalties</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>7-day free trial on Pro</span>
        </div>
      </div>
    </div>
  )
}
