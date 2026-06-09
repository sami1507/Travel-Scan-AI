'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Eye, Bookmark, Bell, DollarSign, Gauge, Users, 
  Route, AlertTriangle, Calendar, TrendingUp
} from 'lucide-react'
import type { RankedDestination } from '@/lib/analysis/schemas'
import { logLearningFeedback } from '@/lib/learning/client-feedback'
import { formatScore } from '@/lib/utils/format-score'

function useCountUp(target: number, duration: number, delay: number) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0
      const step = target / (duration / 16)
      const interval = setInterval(() => {
        start += step
        if (start >= target) {
          setCount(target)
          clearInterval(interval)
        } else {
          setCount(Math.floor(start))
        }
      }, 16)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timer)
  }, [target, duration, delay])
  return count
}

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
  const [whyOpen, setWhyOpen] = useState(false)

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

  const getScoreBarStyle = (s: number) => {
    if (s >= 80) return { background: 'hsl(152,45%,38%)' }
    if (s >= 65) return { background: 'hsl(199,89%,48%)' }
    if (s >= 50) return { background: 'hsl(43,74%,66%)' }
    return { background: 'hsl(22,100%,62%)' }
  }

  const getRankStripe = (r: number) => {
    if (r === 1) return 'bg-[hsl(22,100%,62%)]'
    if (r === 2) return 'bg-[hsl(199,89%,48%)]'
    return 'bg-[hsl(43,74%,66%)]'
  }

  const getRankGlow = (r: number) => {
    if (r === 1) return 'hover:shadow-[0_8px_30px_hsl(22,100%,62%,0.25)]'
    if (r === 2) return 'hover:shadow-[0_8px_30px_hsl(199,89%,48%,0.25)]'
    return 'hover:shadow-[0_8px_30px_hsl(43,74%,66%,0.25)]'
  }

  const getRankBorder = (r: number) => {
    if (r === 1) return 'border-[hsl(22,100%,62%)]'
    if (r === 2) return 'border-[hsl(199,89%,48%)]'
    return 'border-[hsl(43,74%,66%)]'
  }

  const getRankGlowAnimation = (r: number) => {
    const c = r === 1 ? 'rgba(255,133,51' : r === 2 ? 'rgba(13,171,215' : 'rgba(223,183,92'
    return {
      boxShadow: [`0 0 0 0 ${c},0)`, `0 0 14px 5px ${c},0.5)`, `0 0 0 0 ${c},0)`],
    }
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

  const score = typeof destination.totalMatchScore === 'number' ? destination.totalMatchScore : 0
  const animatedScore = useCountUp(score, 1000, 600)

  return (
    <div
      className={`
        relative flex rounded-2xl border-2 overflow-hidden bg-card
        transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
        ${getRankGlow(rank)} ${getRankBorder(rank)}
      `}
    >
      {/* Left rank stripe */}
      <div className={`w-1.5 shrink-0 ${getRankStripe(rank)}`} />

      <div className="flex-1 flex flex-col">
        {/* Top section — destination header */}
        <div
          className="relative p-5 pb-4"
          style={{
            background: `linear-gradient(135deg, hsl(${
              rank === 1 ? '22 100% 62%' : rank === 2 ? '199 89% 48%' : '43 74% 66%'
            } / 0.08) 0%, transparent 60%)`,
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1">
              {destination.diversityLabel && (
                <Badge variant="secondary" className="text-xs font-medium mb-2">
                  {destination.diversityLabel}
                </Badge>
              )}
              <h3 className="text-2xl font-bold leading-tight">{destination.destinationName}</h3>
              {Array.isArray(destination.suggestedRoute) && destination.suggestedRoute.length > 1 && (
                <div className="flex items-center flex-wrap gap-1 mt-2">
                  {destination.suggestedRoute.map((city, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">{city}</span>
                      {idx < destination.suggestedRoute!.length - 1 && (
                        <span className="text-xs text-muted-foreground">→</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getRankStripe(rank)}`}
                animate={getRankGlowAnimation(rank)}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {rank}
              </motion.div>
              <div className="text-2xl select-none">✈️</div>
            </div>
          </div>
        </div>

        {/* Boarding pass tear line */}
        <div className="relative flex items-center px-4 py-1">
          <div className="absolute -left-2 w-4 h-4 rounded-full bg-background border-2 border-border" />
          <div className="flex-1 border-t-2 border-dashed border-border/60" />
          <div className="absolute -right-2 w-4 h-4 rounded-full bg-background border-2 border-border" />
        </div>

        {/* Bottom section — score, details, actions */}
        <div className="p-5 pt-3 space-y-4 flex-1 flex flex-col">
          {/* Score with animated bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-2xl font-bold tabular-nums ${getScoreColor(score)}`}>
                  {animatedScore}/100
                </span>
                <span className="ml-2 text-xs text-muted-foreground">{getScoreLabel(score)}</span>
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
            <div className="w-full h-[3px] rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={getScoreBarStyle(score)}
                initial={{ width: '0%' }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
              />
            </div>
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
            <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
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
          <div className="space-y-2 pt-2 border-t mt-auto">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={onViewDetails} variant="default" size="sm" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              <Button
                onClick={handleSaveRoute}
                variant={saved ? 'default' : 'outline'}
                size="sm"
                className="w-full"
              >
                <Bookmark className="h-4 w-4 mr-2" />
                {saved ? 'Saved' : 'Save Route'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleWatchRoute} variant="outline" size="sm" className="w-full text-xs">
                <Bell className="h-3 w-3 mr-1" />
                {watched ? 'Watching' : 'Watch Route'}
              </Button>
              <Button onClick={handleGroupPlanning} variant="outline" size="sm" className="w-full text-xs">
                <Users className="h-3 w-3 mr-1" />
                Group Plan
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleMakeCheaper} variant="ghost" size="sm" className="w-full text-xs">
                <DollarSign className="h-3 w-3 mr-1" />
                Make Cheaper
              </Button>
              <Button onClick={handleReduceFatigue} variant="ghost" size="sm" className="w-full text-xs">
                <Gauge className="h-3 w-3 mr-1" />
                Reduce Fatigue
              </Button>
            </div>
            <button
              onClick={() => setWhyOpen(v => !v)}
              className="w-full text-xs text-primary/70 hover:text-primary font-medium py-1 hover:underline transition-colors flex items-center justify-center gap-1"
            >
              Why this? {whyOpen ? '↑' : '→'}
            </button>
            <AnimatePresence>
              {whyOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 space-y-2 border-t border-dashed border-border/60">
                    {Array.isArray(destination.whyRecommended) && destination.whyRecommended.slice(0, 3).map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-green-600 font-bold shrink-0">✓</span>
                        <span className="leading-relaxed">{r}</span>
                      </div>
                    ))}
                    {(() => {
                      const warning = ((destination as any).routeWarnings?.[0]) || (destination.possibleDownsides?.[0])
                      return warning ? (
                        <div className="flex items-start gap-2 text-xs text-orange-700">
                          <span className="shrink-0">⚠</span>
                          <span className="leading-relaxed">{warning}</span>
                        </div>
                      ) : null
                    })()}
                    {(destination as any).transportLogic && (
                      <p className="text-xs text-muted-foreground italic">{(destination as any).transportLogic}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
