'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, MapPin, Calendar, DollarSign, Shield, Plane, AlertTriangle, Info } from 'lucide-react'
import type { RankedDestination } from '@/lib/analysis/schemas'
import { ScoreBreakdown } from './score-breakdown'
import { ExternalActions } from './external-actions'

interface RecommendationDetailProps {
  destination: RankedDestination
  onClose: () => void
  travelMonths?: number[]
}

export function RecommendationDetail({ destination, onClose }: RecommendationDetailProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              {destination.destinationName}
            </h2>
            <p className="text-sm text-muted-foreground capitalize">
              {destination.destinationType} · Match Score: {destination.totalMatchScore}/100
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Best Months</div>
                <div className="font-medium text-sm">
                  {destination.bestMonths.map(m => new Date(2024, m - 1).toLocaleString('default', { month: 'short' })).join(', ')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Budget Level</div>
                <div className="font-medium text-sm capitalize">{destination.estimatedBudgetLevel}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Plane className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Passport</div>
                <div className="font-medium text-sm capitalize">{destination.passportEase.replace('-', ' ')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Safety</div>
                <div className="font-medium text-sm">{destination.safetyLevel}/10</div>
              </div>
            </div>
          </div>

          {/* Why Recommended */}
          {destination.whyRecommended.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Why This Destination
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {destination.whyRecommended.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Possible Downsides */}
          {destination.possibleDownsides.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Considerations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {destination.possibleDownsides.map((downside, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-yellow-600 mt-0.5">•</span>
                      <span>{downside}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Score Breakdown */}
          <ScoreBreakdown scores={destination.categoryScores} />

          {/* Data Quality & Confidence */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Data Quality & Confidence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data Quality:</span>
                <Badge variant="outline" className="capitalize">{destination.dataQuality}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confidence Level:</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${destination.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{Math.round(destination.confidence * 100)}%</span>
                </div>
              </div>
              {destination.sourceLabels.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Data Sources:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {destination.sourceLabels.map((source, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* External Actions */}
          <ExternalActions destination={destination} />
        </div>
      </div>
    </div>
  )
}
