import { describe, it, expect } from 'vitest'
import { normalizeFinalRecommendation, normalizeAllRecommendations } from './normalize-recommendation'

describe('normalizeFinalRecommendation', () => {
  it('splits a dirty destinationName into a clean country and route', () => {
    const result = normalizeFinalRecommendation({
      destinationName: 'Portugal - Lisbon → Porto → Coimbra',
    })

    expect(result.destinationName).toBe('Portugal')
    expect(result.suggestedRoute).toEqual(['Lisbon', 'Porto', 'Coimbra'])
  })

  it('keeps clean names untouched and defaults route to empty array', () => {
    const result = normalizeFinalRecommendation({ destinationName: 'Japan' })

    expect(result.destinationName).toBe('Japan')
    expect(result.suggestedRoute).toEqual([])
  })

  it('accepts a string route and converts it to an array', () => {
    const result = normalizeFinalRecommendation({
      destinationName: 'Italy',
      suggestedRoute: 'Rome → Florence → Bologna',
    })

    expect(result.suggestedRoute).toEqual(['Rome', 'Florence', 'Bologna'])
    expect(result.routeDisplayName).toBe('Rome → Florence → Bologna')
  })

  it('normalizes broken whitespace in text fields', () => {
    const result = normalizeFinalRecommendation({
      destinationName: 'South   Korea',
      whyChosen: 'Great   food   scene',
    })

    expect(result.destinationName).toBe('South Korea')
    expect(result.whyChosen).toBe('Great food scene')
  })
})

describe('normalizeAllRecommendations', () => {
  it('returns an empty array for non-array input', () => {
    expect(normalizeAllRecommendations(null as any)).toEqual([])
    expect(normalizeAllRecommendations(undefined as any)).toEqual([])
  })

  it('normalizes every recommendation in the list', () => {
    const result = normalizeAllRecommendations([
      { destinationName: 'France - Paris → Lyon' },
      { destinationName: 'Spain' },
    ])

    expect(result).toHaveLength(2)
    expect(result[0].destinationName).toBe('France')
    expect(result[1].destinationName).toBe('Spain')
  })
})
