// Analytics data access layer for admin insights
import { createAdminClient } from '../supabase/admin'
import { logger } from '../utils'
import type {
  AnalyticsOverview,
  RecommendationPerformance,
  FeedbackInsights,
  SearchInsights,
  PersonalizationInsights,
  DestinationStats,
  QueryPattern,
} from '../types/analytics'

export class AnalyticsDataAccess {
  private getSupabase() {
    return createAdminClient()
  }

  /**
   * Get overall analytics overview
   */
  async getOverview(dateRange?: { start: string; end: string }): Promise<AnalyticsOverview> {
    try {
      const supabase = this.getSupabase()
      const whereClause = dateRange
        ? `created_at >= '${dateRange.start}' AND created_at <= '${dateRange.end}'`
        : '1=1'

      // Total analyses (approximate from feedback sessions)
      const { count: totalAnalyses } = await supabase
        .from('user_feedback')
        .select('session_id', { count: 'exact', head: true })

      // Feedback counts by type
      const { data: feedbackData } = await supabase
        .from('user_feedback')
        .select('feedback_type')
        .filter('created_at', 'gte', dateRange?.start || '2020-01-01')

      const feedbackCounts = (feedbackData || []).reduce(
        (acc, row: any) => {
          acc[row.feedback_type] = (acc[row.feedback_type] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      // Unique users
      const { data: uniqueUsers } = await supabase
        .from('user_feedback')
        .select('user_id')
        .filter('created_at', 'gte', dateRange?.start || '2020-01-01')

      const uniqueUserCount = new Set((uniqueUsers || []).map((u: any) => u.user_id)).size

      return {
        totalAnalyses: totalAnalyses || 0,
        totalFeedbackEvents: feedbackData?.length || 0,
        totalSaves: feedbackCounts['save-trip'] || 0,
        totalDismisses: feedbackCounts['dismiss-recommendation'] || 0,
        totalThumbsUp: feedbackCounts['thumbs-up'] || 0,
        totalThumbsDown: feedbackCounts['thumbs-down'] || 0,
        totalSelections: feedbackCounts['select-destination'] || 0,
        totalViews: feedbackCounts['view-details'] || 0,
        uniqueUsers: uniqueUserCount,
        dateRange: dateRange || null,
      }
    } catch (error) {
      logger.error('Failed to get analytics overview', error)
      throw error
    }
  }

  /**
   * Get top performing destinations
   */
  async getTopDestinations(limit: number = 20): Promise<DestinationStats[]> {
    try {
      const supabase = this.getSupabase()
      const { data } = await supabase
        .from('user_feedback')
        .select('destination_id, destination_name, feedback_type, total_score')
        .not('destination_id', 'is', null)
        .not('destination_name', 'is', null)

      if (!data) return []

      // Aggregate by destination
      const destMap = new Map<string, DestinationStats>()

      data.forEach((row: any) => {
        const key = row.destination_id!
        if (!destMap.has(key)) {
          destMap.set(key, {
            destinationId: row.destination_id!,
            destinationName: row.destination_name!,
            totalViews: 0,
            totalSaves: 0,
            totalDismisses: 0,
            totalThumbsUp: 0,
            totalThumbsDown: 0,
            totalSelections: 0,
            avgScore: 0,
            positiveRate: 0,
          })
        }

        const stats = destMap.get(key)!
        
        switch (row.feedback_type) {
          case 'view-details':
            stats.totalViews++
            break
          case 'save-trip':
            stats.totalSaves++
            break
          case 'dismiss-recommendation':
            stats.totalDismisses++
            break
          case 'thumbs-up':
            stats.totalThumbsUp++
            break
          case 'thumbs-down':
            stats.totalThumbsDown++
            break
          case 'select-destination':
            stats.totalSelections++
            break
        }
      })

      // Calculate metrics
      const results = Array.from(destMap.values()).map(stats => {
        const total = stats.totalViews + stats.totalSaves + stats.totalDismisses + 
                     stats.totalThumbsUp + stats.totalThumbsDown + stats.totalSelections
        const positive = stats.totalSaves + stats.totalThumbsUp + stats.totalSelections
        stats.positiveRate = total > 0 ? positive / total : 0

        // Calculate average score from feedback with scores
        const scoresData = data.filter(
          (d: any) => d.destination_id === stats.destinationId && d.total_score
        )
        stats.avgScore = scoresData.length > 0
          ? scoresData.reduce((sum, d: any) => sum + (d.total_score || 0), 0) / scoresData.length
          : 0

        return stats
      })

      // Sort by total interactions
      return results
        .sort((a, b) => {
          const aTotal = a.totalViews + a.totalSaves + a.totalSelections
          const bTotal = b.totalViews + b.totalSaves + b.totalSelections
          return bTotal - aTotal
        })
        .slice(0, limit)
    } catch (error) {
      logger.error('Failed to get top destinations', error)
      throw error
    }
  }

  /**
   * Get recommendation performance insights
   */
  async getRecommendationPerformance(): Promise<RecommendationPerformance> {
    try {
      const supabase = this.getSupabase()
      const { data } = await supabase
        .from('user_feedback')
        .select('feedback_type, total_score, recommendation_rank, query_context')
        .not('total_score', 'is', null)

      if (!data) {
        return {
          avgScoreForSaved: 0,
          avgScoreForDismissed: 0,
          avgScoreForThumbsUp: 0,
          avgScoreForThumbsDown: 0,
          topRankSelectionRate: 0,
          personalizedVsGenericPerformance: null,
        }
      }

      const saved = data.filter((d: any) => d.feedback_type === 'save-trip')
      const dismissed = data.filter((d: any) => d.feedback_type === 'dismiss-recommendation')
      const thumbsUp = data.filter((d: any) => d.feedback_type === 'thumbs-up')
      const thumbsDown = data.filter((d: any) => d.feedback_type === 'thumbs-down')

      const avgScore = (arr: any[]) =>
        arr.length > 0 ? arr.reduce((sum, d: any) => sum + (d.total_score || 0), 0) / arr.length : 0

      // Top rank selection rate
      const topRankSelections = data.filter(
        (d: any) => (d.feedback_type === 'save-trip' || d.feedback_type === 'select-destination') &&
             d.recommendation_rank === 1
      ).length
      const totalSelections = data.filter(
        (d: any) => d.feedback_type === 'save-trip' || d.feedback_type === 'select-destination'
      ).length

      return {
        avgScoreForSaved: avgScore(saved),
        avgScoreForDismissed: avgScore(dismissed),
        avgScoreForThumbsUp: avgScore(thumbsUp),
        avgScoreForThumbsDown: avgScore(thumbsDown),
        topRankSelectionRate: totalSelections > 0 ? topRankSelections / totalSelections : 0,
        personalizedVsGenericPerformance: null, // Calculated separately
      }
    } catch (error) {
      logger.error('Failed to get recommendation performance', error)
      throw error
    }
  }

  /**
   * Get feedback insights
   */
  async getFeedbackInsights(): Promise<FeedbackInsights> {
    try {
      const supabase = this.getSupabase()
      const { data } = await supabase
        .from('user_feedback')
        .select('feedback_type, recommendation_rank')

      if (!data) {
        return {
          thumbsUpRate: 0,
          thumbsDownRate: 0,
          saveTripRate: 0,
          viewDetailsRate: 0,
          selectionRate: 0,
          dismissalRate: 0,
          avgRankSelected: 0,
        }
      }

      const total = data.length
      const counts = data.reduce(
        (acc, row: any) => {
          acc[row.feedback_type] = (acc[row.feedback_type] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      const selections = data.filter(
        (d: any) => d.feedback_type === 'select-destination' && d.recommendation_rank
      )
      const avgRankSelected = selections.length > 0
        ? selections.reduce((sum, d: any) => sum + (d.recommendation_rank || 0), 0) / selections.length
        : 0

      return {
        thumbsUpRate: total > 0 ? (counts['thumbs-up'] || 0) / total : 0,
        thumbsDownRate: total > 0 ? (counts['thumbs-down'] || 0) / total : 0,
        saveTripRate: total > 0 ? (counts['save-trip'] || 0) / total : 0,
        viewDetailsRate: total > 0 ? (counts['view-details'] || 0) / total : 0,
        selectionRate: total > 0 ? (counts['select-destination'] || 0) / total : 0,
        dismissalRate: total > 0 ? (counts['dismiss-recommendation'] || 0) / total : 0,
        avgRankSelected,
      }
    } catch (error) {
      logger.error('Failed to get feedback insights', error)
      throw error
    }
  }

  /**
   * Get search/query insights
   */
  async getSearchInsights(): Promise<SearchInsights> {
    try {
      const supabase = this.getSupabase()
      const { data } = await supabase
        .from('user_feedback')
        .select('query_context')
        .not('query_context', 'is', null)

      if (!data) {
        return {
          topQueries: [],
          budgetDistribution: {},
          monthDistribution: {},
          interestDistribution: {},
        }
      }

      const queries: string[] = []
      const budgets: string[] = []
      const months: number[] = []
      const interests: string[] = []

      data.forEach((row: any) => {
        const ctx = row.query_context as any
        if (ctx?.query) queries.push(ctx.query)
        if (ctx?.budget) budgets.push(ctx.budget)
        if (ctx?.travel_months) months.push(...ctx.travel_months)
        if (ctx?.interests) interests.push(...ctx.interests)
      })

      // Count occurrences
      const countMap = <T extends string | number>(arr: T[]) =>
        arr.reduce((acc, item) => {
          acc[item] = (acc[item] || 0) + 1
          return acc
        }, {} as Record<string | number, number>)

      const queryCounts = countMap(queries)
      const topQueries = Object.entries(queryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([query, count]) => ({ query, count }))

      return {
        topQueries,
        budgetDistribution: countMap(budgets),
        monthDistribution: countMap(months),
        interestDistribution: countMap(interests),
      }
    } catch (error) {
      logger.error('Failed to get search insights', error)
      throw error
    }
  }

  /**
   * Get personalization insights
   */
  async getPersonalizationInsights(): Promise<PersonalizationInsights> {
    try {
      const supabase = this.getSupabase()
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('inferred_preferences, confidence, feedback_count')

      if (!preferences || preferences.length === 0) {
        return {
          totalUsersWithPreferences: 0,
          avgConfidence: 0,
          avgFeedbackCount: 0,
          commonPreferencePatterns: [],
        }
      }

      const totalUsers = preferences.length
      const avgConfidence = preferences.reduce((sum, p: any) => sum + (p.confidence || 0), 0) / totalUsers
      const avgFeedbackCount = preferences.reduce((sum, p: any) => sum + (p.feedback_count || 0), 0) / totalUsers

      // Extract common patterns
      const budgetPrefs: string[] = []
      const interestPrefs: string[] = []

      preferences.forEach((p: any) => {
        const inferred = p.inferred_preferences as any
        if (inferred?.preferred_budget_levels) budgetPrefs.push(...inferred.preferred_budget_levels)
        if (inferred?.preferred_interests) interestPrefs.push(...inferred.preferred_interests)
      })

      const countOccurrences = <T extends string>(arr: T[]) =>
        arr.reduce((acc, item) => {
          acc[item] = (acc[item] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      const budgetCounts = countOccurrences(budgetPrefs)
      const interestCounts = countOccurrences(interestPrefs)

      const commonPreferencePatterns = [
        ...Object.entries(budgetCounts).map(([pattern, count]) => ({ pattern: `Budget: ${pattern}`, count })),
        ...Object.entries(interestCounts).map(([pattern, count]) => ({ pattern: `Interest: ${pattern}`, count })),
      ].sort((a, b) => b.count - a.count).slice(0, 10)

      return {
        totalUsersWithPreferences: totalUsers,
        avgConfidence,
        avgFeedbackCount,
        commonPreferencePatterns,
      }
    } catch (error) {
      logger.error('Failed to get personalization insights', error)
      throw error
    }
  }
}

export const analyticsDataAccess = new AnalyticsDataAccess()
