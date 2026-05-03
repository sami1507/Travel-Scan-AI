'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Calendar, DollarSign, Shield, TrendingUp, ChevronRight, ThumbsUp, ThumbsDown, Bookmark, X } from 'lucide-react'
import type { RankedDestination } from '@/lib/analysis/schemas'
import { useFeedback } from '@/hooks/use-feedback'
import type { FeedbackInput } from '@/lib/types/feedback'

interface RecommendationCardProps {
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

export function RecommendationCard({ destination, rank, onViewDetails, queryContext }: RecommendationCardProps) {
  const { submitFeedback } = useFeedback()
  const [feedbackState, setFeedbackState] = useState<{
    liked: boolean
    disliked: boolean
    saved: boolean
    dismissed: boolean
  }>({ liked: false, disliked: false, saved: false, dismissed: false })

  const handleFeedback = async (type: 'thumbs-up' | 'thumbs-down' | 'save-trip' | 'dismiss-recommendation') => {
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

      // Update local state
      if (type === 'thumbs-up') {
        setFeedbackState({ ...feedbackState, liked: true, disliked: false })
      } else if (type === 'thumbs-down') {
        setFeedbackState({ ...feedbackState, disliked: true, liked: false })
      } else if (type === 'save-trip') {
        setFeedbackState({ ...feedbackState, saved: !feedbackState.saved })
      } else if (type === 'dismiss-recommendation') {
        setFeedbackState({ ...feedbackState, dismissed: true })
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  const handleViewDetails = async () => {
    // Track view details action
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
      // Silently fail, don't block viewing details
    }
    onViewDetails()
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match'
    if (score >= 60) return 'Good Match'
    if (score >= 40) return 'Fair Match'
    return 'Limited Match'
  }

  const getDataQualityColor = (quality: string) => {
    if (quality === 'knowledge-based') return 'bg-green-100 text-green-800'
    if (quality === 'estimated') return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-semibold">
                #{rank}
              </Badge>
              <Badge variant="outline" className="capitalize text-xs">
                {destination.destinationType}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {destination.destinationName}
            </h3>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(destination.totalMatchScore)}`}>
              {destination.totalMatchScore}
            </div>
            <div className="text-xs text-muted-foreground">/ 100</div>
            <div className="text-xs font-medium mt-1">
              {getScoreLabel(destination.totalMatchScore)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Best:</span>
            <span className="font-medium">
              {destination.bestMonths.map(m => new Date(2024, m - 1).toLocaleString('default', { month: 'short' })).join(', ')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Budget:</span>
            <span className="font-medium capitalize">{destination.estimatedBudgetLevel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Safety:</span>
            <span className="font-medium">{destination.safetyLevel}/10</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Confidence:</span>
            <span className="font-medium">{Math.round(destination.confidence * 100)}%</span>
          </div>
        </div>

        {/* Why Recommended */}
        {destination.whyRecommended.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Why Recommended</h4>
            <ul className="space-y-1">
              {destination.whyRecommended.slice(0, 3).map((reason, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feedback Actions */}
        {!feedbackState.dismissed && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant={feedbackState.liked ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFeedback('thumbs-up')}
              disabled={feedbackState.disliked}
              className="gap-1"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              variant={feedbackState.disliked ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFeedback('thumbs-down')}
              disabled={feedbackState.liked}
              className="gap-1"
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
            <Button
              variant={feedbackState.saved ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFeedback('save-trip')}
              className="gap-1"
            >
              <Bookmark className="h-4 w-4" />
              {feedbackState.saved && 'Saved'}
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('dismiss-recommendation')}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Data Quality & Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Badge variant="outline" className={getDataQualityColor(destination.dataQuality)}>
            {destination.dataQuality}
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleViewDetails} className="gap-1">
            View Details
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
