import { describe, it, expect } from 'vitest'
import { ScoringEngine, type UserPreferences } from './engine'
import type { CountryKnowledge } from '../knowledge/base/countries'

const testCountry: CountryKnowledge = {
  code: 'PT',
  name: 'Portugal',
  region: 'Southern Europe',
  visaEase: 'visa-free',
  safetyLevel: 9,
  budgetLevel: 'moderate',
  bestMonths: [4, 5, 6, 9, 10],
  worstMonths: [12, 1],
  highlights: ['Beaches', 'Food'],
  warnings: [],
  transportQuality: 8,
  hotelValue: 8,
  nightlifeLevel: 7,
  natureLevel: 8,
  weatherPatterns: {},
}

const basePreferences: UserPreferences = {
  budget: 'moderate',
  travelMonths: [6],
  interests: ['food', 'beach'],
}

describe('ScoringEngine', () => {
  it('scores a country within the 0-100 range with all category scores', () => {
    const engine = new ScoringEngine()
    const result = engine.scoreCountry(testCountry, basePreferences)

    expect(result.destinationId).toBe('PT')
    expect(result.destinationType).toBe('country')
    expect(result.totalScore).toBeGreaterThanOrEqual(0)
    expect(result.totalScore).toBeLessThanOrEqual(100)
    expect(result.categoryScores.safety).toBe(9)
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  it('reports flightValue as null when no provider data is available', () => {
    const engine = new ScoringEngine()
    const result = engine.scoreCountry(testCountry, basePreferences)

    expect(result.categoryScores.flightValue).toBeNull()
  })

  it('uses provider flight/hotel data when available and raises confidence', () => {
    const engine = new ScoringEngine()
    const withoutProviders = engine.scoreCountry(testCountry, basePreferences)
    const withProviders = engine.scoreCountry(testCountry, basePreferences, {
      flightValue: 9,
      hotelValue: 9,
    })

    expect(withProviders.categoryScores.flightValue).toBe(9)
    expect(withProviders.categoryScores.hotelValue).toBe(9)
    expect(withProviders.confidence).toBeGreaterThan(withoutProviders.confidence)
  })

  it('penalizes budget mismatch for expensive countries on a low budget', () => {
    const engine = new ScoringEngine()
    const moderate = engine.scoreCountry(testCountry, basePreferences)
    const lowBudget = engine.scoreCountry(testCountry, { ...basePreferences, budget: 'low' })

    expect(lowBudget.categoryScores.budgetFit).toBeLessThanOrEqual(moderate.categoryScores.budgetFit)
  })

  it('scores better when travel months align with best months', () => {
    const engine = new ScoringEngine()
    const goodTiming = engine.scoreCountry(testCountry, { ...basePreferences, travelMonths: [6] })
    const badTiming = engine.scoreCountry(testCountry, { ...basePreferences, travelMonths: [12] })

    expect(goodTiming.categoryScores.weatherFit).toBeGreaterThan(badTiming.categoryScores.weatherFit)
  })
})
