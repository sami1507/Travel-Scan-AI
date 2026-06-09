'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Info, TrendingUp, MapPin, Bookmark, GitCompare, Share2, Search, Sparkles, Brain, Shield, Compass, Route, RefreshCw, Shuffle, Gem, DollarSign, Palmtree } from 'lucide-react'
import { GuidedAnalysisForm } from '@/components/travel/guided-analysis-form'
import { LoadingState } from '@/components/ui/loading-state'
import { TravelLoading } from '@/components/ui/travel-loading'
import { AnalysisLoadingExperience } from '@/components/ui/travelscan/analysis-loading-experience'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { EnhancedRecommendationCard } from '@/components/travel/enhanced-recommendation-card'
import { RouteFirstCard } from '@/components/travel/route-first-card'
import { ConsultantBriefCard } from '@/components/travel/consultant-brief-card'
import { WhyTheseThree } from '@/components/travel/why-these-three'
import { BeforeYouBookChecklist } from '@/components/travel/before-you-book-checklist'
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
import { normalizeAnalysisForUI } from '@/lib/analysis/normalize-analysis-for-ui'
import { AnalysisErrorBoundary } from '@/components/ui/analysis-error-boundary'
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary'
import { clearAnalysisClientState } from '@/lib/analysis/clear-analysis-state'
import { validateAnalysisRequest, sanitizeAnalysisRequest } from '@/lib/analysis/validate-analysis-request'

export default function AnalysisPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [retryCount, setRetryCount] = useState(0)
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0)
  const [analysis, setAnalysis] = useState<TravelAnalysisResponse | null>(null)
  const [selectedDestination, setSelectedDestination] = useState<RankedDestination | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelections, setCompareSelections] = useState<RankedDestination[]>([])
  const [showRevealBanner, setShowRevealBanner] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [limitInfo, setLimitInfo] = useState<{ used: number; limit: number } | null>(null)
  const [queryContext, setQueryContext] = useState<{
    query: string
    departureCity?: string
    passportCountry?: string
    budget?: string
    travel_months?: number[]
    interests?: string[]
    tripLength?: number
    tripStructure?: string
    travelStyle?: string
    pace?: string
  } | null>(null)

  const handleAnalyze = async (data: {
    query: string
    departureCity?: string
    budget: string
    tripLength?: number
    travelMonths: number[]
    interests: string[]
    tripStructure: 'single_country_one_city' | 'single_country_multi_city' | 'multi_country'
    forceFresh?: boolean
    excludeCountries?: string[]
    diversityMode?: 'best_fit' | 'alternative_ideas' | 'hidden_gems' | 'cheaper_options' | 'low_fatigue'
  }, isRetry = false) => {
    // Client-side validation
    const validation = validateAnalysisRequest({
      query: data.query,
      departureCity: data.departureCity,
      tripLength: data.tripLength,
      travelMonths: data.travelMonths,
      interests: data.interests,
      budget: data.budget,
      tripStructure: data.tripStructure,
    })

    if (!validation.valid) {
      setValidationErrors(validation.errors)
      return
    }

    setValidationErrors([])
    setLoading(true)
    setError(null)
    setLimitReached(false)
    
    // Only clear analysis if not retrying
    if (!isRetry) {
      setAnalysis(null)
      setRetryCount(0)
    }

    try {
      // Sanitize request before sending
      const sanitizedData = sanitizeAnalysisRequest(data)
      
      // Always force fresh analysis to ensure OpenAI is called (not cache)
      // forceFresh can be explicitly set or defaults to true for all analyses
      const shouldForceFresh = data.forceFresh !== false // Default to true unless explicitly false
      const requestData = {
        ...sanitizedData,
        forceFresh: shouldForceFresh,
        freshRunId: shouldForceFresh ? `fresh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : undefined,
        excludeCountries: data.excludeCountries,
        diversityMode: data.diversityMode,
      }
      
      const response = await fetch('/api/travel/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      if (response.status === 429) {
        const errorData = await response.json()
        if (errorData.code === 'LIMIT_REACHED') {
          setLimitReached(true)
          setLimitInfo({ used: errorData.analysesUsed, limit: errorData.analysesLimit })
          setLoading(false)
          return
        }
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const result = await response.json()
      
      // Normalize analysis for safe UI rendering
      const normalizedAnalysis = normalizeAnalysisForUI(result.analysis)
      
      // Only set analysis if normalization succeeded
      if (normalizedAnalysis && Array.isArray(normalizedAnalysis.rankedDestinations)) {
        setAnalysis(normalizedAnalysis)
        setShowRevealBanner(true)
        setTimeout(() => setShowRevealBanner(false), 1500)
        // Set first recommendation as selected for itinerary display
        if (normalizedAnalysis.rankedDestinations.length > 0) {
          setSelectedDestination(normalizedAnalysis.rankedDestinations[0])
        }
        setQueryContext({
          query: data.query,
          departureCity: data.departureCity,
          passportCountry: (data as any).passportCountry,
          budget: data.budget,
          travel_months: data.travelMonths,
          interests: data.interests,
          tripLength: data.tripLength,
          tripStructure: data.tripStructure,
          travelStyle: (data as any).travelStyle,
          pace: (data as any).pace,
        })
        setRetryCount(0) // Reset retry count on success
      } else {
        throw new Error('Invalid analysis response received')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      
      // Retry logic: up to 2 retries
      if (retryCount < 2) {
        console.log(`Analysis failed, retrying (attempt ${retryCount + 1}/2)...`)
        setRetryCount(prev => prev + 1)
        setTimeout(() => handleAnalyze(data, true), 2000)
      } else {
        setError(errorMessage + ' (Failed after 3 attempts)')
        setRetryCount(0)
      }
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

  // Helper: Run fresh analysis (bypass cache)
  const handleRunFreshAnalysis = () => {
    if (!queryContext) return
    handleAnalyze({
      query: queryContext.query || '',
      departureCity: queryContext.departureCity,
      passportCountry: queryContext.passportCountry,
      budget: queryContext.budget || 'moderate',
      tripLength: queryContext.tripLength,
      travelMonths: queryContext.travel_months || [],
      interests: queryContext.interests || [],
      tripStructure: (queryContext.tripStructure as any) || 'single_country_multi_city',
      travelStyle: queryContext.travelStyle,
      pace: queryContext.pace,
      forceFresh: true,
    } as any)
  }

  // Helper: Generate different options (exclude current countries)
  const handleGenerateDifferentOptions = () => {
    if (!analysis || !queryContext) return
    
    // Extract current countries from recommendations
    const currentCountries = analysis.rankedDestinations
      .map(dest => dest.destinationName)
      .filter(name => name && name.length > 0)
    
    handleAnalyze({
      query: queryContext.query || '',
      departureCity: queryContext.departureCity,
      passportCountry: queryContext.passportCountry,
      budget: queryContext.budget || 'moderate',
      tripLength: queryContext.tripLength,
      travelMonths: queryContext.travel_months || [],
      interests: queryContext.interests || [],
      tripStructure: (queryContext.tripStructure as any) || 'single_country_multi_city',
      travelStyle: queryContext.travelStyle,
      pace: queryContext.pace,
      forceFresh: true,
      excludeCountries: currentCountries,
      diversityMode: 'alternative_ideas',
    } as any)
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 md:p-10 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, hsl(230,35%,18%) 0%, hsl(199,89%,28%) 50%, hsl(22,100%,40%) 100%)',
        }}
      >
        {/* Floating particles */}
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="absolute text-white/20 animate-float select-none pointer-events-none"
            style={{
              left: `${10 + i * 18}%`,
              top: `${20 + (i % 3) * 25}%`,
              fontSize: `${14 + (i % 3) * 6}px`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${3 + i * 0.4}s`,
            }}
          >
            ✈
          </div>
        ))}
        <div className="relative space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-[hsl(199,89%,48%)]/20 text-[hsl(199,89%,75%)] border-[hsl(199,89%,48%)]/40 border">
              <Brain className="h-3 w-3 mr-1" />
              AI-Powered
            </Badge>
            <Badge className="bg-[hsl(152,45%,38%)]/20 text-[hsl(152,45%,75%)] border-[hsl(152,45%,38%)]/40 border">
              <Shield className="h-3 w-3 mr-1" />
              Passport-Aware
            </Badge>
            <Badge className="bg-[hsl(22,100%,62%)]/20 text-[hsl(22,100%,80%)] border-[hsl(22,100%,62%)]/40 border">
              <Route className="h-3 w-3 mr-1" />
              Route Logic
            </Badge>
            <Badge className="bg-[hsl(43,74%,66%)]/20 text-[hsl(43,74%,85%)] border-[hsl(43,74%,66%)]/40 border">
              <Sparkles className="h-3 w-3 mr-1" />
              Smart Itineraries
            </Badge>
          </div>
          <div>
            <h1
              className="text-4xl md:text-5xl font-bold tracking-tight mb-2 bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(90deg, hsl(22,100%,72%), hsl(199,89%,68%))' }}
            >
              AI Travel Consultant
            </h1>
            {/* Shimmer underline */}
            <div
              className="h-0.5 w-48 rounded-full mb-3 animate-shimmer"
              style={{
                background: 'linear-gradient(90deg, transparent, hsl(22,100%,62%), hsl(199,89%,48%), transparent)',
                backgroundSize: '200% 100%',
              }}
            />
            <p className="text-lg text-white/70 max-w-3xl">
              Understand where to go, why, when, and how — before you book
            </p>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <h4 className="font-semibold mb-2 text-orange-900">Please fix the following:</h4>
            <ul className="space-y-1 text-sm text-orange-800">
              {validationErrors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Upgrade Prompt — shown when free limit reached */}
      {limitReached && (
        <Card className="border-2 border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-700">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">✈️</div>
            <h3 className="text-xl font-bold mb-2">
              You&apos;ve used all {limitInfo?.limit ?? 3} free analyses this month
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upgrade to Pro for unlimited analyses, real-time research, and advanced route planning.
            </p>
            <Button
              size="lg"
              className="font-bold text-white border-0 shadow-lg"
              style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
              onClick={async () => {
                const res = await fetch('/api/subscription/checkout', { method: 'POST' })
                if (res.ok) {
                  const { url } = await res.json()
                  if (url) window.location.href = url
                }
              }}
            >
              Upgrade to Pro — $9/month
            </Button>
            <p className="text-xs text-muted-foreground mt-3">7-day free trial • Cancel anytime</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <ErrorState
          title="Analysis Failed"
          message={error}
          retry={() => {
            setError(null)
            setRetryCount(0)
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
        <div className="py-12">
          <AnalysisLoadingExperience />
        </div>
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
        <>
          {/* Reveal Banner */}
          <AnimatePresence>
            {showRevealBanner && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
              >
                <div
                  className="rounded-2xl py-4 px-8 text-center shadow-2xl pointer-events-auto w-full max-w-2xl"
                  style={{ background: 'linear-gradient(135deg, hsl(230,35%,18%) 0%, hsl(199,89%,38%) 100%)' }}
                >
                  <p className="text-white font-semibold text-base">✈ Analysis Complete — Here are your top destinations</p>
                  {(analysis as any)?.displaySummary?.querySummary && (
                    <p className="text-white/70 text-sm mt-1 line-clamp-2">
                      {(analysis as any).displaySummary.querySummary}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emergency check for malformed analysis */}
          {!Array.isArray(analysis.rankedDestinations) || analysis.rankedDestinations.length === 0 ? (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900 mb-2">
                      Incompatible Analysis Format
                    </p>
                    <p className="text-sm text-orange-800 leading-relaxed mb-4">
                      We could not display this saved analysis because it uses an older format or is incomplete. 
                      Run a fresh analysis to generate a clean result.
                    </p>
                    <Button 
                      onClick={() => {
                        clearAnalysisClientState()
                        setAnalysis(null)
                        setSelectedDestination(null)
                        setCompareSelections([])
                        setCompareMode(false)
                        setErrorBoundaryKey(prev => prev + 1)
                      }}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Run Fresh Analysis
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
        <AnalysisErrorBoundary 
          key={errorBoundaryKey}
          onReset={() => {
            clearAnalysisClientState()
            setAnalysis(null)
            setSelectedDestination(null)
            setCompareSelections([])
            setCompareMode(false)
            setErrorBoundaryKey(prev => prev + 1) // Force remount
          }}
          analysisSummary={{
            hasAnalysis: !!analysis,
            rankedDestinationsType: typeof analysis?.rankedDestinations,
            rankedDestinationsIsArray: Array.isArray(analysis?.rankedDestinations),
            rankedDestinationsLength: analysis?.rankedDestinations?.length,
            warningsType: typeof analysis?.warnings,
            assumptionsType: typeof analysis?.assumptions,
            hasMeta: !!(analysis as any)?._meta,
            cacheStatus: (analysis as any)?._meta?.cacheStatus,
            openAIUsed: (analysis as any)?._meta?.openAIUsed,
            fallbackUsed: (analysis as any)?._meta?.fallbackUsed,
            firstDestinationKeys: Array.isArray(analysis?.rankedDestinations) && analysis.rankedDestinations.length > 0
              ? Object.keys(analysis.rankedDestinations[0])
              : [],
          }}
        >
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
              {compareMode ? 'Exit Compare' : 'Compare'}
            </Button>
          </div>

          {/* Fresh Analysis Controls */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Fresh Analysis Options</h3>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {/* Run Fresh Analysis */}
                  <Button
                    onClick={handleRunFreshAnalysis}
                    disabled={loading || !queryContext}
                    variant="outline"
                    size="sm"
                    className="gap-2 border-2 hover:border-primary/50 hover:bg-primary/5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Run Fresh Analysis
                  </Button>

                  {/* Generate Different Options */}
                  <Button
                    onClick={handleGenerateDifferentOptions}
                    disabled={loading || !analysis || !queryContext}
                    variant="outline"
                    size="sm"
                    className="gap-2 border-2 hover:border-accent/50 hover:bg-accent/5"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Generate Different Options
                  </Button>
                </div>

                {/* Diversity Mode Controls */}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Or try a specific focus:</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        if (!queryContext) return
                        handleAnalyze({
                          query: queryContext.query || '',
                          budget: queryContext.budget || 'moderate',
                          travelMonths: queryContext.travel_months || [],
                          interests: queryContext.interests || [],
                          tripStructure: 'single_country_multi_city',
                          forceFresh: true,
                          diversityMode: 'hidden_gems',
                        })
                      }}
                      disabled={loading || !queryContext}
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs h-7"
                    >
                      <Gem className="h-3 w-3" />
                      Hidden Gems
                    </Button>
                    <Button
                      onClick={() => {
                        if (!queryContext) return
                        handleAnalyze({
                          query: queryContext.query || '',
                          budget: queryContext.budget || 'moderate',
                          travelMonths: queryContext.travel_months || [],
                          interests: queryContext.interests || [],
                          tripStructure: 'single_country_multi_city',
                          forceFresh: true,
                          diversityMode: 'cheaper_options',
                        })
                      }}
                      disabled={loading || !queryContext}
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs h-7"
                    >
                      <DollarSign className="h-3 w-3" />
                      Cheaper Options
                    </Button>
                    <Button
                      onClick={() => {
                        if (!queryContext) return
                        handleAnalyze({
                          query: queryContext.query || '',
                          budget: queryContext.budget || 'moderate',
                          travelMonths: queryContext.travel_months || [],
                          interests: queryContext.interests || [],
                          tripStructure: 'single_country_multi_city',
                          forceFresh: true,
                          diversityMode: 'low_fatigue',
                        })
                      }}
                      disabled={loading || !queryContext}
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs h-7"
                    >
                      <Palmtree className="h-3 w-3" />
                      Lower Fatigue
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personalization Indicator */}
          {analysis.personalization && (
            <PersonalizationIndicator personalization={analysis.personalization} />
          )}

          {/* AI Travel Consultant Brief */}
          <SectionErrorBoundary 
            sectionName="Consultant Brief"
            fallbackMessage="Consultant brief is temporarily unavailable, but your route recommendations are still available below."
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
            >
              <ConsultantBriefCard 
                analysis={analysis}
                queryContext={queryContext}
                confidence={analysis.confidence}
              />
            </motion.div>
          </SectionErrorBoundary>

          {/* Why these 3 routes? */}
          <SectionErrorBoundary
            sectionName="Route Selection Explanation"
            fallbackMessage="Route selection explanation is temporarily unavailable."
          >
            <WhyTheseThree analysis={analysis} />
          </SectionErrorBoundary>

          {/* Warnings & Assumptions */}
          {(Array.isArray(analysis.warnings) && analysis.warnings.length > 0) || (Array.isArray(analysis.assumptions) && analysis.assumptions.length > 0) ? (
            <div className="grid gap-6 md:grid-cols-2">
              {Array.isArray(analysis.warnings) && analysis.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <h4 className="font-semibold mb-2">Before You Book: Watch Outs</h4>
                    <ul className="space-y-1 text-sm">
                      {analysis.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              {Array.isArray(analysis.assumptions) && analysis.assumptions.length > 0 && (
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
          ) : null}

          {/* Phase 3: Ranking Explanation */}
          {Array.isArray(analysis.rankedDestinations) && analysis.rankedDestinations.length > 0 && (
            <RankingExplanation
              topDestination={analysis.rankedDestinations[0]}
              alternatives={analysis.rankedDestinations.slice(1, 3)}
              scoreBreakdown={analysis.scoreBreakdown}
            />
          )}

          {/* Phase 3: Route Visualization & Itinerary */}
          {analysis.recommendedRoutes && Array.isArray(analysis.recommendedRoutes) && analysis.recommendedRoutes.length > 0 && (
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

          {/* Route-First Recommendations */}
          <SectionErrorBoundary 
            sectionName="Route Recommendations"
            fallbackMessage="Route recommendations are temporarily unavailable. Please try refreshing the analysis."
          >
            <div>
              <div className="relative mb-6 inline-block">
                <h2 className="text-3xl font-bold">
                  Recommended Routes ({analysis.rankedDestinations.length})
                </h2>
                <motion.div
                  className="absolute bottom-0 left-0 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, hsl(22,100%,62%), hsl(199,89%,48%))' }}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {analysis.rankedDestinations.slice(0, 3).map((destination, index) => (
                  <motion.div
                    key={destination.destinationId}
                    initial={
                      index === 0 ? { opacity: 0, x: -30 } :
                      index === 1 ? { opacity: 0, y: 30 } :
                      { opacity: 0, x: 30 }
                    }
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.5, delay: index === 0 ? 0.1 : index === 1 ? 0.3 : 0.5 }}
                  >
                    <RouteFirstCard
                      destination={destination}
                      rank={index + 1}
                      onViewDetails={() => setSelectedDestination(destination)}
                      onSaveRoute={() => handleSaveDestination(destination)}
                      queryContext={queryContext || undefined}
                      analysisMeta={(analysis as any)?._meta}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </SectionErrorBoundary>

          {/* Score Breakdown Explanation */}
          <SectionErrorBoundary 
            sectionName="Score Breakdown"
            fallbackMessage="Score breakdown is unavailable for this result."
          >
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg font-bold">How Scores Are Calculated</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{analysis.scoreBreakdown}</p>
              </CardContent>
            </Card>
          </SectionErrorBoundary>

          {/* Data Sources */}
          {Array.isArray(analysis.sourcesUsed) && analysis.sourcesUsed.length > 0 && analysis.dataFreshness && (
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
                  <p><span className="font-medium">Knowledge Base:</span> {analysis.dataFreshness.knowledgeBase || 'Unknown'}</p>
                  <p><span className="font-medium">Provider Data:</span> {analysis.dataFreshness.providerData || 'Unknown'}</p>
                  {analysis.dataFreshness.lastUpdated && (
                    <p><span className="font-medium">Last Updated:</span> {new Date(analysis.dataFreshness.lastUpdated).toLocaleString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Best Alternatives */}
          {analysis.nextBestAlternatives && Array.isArray(analysis.nextBestAlternatives) && analysis.nextBestAlternatives.length > 0 && (
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
        </AnalysisErrorBoundary>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedDestination && (
        <SectionErrorBoundary 
          sectionName="Route Details"
          fallbackMessage="Route details are temporarily unavailable. Please try selecting another route."
        >
          <RecommendationDetail
            destination={selectedDestination}
            onClose={() => setSelectedDestination(null)}
          />
        </SectionErrorBoundary>
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
