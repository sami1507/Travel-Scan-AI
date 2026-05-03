// Orchestrator - coordinates ingestion and scanning
import type { SourceConfig } from '../types'
import { ingestionEngine } from './ingestion/ingestion-engine'
import { scanEngine } from './scan/scan-engine'
import { logger } from '../utils'

export class Orchestrator {
  async runFullPipeline(sourceConfig: SourceConfig): Promise<void> {
    logger.info('Starting full pipeline', { sourceConfigId: sourceConfig.id })

    try {
      // Step 1: Run ingestion
      const ingestionRun = await ingestionEngine.runIngestion(sourceConfig)

      // Step 2: Run scan and generate alerts
      await scanEngine.runScan(ingestionRun, sourceConfig.id, sourceConfig.user_id)

      logger.info('Pipeline completed successfully', { sourceConfigId: sourceConfig.id })
    } catch (error) {
      logger.error('Pipeline failed', error, { sourceConfigId: sourceConfig.id })
      throw error
    }
  }

  async runMultipleSources(sourceConfigs: SourceConfig[]): Promise<void> {
    logger.info('Running pipeline for multiple sources', { count: sourceConfigs.length })

    const results = await Promise.allSettled(
      sourceConfigs.map(config => this.runFullPipeline(config))
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    logger.info('Batch pipeline completed', { total: sourceConfigs.length, successful, failed })

    if (failed > 0) {
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason)
      
      logger.error('Some pipelines failed', errors[0], { failedCount: failed })
    }
  }
}

export const orchestrator = new Orchestrator()
