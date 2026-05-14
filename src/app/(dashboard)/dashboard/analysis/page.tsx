'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Info, TrendingUp, MapPin, Bookmark, GitCompare, Share2, Search, Sparkles, Brain, Shield, Compass, Route } from 'lucide-react'
import { GuidedAnalysisForm } from '@/components/travel/guided-analysis-form'
import { LoadingState } from '@/components/ui/loading-state'
import { TravelLoading } from '@/components/ui/travel-loading'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { EnhancedRecommendationCard } from '@/components/travel/enhanced-recommendation-card'
import { RecommendationDetail } from '@/components/travel/recommendation-detail'
import { PersonalizationIndicator } from '@/components/travel/personalization-indicator'
import { SaveAnalysisDialog } from '@/components/travel/save-analysis-dialog'
import { ShareExportDialog } from '@/components/travel/share-export-dialog'
import { ItineraryView } from '@/components/travel/itinerary-view'
import { RouteMapView } from '@/components/travel/route-map-view'
import { RankingExplanation } from '@/components/travel/ranking-explanation'
import { SeasonMonthStrategyDisplay } from '@/components/travel/season-month-strategy'
import type { TravelAnalysisResponse, RankedDestination } from '@/lib/analysis/schemas'
import { logLearningFeedback } from '@/lib/learning/client-feedback'

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
    tripStructure: 'single_country_one_city' | 'single_country_multi_city' | 'multi_country'
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

  const handleMonthOptionSelected = (month: number, optionType: string, optionData: Record<string, unknown>) => {
    logLearningFeedback({
      signalType: 'season_month_option_selected',
      signalValue: {
        month,
        optionType,
        title: optionData.title,
        suggestedRoute: optionData.suggestedRoute,
        recommendedNights: optionData.recommendedNights,
        dataConfidence: optionData.dataConfidence,
        sourceLabel: optionData.sourceLabel,
        season: analysis?.seasonMonthStrategy?.season,
        tripStructure: queryContext?.query,
        timestamp: new Date().toISOString(),
      },
    })
  }

  return (
    <div className="space-y-8">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 p-8 md:p-10 border border-primary/20 shadow-travel">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9ImhzbCgyMTcgOTElIDYwJSAvIDAuMSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZG90cykiLz48L3N2Zz4=')] opacity-40"></div>
        <div className="relative space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Brain className="h-3 w-3 mr-1" />
              AI-Powered
            </Badge>
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
              <Shield className="h-3 w-3 mr-1" />
              Passport-Aware
            </Badge>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Route className="h-3 w-3 mr-1" />
              Route Logic
            </Badge>
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
              <Sparkles className="h-3 w-3 mr-1" />
              Smart Itineraries
            </Badge>
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Travel Analysis</h1>
            <p className="text-lg text-foreground/80 max-w-3xl">
              Get evidence-based destination recommendations with intelligent route planning, budget optimization, and visa-aware suggestions
            </p>
          </div>
        </div>
      </div>

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
                tripStructure: 'single_country_multi_city', // Default fallback
              })
            }
          }}
        />
      )}

      {/* Form */}
      {(!analysis || error) && (
        <GuidedAnalysisForm
          onSubmit={handleAnalyze}
          loading={loading}
        />
      )}

      {/* Loading State */}
      {loading && (
        <Card className="border-0 shadow-premium-xl">
          <CardContent className="p-0">
            <TravelLoading />
          </CardContent>
        </Card>
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
      {analysis && !loading && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3 animate-fade-in">
            <Button onClick={() => setSaveDialogOpen(true)} className="group shadow-lg shadow-primary/20 hover:shadow-xl transition-all hover:-translate-y-0.5">
              <Bookmark className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
              Save Analysis
            </Button>
            <Button variant="outline" onClick={() => setShareDialogOpen(true)} className="group border-2 hover:border-primary/50 transition-all hover:-translate-y-0.5">
              <Share2 className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
              Share
            </Button>
            <Button
              onClick={() => {
                setCompareMode(!compareMode)
                setCompareSelections([])
              }}
              variant={compareMode ? 'default' : 'outline'}
              className={compareMode ? 'shadow-lg shadow-primary/20' : 'border-2'}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              {compareMode ? 'Exit Compare' : 'Compare Destinations'}
            </Button>
            {compareMode && compareSelections.length === 2 && (
              <Button asChild className="shadow-lg shadow-primary/20">
                <a href={`/dashboard/compare?a=${compareSelections[0].destinationId}&b=${compareSelections[1].destinationId}`}>
                  View Comparison
                </a>
              </Button>
            )}
          </div>

          {/* Personalization Indicator */}
          <PersonalizationIndicator personalization={analysis.personalization} />

          {/* Summary Card */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 shadow-xl">
            <CardHeader className="pb-5">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold mb-3">Analysis Summary</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {analysis.querySummary}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getConfidenceColor(analysis.confidence)}`}>
                    {Math.round(analysis.confidence * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 font-medium">Confidence</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Top Recommendations */}
              {analysis.topRecommendations && analysis.topRecommendations.length > 0 && (
                <div>
                  <h4 className="font-bold text-base mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Top Recommendations
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topRecommendations.map((rec, idx) => (
                      <Badge key={idx} variant="default" className="text-sm px-4 py-1.5 font-medium">
                        <MapPin className="h-3.5 w-3.5 mr-1.5" />
                        {rec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Reasons */}
              {analysis.reasons.length > 0 && (
                <div>
                  <h4 className="font-bold text-base mb-3">Key Insights</h4>
                  <ul className="space-y-2">
                    {analysis.reasons.slice(0, 3).map((reason, i) => (
                      <li key={i} className="text-sm flex items-start gap-3">
                        <span className="text-primary mt-0.5 font-bold">•</span>
                        <span className="leading-relaxed">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warnings & Assumptions */}
          {(analysis.warnings.length > 0 || analysis.assumptions.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
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

          {/* Season Month Strategy */}
          {analysis.seasonMonthStrategy && (
            <SeasonMonthStrategyDisplay 
              strategy={analysis.seasonMonthStrategy}
              onMonthOptionSelected={handleMonthOptionSelected}
            />
          )}

          {/* Ranked Destinations */}
          <div>
            <h2 className="text-3xl font-bold mb-6 animate-fade-up opacity-0">
              All Destinations ({analysis.rankedDestinations.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {analysis.rankedDestinations.slice(0, 3).map((destination, index) => {
                const delayClass = index === 0 ? 'delay-100' : index === 1 ? 'delay-200' : 'delay-300'
                return (
                  <div
                    key={destination.destinationId}
                    className={`animate-scale-in opacity-0 ${delayClass}`}
                  >
                    <EnhancedRecommendationCard
                      destination={destination}
                      rank={index + 1}
                      onViewDetails={() => setSelectedDestination(destination)}
                      queryContext={queryContext || undefined}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Score Breakdown Explanation */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold">How Scores Are Calculated</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.scoreBreakdown}</p>
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Data Sources & Freshness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {analysis.sourcesUsed.map((source, idx) => (
                  <Badge key={idx} variant="secondary" className="px-3 py-1">
                    {source}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-muted-foreground space-y-1.5">
                <p><span className="font-medium">Knowledge Base:</span> {analysis.dataFreshness.knowledgeBase}</p>
                <p><span className="font-medium">Provider Data:</span> {analysis.dataFreshness.providerData}</p>
                <p><span className="font-medium">Last Updated:</span> {new Date(analysis.dataFreshness.lastUpdated).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Next Best Alternatives */}
          {analysis.nextBestAlternatives && analysis.nextBestAlternatives.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Alternative Destinations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.nextBestAlternatives.map((alt, idx) => (
                    <Badge key={idx} variant="outline" className="px-3 py-1">
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
