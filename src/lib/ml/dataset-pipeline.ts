// ML Dataset Pipeline - creates reproducible ML-ready datasets from product data
import type { UserFeedback } from '../types/feedback'
import type { RankedDestination } from '../analysis/schemas'
import type { UserPreferenceProfile } from '../types/preferences'
import type { TrainingExample, Outcome, DatasetMetadata } from './schemas'
import { featureEngineer } from './feature-engineering'
import { logger } from '../utils'
import { getUserFeedback } from '../db/feedback'
import { getUserPreferences } from '../db/preferences'
import { createAdminClient } from '../supabase/admin'

export class MLDatasetPipeline {
  private dataVersion = '1.0'

  /**
   * Create a training example from a recommendation interaction
   */
  async createTrainingExample(
    userId: string,
    sessionId: string,
    destination: RankedDestination,
    rank: number,
    queryContext: {
      query: string
      budget?: string
      travelMonths?: number[]
      interests?: string[]
      travelStyle?: string
      pace?: string
    },
    feedback: UserFeedback,
    analysisId?: string
  ): Promise<TrainingExample> {
    // Load user profile and feedback history
    const userProfile = await getUserPreferences(userId)
    const feedbackHistory = await getUserFeedback(userId, 100)

    // Extract features
    const userFeatures = featureEngineer.extractUserFeatures(userProfile, feedbackHistory)
    const itemFeatures = featureEngineer.extractItemFeatures(destination, rank)
    const contextFeatures = featureEngineer.extractContextFeatures(queryContext)

    // Determine outcome
    const outcome = this.createOutcome(feedback)

    // Determine example type
    const exampleType = this.determineExampleType(feedback, destination)

    // Calculate quality score
    const qualityScore = this.calculateExampleQuality(
      userFeatures,
      itemFeatures,
      contextFeatures,
      outcome
    )

    const example: TrainingExample = {
      exampleId: `${userId}_${sessionId}_${destination.destinationId}_${Date.now()}`,
      userId,
      sessionId,
      analysisId,
      timestamp: new Date().toISOString(),
      userFeatures,
      itemFeatures,
      contextFeatures,
      outcome,
      dataVersion: this.dataVersion,
      exampleType,
      qualityScore,
    }

    logger.info('ML Dataset: Created training example', {
      exampleId: example.exampleId,
      exampleType,
      qualityScore,
      wasAccepted: outcome.wasAccepted,
    })

    return example
  }

  /**
   * Create outcome from feedback
   */
  private createOutcome(feedback: UserFeedback): Outcome {
    const wasAccepted =
      feedback.feedback_type === 'thumbs-up' ||
      feedback.feedback_type === 'save-trip' ||
      feedback.feedback_type === 'select-destination'

    const interactionDepth =
      feedback.feedback_type === 'select-destination'
        ? 'select'
        : feedback.feedback_type === 'save-trip'
        ? 'save'
        : feedback.feedback_type === 'view-details'
        ? 'view'
        : 'none'

    // Check if this is a high-quality ideal example
    const isIdealExample =
      wasAccepted &&
      (feedback.feedback_type === 'select-destination' ||
        (feedback.feedback_type === 'save-trip' && feedback.feedback_metadata?.comment))

    return {
      wasAccepted,
      feedbackType: feedback.feedback_type as any,
      interactionDepth: interactionDepth as any,
      richFeedbackComment: feedback.feedback_metadata?.comment as string,
      selectedFeedbackReasons: feedback.feedback_metadata?.reasons as string[],
      preferenceCorrection: feedback.feedback_metadata?.preferenceCorrection,
      outcomeConfidence: this.calculateOutcomeConfidence(feedback),
      isIdealExample,
    }
  }

  /**
   * Determine example type
   */
  private determineExampleType(
    feedback: UserFeedback,
    destination: RankedDestination
  ): 'recommendation-acceptance' | 'destination-relevance' | 'route-suitability' | 'accommodation-suitability' {
    // Check if feedback mentions accommodation
    const comment = feedback.feedback_metadata?.comment?.toLowerCase() || ''
    if (comment.includes('hotel') || comment.includes('apartment') || comment.includes('rental')) {
      return 'accommodation-suitability'
    }

    // Check if feedback mentions route/itinerary
    if (comment.includes('route') || comment.includes('itinerary') || comment.includes('too much')) {
      return 'route-suitability'
    }

    // Check if it's about destination relevance
    if (
      feedback.feedback_type === 'thumbs-down' &&
      (comment.includes('not what') || comment.includes('wrong') || comment.includes('different'))
    ) {
      return 'destination-relevance'
    }

    // Default: recommendation acceptance
    return 'recommendation-acceptance'
  }

  /**
   * Calculate outcome confidence
   */
  private calculateOutcomeConfidence(feedback: UserFeedback): number {
    let confidence = 1.0

    // Explicit actions have high confidence
    if (feedback.feedback_type === 'select-destination') return 1.0
    if (feedback.feedback_type === 'save-trip') return 0.9

    // Thumbs up/down with comment have higher confidence
    if (
      (feedback.feedback_type === 'thumbs-up' || feedback.feedback_type === 'thumbs-down') &&
      feedback.feedback_metadata?.comment
    ) {
      return 0.8
    }

    // Thumbs up/down without comment
    if (feedback.feedback_type === 'thumbs-up' || feedback.feedback_type === 'thumbs-down') {
      return 0.7
    }

    // View details is weaker signal
    if (feedback.feedback_type === 'view-details') return 0.4

    // Dismiss is moderate signal
    if (feedback.feedback_type === 'dismiss-recommendation') return 0.6

    return confidence
  }

  /**
   * Calculate example quality score
   */
  private calculateExampleQuality(
    userFeatures: any,
    itemFeatures: any,
    contextFeatures: any,
    outcome: Outcome
  ): number {
    let quality = 0.5 // Base quality

    // Higher quality if user has more feedback history
    if (userFeatures.totalFeedbackCount >= 10) quality += 0.1
    if (userFeatures.totalFeedbackCount >= 20) quality += 0.1

    // Higher quality if item has strong evidence
    if (itemFeatures.evidenceStrength >= 0.7) quality += 0.1

    // Higher quality if outcome has high confidence
    if (outcome.outcomeConfidence >= 0.8) quality += 0.1

    // Higher quality if there's rich feedback
    if (outcome.richFeedbackComment) quality += 0.1

    // Higher quality if it's an ideal example
    if (outcome.isIdealExample) quality += 0.2

    // Lower quality if there are contradictions
    if (contextFeatures.hasContradictions) quality -= 0.1

    return Math.max(0, Math.min(1, quality))
  }

  /**
   * Generate dataset from feedback history
   */
  async generateDataset(
    startDate: string,
    endDate: string,
    minQualityScore: number = 0.5
  ): Promise<{
    examples: TrainingExample[]
    metadata: DatasetMetadata
  }> {
    logger.info('ML Dataset: Generating dataset', { startDate, endDate, minQualityScore })

    const supabase = createAdminClient()

    // Fetch feedback in date range
    const { data: feedbackData, error } = await supabase
      .from('user_feedback')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Failed to fetch feedback for dataset', error)
      throw error
    }

    const examples: TrainingExample[] = []
    const userIds = new Set<string>()
    const outcomeDistribution: Record<string, number> = {}

    // Note: This is a simplified version. In production, you'd need to:
    // 1. Store analysis results with recommendations
    // 2. Link feedback to specific recommendations
    // 3. Reconstruct the full context for each example
    // For now, we'll create a placeholder structure

    logger.info('ML Dataset: Dataset generation complete (placeholder)', {
      exampleCount: examples.length,
      userCount: userIds.size,
    })

    const metadata: DatasetMetadata = {
      datasetId: `dataset_${Date.now()}`,
      version: this.dataVersion,
      createdAt: new Date().toISOString(),
      exampleCount: examples.length,
      userCount: userIds.size,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      featureStats: {
        userFeatureCount: Object.keys(featureEngineer.extractUserFeatures(null, [])).length,
        itemFeatureCount: 0, // Would be calculated from actual examples
        contextFeatureCount: 0, // Would be calculated from actual examples
      },
      outcomeDistribution,
      qualityMetrics: {
        avgQualityScore: 0,
        highQualityCount: 0,
        idealExampleCount: 0,
      },
    }

    return { examples, metadata }
  }

  /**
   * Store training example for future fine-tuning
   */
  async storeTrainingExample(example: TrainingExample): Promise<void> {
    const supabase = createAdminClient()

    const { error } = await supabase.from('ml_training_examples').insert({
      example_id: example.exampleId,
      user_id: example.userId,
      session_id: example.sessionId,
      analysis_id: example.analysisId,
      timestamp: example.timestamp,
      user_features: example.userFeatures as any,
      item_features: example.itemFeatures as any,
      context_features: example.contextFeatures as any,
      outcome: example.outcome as any,
      data_version: example.dataVersion,
      example_type: example.exampleType,
      quality_score: example.qualityScore,
    } as any)

    if (error) {
      logger.error('Failed to store training example', error)
      throw error
    }

    logger.info('ML Dataset: Stored training example', {
      exampleId: example.exampleId,
      exampleType: example.exampleType,
    })
  }

  /**
   * Retrieve high-quality examples for fine-tuning
   */
  async getHighQualityExamples(
    minQualityScore: number = 0.7,
    limit: number = 1000
  ): Promise<TrainingExample[]> {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ml_training_examples')
      .select('*')
      .gte('quality_score', minQualityScore)
      .order('quality_score', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('Failed to retrieve high-quality examples', error)
      throw error
    }

    return (data || []).map((row: any) => ({
      exampleId: row.example_id,
      userId: row.user_id,
      sessionId: row.session_id,
      analysisId: row.analysis_id,
      timestamp: row.timestamp,
      userFeatures: row.user_features,
      itemFeatures: row.item_features,
      contextFeatures: row.context_features,
      outcome: row.outcome,
      dataVersion: row.data_version,
      exampleType: row.example_type,
      qualityScore: row.quality_score,
    }))
  }

  /**
   * Export dataset for external ML tools
   */
  async exportDataset(
    examples: TrainingExample[],
    format: 'json' | 'jsonl' | 'csv' = 'jsonl'
  ): Promise<string> {
    if (format === 'jsonl') {
      return examples.map(ex => JSON.stringify(ex)).join('\n')
    }

    if (format === 'json') {
      return JSON.stringify(examples, null, 2)
    }

    // CSV format (simplified)
    const headers = [
      'example_id',
      'user_id',
      'example_type',
      'was_accepted',
      'quality_score',
      'total_match_score',
      'recommendation_rank',
    ]

    const rows = examples.map(ex => [
      ex.exampleId,
      ex.userId,
      ex.exampleType,
      ex.outcome.wasAccepted,
      ex.qualityScore,
      ex.itemFeatures.totalMatchScore,
      ex.itemFeatures.recommendationRank,
    ])

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }
}

export const mlDatasetPipeline = new MLDatasetPipeline()
