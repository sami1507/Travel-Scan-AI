// Analytics type definitions
export interface AnalyticsOverview {
  totalAnalyses: number
  totalFeedbackEvents: number
  totalSaves: number
  totalDismisses: number
  totalThumbsUp: number
  totalThumbsDown: number
  totalSelections: number
  totalViews: number
  uniqueUsers: number
  dateRange: { start: string; end: string } | null
}

export interface DestinationStats {
  destinationId: string
  destinationName: string
  totalViews: number
  totalSaves: number
  totalDismisses: number
  totalThumbsUp: number
  totalThumbsDown: number
  totalSelections: number
  avgScore: number
  positiveRate: number
}

export interface RecommendationPerformance {
  avgScoreForSaved: number
  avgScoreForDismissed: number
  avgScoreForThumbsUp: number
  avgScoreForThumbsDown: number
  topRankSelectionRate: number
  personalizedVsGenericPerformance: {
    personalizedAvgScore: number
    genericAvgScore: number
    personalizedSaveRate: number
    genericSaveRate: number
  } | null
}

export interface FeedbackInsights {
  thumbsUpRate: number
  thumbsDownRate: number
  saveTripRate: number
  viewDetailsRate: number
  selectionRate: number
  dismissalRate: number
  avgRankSelected: number
}

export interface SearchInsights {
  topQueries: Array<{ query: string; count: number }>
  budgetDistribution: Record<string, number>
  monthDistribution: Record<number, number>
  interestDistribution: Record<string, number>
}

export interface PersonalizationInsights {
  totalUsersWithPreferences: number
  avgConfidence: number
  avgFeedbackCount: number
  commonPreferencePatterns: Array<{ pattern: string; count: number }>
}

export interface QueryPattern {
  query: string
  count: number
  avgScore?: number
  saveRate?: number
}

// Quality metrics returned by /api/admin/quality-metrics (rates are 0-1 fractions)
export interface QualityMetrics {
  recommendationQuality: {
    averageScore: number | null
    sampleSize: number
    topDestinations: Array<{ name: string; saves: number; score: number }>
  }
  feedback: {
    saveTripRate: number | null
    dismissalRate: number | null
    viewDetailsRate: number | null
    sampleSize: number
  }
  alerts: {
    readRate: number | null
    dismissRate: number | null
    total: number
  }
  sharing: {
    totalShares: number
    totalViews: number
    avgViewsPerShare: number | null
  }
  personalization: {
    avgConfidence: number | null
    totalUsersWithPreferences: number
    avgFeedbackCount: number
  }
}
