// Enhanced knowledge retrieval with better relevance and structure
import type { UserConstraints } from '../analysis/schemas'

export interface EnhancedKnowledgeContext {
  relevantFacts: string[]
  seasonalInsights: string[]
  budgetGuidance: string[]
  safetyNotes: string[]
  transportInfo: string[]
  culturalContext: string[]
  confidenceFactors: {
    dataQuality: 'high' | 'medium' | 'low'
    recency: 'current' | 'recent' | 'dated'
    coverage: 'comprehensive' | 'partial' | 'limited'
  }
}

export class EnhancedKnowledgeRetrieval {
  /**
   * Retrieve structured, relevant knowledge for analysis
   */
  async retrieve(
    query: string,
    constraints: UserConstraints,
    destinations: string[]
  ): Promise<EnhancedKnowledgeContext> {
    const context: EnhancedKnowledgeContext = {
      relevantFacts: [],
      seasonalInsights: [],
      budgetGuidance: [],
      safetyNotes: [],
      transportInfo: [],
      culturalContext: [],
      confidenceFactors: {
        dataQuality: 'medium',
        recency: 'recent',
        coverage: 'partial',
      },
    }

    // Extract relevant facts based on query and constraints
    context.relevantFacts = this.extractRelevantFacts(query, constraints, destinations)

    // Add seasonal insights if travel months specified
    if (constraints.travelMonths && constraints.travelMonths.length > 0) {
      context.seasonalInsights = this.getSeasonalInsights(destinations, constraints.travelMonths)
    }

    // Add budget guidance
    if (constraints.budget) {
      context.budgetGuidance = this.getBudgetGuidance(destinations, constraints.budget)
    }

    // Add safety information
    context.safetyNotes = this.getSafetyNotes(destinations)

    // Add transport information
    context.transportInfo = this.getTransportInfo(destinations)

    // Add cultural context
    context.culturalContext = this.getCulturalContext(destinations, constraints.interests)

    // Assess confidence factors
    context.confidenceFactors = this.assessConfidence(destinations, constraints)

    return context
  }

  private extractRelevantFacts(
    query: string,
    constraints: UserConstraints,
    destinations: string[]
  ): string[] {
    const facts: string[] = []

    // Add destination-specific facts
    for (const dest of destinations.slice(0, 5)) {
      // Focus on query-relevant information
      if (constraints.interests?.includes('culture')) {
        facts.push(`${dest}: Rich cultural heritage with museums and historical sites`)
      }
      if (constraints.interests?.includes('food')) {
        facts.push(`${dest}: Renowned culinary scene with local specialties`)
      }
      if (constraints.interests?.includes('nightlife')) {
        facts.push(`${dest}: Vibrant nightlife with bars and clubs`)
      }
      if (constraints.interests?.includes('nature')) {
        facts.push(`${dest}: Natural attractions and outdoor activities available`)
      }
    }

    return facts.slice(0, 10) // Limit to most relevant
  }

  private getSeasonalInsights(destinations: string[], months: number[]): string[] {
    const insights: string[] = []
    const season = this.determineSeason(months)

    for (const dest of destinations.slice(0, 5)) {
      if (season === 'winter' && this.isBeachDestination(dest)) {
        insights.push(`${dest}: Off-season for beaches in winter, expect cooler weather`)
      } else if (season === 'summer' && this.isSkiDestination(dest)) {
        insights.push(`${dest}: Ski season closed in summer, limited winter activities`)
      } else if (season === 'summer' && this.isPopularSummerDest(dest)) {
        insights.push(`${dest}: Peak tourist season in summer, expect crowds and higher prices`)
      }
    }

    return insights
  }

  private getBudgetGuidance(destinations: string[], budget: string): string[] {
    const guidance: string[] = []

    for (const dest of destinations.slice(0, 5)) {
      const costLevel = this.getDestinationCostLevel(dest)

      if (budget === 'budget' && costLevel === 'expensive') {
        guidance.push(`${dest}: High cost destination, budget travelers may find it challenging`)
      } else if (budget === 'budget' && costLevel === 'moderate') {
        guidance.push(`${dest}: Moderate costs, budget options available with planning`)
      } else if (budget === 'luxury' && costLevel === 'cheap') {
        guidance.push(`${dest}: Very affordable, luxury travelers will find exceptional value`)
      }
    }

    return guidance
  }

  private getSafetyNotes(destinations: string[]): string[] {
    const notes: string[] = []

    for (const dest of destinations.slice(0, 5)) {
      const safetyLevel = this.getDestinationSafetyLevel(dest)

      if (safetyLevel === 'caution') {
        notes.push(`${dest}: Exercise normal precautions, be aware of pickpockets in tourist areas`)
      } else if (safetyLevel === 'high-caution') {
        notes.push(`${dest}: Exercise increased caution, check travel advisories before booking`)
      }
    }

    return notes
  }

  private getTransportInfo(destinations: string[]): string[] {
    const info: string[] = []

    for (const dest of destinations.slice(0, 5)) {
      info.push(`${dest}: ${this.getTransportDescription(dest)}`)
    }

    return info
  }

  private getCulturalContext(destinations: string[], interests?: string[]): string[] {
    const context: string[] = []

    if (!interests || interests.length === 0) return context

    for (const dest of destinations.slice(0, 5)) {
      if (interests.includes('culture') || interests.includes('history')) {
        context.push(`${dest}: ${this.getCulturalDescription(dest)}`)
      }
    }

    return context
  }

  private assessConfidence(destinations: string[], constraints: UserConstraints): EnhancedKnowledgeContext['confidenceFactors'] {
    // Assess based on data availability and query specificity
    const hasSpecificConstraints = 
      (constraints.travelMonths && constraints.travelMonths.length > 0) ||
      (constraints.interests && constraints.interests.length > 0)

    const dataQuality = destinations.length >= 5 ? 'high' : destinations.length >= 3 ? 'medium' : 'low'
    const coverage = hasSpecificConstraints ? 'comprehensive' : 'partial'

    return {
      dataQuality,
      recency: 'recent',
      coverage,
    }
  }

  // Helper methods
  private determineSeason(months: number[]): 'winter' | 'spring' | 'summer' | 'fall' {
    const avgMonth = months.reduce((a, b) => a + b, 0) / months.length
    if (avgMonth >= 12 || avgMonth <= 2) return 'winter'
    if (avgMonth >= 3 && avgMonth <= 5) return 'spring'
    if (avgMonth >= 6 && avgMonth <= 8) return 'summer'
    return 'fall'
  }

  private isBeachDestination(dest: string): boolean {
    const beachDests = ['greece', 'croatia', 'spain', 'portugal', 'italy', 'maldives', 'thailand']
    return beachDests.some(d => dest.toLowerCase().includes(d))
  }

  private isSkiDestination(dest: string): boolean {
    const skiDests = ['switzerland', 'austria', 'france', 'colorado', 'whistler']
    return skiDests.some(d => dest.toLowerCase().includes(d))
  }

  private isPopularSummerDest(dest: string): boolean {
    const summerDests = ['barcelona', 'rome', 'paris', 'amsterdam', 'venice']
    return summerDests.some(d => dest.toLowerCase().includes(d))
  }

  private getDestinationCostLevel(dest: string): 'cheap' | 'moderate' | 'expensive' {
    const expensive = ['switzerland', 'norway', 'iceland', 'singapore', 'japan', 'london', 'paris']
    const cheap = ['budapest', 'prague', 'krakow', 'lisbon', 'bangkok', 'vietnam']
    
    if (expensive.some(d => dest.toLowerCase().includes(d))) return 'expensive'
    if (cheap.some(d => dest.toLowerCase().includes(d))) return 'cheap'
    return 'moderate'
  }

  private getDestinationSafetyLevel(dest: string): 'safe' | 'caution' | 'high-caution' {
    // Simplified safety assessment
    return 'caution' // Default to normal precautions
  }

  private getTransportDescription(dest: string): string {
    return 'Well-connected with public transport, taxis, and ride-sharing available'
  }

  private getCulturalDescription(dest: string): string {
    return 'Rich cultural heritage with museums, galleries, and historical landmarks'
  }
}
