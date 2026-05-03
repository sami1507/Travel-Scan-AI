'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Info, TrendingUp, MapPin, Bookmark, GitCompare, Share2, Search } from 'lucide-react'
import { AnalysisForm } from '@/components/travel/analysis-form'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { RecommendationCard } from '@/components/travel/recommendation-card'
import { RecommendationDetail } from '@/components/travel/recommendation-detail'
import { PersonalizationIndicator } from '@/components/travel/personalization-indicator'
import { SaveAnalysisDialog } from '@/components/travel/save-analysis-dialog'
import { ShareExportDialog } from '@/components/travel/share-export-dialog'
import { ItineraryView } from '@/components/travel/itinerary-view'
import { RouteMapView } from '@/components/travel/route-map-view'
import { RankingExplanation } from '@/components/travel/ranking-explanation'
import type { TravelAnalysisResponse, RankedDestination } from '@/lib/analysis/schemas'

export default function AnalysisPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<TravelAnalysisResponse | null>(null)
  const [selectedDestination, setSelectedDestination] = useState<RankedDestination | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelections, setCompareSelections] = useState<RankedDestination[]>([])
  const [queryContext, setQueryContext] = useState<{
    query: string
    budget?: string
    travel_months?: number[]
    interests?: string[]
  } | null>(null)

  const handleAnalyze = async (data: {
    query: string
    budget: string
    travelMonths: number[]
    interests: string[]
  }) => {
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch('/api/travel/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const result = await response.json()
      setAnalysis(result.analysis)
      setQueryContext({
        query: data.query,
        budget: data.budget,
        travel_months: data.travelMonths,
        interests: data.interests,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-blue-600'
    return 'text-yellow-600'
  }

  const toggleCompareSelection = (destination: RankedDestination) => {
    setCompareSelections(prev => {
      const exists = prev.find(d => d.destinationId === destination.destinationId)
      if (exists) {
        return prev.filter(d => d.destinationId !== destination.destinationId)
      }
      if (prev.length >= 2) {
        return [prev[1], destination]
      }
      return [...prev, destination]
    })
  }

  const handleSaveDestination = async (destination: RankedDestination) => {
    try {
      await fetch('/api/saved/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination }),
      })
    } catch (err) {
      console.error('Failed to save destination:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Travel Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Evidence-based destination recommendations powered by AI
        </p>
      </div>

      {/* Analysis Form */}
      <AnalysisForm onSubmit={handleAnalyze} loading={loading} />

      {/* Error State */}
      {error && (
        <ErrorState
          title="Analysis Failed"
          message={error}
          retry={() => {
            setError(null)
            if (queryContext) {
              handleAnalyze({
                query: queryContext.query,
                budget: queryContext.budget || 'moderate',
                travelMonths: queryContext.travel_months || [],
                interests: queryContext.interests || [],
              })
            }
          }}
        />
      )}

      {/* Empty State */}
      {!loading && !error && !analysis && (
        <EmptyState
          icon={Search}
          title="Ready to explore?"
          description="Enter your travel preferences above to get AI-powered destination recommendations with intelligent route planning."
        />
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex items-center gap-2">
            <Button onClick={() => setSaveDialogOpen(true)}>
              <Bookmark className="h-4 w-4 mr-2" />
              Save Analysis
            </Button>
            <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              onClick={() => {
                setCompareMode(!compareMode)
                setCompareSelections([])
              }}
              variant={compareMode ? 'default' : 'outline'}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              {compareMode ? 'Exit Compare' : 'Compare Destinations'}
            </Button>
            {compareMode && compareSelections.length === 2 && (
              <Button asChild>
                <a href={`/dashboard/compare?a=${compareSelections[0].destinationId}&b=${compareSelections[1].destinationId}`}>
                  View Comparison
                </a>
              </Button>
            )}
          </div>

          {/* Personalization Indicator */}
          <PersonalizationIndicator personalization={analysis.personalization} />

          {/* Summary Card */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">Analysis Summary</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {analysis.querySummary}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getConfidenceColor(analysis.confidence)}`}>
                    {Math.round(analysis.confidence * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Confidence</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Top Recommendations */}
              {analysis.topRecommendations && analysis.topRecommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Top Recommendations
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topRecommendations.map((rec, idx) => (
                      <Badge key={idx} variant="default" className="text-sm px-3 py-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {rec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Reasons */}
              {analysis.reasons.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Key Insights</h4>
                  <ul className="space-y-1">
                    {analysis.reasons.slice(0, 3).map((reason, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warnings & Assumptions */}
          {(analysis.warnings.length > 0 || analysis.assumptions.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {analysis.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <h4 className="font-semibold mb-2">Important Warnings</h4>
                    <ul className="space-y-1 text-sm">
                      {analysis.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              {analysis.assumptions.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <h4 className="font-semibold mb-2">Assumptions</h4>
                    <ul className="space-y-1 text-sm">
                      {analysis.assumptions.map((assumption, i) => (
                        <li key={i}>• {assumption}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Phase 3: Ranking Explanation */}
          {analysis.rankedDestinations.length > 0 && (
            <RankingExplanation
              topDestination={analysis.rankedDestinations[0]}
              alternatives={analysis.rankedDestinations.slice(1, 3)}
              scoreBreakdown={analysis.scoreBreakdown}
            />
          )}

          {/* Phase 3: Route Visualization & Itinerary */}
          {analysis.recommendedRoutes && analysis.recommendedRoutes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Recommended Itinerary</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <RouteMapView route={analysis.recommendedRoutes[0]} />
                <ItineraryView route={analysis.recommendedRoutes[0]} />
              </div>
            </div>
          )}

          {/* Ranked Destinations */}
          <div>
            <h2 className="text-2xl font-bold mb-4">
              All Destinations ({analysis.rankedDestinations.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {analysis.rankedDestinations.map((destination, index) => (
                <RecommendationCard
                  key={destination.destinationId}
                  destination={destination}
                  rank={index + 1}
                  onViewDetails={() => setSelectedDestination(destination)}
                  queryContext={queryContext || undefined}
                />
              ))}
            </div>
          </div>

          {/* Score Breakdown Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How Scores Are Calculated</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{analysis.scoreBreakdown}</p>
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Sources & Freshness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {analysis.sourcesUsed.map((source, idx) => (
                  <Badge key={idx} variant="secondary">
                    {source}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Knowledge Base: {analysis.dataFreshness.knowledgeBase}</p>
                <p>Provider Data: {analysis.dataFreshness.providerData}</p>
                <p>Last Updated: {new Date(analysis.dataFreshness.lastUpdated).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Next Best Alternatives */}
          {analysis.nextBestAlternatives && analysis.nextBestAlternatives.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alternative Destinations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.nextBestAlternatives.map((alt, idx) => (
                    <Badge key={idx} variant="outline">
                      {alt}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDestination && (
        <RecommendationDetail
          destination={selectedDestination}
          onClose={() => setSelectedDestination(null)}
        />
      )}

      {/* Save Dialog */}
      {analysis && queryContext && (
        <SaveAnalysisDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          analysis={analysis}
          query={queryContext.query}
          userConstraints={analysis.userConstraints}
        />
      )}

      {/* Share/Export Dialog */}
      {analysis && queryContext && (
        <ShareExportDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          analysis={analysis}
          query={queryContext.query}
        />
      )}
    </div>
  )
}
