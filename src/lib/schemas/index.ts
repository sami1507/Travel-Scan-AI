// Zod validation schemas for Travel Scan AI
import { z } from 'zod'

// Source Type Schema
export const sourceTypeSchema = z.enum([
  'flights',
  'hotels',
  'weather',
  'exchange_rates',
  'events'
])

export const sourceStatusSchema = z.enum([
  'active',
  'paused',
  'error',
  'disabled'
])

export const alertSeveritySchema = z.enum([
  'info',
  'low',
  'medium',
  'high',
  'critical'
])

export const changeTypeSchema = z.enum([
  'new',
  'modified',
  'removed',
  'unchanged'
])

// Source Config Schema
export const sourceConfigSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  source_type: sourceTypeSchema,
  status: sourceStatusSchema.default('active'),
  polling_interval_minutes: z.number().int().min(5).max(1440).default(60),
  parser_settings: z.record(z.any()).default({}),
  last_run_at: z.string().datetime().nullable().optional(),
  last_success_at: z.string().datetime().nullable().optional(),
  last_error: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export const createSourceConfigSchema = sourceConfigSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  last_run_at: true,
  last_success_at: true,
  last_error: true,
})

export const updateSourceConfigSchema = sourceConfigSchema.partial().omit({
  id: true,
  user_id: true,
  created_at: true,
})

// Ingestion Run Schema
export const ingestionRunSchema = z.object({
  id: z.string().uuid().optional(),
  source_config_id: z.string().uuid(),
  status: z.enum(['pending', 'running', 'success', 'failed']),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable().optional(),
  records_fetched: z.number().int().min(0).default(0),
  records_new: z.number().int().min(0).default(0),
  records_changed: z.number().int().min(0).default(0),
  records_removed: z.number().int().min(0).default(0),
  error_message: z.string().nullable().optional(),
  metadata: z.record(z.any()).default({}),
})

// Normalized Record Schema
export const normalizedRecordSchema = z.object({
  id: z.string().uuid().optional(),
  source_config_id: z.string().uuid(),
  ingestion_run_id: z.string().uuid(),
  external_id: z.string(),
  record_type: z.string(),
  content: z.record(z.any()),
  content_hash: z.string(),
  metadata: z.record(z.any()).default({}),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

// Change Event Schema
export const changeEventSchema = z.object({
  id: z.string().uuid().optional(),
  normalized_record_id: z.string().uuid(),
  ingestion_run_id: z.string().uuid(),
  change_type: changeTypeSchema,
  previous_content: z.record(z.any()).nullable(),
  new_content: z.record(z.any()),
  diff: z.record(z.any()),
  detected_at: z.string().datetime(),
})

// Scan Result Schema
export const scanResultSchema = z.object({
  id: z.string().uuid().optional(),
  ingestion_run_id: z.string().uuid(),
  source_config_id: z.string().uuid(),
  total_changes: z.number().int().min(0),
  new_records: z.number().int().min(0),
  modified_records: z.number().int().min(0),
  removed_records: z.number().int().min(0),
  ai_summary: z.string().nullable().optional(),
  insights: z.array(z.string()).default([]),
  scan_completed_at: z.string().datetime(),
  metadata: z.record(z.any()).default({}),
})

// Alert Schema
export const alertSchema = z.object({
  id: z.string().uuid().optional(),
  scan_result_id: z.string().uuid(),
  source_config_id: z.string().uuid(),
  user_id: z.string().uuid(),
  severity: alertSeveritySchema,
  title: z.string().min(1).max(500),
  description: z.string(),
  change_event_ids: z.array(z.string().uuid()),
  is_read: z.boolean().default(false),
  is_dismissed: z.boolean().default(false),
  created_at: z.string().datetime().optional(),
  read_at: z.string().datetime().nullable().optional(),
})

// Provider Response Schema
export const providerResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// AI Summary Result Schema
export const aiSummaryResultSchema = z.object({
  summary: z.string(),
  insights: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

// AI Alert Result Schema
export const aiAlertResultSchema = z.object({
  severity: alertSeveritySchema,
  title: z.string(),
  description: z.string(),
  relevantChangeIds: z.array(z.string()),
})

// Export type inference helpers
export type SourceConfigInput = z.infer<typeof createSourceConfigSchema>
export type SourceConfigUpdate = z.infer<typeof updateSourceConfigSchema>
export type IngestionRunInput = z.infer<typeof ingestionRunSchema>
export type NormalizedRecordInput = z.infer<typeof normalizedRecordSchema>
export type ChangeEventInput = z.infer<typeof changeEventSchema>
export type ScanResultInput = z.infer<typeof scanResultSchema>
export type AlertInput = z.infer<typeof alertSchema>

// Re-export provider schemas
export * from './provider-schemas'
