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

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Strong Match'
    if (score >= 70) return 'Good Compromise'
    if (score >= 60) return 'Acceptable Fit'
    return 'Moderate Fit'
  }

  const getDiversityLabel = () => {
    return destination.diversityLabel || (rank === 1 ? 'Best Overall' : rank === 2 ? 'Best Value' : 'Unique Discovery')
  }

  const normalizeText = (text: string): string => {
    return text
      .replace(/\s{2,}/g, ' ')
      .replace(/(\w)\s(\w)(?=\s)/g, '$1$2')
      .trim()
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

  const diversityLabel = getDiversityLabel()
  const scoreLabel = getScoreLabel(destination.totalMatchScore)
  const bestMonth = getBestMonth()
  const matchPercentage = getMatchPercentage()
  const routeDisplay = destination.suggestedRoute && destination.suggestedRoute.length > 1
    ? destination.suggestedRoute.join(' → ')
    : null

  return (
    <Card className="border-0 shadow-travel hover:shadow-2xl transition-all duration-300 overflow-hidden group relative hover:-translate-y-1">
      {/* Diversity Label Badge */}
      <div className="absolute top-5 right-5 z-10">
        <Badge className="bg-gradient-to-r from-primary to-accent text-white px-4 py-1.5 font-semibold shadow-xl text-sm border-0">
          {diversityLabel}
        </Badge>
      </div>

      <CardHeader className="pb-4 space-y-3 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        {/* Destination & Route */}
        <div className="pr-32">
          <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
            {destination.destinationName}
          </h3>
          {routeDisplay && (
            <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
              <Route className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">{routeDisplay}</span>
            </div>
          )}
        </div>

        {/* Match Score with Label */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">{matchPercentage}/100</span>
            <span className="text-sm font-medium text-muted-foreground">{scoreLabel}</span>
          </div>
          <div className="bg-secondary rounded-full h-2 overflow-hidden shadow-inner">
            <div 
              className="h-full gradient-travel transition-all duration-500 shadow-sm"
              style={{ width: `${matchPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Destination Summary */}
        {destination.destinationSummary && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {normalizeText(destination.destinationSummary)}
          </p>
        )}

        {/* Why It Fits - Max 2 bullets */}
        {destination.whyRecommended && destination.whyRecommended.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Why it fits
            </div>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              {destination.whyRecommended.slice(0, 2).map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span className="leading-relaxed">{normalizeText(reason)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Watch Out */}
        {destination.possibleDownsides && destination.possibleDownsides.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Watch out
            </div>
            <p className="text-sm text-orange-800 leading-relaxed">
              {normalizeText(destination.possibleDownsides[0])}
            </p>
          </div>
        )}

        {/* Season Note */}
        {destination.seasonality && destination.seasonality.peakSeason && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              Season note
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {normalizeText(destination.seasonality.peakSeason)}
            </p>
          </div>
        )}

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
