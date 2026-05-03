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
