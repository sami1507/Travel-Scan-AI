'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { RankedDestination, RecommendedRoute } from '@/lib/analysis/schemas'

interface DestinationComparisonProps {
  destinationA: RankedDestination
  destinationB: RankedDestination
}

export function DestinationComparison({ destinationA, destinationB }: DestinationComparisonProps) {
  const scoreDiff = destinationA.totalMatchScore - destinationB.totalMatchScore
  const winner = scoreDiff > 0 ? 'A' : scoreDiff < 0 ? 'B' : 'tie'

  const categoryComparisons = [
    { key: 'budgetFit', label: 'Budget Fit' },
    { key: 'weatherFit', label: 'Weather' },
    { key: 'passportEase', label: 'Visa/Passport' },
    { key: 'nightlife', label: 'Nightlife' },
    { key: 'nature', label: 'Nature' },
    { key: 'transport', label: 'Transport' },
    { key: 'hotelValue', label: 'Hotel Value' },
    { key: 'safety', label: 'Safety' },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header Comparison */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{destinationA.destinationName}</CardTitle>
            <CardDescription>{destinationA.destinationType}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {destinationA.totalMatchScore}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Match Score</p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center">
          <div className="text-center">
            {winner === 'tie' ? (
              <>
                <Minus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Equal Match</p>
              </>
            ) : (
              <>
                {winner === 'A' ? (
                  <TrendingUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
                ) : (
                  <TrendingDown className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                )}
                <p className="text-sm font-medium">
                  {Math.abs(scoreDiff).toFixed(1)} point difference
                </p>
              </>
            )}
          </div>
        </div>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{destinationB.destinationName}</CardTitle>
            <CardDescription>{destinationB.destinationType}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {destinationB.totalMatchScore}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Match Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryComparisons.map(({ key, label }) => {
            const scoreA = destinationA.categoryScores[key]
            const scoreB = destinationB.categoryScores[key]
            const diff = scoreA - scoreB

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className={`text-xs ${
                    Math.abs(diff) < 1 ? 'text-muted-foreground' :
                    diff > 0 ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Progress value={scoreA * 10} className="h-2" />
                    <p className="text-xs text-muted-foreground">{scoreA.toFixed(1)}/10</p>
                  </div>
                  <div className="space-y-1">
                    <Progress value={scoreB * 10} className="h-2" />
                    <p className="text-xs text-muted-foreground">{scoreB.toFixed(1)}/10</p>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{destinationA.destinationName} Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {destinationA.whyRecommended.slice(0, 4).map((reason, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{destinationB.destinationName} Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {destinationB.whyRecommended.slice(0, 4).map((reason, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Best For */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Best For</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-sm mb-2">{destinationA.destinationName}</p>
              <div className="flex flex-wrap gap-2">
                {destinationA.whyRecommended.slice(0, 3).map((reason, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {reason.split(' ').slice(0, 3).join(' ')}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-sm mb-2">{destinationB.destinationName}</p>
              <div className="flex flex-wrap gap-2">
                {destinationB.whyRecommended.slice(0, 3).map((reason, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {reason.split(' ').slice(0, 3).join(' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface RouteComparisonProps {
  routeA: RecommendedRoute
  routeB: RecommendedRoute
}

export function RouteComparison({ routeA, routeB }: RouteComparisonProps) {
  const scoreDiff = routeA.routeScore.totalRouteQuality - routeB.routeScore.totalRouteQuality
  const winner = scoreDiff > 5 ? 'A' : scoreDiff < -5 ? 'B' : 'tie'

  const scoreComparisons = [
    { key: 'coherence', label: 'Route Coherence' },
    { key: 'transferSimplicity', label: 'Transfer Ease' },
    { key: 'transportConvenience', label: 'Transport Quality' },
    { key: 'budgetEfficiency', label: 'Budget Efficiency' },
    { key: 'seasonalCompatibility', label: 'Seasonal Fit' },
    { key: 'destinationSynergy', label: 'Destination Synergy' },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header Comparison */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{routeA.routeName}</CardTitle>
            <CardDescription>
              {routeA.orderedStops.length} stops • {routeA.totalDays} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {routeA.routeScore.totalRouteQuality.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Route Quality</p>
            <Badge className="mt-2" variant="secondary">
              {routeA.estimatedTripIntensity}
            </Badge>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center">
          <div className="text-center">
            {winner === 'tie' ? (
              <>
                <Minus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Similar Quality</p>
              </>
            ) : (
              <>
                {winner === 'A' ? (
                  <TrendingUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
                ) : (
                  <TrendingDown className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                )}
                <p className="text-sm font-medium">
                  {Math.abs(scoreDiff).toFixed(0)} point difference
                </p>
              </>
            )}
          </div>
        </div>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{routeB.routeName}</CardTitle>
            <CardDescription>
              {routeB.orderedStops.length} stops • {routeB.totalDays} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {routeB.routeScore.totalRouteQuality.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Route Quality</p>
            <Badge className="mt-2" variant="secondary">
              {routeB.estimatedTripIntensity}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scoreComparisons.map(({ key, label }) => {
            const scoreA = routeA.routeScore[key]
            const scoreB = routeB.routeScore[key]
            const diff = scoreA - scoreB

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className={`text-xs ${
                    Math.abs(diff) < 0.5 ? 'text-muted-foreground' :
                    diff > 0 ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Progress value={scoreA * 10} className="h-2" />
                    <p className="text-xs text-muted-foreground">{scoreA.toFixed(1)}/10</p>
                  </div>
                  <div className="space-y-1">
                    <Progress value={scoreB * 10} className="h-2" />
                    <p className="text-xs text-muted-foreground">{scoreB.toFixed(1)}/10</p>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Route Highlights */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Route A Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {routeA.highlights.map((highlight, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Route B Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {routeB.highlights.map((highlight, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Cost Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-sm mb-2">{routeA.routeName}</p>
              <p className="text-2xl font-bold">
                {routeA.estimatedCost.currency} {routeA.estimatedCost.min.toLocaleString()} - {routeA.estimatedCost.max.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm mb-2">{routeB.routeName}</p>
              <p className="text-2xl font-bold">
                {routeB.estimatedCost.currency} {routeB.estimatedCost.min.toLocaleString()} - {routeB.estimatedCost.max.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
