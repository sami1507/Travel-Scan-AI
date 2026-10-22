// Retraining Readiness and Model Version Management
// State is persisted to Supabase (ml_model_versions / ml_data_snapshots) so it
// survives serverless cold starts. Rows are cached in memory per instance and
// hydrated lazily on first access.
import { logger } from '../../utils'
import { createAdminClient } from '../../supabase/admin'

export interface ModelVersion {
  version: string
  trainingDate: string
  datasetVersion: string
  featureSchemaVersion: string
  trainingExampleCount: number
  evaluationMetrics: {
    ndcg: number
    mrr: number
    accuracy: number
    precision: number
    recall: number
  }
  modelArtifacts: {
    weightsPath?: string
    configPath?: string
    featureImportancePath?: string
  }
  status: 'training' | 'evaluating' | 'deployed' | 'archived'
  deployedAt?: string
  notes?: string
}

export interface TrainingDataSnapshot {
  snapshotId: string
  createdAt: string
  exampleCount: number
  dateRange: {
    from: string
    to: string
  }
  featureSchemaVersion: string
  dataQuality: {
    completeness: number // 0-1
    labeledExamples: number
    positiveExamples: number
    negativeExamples: number
  }
  exportPath?: string
  format: 'jsonl' | 'json' | 'csv'
}

export interface RetrainingReadinessStatus {
  ready: boolean
  reasons: string[]
  dataSnapshot: TrainingDataSnapshot | null
  currentModel: ModelVersion | null
  recommendedActions: string[]
  estimatedTrainingTime?: string
}

class RetrainingManager {
  private modelHistory: ModelVersion[] = []
  private dataSnapshots: TrainingDataSnapshot[] = []
  private loaded = false
  private loading: Promise<void> | null = null

  private readonly MIN_TRAINING_EXAMPLES = 100
  private readonly MIN_DATA_QUALITY = 0.7
  private readonly FEATURE_SCHEMA_VERSION = '1.0.0'

  /**
   * Hydrate in-memory cache from Supabase (once per instance)
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    if (this.loading) return this.loading

    this.loading = (async () => {
      const supabase = createAdminClient()

      const [modelsResult, snapshotsResult] = await Promise.all([
        supabase.from('ml_model_versions').select('*').order('training_date', { ascending: true }),
        supabase.from('ml_data_snapshots').select('*').order('created_at', { ascending: true }),
      ])

      if (modelsResult.error) {
        logger.error('Failed to load model versions', modelsResult.error)
        throw modelsResult.error
      }
      if (snapshotsResult.error) {
        logger.error('Failed to load data snapshots', snapshotsResult.error)
        throw snapshotsResult.error
      }

      this.modelHistory = (modelsResult.data || []).map((row: any) => ({
        version: row.version,
        trainingDate: row.training_date,
        datasetVersion: row.dataset_version,
        featureSchemaVersion: row.feature_schema_version,
        trainingExampleCount: row.training_example_count,
        evaluationMetrics: row.evaluation_metrics,
        modelArtifacts: row.model_artifacts || {},
        status: row.status,
        deployedAt: row.deployed_at || undefined,
        notes: row.notes || undefined,
      }))

      this.dataSnapshots = (snapshotsResult.data || []).map((row: any) => ({
        snapshotId: row.snapshot_id,
        createdAt: row.created_at,
        exampleCount: row.example_count,
        dateRange: row.date_range,
        featureSchemaVersion: row.feature_schema_version,
        dataQuality: row.data_quality,
        exportPath: row.export_path || undefined,
        format: row.format || 'jsonl',
      }))

      this.loaded = true
    })()

    try {
      await this.loading
    } finally {
      this.loading = null
    }
  }

  /**
   * Check if system is ready for retraining
   */
  async checkRetrainingReadiness(): Promise<RetrainingReadinessStatus> {
    await this.ensureLoaded()

    const reasons: string[] = []
    const recommendedActions: string[] = []
    let ready = true

    // Get latest data snapshot
    const latestSnapshot = this.dataSnapshots.length > 0
      ? this.dataSnapshots[this.dataSnapshots.length - 1]
      : null

    // Check 1: Sufficient training data
    if (!latestSnapshot || latestSnapshot.exampleCount < this.MIN_TRAINING_EXAMPLES) {
      ready = false
      reasons.push(
        `Insufficient training examples: ${latestSnapshot?.exampleCount || 0} < ${this.MIN_TRAINING_EXAMPLES}`
      )
      recommendedActions.push('Collect more user feedback and interactions')
    }

    // Check 2: Data quality
    if (latestSnapshot && latestSnapshot.dataQuality.completeness < this.MIN_DATA_QUALITY) {
      ready = false
      reasons.push(
        `Low data quality: ${(latestSnapshot.dataQuality.completeness * 100).toFixed(1)}% < ${this.MIN_DATA_QUALITY * 100}%`
      )
      recommendedActions.push('Improve data collection completeness')
    }

    // Check 3: Balanced labels
    if (latestSnapshot) {
      const { positiveExamples, negativeExamples } = latestSnapshot.dataQuality
      const total = positiveExamples + negativeExamples
      if (total > 0) {
        const positiveRate = positiveExamples / total
        if (positiveRate < 0.1 || positiveRate > 0.9) {
          ready = false
          reasons.push(
            `Imbalanced labels: ${(positiveRate * 100).toFixed(1)}% positive (should be 10-90%)`
          )
          recommendedActions.push('Collect more diverse feedback to balance labels')
        }
      }
    }

    // Check 4: Feature schema compatibility
    if (latestSnapshot && latestSnapshot.featureSchemaVersion !== this.FEATURE_SCHEMA_VERSION) {
      ready = false
      reasons.push(
        `Feature schema mismatch: ${latestSnapshot.featureSchemaVersion} != ${this.FEATURE_SCHEMA_VERSION}`
      )
      recommendedActions.push('Regenerate training data with current feature schema')
    }

    // Estimate training time
    let estimatedTrainingTime: string | undefined
    if (latestSnapshot) {
      const exampleCount = latestSnapshot.exampleCount
      if (exampleCount < 1000) {
        estimatedTrainingTime = '5-10 minutes'
      } else if (exampleCount < 10000) {
        estimatedTrainingTime = '15-30 minutes'
      } else {
        estimatedTrainingTime = '30-60 minutes'
      }
    }

    if (ready) {
      reasons.push('All retraining requirements met')
      recommendedActions.push('Ready to start model training')
    }

    return {
      ready,
      reasons,
      dataSnapshot: latestSnapshot,
      currentModel: this.getDeployedModel(),
      recommendedActions,
      estimatedTrainingTime,
    }
  }

  /**
   * Register a new training data snapshot (persisted to Supabase)
   */
  async registerDataSnapshot(snapshot: TrainingDataSnapshot): Promise<void> {
    await this.ensureLoaded()

    const supabase = createAdminClient()
    const { error } = await supabase.from('ml_data_snapshots').insert({
      snapshot_id: snapshot.snapshotId,
      example_count: snapshot.exampleCount,
      date_range: snapshot.dateRange,
      feature_schema_version: snapshot.featureSchemaVersion,
      data_quality: snapshot.dataQuality,
      export_path: snapshot.exportPath,
      format: snapshot.format,
    } as any)

    if (error) {
      logger.error('Failed to persist data snapshot', error)
      throw error
    }

    this.dataSnapshots.push(snapshot)
    logger.info('Training data snapshot registered', {
      snapshotId: snapshot.snapshotId,
      exampleCount: snapshot.exampleCount,
    })
  }

  /**
   * Register a new model version (persisted to Supabase)
   */
  async registerModelVersion(model: ModelVersion): Promise<void> {
    await this.ensureLoaded()

    const supabase = createAdminClient()
    const { error } = await supabase.from('ml_model_versions').insert({
      version: model.version,
      training_date: model.trainingDate,
      dataset_version: model.datasetVersion,
      feature_schema_version: model.featureSchemaVersion,
      training_example_count: model.trainingExampleCount,
      evaluation_metrics: model.evaluationMetrics,
      model_artifacts: model.modelArtifacts,
      status: model.status,
      deployed_at: model.deployedAt,
      notes: model.notes,
    } as any)

    if (error) {
      logger.error('Failed to persist model version', error)
      throw error
    }

    this.modelHistory.push(model)
    if (model.status === 'deployed') {
      logger.info('Model version deployed', {
        version: model.version,
        ndcg: model.evaluationMetrics.ndcg,
      })
    }
  }

  /**
   * Get latest data snapshot
   */
  async getLatestDataSnapshot(): Promise<TrainingDataSnapshot | null> {
    await this.ensureLoaded()
    if (this.dataSnapshots.length === 0) return null
    return this.dataSnapshots[this.dataSnapshots.length - 1]
  }

  private getDeployedModel(): ModelVersion | null {
    return this.modelHistory.find(m => m.status === 'deployed') || null
  }

  /**
   * Get current (deployed) model version
   */
  async getCurrentModel(): Promise<ModelVersion | null> {
    await this.ensureLoaded()
    return this.getDeployedModel()
  }

  /**
   * Get model history
   */
  async getModelHistory(): Promise<ModelVersion[]> {
    await this.ensureLoaded()
    return this.modelHistory
  }

  /**
   * Get all data snapshots
   */
  async getDataSnapshots(): Promise<TrainingDataSnapshot[]> {
    await this.ensureLoaded()
    return this.dataSnapshots
  }

  /**
   * Compare current model with baseline
   */
  async compareWithBaseline(): Promise<{
    hasTrainedModel: boolean
    modelVersion?: string
    deployedAt?: string
    evaluationMetrics?: ModelVersion['evaluationMetrics']
    isUsingML: boolean
  }> {
    await this.ensureLoaded()
    const currentModel = this.getDeployedModel()

    if (!currentModel) {
      return {
        hasTrainedModel: false,
        isUsingML: false,
      }
    }

    return {
      hasTrainedModel: true,
      modelVersion: currentModel.version,
      deployedAt: currentModel.deployedAt,
      evaluationMetrics: currentModel.evaluationMetrics,
      isUsingML: currentModel.status === 'deployed',
    }
  }

  /**
   * Create a new training data snapshot from current data
   */
  async createDataSnapshot(
    exampleCount: number,
    dateRange: { from: string; to: string },
    dataQuality: TrainingDataSnapshot['dataQuality'],
    exportPath?: string
  ): Promise<TrainingDataSnapshot> {
    const snapshot: TrainingDataSnapshot = {
      snapshotId: `snapshot_${Date.now()}`,
      createdAt: new Date().toISOString(),
      exampleCount,
      dateRange,
      featureSchemaVersion: this.FEATURE_SCHEMA_VERSION,
      dataQuality,
      exportPath,
      format: 'jsonl',
    }

    await this.registerDataSnapshot(snapshot)
    return snapshot
  }

  /**
   * Archive old model version (persisted to Supabase)
   */
  async archiveModel(version: string): Promise<void> {
    await this.ensureLoaded()

    const model = this.modelHistory.find(m => m.version === version)
    if (!model) return

    const supabase = createAdminClient()
    const { error } = await (supabase.from('ml_model_versions') as any)
      .update({ status: 'archived' })
      .eq('version', version)

    if (error) {
      logger.error('Failed to archive model version', error)
      throw error
    }

    model.status = 'archived'
    logger.info('Model version archived', { version })
  }

  /**
   * Get retraining recommendations
   */
  async getRetrainingRecommendations(): Promise<string[]> {
    await this.ensureLoaded()

    const recommendations: string[] = []
    const latestSnapshot = this.dataSnapshots.length > 0
      ? this.dataSnapshots[this.dataSnapshots.length - 1]
      : null

    if (!latestSnapshot) {
      recommendations.push('Create initial training data snapshot')
      return recommendations
    }

    const currentModel = this.getDeployedModel()

    // Check if enough new data since last training
    if (currentModel) {
      const lastTrainingDate = new Date(currentModel.trainingDate)
      const snapshotDate = new Date(latestSnapshot.createdAt)
      const daysSinceTraining = (snapshotDate.getTime() - lastTrainingDate.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceTraining > 30) {
        recommendations.push('Consider retraining: 30+ days since last training')
      }

      const newExamples = latestSnapshot.exampleCount - currentModel.trainingExampleCount
      if (newExamples > 100) {
        recommendations.push(`${newExamples} new training examples available`)
      }
    }

    // Check data quality
    if (latestSnapshot.dataQuality.completeness < 0.8) {
      recommendations.push('Improve data quality before retraining')
    }

    // Check label balance
    const { positiveExamples, negativeExamples } = latestSnapshot.dataQuality
    const total = positiveExamples + negativeExamples
    if (total > 0) {
      const positiveRate = positiveExamples / total
      if (positiveRate < 0.2 || positiveRate > 0.8) {
        recommendations.push('Collect more balanced feedback before retraining')
      }
    }

    return recommendations
  }
}

// Singleton instance
export const retrainingManager = new RetrainingManager()
