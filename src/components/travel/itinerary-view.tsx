'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MapPin, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import type { RecommendedRoute } from '@/lib/analysis/schemas'

interface ItineraryViewProps {
  route: RecommendedRoute
}

export function ItineraryView({ route }: ItineraryViewProps) {
  const getIntensityColor = (intensity: string) => {
    const colors: Record<string, string> = {
      'light': 'bg-green-100 text-green-800 border-green-300',
      'balanced': 'bg-blue-100 text-blue-800 border-blue-300',
      'moderate': 'bg-blue-100 text-blue-800 border-blue-300',
      'intensive': 'bg-orange-100 text-orange-800 border-orange-300',
      'very-intensive': 'bg-red-100 text-red-800 border-red-300',
    }
    return colors[intensity.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getTripIntensityDescription = (intensity: string) => {
    const descriptions: Record<string, string> = {
      'light': 'Relaxed pace with plenty of downtime',
      'balanced': 'Good mix of activities and rest',
      'moderate': 'Steady pace with regular activities',
      'intensive': 'Fast-paced with many activities',
      'very-intensive': 'Very busy schedule, minimal downtime',
    }
    return descriptions[intensity.toLowerCase()] || 'Moderate pacing'
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{route.routeName}</CardTitle>
            <CardDescription className="mt-1">
              {route.orderedStops.length} stops • {route.totalDays} days
            </CardDescription>
          </div>
          <div className="text-right">
            <Badge className={`${getIntensityColor(route.estimatedTripIntensity)} border`}>
              {route.estimatedTripIntensity}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {getTripIntensityDescription(route.estimatedTripIntensity)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Route Overview */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-sm">Route Overview</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Duration</p>
              <p className="font-medium">{route.totalDays} days</p>
            </div>
            <div>
              <p className="text-muted-foreground">Route Quality</p>
              <p className="font-medium">{route.routeScore.totalRouteQuality.toFixed(0)}/100</p>
            </div>
            <div>
              <p className="text-muted-foreground">Estimated Cost</p>
              <p className="font-medium">
                {route.estimatedCost.currency} {route.estimatedCost.min.toLocaleString()} - {route.estimatedCost.max.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Trip Intensity</p>
              <p className="font-medium capitalize">{route.estimatedTripIntensity}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Ordered Stops */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Itinerary
          </h3>
          
          <div className="space-y-4">
            {route.orderedStops.map((stop, index) => (
              <div key={index} className="relative">
                {/* Connection Line */}
                {index < route.orderedStops.length - 1 && (
                  <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-border" />
                )}
                
                <div className="flex gap-4">
                  {/* Stop Number */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Stop Details */}
                  <div className="flex-1 pb-4">
                    <div className="bg-card border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{stop.destinationName}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{stop.destinationType}</p>
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {stop.daysRecommended} {stop.daysRecommended === 1 ? 'day' : 'days'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Route Highlights */}
        {route.highlights && route.highlights.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Route Highlights
            </h3>
            <ul className="space-y-2">
              {route.highlights.map((highlight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {route.routeWarnings && Array.isArray(route.routeWarnings) && route.routeWarnings.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                Important Considerations
              </h3>
              <ul className="space-y-2">
                {route.routeWarnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-orange-600">
                    <span className="mt-0.5">⚠</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Route Score Breakdown */}
        <Separator />
        <div className="space-y-3">
          <h3 className="font-semibold">Route Quality Breakdown</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coherence</span>
              <span className="font-medium">{route.routeScore.coherence.toFixed(1)}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transfer Ease</span>
              <span className="font-medium">{route.routeScore.transferSimplicity.toFixed(1)}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transport</span>
              <span className="font-medium">{route.routeScore.transportConvenience.toFixed(1)}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget Efficiency</span>
              <span className="font-medium">{route.routeScore.budgetEfficiency.toFixed(1)}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seasonal Fit</span>
              <span className="font-medium">{route.routeScore.seasonalCompatibility.toFixed(1)}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Synergy</span>
              <span className="font-medium">{route.routeScore.destinationSynergy.toFixed(1)}/10</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
