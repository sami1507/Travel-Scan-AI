// Base provider interface and abstract class
import type { TravelProvider, ProviderResponse, SourceConfig, NormalizedRecord } from '../types'
import { generateContentHash, generateId, logger } from '../utils'

export abstract class BaseProvider implements TravelProvider {
  abstract name: string
  abstract type: SourceConfig['source_type']

  abstract fetch(config: SourceConfig): Promise<ProviderResponse>
  abstract validate(data: any): boolean
  abstract normalize(data: any, config: SourceConfig, ingestionRunId: string): NormalizedRecord[]

  protected createNormalizedRecord(
    sourceConfigId: string,
    ingestionRunId: string,
    externalId: string,
    recordType: string,
    content: Record<string, any>,
    metadata: Record<string, any> = {}
  ): NormalizedRecord {
    const contentHash = generateContentHash(content)

    return {
      id: generateId(),
      source_config_id: sourceConfigId,
      ingestion_run_id: ingestionRunId,
      external_id: externalId,
      record_type: recordType,
      content,
      content_hash: contentHash,
      metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  protected handleError(error: any, context: string): ProviderResponse {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`${this.name} provider error: ${context}`, error)

    return {
      success: false,
      data: null,
      error: errorMessage,
      metadata: { context },
    }
  }
}
