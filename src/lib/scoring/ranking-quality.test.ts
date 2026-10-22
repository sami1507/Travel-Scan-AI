// Behavioural evaluation of the deterministic ranking: given a traveller profile, does the
// ranking move in the direction a travel consultant would expect? These run against the real
// knowledge base, so they double as regression protection for ranking quality in CI.
import { describe, it, expect } from 'vitest'
import { ScoringEngine, type UserPreferences } from './engine'
import { countriesKnowledge, type CountryKnowledge } from '../knowledge/base/countries'

const engine = new ScoringEngine()

function rank(preferences: UserPreferences, pool: CountryKnowledge[] = countriesKnowledge) {
  return pool
    .map((country) => ({ country, score: engine.scoreCountry(country, preferences) }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore)
}

const average = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length

describe('ranking quality: interests change the ranking', () => {
  const base: UserPreferences = { budget: 'moderate', travelMonths: [6] }

  it('a nightlife-seeker sees nightlife-heavy destinations ranked no lower than a nature-seeker does', () => {
    const position = (ranking: ReturnType<typeof rank>, code: string) =>
      ranking.findIndex((r) => r.country.code === code)

    const nightlifeRanking = rank({ ...base, interests: ['nightlife'] })
    const natureRanking = rank({ ...base, interests: ['nature'] })

    const nightlifeLeader = countriesKnowledge.reduce((a, b) => (b.nightlifeLevel > a.nightlifeLevel ? b : a))
    const natureLeader = countriesKnowledge.reduce((a, b) => (b.natureLevel > a.natureLevel ? b : a))

    expect(position(nightlifeRanking, nightlifeLeader.code)).toBeLessThanOrEqual(
      position(natureRanking, nightlifeLeader.code)
    )
    expect(position(natureRanking, natureLeader.code)).toBeLessThanOrEqual(
      position(nightlifeRanking, natureLeader.code)
    )
  })

  it('different interests produce different scores for the same destinations', () => {
    const a = rank({ ...base, interests: ['nightlife'] }).map((r) => [r.country.code, r.score.totalScore]).sort()
    const b = rank({ ...base, interests: ['nature'] }).map((r) => [r.country.code, r.score.totalScore]).sort()
    expect(a).not.toEqual(b)
  })

  it('stated interests move individual scores in the expected direction', () => {
    const nightlifeHeavy = countriesKnowledge.reduce((a, b) => (b.nightlifeLevel > a.nightlifeLevel ? b : a))
    const withInterest = engine.scoreCountry(nightlifeHeavy, { ...base, interests: ['nightlife'] })
    const withoutInterest = engine.scoreCountry(nightlifeHeavy, { ...base, interests: ['nature'] })
    expect(withInterest.totalScore).toBeGreaterThan(withoutInterest.totalScore)
  })

  it('with no interests the weights are unchanged', () => {
    expect(engine.effectiveWeights(base)).toEqual(engine.getWeights())
  })

  it('adjusted weights keep the same total so scores stay on the 0-100 scale', () => {
    const total = (w: object) => Object.values(w as Record<string, number>).reduce((s, v) => s + v, 0)
    const adjusted = engine.effectiveWeights({ ...base, interests: ['nightlife', 'beach'] })
    expect(total(adjusted)).toBeCloseTo(total(engine.getWeights()), 10)
    for (const r of rank({ ...base, interests: ['nightlife', 'beach'] })) {
      expect(r.score.totalScore).toBeGreaterThanOrEqual(0)
      expect(r.score.totalScore).toBeLessThanOrEqual(100)
    }
  })
})

describe('ranking quality: constraints are respected', () => {
  const prefs: UserPreferences = { budget: 'moderate', travelMonths: [6], interests: ['food'] }

  it('travelling in a destination\'s best month scores higher than in its worst month', () => {
    let checked = 0
    for (const country of countriesKnowledge) {
      if (country.bestMonths.length === 0 || country.worstMonths.length === 0) continue
      const best = engine.scoreCountry(country, { ...prefs, travelMonths: [country.bestMonths[0]] })
      const worst = engine.scoreCountry(country, { ...prefs, travelMonths: [country.worstMonths[0]] })
      expect(best.totalScore).toBeGreaterThan(worst.totalScore)
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('a destination matching the budget outscores the same destination far outside it', () => {
    const country = countriesKnowledge[0]
    const matching = engine.scoreCountry(country, { ...prefs, budget: country.budgetLevel === 'budget' ? 'low' : (country.budgetLevel === 'expensive' ? 'high' : country.budgetLevel) as UserPreferences['budget'] })
    const mismatched = engine.scoreCountry(country, { ...prefs, budget: country.budgetLevel === 'luxury' ? 'low' : 'luxury' })
    expect(matching.categoryScores.budgetFit).toBeGreaterThan(mismatched.categoryScores.budgetFit)
  })

  it('easier visa access raises the score, all else equal', () => {
    const country = countriesKnowledge[0]
    const visaFree = engine.scoreCountry({ ...country, visaEase: 'visa-free' }, prefs)
    const visaRequired = engine.scoreCountry({ ...country, visaEase: 'visa-required' }, prefs)
    expect(visaFree.totalScore).toBeGreaterThan(visaRequired.totalScore)
  })

  it('a safer destination scores higher, all else equal', () => {
    const country = countriesKnowledge[0]
    const safe = engine.scoreCountry({ ...country, safetyLevel: 9 }, prefs)
    const unsafe = engine.scoreCountry({ ...country, safetyLevel: 3 }, prefs)
    expect(safe.totalScore).toBeGreaterThan(unsafe.totalScore)
  })
})

describe('ranking quality: determinism', () => {
  it('returns an identical ranking for identical input', () => {
    const prefs: UserPreferences = { budget: 'high', travelMonths: [3, 4], interests: ['beach', 'food'] }
    const first = rank(prefs).map((r) => [r.country.code, r.score.totalScore])
    const second = rank(prefs).map((r) => [r.country.code, r.score.totalScore])
    expect(first).toEqual(second)
  })
})
