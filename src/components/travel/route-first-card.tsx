'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Eye, Bookmark, Bell, DollarSign, Gauge, Users, 
  Route, AlertTriangle, Calendar, TrendingUp
} from 'lucide-react'
import type { RankedDestination } from '@/lib/analysis/schemas'
import { logLearningFeedback } from '@/lib/learning/client-feedback'

interface RouteFirstCardProps {
  destination: RankedDestination
  rank: number
  onViewDetails: () => void
  onSaveRoute?: () => void
  onWatchRoute?: () => void
  onMakeCheaper?: () => void
  onReduceFatigue?: () => void
  onGroupPlanning?: () => void
  queryContext?: {
    query: string
    budget?: string
    travel_months?: number[]
    interests?: string[]
  }
  analysisMeta?: any
}

export function RouteFirstCard({
  destination,
  rank,
  onViewDetails,
  onSaveRoute,
  onWatchRoute,
  onMakeCheaper,
  onReduceFatigue,
  onGroupPlanning,
  queryContext,
  analysisMeta
}: RouteFirstCardProps) {
  const [saved, setSaved] = useState(false)
  const [watched, setWatched] = useState(false)

  const getScoreLabel = (score: number | undefined) => {
    const s = typeof score === 'number' ? score : 0
    if (s >= 85) return 'Excellent Match'
    if (s >= 75) return 'Strong Match'
    if (s >= 65) return 'Good Compromise'
    if (s >= 55) return 'Acceptable Option'
    return 'Consider Alternatives'
  }

  const getScoreColor = (score: number | undefined) => {
    const s = typeof score === 'number' ? score : 0
    if (s >= 85) return 'text-green-600'
    if (s >= 75) return 'text-blue-600'
    if (s >= 65) return 'text-yellow-600'
    return 'text-orange-600'
  }

  const getBestForText = () => {
    const interests = queryContext?.interests || []
    if (interests.length === 0) return 'general travel'
    return interests.slice(0, 3).join(' + ')
  }

  const getSeasonReality = () => {
    if (destination.seasonality?.honestConsultantNote) {
      return destination.seasonality.honestConsultantNote.substring(0, 100)
    }
    if (Array.isArray(destination.bestMonths) && destination.bestMonths.length > 0) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const months = destination.bestMonths.slice(0, 3).map(m => monthNames[m - 1] || 'Unknown').join(', ')
      return `Best in ${months}`
    }
    return 'Check seasonal conditions before booking'
  }

  const handleSaveRoute = async () => {
    setSaved(!saved)
    if (onSaveRoute) {
      onSaveRoute()
    }
    
    // Track feedback
    await logLearningFeedback({
      signalType: 'save-route',
      signalValue: {
        destinationId: destination.destinationId,
        destinationName: destination.destinationName,
        routeCities: destination.suggestedRoute,
        diversityLabel: destination.diversityLabel,
        rank,
        score: destination.totalMatchScore,
        query: queryContext?.query,
        budget: queryContext?.budget,
        travel_months: queryContext?.travel_months,
        analysisId: analysisMeta?.analysisId,
        consultantQualityScore: analysisMeta?.consultantQualityScore,
        openAIUsed: analysisMeta?.openAIUsed,
        fallbackUsed: analysisMeta?.fallbackUsed,
      },
    })
  }

  const handleWatchRoute = async () => {
    setWatched(!watched)
    if (onWatchRoute) {
      onWatchRoute()
    }
    
    // Track feedback
    await logLearningFeedback({
      signalType: 'watch-route',
      signalValue: {
        destinationId: destination.destinationId,
        destinationName: destination.destinationName,
        routeCities: destination.suggestedRoute,
        diversityLabel: destination.diversityLabel,
        rank,
        query: queryContext?.query,
        analysisId: analysisMeta?.analysisId,
      },
    })
  }

  const handleMakeCheaper = async () => {
    if (onMakeCheaper) {
      onMakeCheaper()
    }
    
    await logLearningFeedback({
      signalType: 'refine-budget',
      signalValue: {
        destinationId: destination.destinationId,
        action: 'make-cheaper',
        query: queryContext?.query,
        analysisId: analysisMeta?.analysisId,
      },
    })
  }

  const handleReduceFatigue = async () => {
    if (onReduceFatigue) {
      onReduceFatigue()
    }
    
    await logLearningFeedback({
      signalType: 'reduce-fatigue',
      signalValue: {
        destinationId: destination.destinationId,
        currentFatigue: destination.travelFatigueLevel,
        query: queryContext?.query,
        analysisId: analysisMeta?.analysisId,
      },
    })
  }

  const handleGroupPlanning = async () => {
    if (onGroupPlanning) {
      onGroupPlanning()
    }
    
    await logLearningFeedback({
      signalType: 'group-planning',
      signalValue: {
        destinationId: destination.destinationId,
        query: queryContext?.query,
        analysisId: analysisMeta?.analysisId,
      },
    })
  }

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardContent className="p-6 space-y-4">
        {/* Header: Diversity Label + Country + Route */}
        <div className="space-y-2">
          {destination.diversityLabel && (
            <Badge variant="secondary" className="text-xs font-medium">
              {destination.diversityLabel}
            </Badge>
          )}
          
          <div>
            <h3 className="text-xl font-bold">{destination.destinationName}</h3>
            {Array.isArray(destination.suggestedRoute) && destination.suggestedRoute.length > 1 && (
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Route className="h-4 w-4" />
                <span>{destination.suggestedRoute.join(' → ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-2xl font-bold ${getScoreColor(destination.totalMatchScore)}`}>
              {typeof destination.totalMatchScore === 'number' ? destination.totalMatchScore : 0}/100
            </div>
            <div className="text-xs text-muted-foreground">{getScoreLabel(destination.totalMatchScore)}</div>
          </div>
          {destination.travelFatigueLevel && (
            <Badge 
              variant="outline" 
              className={
                destination.travelFatigueLevel === 'Low' ? 'border-green-300 text-green-700' :
                destination.travelFatigueLevel === 'Medium' ? 'border-yellow-300 text-yellow-700' :
                'border-orange-300 text-orange-700'
              }
            >
              {destination.travelFatigueLevel} Fatigue
            </Badge>
          )}
        </div>

        {/* Best For */}
        <div className="text-sm">
          <span className="text-muted-foreground">Best for: </span>
          <span className="font-medium">{getBestForText()}</span>
        </div>

        {/* Why It Fits */}
        {Array.isArray(destination.whyRecommended) && destination.whyRecommended.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Why it fits</div>
            <ul className="space-y-1">
              {destination.whyRecommended.slice(0, 2).map((reason, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <TrendingUp className="h-3 w-3 text-primary mt-1 shrink-0" />
                  <span className="leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Watch Out */}
        {Array.isArray(destination.possibleDownsides) && destination.possibleDownsides.length > 0 && (
          <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 rounded">
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-orange-900">Watch out</div>
              <p className="text-xs text-orange-800 leading-relaxed mt-0.5">
                {destination.possibleDownsides[0]}
              </p>
            </div>
          </div>
        )}

        {/* Season Reality */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{getSeasonReality()}</span>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onViewDetails} variant="default" size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button 
              onClick={handleSaveRoute} 
              variant={saved ? "default" : "outline"} 
              size="sm" 
              className="w-full"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              {saved ? 'Saved' : 'Save Route'}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleWatchRoute} 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
            >
              <Bell className="h-3 w-3 mr-1" />
              {watched ? 'Watching' : 'Watch Route'}
            </Button>
            <Button 
              onClick={handleGroupPlanning} 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
            >
              <Users className="h-3 w-3 mr-1" />
              Group Plan
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleMakeCheaper} 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Make Cheaper
            </Button>
            <Button 
              onClick={handleReduceFatigue} 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
            >
              <Gauge className="h-3 w-3 mr-1" />
              Reduce Fatigue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
