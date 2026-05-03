// Lightweight RAG-style knowledge retrieval
import { countriesKnowledge, getCountryKnowledge, searchCountries, type CountryKnowledge } from './base/countries'
import { citiesKnowledge, getCityKnowledge, searchCities, getCitiesByCountry, type CityKnowledge } from './base/cities'

export interface RetrievalContext {
  query: string
  destination?: string
  budget?: string
  months?: number[]
  interests?: string[]
}

export interface RetrievedKnowledge {
  countries: CountryKnowledge[]
  cities: CityKnowledge[]
  relevanceScore: number
  matchedKeywords: string[]
}

export class KnowledgeRetrieval {
  /**
   * Retrieve relevant knowledge based on user query and context
   */
  retrieve(context: RetrievalContext): RetrievedKnowledge {
    const { query, destination, budget, months, interests } = context
    
    const matchedKeywords: string[] = []
    let countries: CountryKnowledge[] = []
    let cities: CityKnowledge[] = []
    
    // Extract keywords from query
    const keywords = this.extractKeywords(query)
    matchedKeywords.push(...keywords)
    
    // Search by destination if provided
    if (destination) {
      const destCountries = searchCountries(destination)
      const destCities = searchCities(destination)
      countries.push(...destCountries)
      cities.push(...destCities)
    }
    
    // Search by query keywords
    keywords.forEach(keyword => {
      const keywordCountries = searchCountries(keyword)
      const keywordCities = searchCities(keyword)
      countries.push(...keywordCountries)
      cities.push(...keywordCities)
    })
    
    // Remove duplicates
    countries = this.deduplicateCountries(countries)
    cities = this.deduplicateCities(cities)
    
    // Filter by budget if provided
    if (budget) {
      countries = countries.filter(c => this.matchesBudget(c.budgetLevel, budget))
      cities = cities.filter(c => this.matchesBudget(c.budgetLevel, budget))
    }
    
    // Filter by months if provided
    if (months && months.length > 0) {
      countries = countries.filter(c => this.matchesMonths(c.bestMonths, months))
      cities = cities.filter(c => this.matchesMonths(c.bestMonths, months))
    }
    
    // Filter by interests if provided
    if (interests && interests.length > 0) {
      cities = this.filterByInterests(cities, interests)
    }
    
    // Calculate relevance score
    const relevanceScore = this.calculateRelevance(countries, cities, matchedKeywords)
    
    return {
      countries,
      cities,
      relevanceScore,
      matchedKeywords,
    }
  }
  
  /**
   * Get knowledge for specific destination
   */
  getDestinationKnowledge(destination: string): {
    country?: CountryKnowledge
    city?: CityKnowledge
  } {
    // Try to find as city first
    const city = citiesKnowledge.find(c => 
      c.name.toLowerCase() === destination.toLowerCase() ||
      c.id.toLowerCase() === destination.toLowerCase()
    )
    
    if (city) {
      const country = getCountryKnowledge(city.countryCode)
      return { city, country }
    }
    
    // Try to find as country
    const country = countriesKnowledge.find(c =>
      c.name.toLowerCase() === destination.toLowerCase() ||
      c.code.toLowerCase() === destination.toLowerCase()
    )
    
    if (country) {
      const cities = getCitiesByCountry(country.code)
      return { country, city: cities[0] }
    }
    
    return {}
  }
  
  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    const lowerQuery = query.toLowerCase()
    const keywords: string[] = []
    
    // Travel-related keywords
    const travelKeywords = [
      'beach', 'mountain', 'city', 'nature', 'culture', 'history',
      'food', 'nightlife', 'adventure', 'relaxation', 'shopping',
      'budget', 'luxury', 'cheap', 'expensive', 'affordable',
      'safe', 'family', 'solo', 'couple', 'romantic',
      'summer', 'winter', 'spring', 'fall', 'warm', 'cold',
    ]
    
    travelKeywords.forEach(keyword => {
      if (lowerQuery.includes(keyword)) {
        keywords.push(keyword)
      }
    })
    
    // Extract country/city names from query
    countriesKnowledge.forEach(country => {
      if (lowerQuery.includes(country.name.toLowerCase())) {
        keywords.push(country.name)
      }
    })
    
    citiesKnowledge.forEach(city => {
      if (lowerQuery.includes(city.name.toLowerCase())) {
        keywords.push(city.name)
      }
    })
    
    return keywords
  }
  
  /**
   * Check if budget level matches
   */
  private matchesBudget(level: string, targetBudget: string): boolean {
    const budgetMap: Record<string, string[]> = {
      'low': ['budget'],
      'budget': ['budget'],
      'moderate': ['budget', 'moderate'],
      'medium': ['budget', 'moderate'],
      'high': ['moderate', 'expensive'],
      'expensive': ['expensive', 'luxury'],
      'luxury': ['luxury'],
    }
    
    const acceptableLevels = budgetMap[targetBudget.toLowerCase()] || []
    return acceptableLevels.includes(level)
  }
  
  /**
   * Check if months overlap with best months
   */
  private matchesMonths(bestMonths: number[], targetMonths: number[]): boolean {
    return targetMonths.some(month => bestMonths.includes(month))
  }
  
  /**
   * Filter cities by interests
   */
  private filterByInterests(cities: CityKnowledge[], interests: string[]): CityKnowledge[] {
    return cities.filter(city => {
      let score = 0
      
      interests.forEach(interest => {
        const lowerInterest = interest.toLowerCase()
        
        if (lowerInterest.includes('nightlife') && city.nightlifeScore >= 7) score++
        if (lowerInterest.includes('nature') && city.natureScore >= 7) score++
        if (lowerInterest.includes('culture') && city.cultureScore >= 7) score++
        if (lowerInterest.includes('food') && city.foodScore >= 7) score++
        if (lowerInterest.includes('history') && city.cultureScore >= 7) score++
        if (lowerInterest.includes('beach') && city.natureScore >= 7) score++
      })
      
      return score > 0
    })
  }
  
  /**
   * Remove duplicate countries
   */
  private deduplicateCountries(countries: CountryKnowledge[]): CountryKnowledge[] {
    const seen = new Set<string>()
    return countries.filter(c => {
      if (seen.has(c.code)) return false
      seen.add(c.code)
      return true
    })
  }
  
  /**
   * Remove duplicate cities
   */
  private deduplicateCities(cities: CityKnowledge[]): CityKnowledge[] {
    const seen = new Set<string>()
    return cities.filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  }
  
  /**
   * Calculate relevance score
   */
  private calculateRelevance(
    countries: CountryKnowledge[],
    cities: CityKnowledge[],
    keywords: string[]
  ): number {
    let score = 0
    
    // More results = higher relevance
    score += Math.min(countries.length * 0.2, 1)
    score += Math.min(cities.length * 0.3, 1.5)
    
    // More matched keywords = higher relevance
    score += Math.min(keywords.length * 0.1, 0.5)
    
    return Math.min(score, 1)
  }
}

export const knowledgeRetrieval = new KnowledgeRetrieval()
