// Tests for the post-processing stages that decide what the user finally sees:
// candidate pool filtering, consultant-quality scoring and diversity enforcement.
// Fixtures come from the (schema-valid) fallback builder, so no network or AI is involved.
import { describe, it, expect } from 'vitest'
import { FallbackRecommendationBuilder } from './fallback-recommendations'
import { buildRouteCandidatePool, filterCandidatesByRequest } from './route-candidate-pool'
import { getQualityGrade, scoreConsultantQuality } from './consultant-quality-score'
import { enforceRecommendationDiversity } from './diversity-enforcement'
import type { AnalysisRequest } from './engine'

const baseRequest: AnalysisRequest = {
  query: 'culture and food trip',
  departureCity: 'London',
  budget: 'moderate',
  tripLength: 10,
  travelMonths: [6],
  interests: ['culture', 'food'],
  tripStructure: 'multi_country',
}

const builder = new FallbackRecommendationBuilder()
const analysis = () => builder.generateFallbackRecommendations(baseRequest, [])

describe('route candidate pool', () => {
  it('builds a non-empty pool of candidates with a country and route cities', () => {
    const pool = buildRouteCandidatePool(baseRequest)
    expect(pool.length).toBeGreaterThan(0)
    for (const candidate of pool) {
      expect(candidate.country).toBeTruthy()
      expect(candidate.routeCities.length).toBeGreaterThan(0)
    }
  })

  it('removes excluded countries (case-insensitively)', () => {
    const pool = buildRouteCandidatePool(baseRequest)
    const excluded = pool[0].country
    const filtered = filterCandidatesByRequest(pool, { ...baseRequest, excludeCountries: [excluded.toUpperCase()] })
    expect(filtered.some((c) => c.country.toLowerCase() === excluded.toLowerCase())).toBe(false)
  })

  it('keeps premium routes out of low-budget requests', () => {
    const pool = buildRouteCandidatePool(baseRequest)
    const filtered = filterCandidatesByRequest(pool, { ...baseRequest, budget: 'low' })
    expect(filtered.every((c) => c.priceTier === 'budget' || c.priceTier === 'moderate')).toBe(true)
  })

  it('respects the requested trip structure', () => {
    const pool = buildRouteCandidatePool({ ...baseRequest, tripStructure: undefined })
    const oneCity = filterCandidatesByRequest(pool, { ...baseRequest, tripStructure: 'single_country_one_city' })
    expect(oneCity.every((c) => c.routeType === 'single-city')).toBe(true)
  })
})

describe('consultant quality scoring', () => {
  it('scores a fallback analysis on a 0-100 scale with all sub-scores present', () => {
    const result = scoreConsultantQuality(analysis(), { budget: 'moderate', tripLength: 10 })
    expect(result.totalScore).toBeGreaterThanOrEqual(0)
    expect(result.totalScore).toBeLessThanOrEqual(100)
    expect(Object.keys(result.subScores)).toEqual(
      expect.arrayContaining(['routeSpecificity', 'seasonReality', 'budgetHonesty', 'diversity', 'dataHonesty'])
    )
  })

  it('is deterministic', () => {
    const a = scoreConsultantQuality(analysis(), { budget: 'moderate' })
    const b = scoreConsultantQuality(analysis(), { budget: 'moderate' })
    expect(a.totalScore).toBe(b.totalScore)
  })

  it('detects and penalises boilerplate marketing language', () => {
    const clean = analysis()
    const generic = analysis()
    for (const destination of generic.rankedDestinations) {
      destination.whyRecommended = [
        'An ideal destination with rich history and beautiful landscapes',
        'A perfect trip offering an unforgettable journey and breathtaking views',
      ]
      destination.destinationSummary = 'world-class amazing experience, perfect for everyone'
    }

    const cleanScore = scoreConsultantQuality(clean, { budget: 'moderate' })
    const genericScore = scoreConsultantQuality(generic, { budget: 'moderate' })
    expect(genericScore.genericPhrases.length).toBeGreaterThan(cleanScore.genericPhrases.length)
    expect(genericScore.totalScore).toBeLessThanOrEqual(cleanScore.totalScore)
  })

  it('maps scores to grades at the documented thresholds', () => {
    expect(getQualityGrade(95)).toBe('Excellent')
    expect(getQualityGrade(85)).toBe('Good')
    expect(getQualityGrade(75)).toBe('Acceptable')
    expect(getQualityGrade(65)).toBe('Needs Improvement')
    expect(getQualityGrade(10)).toBe('Poor')
  })
})

describe('diversity enforcement', () => {
  const ranked = () => analysis().rankedDestinations

  it('returns three recommendations untouched in fixed-country mode', () => {
    const recommendations = ranked()
    const result = enforceRecommendationDiversity(recommendations, {
      request: { ...baseRequest, destination: 'Italy' },
    })
    expect(result.fixedCountryMode).toBe(true)
    expect(result.diversityApplied).toBe(false)
    expect(result.recommendations).toHaveLength(Math.min(3, recommendations.length))
  })

  it('does not attempt enforcement with fewer than three recommendations', () => {
    const result = enforceRecommendationDiversity(ranked().slice(0, 2), { request: baseRequest })
    expect(result.diversityApplied).toBe(false)
    expect(result.diversityScore).toBe(0)
    expect(result.recommendations).toHaveLength(2)
  })

  it('leaves an already-diverse top three alone', () => {
    const recommendations = ranked()
    const countries = new Set(recommendations.slice(0, 3).map((r) => r.destinationName))
    const result = enforceRecommendationDiversity(recommendations, { request: baseRequest })
    expect(result.recommendations.length).toBeLessThanOrEqual(3)
    if (countries.size === 3) expect(result.diversityScore).toBeGreaterThanOrEqual(0.9)
    expect(result.preDiversityCountries).toHaveLength(3)
  })

  it('never returns more than three recommendations', () => {
    const result = enforceRecommendationDiversity(ranked(), { request: baseRequest })
    expect(result.recommendations.length).toBeLessThanOrEqual(3)
    expect(result.diversityScore).toBeGreaterThanOrEqual(0)
    expect(result.diversityScore).toBeLessThanOrEqual(1)
  })
})
