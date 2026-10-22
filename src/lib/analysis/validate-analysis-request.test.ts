import { describe, it, expect } from 'vitest'
import { validateAnalysisRequest, sanitizeAnalysisRequest } from './validate-analysis-request'

describe('validateAnalysisRequest', () => {
  it('rejects an empty request with no query or departure city', () => {
    const result = validateAnalysisRequest({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Please enter a destination or departure city')
  })

  it('accepts a minimal valid request', () => {
    const result = validateAnalysisRequest({ query: 'beach trip in July' })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects out-of-range trip lengths', () => {
    expect(validateAnalysisRequest({ query: 'trip', tripLength: 0 }).valid).toBe(false)
    expect(validateAnalysisRequest({ query: 'trip', tripLength: 400 }).valid).toBe(false)
    expect(validateAnalysisRequest({ query: 'trip', tripLength: 14 }).valid).toBe(true)
  })

  it('rejects invalid travel months', () => {
    const result = validateAnalysisRequest({ query: 'trip', travelMonths: [0, 13] })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Travel months must be numbers between 1 and 12')
  })

  it('rejects unknown budget values', () => {
    expect(validateAnalysisRequest({ query: 'trip', budget: 'extravagant' }).valid).toBe(false)
    expect(validateAnalysisRequest({ query: 'trip', budget: 'moderate' }).valid).toBe(true)
  })

  it('rejects unknown trip structures', () => {
    expect(validateAnalysisRequest({ query: 'trip', tripStructure: 'roadtrip' }).valid).toBe(false)
    expect(validateAnalysisRequest({ query: 'trip', tripStructure: 'multi_country' }).valid).toBe(true)
  })
})

describe('sanitizeAnalysisRequest', () => {
  it('clamps trip length into the 1-365 range', () => {
    expect(sanitizeAnalysisRequest({ query: 'x', tripLength: 0 }).tripLength).toBe(1)
    expect(sanitizeAnalysisRequest({ query: 'x', tripLength: 999 }).tripLength).toBe(365)
    expect(sanitizeAnalysisRequest({ query: 'x', tripLength: 14.7 }).tripLength).toBe(15)
  })

  it('drops invalid months and interests', () => {
    const result = sanitizeAnalysisRequest({
      query: 'x',
      travelMonths: [0, 6, 13, 'July'],
      interests: ['food', '', 42],
    })
    expect(result.travelMonths).toEqual([6])
    expect(result.interests).toEqual(['food'])
  })

  it('drops unknown budget values instead of passing them through', () => {
    expect(sanitizeAnalysisRequest({ query: 'x', budget: 'extravagant' }).budget).toBeUndefined()
    expect(sanitizeAnalysisRequest({ query: 'x', budget: 'MODERATE' }).budget).toBe('moderate')
  })
})
