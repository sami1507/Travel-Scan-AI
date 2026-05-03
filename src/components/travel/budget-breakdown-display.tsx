'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Plane, Hotel, Utensils, Car, Ticket } from 'lucide-react'
import type { BudgetBreakdown } from '@/lib/services/user-profile'

interface BudgetBreakdownDisplayProps {
  breakdown: BudgetBreakdown
  showDetails?: boolean
}

export function BudgetBreakdownDisplay({ breakdown, showDetails = true }: BudgetBreakdownDisplayProps) {
  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return 'N/A'
    return `${currency || 'USD'} ${amount.toLocaleString()}`
  }

  const formatRange = (min?: number, max?: number, currency?: string) => {
    if (!min || !max) return 'N/A'
    return `${currency || 'USD'} ${min.toLocaleString()} - ${max.toLocaleString()}`
  }

  const getQualityBadge = (quality?: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline', label: string }> = {
      real: { variant: 'default', label: 'Real Data' },
      estimated: { variant: 'secondary', label: 'Estimated' },
      demo: { variant: 'outline', label: 'Demo' },
    }
    const config = variants[quality || 'demo']
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Budget Breakdown</CardTitle>
            <CardDescription>{breakdown.destination_name}</CardDescription>
          </div>
          {breakdown.trip_duration_days && (
            <Badge variant="secondary">{breakdown.trip_duration_days} days</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Trip Cost */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total Trip Cost</p>
            {getQualityBadge('estimated')}
          </div>
          <p className="text-3xl font-bold text-primary">
            {formatRange(breakdown.total_trip_cost_min, breakdown.total_trip_cost_max, breakdown.total_cost_currency)}
          </p>
          {breakdown.trip_duration_days && (
            <p className="text-xs text-muted-foreground mt-1">
              For {breakdown.trip_duration_days} days
            </p>
          )}
        </div>

        {showDetails && (
          <>
            <Separator />

            {/* Flight Costs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Flights</p>
                </div>
                {getQualityBadge(breakdown.flight_data_quality)}
              </div>
              <p className="text-lg font-semibold">
                {formatRange(breakdown.flight_cost_min, breakdown.flight_cost_max, breakdown.flight_cost_currency)}
              </p>
              <p className="text-xs text-muted-foreground">Round-trip estimate</p>
            </div>

            <Separator />

            {/* Accommodation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hotel className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Accommodation</p>
                </div>
                {getQualityBadge(breakdown.accommodation_data_quality)}
              </div>
              <p className="text-lg font-semibold">
                {formatRange(
                  breakdown.accommodation_cost_per_night_min,
                  breakdown.accommodation_cost_per_night_max,
                  breakdown.accommodation_currency
                )}
              </p>
              <p className="text-xs text-muted-foreground">Per night</p>
              {breakdown.trip_duration_days && (
                <p className="text-xs text-muted-foreground">
                  Total: {formatRange(
                    (breakdown.accommodation_cost_per_night_min || 0) * breakdown.trip_duration_days,
                    (breakdown.accommodation_cost_per_night_max || 0) * breakdown.trip_duration_days,
                    breakdown.accommodation_currency
                  )}
                </p>
              )}
            </div>

            <Separator />

            {/* Daily Costs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Daily Expenses</p>
                {getQualityBadge(breakdown.daily_cost_data_quality)}
              </div>
              
              <div className="space-y-2">
                {breakdown.daily_cost_breakdown?.food && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Food</span>
                    </div>
                    <span className="font-medium">
                      {formatRange(
                        breakdown.daily_cost_breakdown.food.min,
                        breakdown.daily_cost_breakdown.food.max,
                        breakdown.daily_cost_currency
                      )}
                    </span>
                  </div>
                )}

                {breakdown.daily_cost_breakdown?.transport && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Car className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Local Transport</span>
                    </div>
                    <span className="font-medium">
                      {formatRange(
                        breakdown.daily_cost_breakdown.transport.min,
                        breakdown.daily_cost_breakdown.transport.max,
                        breakdown.daily_cost_currency
                      )}
                    </span>
                  </div>
                )}

                {breakdown.daily_cost_breakdown?.activities && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Activities</span>
                    </div>
                    <span className="font-medium">
                      {formatRange(
                        breakdown.daily_cost_breakdown.activities.min,
                        breakdown.daily_cost_breakdown.activities.max,
                        breakdown.daily_cost_currency
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="font-medium">Total per day</span>
                  <span className="font-semibold">
                    {formatRange(breakdown.daily_cost_min, breakdown.daily_cost_max, breakdown.daily_cost_currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Data Quality Notice */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">About these estimates</p>
                <p>
                  Budget estimates are based on {breakdown.budget_level || 'moderate'} travel style. 
                  Actual costs may vary based on season, booking timing, and personal choices.
                  {breakdown.data_sources && breakdown.data_sources.length > 0 && (
                    <> Sources: {breakdown.data_sources.join(', ')}.</>
                  )}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
