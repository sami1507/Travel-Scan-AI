// Core domain types for Travel Scan AI

export type SourceType = 
  | 'flights' 
  | 'hotels' 
  | 'weather' 
  | 'exchange_rates' 
  | 'events'

export type SourceStatus = 'active' | 'paused' | 'error' | 'disabled'

export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export type ChangeType = 'new' | 'modified' | 'removed' | 'unchanged'

export type NotificationChannel = 'in_app' | 'email' | 'sms'

// Source Configuration
export interface SourceConfig {
  id: string
  user_id: string
  name: string
  source_type: SourceType
  status: SourceStatus
  is_active: boolean
  polling_interval_minutes: number
  parser_settings: Record<string, any>
  last_run_at: string | null
  last_success_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

// Ingestion Run
export interface IngestionRun {
  id: string
  source_config_id: string
  status: 'pending' | 'running' | 'success' | 'failed'
  started_at: string
  completed_at: string | null
  records_fetched: number
  records_new: number
  records_changed: number
  records_removed: number
  error_message: string | null
  metadata: Record<string, any>
}

// Raw Payload (stores original API responses)
export interface RawPayload {
  id: string
  ingestion_run_id: string
  source_config_id: string
  payload: any
  payload_hash: string
  fetched_at: string
}

// Normalized Record (domain-agnostic structure)
export interface NormalizedRecord {
  id: string
  source_config_id: string
  ingestion_run_id: string
  external_id: string
  record_type: string
  content: Record<string, any>
  content_hash: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// Record Snapshot (point-in-time state)
export interface RecordSnapshot {
  id: string
  normalized_record_id: string
  content: Record<string, any>
  content_hash: string
  snapshot_at: string
}

// Change Event
export interface ChangeEvent {
  id: string
  normalized_record_id: string
  ingestion_run_id: string
  change_type: ChangeType
  previous_content: Record<string, any> | null
  new_content: Record<string, any>
  diff: Record<string, any>
  detected_at: string
}

// Scan Result
export interface ScanResult {
  id: string
  ingestion_run_id: string
  source_config_id: string
  total_changes: number
  new_records: number
  modified_records: number
  removed_records: number
  ai_summary: string | null
  insights: string[]
  scan_completed_at: string
  metadata: Record<string, any>
}

// Alert
export interface Alert {
  id: string
  scan_result_id: string
  source_config_id: string
  user_id: string
  severity: AlertSeverity
  title: string
  description: string
  change_event_ids: string[]
  is_read: boolean
  is_dismissed: boolean
  created_at: string
  read_at: string | null
}

// Notification Event
export interface NotificationEvent {
  id: string
  user_id: string
  alert_id: string | null
  channel: NotificationChannel
  status: 'pending' | 'sent' | 'failed'
  sent_at: string | null
  error_message: string | null
  metadata: Record<string, any>
}

// Audit Log
export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  changes: Record<string, any>
  metadata: Record<string, any>
  created_at: string
}

// Provider Interface
export interface TravelProvider {
  name: string
  type: SourceType
  fetch(config: SourceConfig): Promise<ProviderResponse>
  validate(data: any): boolean
  normalize(data: any, config: SourceConfig, ingestionRunId: string): NormalizedRecord[]
}

export interface ProviderResponse {
  success: boolean
  data: any
  error?: string
  metadata?: Record<string, any>
}

// AI Provider Interface
export interface AIProvider {
  name: string
  summarize(changes: ChangeEvent[], context: Record<string, any>): Promise<AISummaryResult>
  generateAlerts(changes: ChangeEvent[], context: Record<string, any>): Promise<AIAlertResult[]>
}

export interface AISummaryResult {
  summary: string
  insights: string[]
  confidence: number
}

export interface AIAlertResult {
  severity: AlertSeverity
  title: string
  description: string
  relevantChangeIds: string[]
}
