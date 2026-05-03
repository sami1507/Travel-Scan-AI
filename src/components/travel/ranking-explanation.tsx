'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Award, AlertCircle, Info } from 'lucide-react'
import type { RankedDestination } from '@/lib/analysis/schemas'

interface RankingExplanationProps {
  topDestination: RankedDestination
  alternatives?: RankedDestination[]
  scoreBreakdown?: string
}

export function RankingExplanation({ topDestination, alternatives = [], scoreBreakdown }: RankingExplanationProps) {
  const getCategoryLabel = (key: string): string => {
    const labels: Record<string, string> = {
      budgetFit: 'Budget Fit',
      weatherFit: 'Weather',
      passportEase: 'Visa/Passport',
      nightlife: 'Nightlife',
      nature: 'Nature',
      transport: 'Transport',
      hotelValue: 'Hotel Value',
      safety: 'Safety',
    }
    return labels[key] || key
  }

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-blue-600'
    if (score >= 4) return 'text-yellow-600'
    return 'text-orange-600'
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Why {topDestination.destinationName} Ranked #1</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold">Overall Match Score</p>
            <Badge className="bg-primary text-primary-foreground">
              {topDestination.totalMatchScore.toFixed(1)}/100
            </Badge>
          </div>
          <Progress value={topDestination.totalMatchScore} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            Based on {Object.keys(topDestination.categoryScores).length} factors matched to your preferences
          </p>
        </div>

        <Separator />

        {/* Key Strengths */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Key Strengths
          </h3>
          <ul className="space-y-2">
            {topDestination.whyRecommended.slice(0, 5).map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-600 mt-0.5 font-bold">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Category Scores */}
        <div className="space-y-3">
          <h3 className="font-semibold">Score Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(topDestination.categoryScores)
              .sort(([, a], [, b]) => b - a)
              .map(([category, score]) => (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{getCategoryLabel(category)}</span>
                    <span className={`font-semibold ${getScoreColor(score)}`}>
                      {score.toFixed(1)}/10
                    </span>
                  </div>
                  <Progress value={score * 10} className="h-2" />
                </div>
              ))}
          </div>
        </div>

        {/* Scoring Methodology */}
        {scoreBreakdown && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                How Scores Are Calculated
              </h3>
              <p className="text-sm text-muted-foreground">{scoreBreakdown}</p>
            </div>
          </>
        )}

        {/* Comparison with Alternatives */}
        {alternatives.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold">Why Alternatives Ranked Lower</h3>
              <div className="space-y-3">
                {alternatives.slice(0, 2).map((alt, index) => (
                  <div key={alt.destinationId} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          #{index + 2} {alt.destinationName}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{alt.destinationType}</p>
                      </div>
                      <Badge variant="outline">
                        {alt.totalMatchScore.toFixed(1)}/100
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Score difference:</span>
                      <span className="font-medium text-orange-600">
                        -{(topDestination.totalMatchScore - alt.totalMatchScore).toFixed(1)} points
                      </span>
                    </div>

                    {/* Show weaker categories */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Weaker in:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(alt.categoryScores)
                          .filter(([cat, score]) => {
                            const topScore = topDestination.categoryScores[cat as keyof typeof topDestination.categoryScores]
                            return topScore - score > 1
                          })
                          .slice(0, 3)
                          .map(([cat]) => (
                            <Badge key={cat} variant="secondary" className="text-xs">
                              {getCategoryLabel(cat)}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Data Quality Notice */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">About these rankings</p>
            <p>
              Rankings are based on evidence-based scoring across multiple factors. 
              Scores reflect how well each destination matches your specific preferences and constraints.
              Data quality: <span className="font-medium">{topDestination.dataQuality}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
