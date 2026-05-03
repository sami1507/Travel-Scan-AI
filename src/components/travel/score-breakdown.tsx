'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CategoryScores } from '@/lib/analysis/schemas'

interface ScoreBreakdownProps {
  scores: CategoryScores
  compact?: boolean
}

export function ScoreBreakdown({ scores, compact = false }: ScoreBreakdownProps) {
  const categories = [
    { key: 'budgetFit', label: 'Budget Fit', value: scores.budgetFit },
    { key: 'weatherFit', label: 'Weather Fit', value: scores.weatherFit },
    { key: 'passportEase', label: 'Passport Ease', value: scores.passportEase },
    { key: 'safety', label: 'Safety', value: scores.safety },
    { key: 'transport', label: 'Transport', value: scores.transport },
    { key: 'hotelValue', label: 'Hotel Value', value: scores.hotelValue },
    { key: 'nightlife', label: 'Nightlife', value: scores.nightlife },
    { key: 'nature', label: 'Nature', value: scores.nature },
  ]

  // Add flight value if available (from provider data)
  if (scores.flightValue !== undefined) {
    categories.push({ 
      key: 'flightValue', 
      label: 'Flight Value (estimated)', 
      value: scores.flightValue 
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-blue-500'
    if (score >= 4) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent'
    if (score >= 6) return 'Good'
    if (score >= 4) return 'Fair'
    return 'Poor'
  }

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{cat.label}:</span>
            <span className="font-medium">{cat.value}/10</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{cat.label}</span>
              <span className="text-muted-foreground">
                {cat.value}/10 · {getScoreLabel(cat.value)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getScoreColor(cat.value)}`}
                style={{ width: `${(cat.value / 10) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
