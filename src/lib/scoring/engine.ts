// Deterministic scoring engine for travel destinations
import type { CountryKnowledge } from '../knowledge/base/countries'
import type { CityKnowledge } from '../knowledge/base/cities'

export interface UserPreferences {
  budget: 'low' | 'moderate' | 'high' | 'luxury'
  travelMonths?: number[]
  interests?: string[]
  travelStyle?: 'solo' | 'couple' | 'family' | 'friends'
  pace?: 'relaxed' | 'moderate' | 'fast'
}

export interface CategoryScores {
  budgetFit: number // 0-10
  weatherFit: number // 0-10
  passportEase: number // 0-10
  nightlife: number // 0-10
  nature: number // 0-10
  transport: number // 0-10
  hotelValue: number // 0-10
  safety: number // 0-10
  flightValue?: number // 0-10 (optional, from provider data)
}

export interface DestinationScore {
  destinationId: string
  destinationName: string
  destinationType: 'country' | 'city'
  totalScore: number // 0-100
  categoryScores: CategoryScores
  reasons: string[]
  warnings: string[]
  bestMonths: number[]
  estimatedDailyBudget?: {
    min: number
    max: number
    currency: string
  }
  confidence: number // 0-1
}

export interface ScoringWeights {
  budgetFit: number
  weatherFit: number
  passportEase: number
  nightlife: number
  nature: number
  transport: number
  hotelValue: number
  safety: number
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  budgetFit: 0.20,
  weatherFit: 0.15,
  passportEase: 0.10,
  nightlife: 0.10,
  nature: 0.10,
  transport: 0.10,
  hotelValue: 0.15,
  safety: 0.10,
}

export class ScoringEngine {
  private weights: ScoringWeights

  constructor(weights: ScoringWeights = DEFAULT_WEIGHTS) {
    this.weights = weights
  }

  /**
   * Set custom weights (for personalization)
   */
  setWeights(weights: ScoringWeights): void {
    this.weights = weights
  }

  /**
   * Get current weights
   */
  getWeights(): ScoringWeights {
    return { ...this.weights }
  }

  /**
   * Score a country destination
   */
  scoreCountry(
    country: CountryKnowledge, 
    preferences: UserPreferences,
    providerScores?: { flightValue?: number; hotelValue?: number }
  ): DestinationScore {
    const categoryScores = this.calculateCountryScores(country, preferences, providerScores)
    const totalScore = this.calculateTotalScore(categoryScores)
    const reasons = this.generateReasons(country, categoryScores, preferences)
    const warnings = country.warnings

    return {
      destinationId: country.code,
      destinationName: country.name,
      destinationType: 'country',
      totalScore,
      categoryScores,
      reasons,
      warnings,
      bestMonths: country.bestMonths,
      confidence: providerScores ? 0.90 : 0.85, // Higher confidence with provider data
    }
  }

  /**
   * Score a city destination
   */
  scoreCity(
    city: CityKnowledge, 
    country: CountryKnowledge | undefined, 
    preferences: UserPreferences,
    providerScores?: { flightValue?: number; hotelValue?: number }
  ): DestinationScore {
    const categoryScores = this.calculateCityScores(city, country, preferences, providerScores)
    const totalScore = this.calculateTotalScore(categoryScores)
    const reasons = this.generateCityReasons(city, categoryScores, preferences)
    const warnings = city.practicalNotes.filter(note => 
      note.toLowerCase().includes('avoid') || 
      note.toLowerCase().includes('watch') ||
      note.toLowerCase().includes('careful')
    )

    return {
      destinationId: city.id,
      destinationName: city.name,
      destinationType: 'city',
      totalScore,
      categoryScores,
      reasons,
      warnings,
      bestMonths: city.bestMonths,
      estimatedDailyBudget: {
        min: city.avgDailyBudget.budget,
        max: city.avgDailyBudget.luxury,
        currency: 'USD',
      },
      confidence: providerScores ? 0.95 : 0.90, // Higher confidence with provider data
    }
  }

  /**
   * Calculate category scores for a country
   */
  private calculateCountryScores(
    country: CountryKnowledge, 
    preferences: UserPreferences,
    providerScores?: { flightValue?: number; hotelValue?: number }
  ): CategoryScores {
    return {
      budgetFit: this.scoreBudgetFit(country.budgetLevel, preferences.budget),
      weatherFit: this.scoreWeatherFit(country.bestMonths, country.worstMonths, preferences.travelMonths),
      passportEase: this.scorePassportEase(country.visaEase),
      nightlife: country.nightlifeLevel,
      nature: country.natureLevel,
      transport: country.transportQuality,
      hotelValue: providerScores?.hotelValue ?? country.hotelValue,
      safety: country.safetyLevel,
      flightValue: providerScores?.flightValue,
    }
  }

  /**
   * Calculate category scores for a city
   */
  private calculateCityScores(
    city: CityKnowledge, 
    country: CountryKnowledge | undefined, 
    preferences: UserPreferences,
    providerScores?: { flightValue?: number; hotelValue?: number }
  ): CategoryScores {
    return {
      budgetFit: this.scoreBudgetFit(city.budgetLevel, preferences.budget),
      weatherFit: this.scoreWeatherFit(city.bestMonths, [], preferences.travelMonths),
      passportEase: country ? this.scorePassportEase(country.visaEase) : 5,
      nightlife: city.nightlifeScore,
      nature: city.natureScore,
      transport: city.transportScore,
      hotelValue: providerScores?.hotelValue ?? city.hotelValueScore,
      safety: city.safetyScore,
      flightValue: providerScores?.flightValue,
    }
  }

  /**
   * Score budget fit
   */
  private scoreBudgetFit(destinationBudget: string, userBudget: string): number {
    const budgetLevels = ['budget', 'moderate', 'expensive', 'luxury']
    const destIndex = budgetLevels.indexOf(destinationBudget)
    const userIndex = budgetLevels.indexOf(userBudget === 'low' ? 'budget' : userBudget === 'high' ? 'expensive' : userBudget)

    if (destIndex === -1 || userIndex === -1) return 5

    const difference = Math.abs(destIndex - userIndex)
    
    if (difference === 0) return 10
    if (difference === 1) return 7
    if (difference === 2) return 4
    return 2
  }

  /**
   * Score weather fit
   */
  private scoreWeatherFit(bestMonths: number[], worstMonths: number[], travelMonths?: number[]): number {
    if (!travelMonths || travelMonths.length === 0) return 7

    let score = 0
    travelMonths.forEach(month => {
      if (bestMonths.includes(month)) {
        score += 10 / travelMonths.length
      } else if (worstMonths.includes(month)) {
        score += 2 / travelMonths.length
      } else {
        score += 6 / travelMonths.length
      }
    })

    return Math.round(score)
  }

  /**
   * Score passport ease
   */
  private scorePassportEase(visaEase: string): number {
    const easeMap: Record<string, number> = {
      'visa-free': 10,
      'visa-on-arrival': 8,
      'e-visa': 6,
      'visa-required': 3,
    }
    return easeMap[visaEase] || 5
  }

  /**
   * Calculate total score with weights
   */
  private calculateTotalScore(categoryScores: CategoryScores): number {
    let weighted = 
      categoryScores.budgetFit * this.weights.budgetFit +
      categoryScores.weatherFit * this.weights.weatherFit +
      categoryScores.passportEase * this.weights.passportEase +
      categoryScores.nightlife * this.weights.nightlife +
      categoryScores.nature * this.weights.nature +
      categoryScores.transport * this.weights.transport +
      categoryScores.hotelValue * this.weights.hotelValue +
      categoryScores.safety * this.weights.safety

    // If flight value is available, blend it with budget fit (10% influence)
    if (categoryScores.flightValue !== undefined) {
      weighted += categoryScores.flightValue * 0.05
    }

    return Math.round(weighted * 10)
  }

  /**
   * Generate reasons for country score
   */
  private generateReasons(country: CountryKnowledge, scores: CategoryScores, preferences: UserPreferences): string[] {
    const reasons: string[] = []

    if (scores.budgetFit >= 8) {
      reasons.push(`Budget-friendly for ${preferences.budget} travelers`)
    }
    if (scores.weatherFit >= 8) {
      reasons.push('Excellent weather during your travel dates')
    }
    if (scores.passportEase >= 8) {
      reasons.push('Easy visa requirements')
    }
    if (scores.safety >= 8) {
      reasons.push('Very safe destination')
    }
    if (scores.hotelValue >= 8) {
      reasons.push('Great value for accommodation')
    }

    // Add highlights
    reasons.push(...country.highlights.slice(0, 2))

    return reasons
  }

  /**
   * Generate reasons for city score
   */
  private generateCityReasons(city: CityKnowledge, scores: CategoryScores, preferences: UserPreferences): string[] {
    const reasons: string[] = []

    if (scores.budgetFit >= 8) {
      reasons.push(`Matches your ${preferences.budget} budget`)
    }
    if (scores.transport >= 8) {
      reasons.push('Excellent public transportation')
    }
    if (city.foodScore >= 8) {
      reasons.push('Outstanding food scene')
    }
    if (scores.nightlife >= 8 && preferences.interests?.includes('nightlife')) {
      reasons.push('Vibrant nightlife')
    }
    if (scores.nature >= 8 && preferences.interests?.includes('nature')) {
      reasons.push('Beautiful natural surroundings')
    }
    if (scores.flightValue !== undefined && scores.flightValue >= 8) {
      reasons.push('Affordable flight options available')
    }
    if (scores.hotelValue >= 8) {
      reasons.push('Great value accommodation options')
    }

    // Add highlights
    reasons.push(...city.highlights.slice(0, 2))

    return reasons
  }

}

export const scoringEngine = new ScoringEngine()
