// Retraining Readiness and Model Version Management
import { logger } from '../../utils'

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
  private currentModelVersion: ModelVersion | null = null
  private modelHistory: ModelVersion[] = []
  private dataSnapshots: TrainingDataSnapshot[] = []
  
  private readonly MIN_TRAINING_EXAMPLES = 100
  private readonly MIN_DATA_QUALITY = 0.7
  private readonly FEATURE_SCHEMA_VERSION = '1.0.0'

  /**
   * Check if system is ready for retraining
   */
  async checkRetrainingReadiness(): Promise<RetrainingReadinessStatus> {
    const reasons: string[] = []
    const recommendedActions: string[] = []
    let ready = true

    // Get latest data snapshot
    const latestSnapshot = this.getLatestDataSnapshot()

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
      currentModel: this.currentModelVersion,
      recommendedActions,
      estimatedTrainingTime,
    }
  }

  /**
   * Register a new training data snapshot
   */
  registerDataSnapshot(snapshot: TrainingDataSnapshot) {
    this.dataSnapshots.push(snapshot)
    logger.info('Training data snapshot registered', {
      snapshotId: snapshot.snapshotId,
      exampleCount: snapshot.exampleCount,
    })
  }

  /**
   * Register a new model version
   */
  registerModelVersion(model: ModelVersion) {
    this.modelHistory.push(model)
    if (model.status === 'deployed') {
      this.currentModelVersion = model
      logger.info('Model version deployed', {
        version: model.version,
        ndcg: model.evaluationMetrics.ndcg,
      })
    }
  }

  /**
   * Get latest data snapshot
   */
  getLatestDataSnapshot(): TrainingDataSnapshot | null {
    if (this.dataSnapshots.length === 0) return null
    return this.dataSnapshots[this.dataSnapshots.length - 1]
  }

  /**
   * Get current model version
   */
  getCurrentModel(): ModelVersion | null {
    return this.currentModelVersion
  }

  /**
   * Get model history
   */
  getModelHistory(): ModelVersion[] {
    return this.modelHistory
  }

  /**
   * Get all data snapshots
   */
  getDataSnapshots(): TrainingDataSnapshot[] {
    return this.dataSnapshots
  }

  /**
   * Compare current model with baseline
   */
  compareWithBaseline(): {
    hasTrainedModel: boolean
    modelVersion?: string
    deployedAt?: string
    evaluationMetrics?: ModelVersion['evaluationMetrics']
    isUsingML: boolean
  } {
    if (!this.currentModelVersion) {
      return {
        hasTrainedModel: false,
        isUsingML: false,
      }
    }

    return {
      hasTrainedModel: true,
      modelVersion: this.currentModelVersion.version,
      deployedAt: this.currentModelVersion.deployedAt,
      evaluationMetrics: this.currentModelVersion.evaluationMetrics,
      isUsingML: this.currentModelVersion.status === 'deployed',
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

    this.registerDataSnapshot(snapshot)
    return snapshot
  }

  /**
   * Archive old model version
   */
  archiveModel(version: string) {
    const model = this.modelHistory.find(m => m.version === version)
    if (model) {
      model.status = 'archived'
      logger.info('Model version archived', { version })
    }
  }

  /**
   * Get retraining recommendations
   */
  getRetrainingRecommendations(): string[] {
    const recommendations: string[] = []
    const latestSnapshot = this.getLatestDataSnapshot()

    if (!latestSnapshot) {
      recommendations.push('Create initial training data snapshot')
      return recommendations
    }

    // Check if enough new data since last training
    if (this.currentModelVersion) {
      const lastTrainingDate = new Date(this.currentModelVersion.trainingDate)
      const snapshotDate = new Date(latestSnapshot.createdAt)
      const daysSinceTraining = (snapshotDate.getTime() - lastTrainingDate.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceTraining > 30) {
        recommendations.push('Consider retraining: 30+ days since last training')
      }

      const newExamples = latestSnapshot.exampleCount - this.currentModelVersion.trainingExampleCount
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
