// Recommendation performance insights component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { RecommendationPerformance } from '@/lib/types/analytics'

interface RecommendationInsightsProps {
  data: RecommendationPerformance
}

export function RecommendationInsights({ data }: RecommendationInsightsProps) {
  const formatScore = (score: number) => score.toFixed(1)
  const formatPercent = (rate: number) => `${(rate * 100).toFixed(1)}%`

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Score Patterns</CardTitle>
          <CardDescription>Average scores by feedback type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Saved Destinations</span>
              <span className="text-sm text-muted-foreground">{formatScore(data.avgScoreForSaved)}/100</span>
            </div>
            <Progress value={data.avgScoreForSaved} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Thumbs Up</span>
              <span className="text-sm text-muted-foreground">{formatScore(data.avgScoreForThumbsUp)}/100</span>
            </div>
            <Progress value={data.avgScoreForThumbsUp} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Thumbs Down</span>
              <span className="text-sm text-muted-foreground">{formatScore(data.avgScoreForThumbsDown)}/100</span>
            </div>
            <Progress value={data.avgScoreForThumbsDown} className="h-2 bg-red-100" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Dismissed</span>
              <span className="text-sm text-muted-foreground">{formatScore(data.avgScoreForDismissed)}/100</span>
            </div>
            <Progress value={data.avgScoreForDismissed} className="h-2 bg-red-100" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selection Patterns</CardTitle>
          <CardDescription>User behavior insights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Top Rank Selection Rate</span>
              <span className="text-2xl font-bold">{formatPercent(data.topRankSelectionRate)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Users select the #1 recommendation {formatPercent(data.topRankSelectionRate)} of the time
            </p>
            <Progress value={data.topRankSelectionRate * 100} className="h-2" />
          </div>

          {data.personalizedVsGenericPerformance && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Personalization Impact</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Personalized Avg Score</span>
                    <span className="font-medium">{formatScore(data.personalizedVsGenericPerformance.personalizedAvgScore)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Generic Avg Score</span>
                    <span className="font-medium">{formatScore(data.personalizedVsGenericPerformance.genericAvgScore)}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Personalized Save Rate</span>
                    <span className="font-medium">{formatPercent(data.personalizedVsGenericPerformance.personalizedSaveRate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Generic Save Rate</span>
                    <span className="font-medium">{formatPercent(data.personalizedVsGenericPerformance.genericSaveRate)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
