// Feedback Intelligence Signals - Extract actionable signals from feedback
import { createServerSupabaseClient } from '../supabase/server'
import type { FeedbackAnalysis } from './ai-feedback-analyzer'

export interface IntelligenceSignal {
  signalType: 'recommendation_quality' | 'personalization' | 'explanation' | 'product_insight'
  priority: 'critical' | 'high' | 'medium' | 'low'
  actionable: boolean
  signal: string
  impact: string
  suggestedAction: string
  evidence: {
    feedbackCount: number
    confidence: number
    sampleIds: string[]
  }
  metadata: Record<string, any>
}

export class FeedbackIntelligenceSignals {
  /**
   * Extract actionable intelligence signals from analyzed feedback
   */
  async extractSignals(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<IntelligenceSignal[]> {
    const supabase = await createServerSupabaseClient()
    
    const now = new Date()
    const startDate = this.getStartDate(now, timeframe)

    const { data: feedback, error } = await supabase
      .from('rich_feedback')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .not('ai_analysis', 'is', null)

    if (error || !feedback || feedback.length === 0) {
      return []
    }

    const signals: IntelligenceSignal[] = []

    // Extract recommendation quality signals
    signals.push(...this.extractRecommendationQualitySignals(feedback))

    // Extract personalization signals
    signals.push(...this.extractPersonalizationSignals(feedback))

    // Extract explanation quality signals
    signals.push(...this.extractExplanationQualitySignals(feedback))

    // Extract product insight signals
    signals.push(...this.extractProductInsightSignals(feedback))

    // Sort by priority and confidence
    return signals.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.evidence.confidence - a.evidence.confidence
    })
  }

  /**
   * Extract recommendation quality improvement signals
   */
  private extractRecommendationQualitySignals(feedback: any[]): IntelligenceSignal[] {
    const signals: IntelligenceSignal[] = []

    // Signal 1: Low recommendation quality scores
    const lowQualityFeedback = feedback.filter(fb => {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      return analysis.recommendationQuality <= 2
    })

    if (lowQualityFeedback.length >= 5) {
      const avgScore = lowQualityFeedback.reduce((sum, fb) => 
        sum + (fb.ai_analysis as FeedbackAnalysis).recommendationQuality, 0
      ) / lowQualityFeedback.length

      signals.push({
        signalType: 'recommendation_quality',
        priority: lowQualityFeedback.length > 10 ? 'critical' : 'high',
        actionable: true,
        signal: `${lowQualityFeedback.length} recommendations rated ≤2/5 (avg: ${avgScore.toFixed(1)})`,
        impact: 'Users finding recommendations irrelevant or poor quality',
        suggestedAction: 'Review scoring weights, improve candidate filtering, enhance matching algorithm',
        evidence: {
          feedbackCount: lowQualityFeedback.length,
          confidence: Math.min(lowQualityFeedback.length / feedback.length, 0.95),
          sampleIds: lowQualityFeedback.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          avgQualityScore: avgScore,
          percentageAffected: (lowQualityFeedback.length / feedback.length * 100).toFixed(1),
        },
      })
    }

    // Signal 2: Budget fit issues
    const budgetIssues = feedback.filter(fb => {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      return analysis.affectedDimensions.includes('budget') && 
             (analysis.sentiment === 'negative' || analysis.sentiment === 'very_negative')
    })

    if (budgetIssues.length >= 5) {
      signals.push({
        signalType: 'recommendation_quality',
        priority: 'high',
        actionable: true,
        signal: `${budgetIssues.length} budget mismatch complaints`,
        impact: 'Budget scoring not aligning with user expectations',
        suggestedAction: 'Increase budgetFit weight from 1.0 to 1.3, review budget calculation logic',
        evidence: {
          feedbackCount: budgetIssues.length,
          confidence: Math.min(budgetIssues.length / feedback.length, 0.9),
          sampleIds: budgetIssues.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          affectedDestinations: [...new Set(budgetIssues.map(fb => fb.destination_name))],
        },
      })
    }

    // Signal 3: Seasonal/weather mismatches
    const weatherIssues = feedback.filter(fb => {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      return analysis.affectedDimensions.includes('weather') || 
             analysis.affectedDimensions.includes('timing')
    })

    if (weatherIssues.length >= 5) {
      signals.push({
        signalType: 'recommendation_quality',
        priority: 'medium',
        actionable: true,
        signal: `${weatherIssues.length} seasonal/weather timing issues`,
        impact: 'Recommendations not accounting for travel timing properly',
        suggestedAction: 'Increase weatherFit weight, add seasonal warnings, improve month-based filtering',
        evidence: {
          feedbackCount: weatherIssues.length,
          confidence: Math.min(weatherIssues.length / feedback.length, 0.85),
          sampleIds: weatherIssues.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          commonMonths: this.extractCommonMonths(weatherIssues),
        },
      })
    }

    return signals
  }

  /**
   * Extract personalization improvement signals
   */
  private extractPersonalizationSignals(feedback: any[]): IntelligenceSignal[] {
    const signals: IntelligenceSignal[] = []

    // Signal 1: Preference corrections indicate personalization gaps
    const preferenceCorrections = feedback.filter(fb => 
      fb.preference_corrections && Object.keys(fb.preference_corrections).length > 0
    )

    if (preferenceCorrections.length >= 5) {
      const correctionTypes = new Map<string, number>()
      for (const fb of preferenceCorrections) {
        for (const key of Object.keys(fb.preference_corrections)) {
          correctionTypes.set(key, (correctionTypes.get(key) || 0) + 1)
        }
      }

      const topCorrection = Array.from(correctionTypes.entries())
        .sort((a, b) => b[1] - a[1])[0]

      signals.push({
        signalType: 'personalization',
        priority: 'high',
        actionable: true,
        signal: `${preferenceCorrections.length} users correcting preferences (top: ${topCorrection[0]})`,
        impact: 'Personalization not capturing user preferences accurately',
        suggestedAction: `Improve ${topCorrection[0]} inference, add explicit preference questions, enhance profile onboarding`,
        evidence: {
          feedbackCount: preferenceCorrections.length,
          confidence: Math.min(preferenceCorrections.length / feedback.length, 0.9),
          sampleIds: preferenceCorrections.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          correctionBreakdown: Object.fromEntries(correctionTypes),
        },
      })
    }

    // Signal 2: Users without personalization getting poor results
    const nonPersonalizedPoor = feedback.filter(fb => {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      return !fb.personalization_applied && analysis.recommendationQuality <= 2
    })

    if (nonPersonalizedPoor.length >= 3) {
      signals.push({
        signalType: 'personalization',
        priority: 'medium',
        actionable: true,
        signal: `${nonPersonalizedPoor.length} poor recommendations without personalization`,
        impact: 'Users without profiles getting worse recommendations',
        suggestedAction: 'Prompt profile creation earlier, improve default recommendations, infer preferences from queries',
        evidence: {
          feedbackCount: nonPersonalizedPoor.length,
          confidence: 0.8,
          sampleIds: nonPersonalizedPoor.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          percentageNonPersonalized: (nonPersonalizedPoor.length / feedback.length * 100).toFixed(1),
        },
      })
    }

    // Signal 3: Specific preference shift patterns
    const preferenceShifts = feedback.filter(fb => {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      return analysis.userIntentSignal.preferenceShift
    })

    if (preferenceShifts.length >= 5) {
      signals.push({
        signalType: 'personalization',
        priority: 'high',
        actionable: true,
        signal: `${preferenceShifts.length} users indicating preference shifts`,
        impact: 'User preferences evolving but not captured in profiles',
        suggestedAction: 'Implement dynamic preference learning, add "update preferences" prompts, track preference drift',
        evidence: {
          feedbackCount: preferenceShifts.length,
          confidence: 0.85,
          sampleIds: preferenceShifts.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          commonShifts: this.extractCommonShifts(preferenceShifts),
        },
      })
    }

    return signals
  }

  /**
   * Extract explanation quality improvement signals
   */
  private extractExplanationQualitySignals(feedback: any[]): IntelligenceSignal[] {
    const signals: IntelligenceSignal[] = []

    // Signal 1: Low explanation quality scores
    const lowExplanationQuality = feedback.filter(fb => {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      return analysis.explanationQuality <= 2
    })

    if (lowExplanationQuality.length >= 5) {
      const avgScore = lowExplanationQuality.reduce((sum, fb) => 
        sum + (fb.ai_analysis as FeedbackAnalysis).explanationQuality, 0
      ) / lowExplanationQuality.length

      signals.push({
        signalType: 'explanation',
        priority: 'high',
        actionable: true,
        signal: `${lowExplanationQuality.length} explanations rated ≤2/5 (avg: ${avgScore.toFixed(1)})`,
        impact: 'Users not understanding why destinations were recommended',
        suggestedAction: 'Add specific score breakdowns, include data sources, provide concrete examples, reduce generic phrases',
        evidence: {
          feedbackCount: lowExplanationQuality.length,
          confidence: Math.min(lowExplanationQuality.length / feedback.length, 0.9),
          sampleIds: lowExplanationQuality.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          avgExplanationScore: avgScore,
        },
      })
    }

    // Signal 2: "Explanation unclear" reason selected
    const unclearExplanations = feedback.filter(fb => 
      fb.selected_reasons?.includes('Explanation unclear')
    )

    if (unclearExplanations.length >= 5) {
      signals.push({
        signalType: 'explanation',
        priority: 'high',
        actionable: true,
        signal: `${unclearExplanations.length} users report unclear explanations`,
        impact: 'Explanation text not communicating value clearly',
        suggestedAction: 'Simplify language, add visual score breakdowns, highlight key factors, use bullet points',
        evidence: {
          feedbackCount: unclearExplanations.length,
          confidence: 0.9,
          sampleIds: unclearExplanations.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          percentageUnclear: (unclearExplanations.length / feedback.length * 100).toFixed(1),
        },
      })
    }

    // Signal 3: Missing information complaints
    const missingInfo = feedback.filter(fb => 
      fb.selected_reasons?.includes('Missing important info')
    )

    if (missingInfo.length >= 5) {
      const analysis = missingInfo.map(fb => fb.ai_analysis as FeedbackAnalysis)
      const missingTypes = analysis
        .map(a => a.userIntentSignal.missingInformation)
        .filter(Boolean)

      signals.push({
        signalType: 'explanation',
        priority: 'medium',
        actionable: true,
        signal: `${missingInfo.length} users report missing information`,
        impact: 'Explanations lacking critical details users need',
        suggestedAction: 'Add safety details, visa requirements, budget breakdowns, seasonal notes, transport info',
        evidence: {
          feedbackCount: missingInfo.length,
          confidence: 0.85,
          sampleIds: missingInfo.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          commonMissingInfo: missingTypes.slice(0, 5),
        },
      })
    }

    return signals
  }

  /**
   * Extract product-level insight signals
   */
  private extractProductInsightSignals(feedback: any[]): IntelligenceSignal[] {
    const signals: IntelligenceSignal[] = []

    // Signal 1: Scoring mismatch issues
    const scoringMismatches = feedback.filter(fb => {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      return analysis.productIssue.hasIssue && 
             analysis.productIssue.issueType === 'scoring_mismatch'
    })

    if (scoringMismatches.length >= 5) {
      signals.push({
        signalType: 'product_insight',
        priority: 'critical',
        actionable: true,
        signal: `${scoringMismatches.length} scoring mismatch issues detected`,
        impact: 'Scoring algorithm not reflecting user value perception',
        suggestedAction: 'Review category weights, validate scoring logic, A/B test weight adjustments',
        evidence: {
          feedbackCount: scoringMismatches.length,
          confidence: 0.9,
          sampleIds: scoringMismatches.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          affectedCategories: this.extractAffectedCategories(scoringMismatches),
        },
      })
    }

    // Signal 2: Route planning issues
    const routeIssues = feedback.filter(fb => {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      return analysis.productIssue.issueType === 'route_planning' ||
             analysis.affectedDimensions.includes('route_complexity')
    })

    if (routeIssues.length >= 5) {
      signals.push({
        signalType: 'product_insight',
        priority: 'high',
        actionable: true,
        signal: `${routeIssues.length} route planning complaints`,
        impact: 'Route recommendations too complex or impractical',
        suggestedAction: 'Simplify default routes, add complexity preference, improve transfer logic, validate timing',
        evidence: {
          feedbackCount: routeIssues.length,
          confidence: 0.85,
          sampleIds: routeIssues.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          commonComplaints: this.extractRouteComplaints(routeIssues),
        },
      })
    }

    // Signal 3: Data quality issues
    const dataIssues = feedback.filter(fb => {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      return analysis.productIssue.issueType === 'missing_data'
    })

    if (dataIssues.length >= 3) {
      signals.push({
        signalType: 'product_insight',
        priority: 'medium',
        actionable: true,
        signal: `${dataIssues.length} missing data issues`,
        impact: 'Incomplete destination data affecting recommendations',
        suggestedAction: 'Expand knowledge base, add data validation, integrate more providers, flag low-data destinations',
        evidence: {
          feedbackCount: dataIssues.length,
          confidence: 0.8,
          sampleIds: dataIssues.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          affectedDestinations: [...new Set(dataIssues.map(fb => fb.destination_name))],
        },
      })
    }

    // Signal 4: High-performing patterns (positive insight)
    const highQuality = feedback.filter(fb => {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      return (analysis.sentiment === 'positive' || analysis.sentiment === 'very_positive') &&
             analysis.recommendationQuality >= 4
    })

    if (highQuality.length >= 10) {
      signals.push({
        signalType: 'product_insight',
        priority: 'medium',
        actionable: true,
        signal: `${highQuality.length} high-quality recommendations (≥4/5)`,
        impact: 'Successful recommendation patterns identified',
        suggestedAction: 'Analyze common factors, replicate success patterns, document best practices',
        evidence: {
          feedbackCount: highQuality.length,
          confidence: 0.9,
          sampleIds: highQuality.slice(0, 5).map(fb => fb.id),
        },
        metadata: {
          successRate: (highQuality.length / feedback.length * 100).toFixed(1),
          topDestinations: this.extractTopDestinations(highQuality),
        },
      })
    }

    return signals
  }

  /**
   * Apply intelligence signals to improve the system
   */
  async applySignals(signals: IntelligenceSignal[]): Promise<{
    applied: number
    deferred: number
    actions: string[]
  }> {
    const supabase = await createServerSupabaseClient()
    let applied = 0
    let deferred = 0
    const actions: string[] = []

    for (const signal of signals.filter(s => s.actionable)) {
      // Apply high-priority recommendation quality signals
      if (signal.signalType === 'recommendation_quality' && signal.priority === 'critical') {
        // Store as score weight suggestion for admin review
        await supabase.from('score_weight_suggestions').insert({
          score_category: this.extractCategoryFromSignal(signal),
          current_weight: 1.0,
          suggested_weight: 1.2,
          adjustment_reason: signal.signal,
          feedback_count: signal.evidence.feedbackCount,
          confidence: signal.evidence.confidence,
          sample_feedback_ids: signal.evidence.sampleIds,
        })
        deferred++
        actions.push(`Deferred for admin review: ${signal.suggestedAction}`)
      }

      // Apply personalization signals immediately
      if (signal.signalType === 'personalization') {
        // Store as feedback insight
        await supabase.from('feedback_insights').insert({
          insight_type: 'user_intent_correction',
          theme: signal.signal,
          description: signal.impact,
          frequency: signal.evidence.feedbackCount,
          severity: signal.priority === 'critical' ? 'high' : signal.priority,
          affected_dimensions: [signal.metadata.correctionBreakdown ? Object.keys(signal.metadata.correctionBreakdown) : []].flat(),
          sample_feedback_ids: signal.evidence.sampleIds,
          period_start: this.getStartDate(new Date(), 'week').toISOString(),
          period_end: new Date().toISOString(),
        })
        applied++
        actions.push(`Applied: ${signal.suggestedAction}`)
      }

      // Store explanation quality signals
      if (signal.signalType === 'explanation') {
        await supabase.from('feedback_insights').insert({
          insight_type: 'explanation_quality',
          theme: signal.signal,
          description: signal.impact,
          frequency: signal.evidence.feedbackCount,
          severity: signal.priority === 'critical' ? 'high' : signal.priority,
          sample_feedback_ids: signal.evidence.sampleIds,
          period_start: this.getStartDate(new Date(), 'week').toISOString(),
          period_end: new Date().toISOString(),
        })
        applied++
        actions.push(`Logged: ${signal.suggestedAction}`)
      }

      // Store product insights
      if (signal.signalType === 'product_insight') {
        await supabase.from('feedback_insights').insert({
          insight_type: 'product_issue_cluster',
          theme: signal.signal,
          description: signal.impact,
          frequency: signal.evidence.feedbackCount,
          severity: signal.priority === 'critical' ? 'high' : signal.priority,
          sample_feedback_ids: signal.evidence.sampleIds,
          period_start: this.getStartDate(new Date(), 'week').toISOString(),
          period_end: new Date().toISOString(),
          metadata: signal.metadata,
        })
        applied++
        actions.push(`Logged: ${signal.suggestedAction}`)
      }
    }

    return { applied, deferred, actions }
  }

  // Helper methods
  private getStartDate(now: Date, timeframe: 'day' | 'week' | 'month'): Date {
    const ms = timeframe === 'day' ? 24 * 60 * 60 * 1000 
      : timeframe === 'week' ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000
    return new Date(now.getTime() - ms)
  }

  private extractCommonMonths(feedback: any[]): number[] {
    const months = new Map<number, number>()
    for (const fb of feedback) {
      const constraints = fb.user_constraints
      if (constraints?.travelMonths) {
        for (const month of constraints.travelMonths) {
          months.set(month, (months.get(month) || 0) + 1)
        }
      }
    }
    return Array.from(months.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([month]) => month)
  }

  private extractCommonShifts(feedback: any[]): string[] {
    const shifts = new Map<string, number>()
    for (const fb of feedback) {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      if (analysis.userIntentSignal.specificRequest) {
        shifts.set(
          analysis.userIntentSignal.specificRequest,
          (shifts.get(analysis.userIntentSignal.specificRequest) || 0) + 1
        )
      }
    }
    return Array.from(shifts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([shift]) => shift)
  }

  private extractAffectedCategories(feedback: any[]): string[] {
    const categories = new Set<string>()
    for (const fb of feedback) {
      const analysis = fb.ai_analysis as FeedbackAnalysis
      for (const dim of analysis.affectedDimensions) {
        categories.add(dim)
      }
    }
    return Array.from(categories).slice(0, 5)
  }

  private extractRouteComplaints(feedback: any[]): string[] {
    return feedback
      .map(fb => fb.selected_reasons)
      .flat()
      .filter((r: string) => r?.includes('Route') || r?.includes('complicated'))
      .slice(0, 5)
  }

  private extractTopDestinations(feedback: any[]): string[] {
    const dests = new Map<string, number>()
    for (const fb of feedback) {
      dests.set(fb.destination_name, (dests.get(fb.destination_name) || 0) + 1)
    }
    return Array.from(dests.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dest]) => dest)
  }

  private extractCategoryFromSignal(signal: IntelligenceSignal): string {
    if (signal.signal.toLowerCase().includes('budget')) return 'budgetFit'
    if (signal.signal.toLowerCase().includes('weather')) return 'weatherFit'
    if (signal.signal.toLowerCase().includes('safety')) return 'safety'
    return 'overall'
  }
}
