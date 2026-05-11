'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MapPin, Calendar, DollarSign, AlertTriangle, Info, 
  ChevronRight, ThumbsUp, ThumbsDown, Bookmark, Home,
  Sparkles, TrendingUp, Route, Moon, Gauge, Train
} from 'lucide-react'
import type { RankedDestination } from '@/lib/analysis/schemas'
import { useFeedback } from '@/hooks/use-feedback'
import type { FeedbackInput } from '@/lib/types/feedback'

interface EnhancedRecommendationCardProps {
  destination: RankedDestination
  rank: number
  onViewDetails: () => void
  queryContext?: {
    query: string
    budget?: string
    travel_months?: number[]
    interests?: string[]
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function EnhancedRecommendationCard({ 
  destination, 
  rank, 
  onViewDetails, 
  queryContext 
}: EnhancedRecommendationCardProps) {
  const { submitFeedback } = useFeedback()
  const [feedbackState, setFeedbackState] = useState<{
    liked: boolean
    disliked: boolean
    saved: boolean
  }>({ liked: false, disliked: false, saved: false })

  const handleFeedback = async (type: 'thumbs-up' | 'thumbs-down' | 'save-trip') => {
    try {
      const feedbackData: FeedbackInput = {
        feedback_type: type,
        destination_id: destination.destinationId,
        destination_name: destination.destinationName,
        recommendation_rank: rank,
        total_score: destination.totalMatchScore,
        category_scores: destination.categoryScores as any,
        query_context: queryContext,
      }

      await submitFeedback(feedbackData)

      if (type === 'thumbs-up') {
        setFeedbackState({ ...feedbackState, liked: true, disliked: false })
      } else if (type === 'thumbs-down') {
        setFeedbackState({ ...feedbackState, disliked: true, liked: false })
      } else if (type === 'save-trip') {
        setFeedbackState({ ...feedbackState, saved: !feedbackState.saved })
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  const handleViewDetails = async () => {
    try {
      await submitFeedback({
        feedback_type: 'view-details',
        destination_id: destination.destinationId,
        destination_name: destination.destinationName,
        recommendation_rank: rank,
        total_score: destination.totalMatchScore,
        query_context: queryContext,
      })
    } catch (error) {
      // Silently fail
    }
    onViewDetails()
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { label: 'Top Pick', color: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' }
    if (rank === 2) return { label: 'Great Choice', color: 'bg-gradient-to-r from-blue-400 to-blue-600 text-white' }
    return { label: 'Good Option', color: 'bg-gradient-to-r from-green-400 to-green-600 text-white' }
  }

  const getBestMonth = () => {
    // Use destination's bestMonths if available
    if (destination.bestMonths && destination.bestMonths.length > 0) {
      return MONTH_NAMES[destination.bestMonths[0] - 1]
    }
    // Fallback to query context
    if (queryContext?.travel_months && queryContext.travel_months.length > 0) {
      return MONTH_NAMES[queryContext.travel_months[0] - 1]
    }
    return 'May'
  }

  const getMatchPercentage = () => {
    return Math.round(destination.totalMatchScore)
  }

  const rankBadge = getRankBadge(rank)
  const bestMonth = getBestMonth()
  const matchPercentage = getMatchPercentage()

  return (
    <Card className="border-0 shadow-travel hover:shadow-2xl transition-all duration-300 overflow-hidden group relative hover:-translate-y-1">
      {/* Rank Badge */}
      <div className="absolute top-5 right-5 z-10">
        <Badge className={`${rankBadge.color} px-4 py-1.5 font-semibold shadow-xl text-sm border-0`}>
          #{rank} · {rankBadge.label}
        </Badge>
      </div>

      <CardHeader className="pb-5 space-y-4 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        {/* Destination & Month */}
        <div className="pr-32">
          <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
            {destination.destinationName}
          </h3>
          <div className="flex items-center gap-2 mt-2.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Best in {bestMonth}</span>
          </div>
        </div>

        {/* Match Score */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-secondary rounded-full h-3 overflow-hidden shadow-inner">
            <div 
              className="h-full gradient-travel transition-all duration-500 shadow-sm"
              style={{ width: `${matchPercentage}%` }}
            />
          </div>
          <span className="text-sm font-bold text-primary tabular-nums">{matchPercentage}% Match</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Why This Fits */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Why This Fits You
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {destination.whyRecommended && destination.whyRecommended.length > 0 
              ? destination.whyRecommended[0] 
              : `Perfect match for your interests and budget. ${destination.destinationName} offers excellent value and aligns with your travel style.`}
          </p>
        </div>

        {/* Why This Month */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            Why {bestMonth}?
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {`${bestMonth} offers ideal weather conditions and fewer crowds. Prices are typically moderate during this period.`}
          </p>
        </div>

        {/* What You Can Do */}
        {destination.whyRecommended && Array.isArray(destination.whyRecommended) && destination.whyRecommended.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              What You Can Do
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {destination.whyRecommended.slice(1, 4).map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Trip Type Badge */}
        {destination.tripType && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium">
              {destination.tripType}
            </Badge>
          </div>
        )}

        {/* Suggested Route */}
        {destination.suggestedRoute && Array.isArray(destination.suggestedRoute) && destination.suggestedRoute.length > 0 && (
          <div className="space-y-2 bg-primary/5 rounded-lg p-3 border border-primary/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Route className="h-4 w-4 text-primary" />
              Suggested Route
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              {destination.suggestedRoute.map((city, idx) => (
                <span key={idx} className="flex items-center gap-2">
                  {city}
                  {idx < destination.suggestedRoute.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Nights */}
        {destination.recommendedNights && typeof destination.recommendedNights === 'object' && Object.keys(destination.recommendedNights).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Moon className="h-4 w-4 text-primary" />
              Suggested Nights
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(destination.recommendedNights).map(([city, nights]) => (
                <div key={city} className="flex items-center justify-between text-muted-foreground">
                  <span>{city}:</span>
                  <span className="font-semibold text-foreground">{nights} nights</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Route Realism & Travel Fatigue */}
        {(destination.routeRealismScore !== undefined || destination.travelFatigueLevel) && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {destination.routeRealismScore !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Gauge className="h-3 w-3" />
                  Route Realism
                </div>
                <div className="text-sm font-bold text-foreground">
                  {destination.routeRealismScore}/100
                </div>
              </div>
            )}
            {destination.travelFatigueLevel && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  Travel Fatigue
                </div>
                <div className="text-sm font-bold text-foreground">
                  {destination.travelFatigueLevel}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transport Logic */}
        {destination.transportLogic && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Train className="h-4 w-4 text-primary" />
              Transport
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {destination.transportLogic}
            </p>
          </div>
        )}

        {/* Consultant Notes */}
        {destination.realisticConsultantNotes && (
          <div className="space-y-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Info className="h-4 w-4 text-blue-600" />
              Travel Consultant Notes
            </div>
            <p className="text-sm text-blue-800 leading-relaxed">
              {destination.realisticConsultantNotes}
            </p>
          </div>
        )}

        {/* Route Warnings */}
        {destination.routeWarnings && Array.isArray(destination.routeWarnings) && destination.routeWarnings.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm text-orange-800">
              <div className="font-semibold mb-1">Route Considerations:</div>
              <ul className="space-y-1">
                {destination.routeWarnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Route Alternatives */}
        {destination.routeAlternatives && (
          <Alert className="border-purple-200 bg-purple-50">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-sm text-purple-800">
              <span className="font-semibold">Alternative Suggestion:</span> {destination.routeAlternatives}
            </AlertDescription>
          </Alert>
        )}

        {/* Budget & Accommodation */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {queryContext?.budget ? queryContext.budget.charAt(0).toUpperCase() + queryContext.budget.slice(1) : 'Moderate'} budget
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Hotel or Apartment</span>
          </div>
        </div>

        {/* Warnings */}
        {destination.possibleDownsides && Array.isArray(destination.possibleDownsides) && destination.possibleDownsides.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-800">
              <span className="font-semibold">Important:</span> {destination.possibleDownsides[0]}
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Disclaimer */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800">
            Prices are estimates and may change depending on booking time, availability, and season.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button 
            onClick={handleViewDetails}
            className="flex-1 shadow-md hover:shadow-lg transition-shadow"
          >
            View Full Details
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleFeedback('thumbs-up')}
            className={feedbackState.liked ? 'bg-green-50 border-green-300' : ''}
          >
            <ThumbsUp className={`h-4 w-4 ${feedbackState.liked ? 'text-green-600' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleFeedback('thumbs-down')}
            className={feedbackState.disliked ? 'bg-red-50 border-red-300' : ''}
          >
            <ThumbsDown className={`h-4 w-4 ${feedbackState.disliked ? 'text-red-600' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleFeedback('save-trip')}
            className={feedbackState.saved ? 'bg-blue-50 border-blue-300' : ''}
          >
            <Bookmark className={`h-4 w-4 ${feedbackState.saved ? 'text-blue-600 fill-blue-600' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
