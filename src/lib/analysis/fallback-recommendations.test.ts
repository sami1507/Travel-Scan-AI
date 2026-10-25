// The fallback path is what users get when the AI provider is down or times out, so it must
// always return a complete, schema-valid, deterministic analysis for every trip structure.
import { describe, it, expect } from 'vitest'
import { FallbackRecommendationBuilder } from './fallback-recommendations'
import { travelAnalysisResponseSchema } from './schemas'
import type { AnalysisRequest } from './engine'

const builder = new FallbackRecommendationBuilder()

const structures: Array<NonNullable<AnalysisRequest['tripStructure']>> = [
  'single_country_one_city',
  'single_country_multi_city',
  'multi_country',
]

function request(overrides: Partial<AnalysisRequest> = {}): AnalysisRequest {
  return {
    query: 'culture and food trip',
    departureCity: 'London',
    budget: 'moderate',
    tripLength: 10,
    travelMonths: [6],
    interests: ['culture', 'food'],
    ...overrides,
  }
}

describe('FallbackRecommendationBuilder', () => {
  for (const tripStructure of structures) {
    it(`returns recommendations for ${tripStructure}`, () => {
      const result = builder.generateFallbackRecommendations(request({ tripStructure }), [])
      expect(result.topRecommendations.length).toBeGreaterThan(0)
      expect(result.topRecommendations.length).toBe(result.rankedDestinations.length)
      for (const recommendation of result.rankedDestinations) {
        expect(recommendation.destinationName).toBeTruthy()
        expect(recommendation.totalMatchScore).toBeGreaterThanOrEqual(0)
        expect(recommendation.totalMatchScore).toBeLessThanOrEqual(100)
      }
    })
  }

  it('produces output that satisfies the analysis response schema', () => {
    const result = builder.generateFallbackRecommendations(request({ tripStructure: 'multi_country' }), [])
    const parsed = travelAnalysisResponseSchema.safeParse(result)
    if (!parsed.success) {
      throw new Error(JSON.stringify(parsed.error.issues.slice(0, 5), null, 2))
    }
    expect(parsed.success).toBe(true)
  })

  it('is deterministic for identical input', () => {
    const a = builder.generateFallbackRecommendations(request({ tripStructure: 'single_country_multi_city' }), [])
    const b = builder.generateFallbackRecommendations(request({ tripStructure: 'single_country_multi_city' }), [])
    expect(a.topRecommendations).toEqual(b.topRecommendations)
  })

  it('still returns recommendations when no trip structure is given', () => {
    const result = builder.generateFallbackRecommendations(request({ tripStructure: undefined }), [])
    expect(result.topRecommendations.length).toBeGreaterThan(0)
  })

  it('does not throw for a minimal request and for a timeout fallback', () => {
    expect(() => builder.generateFallbackRecommendations({ query: 'somewhere warm' }, [])).not.toThrow()
    expect(() => builder.generateFallbackRecommendations(request(), [], true)).not.toThrow()
  })

  it('handles every travel season', () => {
    for (const month of [1, 4, 7, 10]) {
      const result = builder.generateFallbackRecommendations(request({ travelMonths: [month] }), [])
      expect(result.topRecommendations.length).toBeGreaterThan(0)
    }
  })
})
