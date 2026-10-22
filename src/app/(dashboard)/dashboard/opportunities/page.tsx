'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, DollarSign, Calendar, CloudSun, ArrowRight, Sparkles } from 'lucide-react'
import { LoadingState } from '@/components/ui/loading-state'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { UserAlert } from '@/lib/services/alerts'

type FilterKey = 'all' | 'price' | 'timing' | 'weather'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'price', label: 'Price & Value' },
  { key: 'timing', label: 'Timing' },
  { key: 'weather', label: 'Weather' },
]

const CATEGORY_TYPES: Record<FilterKey, string[]> = {
  all: [],
  price: ['budget_change', 'value_opportunity'],
  timing: ['timing_change', 'score_improvement', 'route_improvement'],
  weather: ['weather_change'],
}

const ALERT_ICONS: Record<string, any> = {
  score_improvement: TrendingUp,
  route_improvement: TrendingUp,
  timing_change: Calendar,
  weather_change: CloudSun,
  budget_change: DollarSign,
  value_opportunity: DollarSign,
  recommendation_update: Sparkles,
}

export default function OpportunitiesPage() {
  const [alerts, setAlerts] = useState<UserAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    fetch('/api/alerts')
      .then((res) => (res.ok ? res.json() : { alerts: [] }))
      .then((data) => setAlerts(data.alerts || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return alerts
    const types = CATEGORY_TYPES[filter]
    return alerts.filter((a) => types.includes(a.alert_type))
  }, [alerts, filter])

  if (loading) {
    return <LoadingState message="Loading opportunities..." fullPage />
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Travel Opportunities</h1>
        <p className="text-muted-foreground">Price drops, timing, and weather opportunities detected for your saved trips</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <Badge
            key={f.key}
            variant={filter === f.key ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Badge>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground max-w-2xl mx-auto">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No travel opportunities detected yet</p>
              <p className="text-sm mt-2">
                Opportunities are price drops, favorable timing, and weather windows detected for your saved trips.
              </p>
              <p className="text-sm mt-2">
                Create travel analyses and save destinations to start receiving opportunity alerts.
              </p>
              <Button className="mt-4" asChild>
<Link href="/dashboard/analysis">
                  Create Travel Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((opportunity) => {
            const Icon = ALERT_ICONS[opportunity.alert_type] || TrendingUp
            const details = opportunity.change_details as { oldValue?: string; newValue?: string; improvement?: string } | null
            return (
              <Card key={opportunity.id} className={cn('hover:shadow-md transition-shadow', !opportunity.is_read && 'border-primary/30')}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-lg">{opportunity.title}</h3>
                        <p className="text-sm text-muted-foreground">{opportunity.message}</p>
                        {opportunity.trigger_reason && (
                          <p className="text-xs text-muted-foreground mt-2">
                            <strong>Why:</strong> {opportunity.trigger_reason}
                          </p>
                        )}
                        {details?.improvement && (
                          <p className="text-xs flex items-center gap-1 mt-2 text-green-600">
                            <TrendingDown className="h-3 w-3" /> {details.improvement}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {opportunity.destination_name && (
                        <Badge variant="outline">{opportunity.destination_name}</Badge>
                      )}
                      <Badge variant="secondary" className="capitalize">
                        {opportunity.alert_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  {opportunity.action_url && opportunity.action_label && (
                    <div className="flex justify-end mt-4">
                      <Button size="sm" asChild>
                        <a href={opportunity.action_url}>
                          {opportunity.action_label}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
