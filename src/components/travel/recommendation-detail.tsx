'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, MapPin, Calendar, DollarSign, Shield, Plane, AlertTriangle, Info, Star } from 'lucide-react'
import { BeforeYouBookChecklist } from './before-you-book-checklist'
import type { RankedDestination } from '@/lib/analysis/schemas'
import { ScoreBreakdown } from './score-breakdown'
import { ExternalActions } from './external-actions'
import { TravelStrategyTipsDisplay } from './travel-strategy-tips'
import { ItineraryMapDisplay } from './itinerary-map-display'
import { SafeItineraryMap } from './safe-itinerary-map'
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary'
import { logLearningFeedback } from '@/lib/learning/client-feedback'
import { formatScore } from '@/lib/utils/format-score'

interface RecommendationDetailProps {
  destination: RankedDestination
  onClose: () => void
  travelMonths?: number[]
}

export function RecommendationDetail({ destination, onClose }: RecommendationDetailProps) {
  const handleMapOpened = () => {
    logLearningFeedback({
      signalType: 'itinerary_map_opened',
      signalValue: {
        recommendationTitle: destination.destinationName,
        tripType: destination.tripType,
        suggestedRoute: destination.suggestedRoute,
        routeTitle: destination.itineraryMapPlan?.routeTitle,
        routeRealismScore: destination.routeRealismScore,
        travelFatigueLevel: destination.travelFatigueLevel,
        timestamp: new Date().toISOString(),
      },
    })
  }

  const handleStopSelected = (stopId: string, stopName: string, day: number) => {
    logLearningFeedback({
      signalType: 'itinerary_stop_selected',
      signalValue: {
        recommendationTitle: destination.destinationName,
        stopId,
        stopName,
        day,
        tripType: destination.tripType,
        routeTitle: destination.itineraryMapPlan?.routeTitle,
        timestamp: new Date().toISOString(),
      },
    })
  }

  const handleDayPlanOpened = (day: number) => {
    logLearningFeedback({
      signalType: 'itinerary_day_plan_opened',
      signalValue: {
        recommendationTitle: destination.destinationName,
        day,
        tripType: destination.tripType,
        routeTitle: destination.itineraryMapPlan?.routeTitle,
        timestamp: new Date().toISOString(),
      },
    })
  }

  const handleTipInteraction = (tipType: string, action: string) => {
    const signalTypeMap: Record<string, string> = {
      'opened': 'travel_strategy_tip_opened',
      'expanded': 'travel_strategy_tip_opened',
      'selected': 'travel_strategy_tip_selected',
      'email_copied': 'negotiation_email_copied',
      'extra_fees_viewed': 'extra_fee_warning_viewed',
      'alternative_airport_selected': 'alternative_airport_selected',
    }

    // Skip collapsed events
    if (action === 'collapsed') return

    const signalType = signalTypeMap[action] || 'travel_strategy_tip_opened'

    logLearningFeedback({
      signalType,
      signalValue: {
        recommendationTitle: destination.destinationName,
        tipType,
        action,
        tripType: destination.tripType,
        routeRealismScore: destination.routeRealismScore,
        travelFatigueLevel: destination.travelFatigueLevel,
        timestamp: new Date().toISOString(),
      },
    })
  }

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
              {destination.destinationType} · Match Score: {formatScore(destination.totalMatchScore)}/100
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
                  {destination.bestMonths && Array.isArray(destination.bestMonths) && destination.bestMonths.length > 0
                    ? destination.bestMonths.map(m => new Date(2024, m - 1).toLocaleString('default', { month: 'short' })).join(', ')
                    : 'Year-round'}
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
          {destination.whyRecommended && Array.isArray(destination.whyRecommended) && destination.whyRecommended.length > 0 && (
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
          {destination.possibleDownsides && Array.isArray(destination.possibleDownsides) && destination.possibleDownsides.length > 0 && (
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
              {destination.sourceLabels && Array.isArray(destination.sourceLabels) && destination.sourceLabels.length > 0 && (
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

          {/* Verified Places from Google Places */}
          {((destination as any).livePlacesToVisit?.length > 0 || 
            (destination as any).liveFoodIdeas?.length > 0 || 
            (destination as any).liveNatureIdeas?.length > 0 || 
            (destination as any).liveCulturalIdeas?.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Verified Places from Google Places
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(destination as any).livePlacesToVisit?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Tourist Attractions</h4>
                    <div className="space-y-2">
                      {(destination as any).livePlacesToVisit.slice(0, 4).map((place: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium">{place.name}</div>
                            {place.address && (
                              <div className="text-xs text-muted-foreground">{place.address}</div>
                            )}
                            {place.rating && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{place.rating.toFixed(1)}</span>
                                {place.userRatingCount && (
                                  <span>({place.userRatingCount.toLocaleString()} reviews)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(destination as any).liveFoodIdeas?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Restaurants</h4>
                    <div className="space-y-2">
                      {(destination as any).liveFoodIdeas.slice(0, 4).map((place: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium">{place.name}</div>
                            {place.address && (
                              <div className="text-xs text-muted-foreground">{place.address}</div>
                            )}
                            {place.rating && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{place.rating.toFixed(1)}</span>
                                {place.userRatingCount && (
                                  <span>({place.userRatingCount.toLocaleString()} reviews)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(destination as any).liveNatureIdeas?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Nature & Parks</h4>
                    <div className="space-y-2">
                      {(destination as any).liveNatureIdeas.slice(0, 4).map((place: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium">{place.name}</div>
                            {place.address && (
                              <div className="text-xs text-muted-foreground">{place.address}</div>
                            )}
                            {place.rating && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{place.rating.toFixed(1)}</span>
                                {place.userRatingCount && (
                                  <span>({place.userRatingCount.toLocaleString()} reviews)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(destination as any).liveCulturalIdeas?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Museums & Culture</h4>
                    <div className="space-y-2">
                      {(destination as any).liveCulturalIdeas.slice(0, 4).map((place: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium">{place.name}</div>
                            {place.address && (
                              <div className="text-xs text-muted-foreground">{place.address}</div>
                            )}
                            {place.rating && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{place.rating.toFixed(1)}</span>
                                {place.userRatingCount && (
                                  <span>({place.userRatingCount.toLocaleString()} reviews)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Live data from Google Places API
                </div>
              </CardContent>
            </Card>
          )}

          {/* Before You Book Checklist */}
          <BeforeYouBookChecklist destination={destination} />

          {/* Itinerary Map */}
          <SectionErrorBoundary
            sectionName="Interactive Map"
            fallbackMessage="Interactive map is unavailable right now. You can still use the route plan and travel tips below."
          >
            {destination.itineraryMapPlan ? (
              <ItineraryMapDisplay 
                plan={destination.itineraryMapPlan}
                onMapOpened={handleMapOpened}
                onStopSelected={handleStopSelected}
                onDayPlanOpened={handleDayPlanOpened}
              />
            ) : (
              <SafeItineraryMap
                route={destination.suggestedRoute}
                itineraryMapPlan={destination.itineraryMapPlan}
                destinationName={destination.destinationName}
              />
            )}
          </SectionErrorBoundary>

          {/* Travel Strategy Tips */}
          <TravelStrategyTipsDisplay 
            tips={destination.travelStrategyTips}
            onTipInteraction={handleTipInteraction}
          />

          {/* External Actions */}
          <ExternalActions destination={destination} />
        </div>
      </div>
    </div>
  )
}
