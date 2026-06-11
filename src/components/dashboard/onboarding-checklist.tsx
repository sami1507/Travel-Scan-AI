'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, CheckCircle2, Circle } from 'lucide-react'

const STORAGE_KEY = 'onboarding_dismissed'

interface OnboardingChecklistProps {
  analysisCount: number
  savedCount: number
}

export function OnboardingChecklist({ analysisCount, savedCount }: OnboardingChecklistProps) {
  const [visible, setVisible] = useState(false)
  const [allDoneTimer, setAllDoneTimer] = useState(false)

  const steps = [
    { label: 'Create your account', done: true, link: null },
    { label: 'Run your first analysis', done: analysisCount > 0, link: { href: '/dashboard/analysis', text: 'Start now →' } },
    { label: 'Save a trip you love', done: savedCount > 0, link: { href: '/dashboard/saved', text: 'View results →' } },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length
  const pct = Math.round((completedCount / steps.length) * 100)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed && analysisCount === 0) {
      setVisible(true)
    }
  }, [analysisCount])

  useEffect(() => {
    if (!allDone || !visible) return
    setAllDoneTimer(true)
    const t = setTimeout(() => dismiss(), 3000)
    return () => clearTimeout(t)
  }, [allDone, visible])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="relative rounded-2xl p-px"
      style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
    >
      <div className="rounded-2xl bg-card p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg leading-tight">
              {allDoneTimer ? '🎉 You\'re all set!' : 'Get started in 3 steps 🚀'}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allDoneTimer
                ? 'Dismissing in a moment…'
                : `${completedCount} of ${steps.length} steps completed`}
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss onboarding checklist"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-4 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-5">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))',
            }}
          />
        </div>

        {/* Steps */}
        <ul className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-3">
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={`flex-1 text-sm ${step.done ? 'text-foreground line-through decoration-muted-foreground/40' : 'text-foreground'}`}
              >
                {step.label}
              </span>
              {!step.done && step.link && (
                <Link
                  href={step.link.href}
                  className="text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  {step.link.text}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
