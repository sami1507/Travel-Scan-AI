import { describe, it, expect } from 'vitest'
import { isValidUUID, sanitizeText, schemas, validateRequest } from './validation'

describe('validateRequest', () => {
  it('returns parsed data for valid input', () => {
    const result = validateRequest(schemas.analysisRequest, { query: 'beach holiday in july' })
    expect(result.success).toBe(true)
  })

  it('returns a readable error naming the failing field', () => {
    const result = validateRequest(schemas.analysisRequest, { query: 'x' })
    expect(result.success).toBe(false)
    expect((result as { error: string }).error).toContain('query')
  })

  it('rejects out-of-range values', () => {
    expect(validateRequest(schemas.analysisRequest, { query: 'valid query', tripLength: 9999 }).success).toBe(false)
    expect(validateRequest(schemas.analysisRequest, { query: 'valid query', travelMonths: [13] }).success).toBe(false)
  })
})

describe('schemas', () => {
  it('bounds intelligence-agent limits to prevent unbounded AI cost', () => {
    expect(validateRequest(schemas.intelligenceRequest, { recordLimit: 100, changeLimit: 200 }).success).toBe(true)
    expect(validateRequest(schemas.intelligenceRequest, { recordLimit: 100000 }).success).toBe(false)
    expect(validateRequest(schemas.intelligenceRequest, { changeLimit: -1 }).success).toBe(false)
  })

  it('requires a UUID id and a bounded non-empty updates object for saved items', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000'
    expect(validateRequest(schemas.savedItemUpdate, { id, updates: { notes: 'hi' } }).success).toBe(true)
    expect(validateRequest(schemas.savedItemUpdate, { id: 'nope', updates: { notes: 'hi' } }).success).toBe(false)
    expect(validateRequest(schemas.savedItemUpdate, { id, updates: {} }).success).toBe(false)
    const tooMany = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, i]))
    expect(validateRequest(schemas.savedItemUpdate, { id, updates: tooMany }).success).toBe(false)
  })

  it('only accepts the two known alert actions', () => {
    const alertId = '123e4567-e89b-42d3-a456-426614174000'
    expect(validateRequest(schemas.alertAction, { alertId, action: 'read' }).success).toBe(true)
    expect(validateRequest(schemas.alertAction, { alertId, action: 'delete-everything' }).success).toBe(false)
  })

  it('validates travel profile ranges and enums', () => {
    expect(validateRequest(schemas.travelProfileUpdate, { nightlife_importance: 7, preferred_pace: 'relaxed' }).success).toBe(true)
    expect(validateRequest(schemas.travelProfileUpdate, { nightlife_importance: 11 }).success).toBe(false)
    expect(validateRequest(schemas.travelProfileUpdate, { preferred_pace: 'warp-speed' }).success).toBe(false)
  })

  it('validates the rich feedback envelope sent by the dialog', () => {
    const valid = {
      feedbackData: { feedbackType: 'positive', selectedReasons: ['great food'] },
      destination: { destinationId: 'ES', destinationName: 'Spain', totalMatchScore: 88 },
    }
    expect(validateRequest(schemas.richFeedback, valid).success).toBe(true)
    expect(validateRequest(schemas.richFeedback, { ...valid, destination: { destinationName: 'Spain' } }).success).toBe(false)
  })
})

describe('sanitizeText', () => {
  it('strips script and iframe blocks and inline event handlers', () => {
    expect(sanitizeText('hi<script>alert(1)</script> there')).toBe('hi there')
    expect(sanitizeText('<iframe src="x"></iframe>ok')).toBe('ok')
    expect(sanitizeText('<img src=x onerror="alert(1)">').includes('onerror')).toBe(false)
  })

  it('trims whitespace and leaves ordinary text alone', () => {
    expect(sanitizeText('  Great trip!  ')).toBe('Great trip!')
  })
})

describe('isValidUUID', () => {
  it('accepts UUIDs and rejects other strings', () => {
    expect(isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true)
    expect(isValidUUID('not-a-uuid')).toBe(false)
    expect(isValidUUID('')).toBe(false)
    expect(isValidUUID("123e4567-e89b-42d3-a456-426614174000' OR 1=1")).toBe(false)
  })
})
