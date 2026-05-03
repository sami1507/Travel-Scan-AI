'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, BarChart3, TrendingUp, Search, Users, Target } from 'lucide-react'
import { OverviewMetrics } from '@/components/admin/overview-metrics'
import { DestinationTable } from '@/components/admin/destination-table'
import { RecommendationInsights } from '@/components/admin/recommendation-insights'
import { FeedbackInsightsCard } from '@/components/admin/feedback-insights'
import { SearchInsightsCards } from '@/components/admin/search-insights'
import { PersonalizationInsightsCard } from '@/components/admin/personalization-insights'
import type {
  AnalyticsOverview,
  DestinationStats,
  RecommendationPerformance,
  FeedbackInsights,
  SearchInsights,
  PersonalizationInsights,
} from '@/lib/types/analytics'

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [destinations, setDestinations] = useState<DestinationStats[]>([])
  const [recommendations, setRecommendations] = useState<RecommendationPerformance | null>(null)
  const [feedback, setFeedback] = useState<FeedbackInsights | null>(null)
  const [search, setSearch] = useState<SearchInsights | null>(null)
  const [personalization, setPersonalization] = useState<PersonalizationInsights | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load all analytics data in parallel
      const [
        overviewRes,
        destinationsRes,
        recommendationsRes,
        feedbackRes,
        searchRes,
        personalizationRes,
      ] = await Promise.all([
        fetch('/api/admin/analytics?type=overview'),
        fetch('/api/admin/analytics?type=destinations&limit=20'),
        fetch('/api/admin/analytics?type=recommendations'),
        fetch('/api/admin/analytics?type=feedback'),
        fetch('/api/admin/analytics?type=search'),
        fetch('/api/admin/analytics?type=personalization'),
      ])

      if (!overviewRes.ok) throw new Error('Failed to load overview')
      if (!destinationsRes.ok) throw new Error('Failed to load destinations')
      if (!recommendationsRes.ok) throw new Error('Failed to load recommendations')
      if (!feedbackRes.ok) throw new Error('Failed to load feedback')
      if (!searchRes.ok) throw new Error('Failed to load search insights')
      if (!personalizationRes.ok) throw new Error('Failed to load personalization')

      const overviewData = await overviewRes.json()
      const destinationsData = await destinationsRes.json()
      const recommendationsData = await recommendationsRes.json()
      const feedbackData = await feedbackRes.json()
      const searchData = await searchRes.json()
      const personalizationData = await personalizationRes.json()

      setOverview(overviewData.data)
      setDestinations(destinationsData.data)
      setRecommendations(recommendationsData.data)
      setFeedback(feedbackData.data)
      setSearch(searchData.data)
      setPersonalization(personalizationData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Analytics</h1>
          <p className="text-muted-foreground mt-1">Internal insights and performance metrics</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Analytics</h1>
          <p className="text-muted-foreground mt-1">Internal insights and performance metrics</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Internal insights and performance metrics for the travel analysis product
        </p>
      </div>

      {/* Overview Metrics */}
      {overview && <OverviewMetrics data={overview} />}

      {/* Tabbed Analytics */}
      <Tabs defaultValue="destinations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="destinations" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Destinations
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="personalization" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Personalization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="destinations" className="space-y-4">
          <DestinationTable
            destinations={destinations}
            title="Top Performing Destinations"
            description="Destinations ranked by total user interactions and engagement"
          />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendations && <RecommendationInsights data={recommendations} />}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          {feedback && <FeedbackInsightsCard data={feedback} />}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          {search && <SearchInsightsCards data={search} />}
        </TabsContent>

        <TabsContent value="personalization" className="space-y-4">
          {personalization && <PersonalizationInsightsCard data={personalization} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
