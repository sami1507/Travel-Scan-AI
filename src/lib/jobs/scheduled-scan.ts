// Scheduled scan job - ready for cron integration
// This can be triggered by:
// 1. Vercel Cron Jobs
// 2. GitHub Actions
// 3. External cron services (cron-job.org, etc.)
// 4. Node-cron for self-hosted

import { getActiveSourceConfigs } from '../db/sources'
import { orchestrator } from '../services/orchestrator'
import { logger } from '../utils'

export async function runScheduledScans() {
  logger.info('Starting scheduled scan job')

  try {
    // Get all active sources that need scanning
    const sourceConfigs = await getActiveSourceConfigs()

    if (sourceConfigs.length === 0) {
      logger.info('No active sources to scan')
      return { success: true, scanned: 0 }
    }

    // Filter sources based on polling interval
    const now = new Date()
    const sourcesToScan = sourceConfigs.filter(source => {
      if (!source.last_run_at) return true // Never run before

      const lastRun = new Date(source.last_run_at)
      const minutesSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60)

      return minutesSinceLastRun >= source.polling_interval_minutes
    })

    logger.info('Sources ready for scanning', { 
      total: sourceConfigs.length, 
      ready: sourcesToScan.length 
    })

    if (sourcesToScan.length === 0) {
      return { success: true, scanned: 0 }
    }

    // Run scans
    await orchestrator.runMultipleSources(sourcesToScan)

    logger.info('Scheduled scan job completed', { scanned: sourcesToScan.length })

    return { success: true, scanned: sourcesToScan.length }
  } catch (error) {
    logger.error('Scheduled scan job failed', error)
    throw error
  }
}

// For direct execution (e.g., node-cron)
if (require.main === module) {
  runScheduledScans()
    .then(result => {
      console.log('Job completed:', result)
      process.exit(0)
    })
    .catch(error => {
      console.error('Job failed:', error)
      process.exit(1)
    })
}
