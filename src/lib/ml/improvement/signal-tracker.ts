// Continuous ML Improvement Signal Tracking
import type { UserFeedback } from '../../types/feedback'
import { logger } from '../../utils'

export interface UserPersonalizationSignal {
  userId: string
  signalType: 'preference' | 'behavior' | 'correction'
  timestamp: string
  data: {
    preferredInterests?: string[]
    preferredBudget?: string
    preferredStyle?: string
    rejectedDestinations?: string[]
    acceptedDestinations?: string[]
    feedbackPattern?: string
  }
  strength: number // 0-1, how strong this signal is
}

export interface GlobalImprovementSignal {
  signalType: 'quality' | 'mismatch' | 'pattern' | 'drift'
  timestamp: string
  affectedDestinations?: string[]
  affectedFeatures?: string[]
  description: string
  severity: 'low' | 'medium' | 'high'
  count: number
  data: Record<string, any>
}

export interface SignalAggregation {
  period: string // e.g., 'last_24h', 'last_7d'
  userSignals: {
    totalUsers: number
    totalSignals: number
    byType: Record<string, number>
    strongSignals: number
  }
  globalSignals: {
    totalSignals: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
    topPatterns: Array<{ pattern: string; count: number }>
  }
  improvementOpportunities: string[]
}

class SignalTracker {
  private userSignals: UserPersonalizationSignal[] = []
  private globalSignals: GlobalImprovementSignal[] = []
  private readonly MAX_SIGNALS = 10000

  /**
   * Track user personalization signal from feedback
   */
  trackUserSignal(feedback: UserFeedback) {
    const signal = this.extractUserSignal(feedback)
    if (signal) {
      this.userSignals.push(signal)
      this.trimSignals()
      
      logger.info('User signal tracked', {
        userId: signal.userId,
        type: signal.signalType,
        strength: signal.strength.toFixed(2),
      })
    }
  }

  /**
   * Track global improvement signal
   */
  trackGlobalSignal(signal: GlobalImprovementSignal) {
    this.globalSignals.push(signal)
    this.trimSignals()

    if (signal.severity === 'high') {
      logger.warn('High-severity global signal', {
        type: signal.signalType,
        description: signal.description,
        count: signal.count,
      })
    }
  }

  /**
   * Detect and track mismatch patterns
   */
  detectMismatchPattern(
    feedbackHistory: UserFeedback[],
    threshold: number = 3
  ) {
    // Group by destination
    const destinationFeedback = new Map<string, UserFeedback[]>()
    
    feedbackHistory.forEach(fb => {
      if (fb.destination_id) {
        const existing = destinationFeedback.get(fb.destination_id) || []
        existing.push(fb)
        destinationFeedback.set(fb.destination_id, existing)
      }
    })

    // Find destinations with repeated rejections
    destinationFeedback.forEach((feedbacks, destId) => {
      const rejections = feedbacks.filter(
        fb => fb.feedback_type === 'thumbs-down' || fb.feedback_type === 'dismiss-recommendation'
      )

      if (rejections.length >= threshold) {
        this.trackGlobalSignal({
          signalType: 'mismatch',
          timestamp: new Date().toISOString(),
          affectedDestinations: [destId],
          description: `Destination ${destId} repeatedly rejected (${rejections.length} times)`,
          severity: rejections.length >= 5 ? 'high' : 'medium',
          count: rejections.length,
          data: {
            reasons: rejections
              .map(r => r.feedback_metadata?.reason)
              .filter(Boolean),
          },
        })
      }
    })
  }

  /**
   * Detect quality drift
   */
  detectQualityDrift(
    recentAcceptanceRate: number,
    historicalAcceptanceRate: number,
    threshold: number = 0.1
  ) {
    const drift = historicalAcceptanceRate - recentAcceptanceRate

    if (Math.abs(drift) > threshold) {
      this.trackGlobalSignal({
        signalType: 'drift',
        timestamp: new Date().toISOString(),
        description: `Acceptance rate drift detected: ${(drift * 100).toFixed(1)}%`,
        severity: Math.abs(drift) > 0.2 ? 'high' : 'medium',
        count: 1,
        data: {
          recentRate: recentAcceptanceRate,
          historicalRate: historicalAcceptanceRate,
          drift,
        },
      })
    }
  }

  /**
   * Get signal aggregation for a time period
   */
  getSignalAggregation(periodHours: number = 24): SignalAggregation {
    const cutoff = Date.now() - periodHours * 60 * 60 * 1000

    // Filter signals by period
    const recentUserSignals = this.userSignals.filter(
      s => new Date(s.timestamp).getTime() > cutoff
    )
    const recentGlobalSignals = this.globalSignals.filter(
      s => new Date(s.timestamp).getTime() > cutoff
    )

    // Aggregate user signals
    const userSignalsByType: Record<string, number> = {}
    const uniqueUsers = new Set<string>()
    let strongSignals = 0

    recentUserSignals.forEach(signal => {
      uniqueUsers.add(signal.userId)
      userSignalsByType[signal.signalType] = (userSignalsByType[signal.signalType] || 0) + 1
      if (signal.strength > 0.7) strongSignals++
    })

    // Aggregate global signals
    const globalSignalsByType: Record<string, number> = {}
    const globalSignalsBySeverity: Record<string, number> = {}
    const patternCounts = new Map<string, number>()

    recentGlobalSignals.forEach(signal => {
      globalSignalsByType[signal.signalType] = (globalSignalsByType[signal.signalType] || 0) + 1
      globalSignalsBySeverity[signal.severity] = (globalSignalsBySeverity[signal.severity] || 0) + 1
      
      if (signal.signalType === 'pattern' || signal.signalType === 'mismatch') {
        const key = signal.description
        patternCounts.set(key, (patternCounts.get(key) || 0) + 1)
      }
    })

    const topPatterns = Array.from(patternCounts.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Identify improvement opportunities
    const improvementOpportunities = this.identifyImprovementOpportunities(
      recentUserSignals,
      recentGlobalSignals
    )

    return {
      period: `last_${periodHours}h`,
      userSignals: {
        totalUsers: uniqueUsers.size,
        totalSignals: recentUserSignals.length,
        byType: userSignalsByType,
        strongSignals,
      },
      globalSignals: {
        totalSignals: recentGlobalSignals.length,
        byType: globalSignalsByType,
        bySeverity: globalSignalsBySeverity,
        topPatterns,
      },
      improvementOpportunities,
    }
  }

  /**
   * Get improvement signals for retraining
   */
  getImprovementSignalsForRetraining(): {
    userPreferenceUpdates: Array<{ userId: string; preferences: any }>
    globalQualityIssues: GlobalImprovementSignal[]
    featureImportanceHints: Array<{ feature: string; importance: number }>
  } {
    // Extract user preference updates
    const userPreferenceMap = new Map<string, any>()
    this.userSignals
      .filter(s => s.signalType === 'preference' && s.strength > 0.5)
      .forEach(signal => {
        const existing = userPreferenceMap.get(signal.userId) || {}
        userPreferenceMap.set(signal.userId, {
          ...existing,
          ...signal.data,
        })
      })

    const userPreferenceUpdates = Array.from(userPreferenceMap.entries()).map(
      ([userId, preferences]) => ({ userId, preferences })
    )

    // Extract global quality issues
    const globalQualityIssues = this.globalSignals.filter(
      s => s.signalType === 'quality' || s.signalType === 'mismatch'
    )

    // Extract feature importance hints from patterns
    const featureImportanceHints = this.extractFeatureImportance()

    return {
      userPreferenceUpdates,
      globalQualityIssues,
      featureImportanceHints,
    }
  }

  /**
   * Clear old signals
   */
  clearOldSignals(olderThanDays: number = 30) {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    
    this.userSignals = this.userSignals.filter(
      s => new Date(s.timestamp).getTime() > cutoff
    )
    this.globalSignals = this.globalSignals.filter(
      s => new Date(s.timestamp).getTime() > cutoff
    )

    logger.info('Old signals cleared', {
      olderThanDays,
      remainingUserSignals: this.userSignals.length,
      remainingGlobalSignals: this.globalSignals.length,
    })
  }

  // Private methods

  private extractUserSignal(feedback: UserFeedback): UserPersonalizationSignal | null {
    if (!feedback.user_id) return null

    let signalType: 'preference' | 'behavior' | 'correction' = 'behavior'
    let strength = 0.5
    const data: UserPersonalizationSignal['data'] = {}

    // Extract signal based on feedback type
    switch (feedback.feedback_type) {
      case 'thumbs-up':
      case 'save-trip':
      case 'select-destination':
        signalType = 'preference'
        strength = 0.8
        if (feedback.destination_id) {
          data.acceptedDestinations = [feedback.destination_id]
        }
        break

      case 'thumbs-down':
      case 'dismiss-recommendation':
        signalType = 'correction'
        strength = 0.7
        if (feedback.destination_id) {
          data.rejectedDestinations = [feedback.destination_id]
        }
        break

      case 'view-details':
        signalType = 'behavior'
        strength = 0.3
        break

      default:
        // Handle any other feedback types as behavior signals
        signalType = 'behavior'
        strength = 0.5
        if (feedback.feedback_metadata) {
          const meta = feedback.feedback_metadata as any
          if (meta.reason) {
            data.feedbackPattern = meta.reason
          }
        }
        break
    }

    return {
      userId: feedback.user_id,
      signalType,
      timestamp: feedback.created_at,
      data,
      strength,
    }
  }

  private identifyImprovementOpportunities(
    userSignals: UserPersonalizationSignal[],
    globalSignals: GlobalImprovementSignal[]
  ): string[] {
    const opportunities: string[] = []

    // Check for strong user preference signals
    const strongPreferences = userSignals.filter(
      s => s.signalType === 'preference' && s.strength > 0.7
    ).length

    if (strongPreferences > 10) {
      opportunities.push(`${strongPreferences} strong user preferences can improve personalization`)
    }

    // Check for high-severity global issues
    const highSeverityIssues = globalSignals.filter(s => s.severity === 'high').length
    if (highSeverityIssues > 0) {
      opportunities.push(`${highSeverityIssues} high-severity quality issues need attention`)
    }

    // Check for mismatch patterns
    const mismatches = globalSignals.filter(s => s.signalType === 'mismatch').length
    if (mismatches > 5) {
      opportunities.push(`${mismatches} destination mismatch patterns detected`)
    }

    // Check for drift
    const drifts = globalSignals.filter(s => s.signalType === 'drift').length
    if (drifts > 0) {
      opportunities.push('Quality drift detected - consider retraining')
    }

    return opportunities
  }

  private extractFeatureImportance(): Array<{ feature: string; importance: number }> {
    // Analyze global signals to infer feature importance
    const featureHints = new Map<string, number>()

    this.globalSignals.forEach(signal => {
      if (signal.affectedFeatures) {
        signal.affectedFeatures.forEach(feature => {
          const current = featureHints.get(feature) || 0
          const weight = signal.severity === 'high' ? 3 : signal.severity === 'medium' ? 2 : 1
          featureHints.set(feature, current + weight)
        })
      }
    })

    return Array.from(featureHints.entries())
      .map(([feature, importance]) => ({ feature, importance }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 20)
  }

  private trimSignals() {
    if (this.userSignals.length > this.MAX_SIGNALS) {
      this.userSignals = this.userSignals.slice(-this.MAX_SIGNALS)
    }
    if (this.globalSignals.length > this.MAX_SIGNALS) {
      this.globalSignals = this.globalSignals.slice(-this.MAX_SIGNALS)
    }
  }
}

// Singleton instance
export const signalTracker = new SignalTracker()

// Auto-cleanup every day
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    signalTracker.clearOldSignals(30)
  }, 24 * 60 * 60 * 1000)
}
