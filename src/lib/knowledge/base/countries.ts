// Travel knowledge base - Countries
export interface CountryKnowledge {
  code: string
  name: string
  region: string
  visaEase: 'visa-free' | 'visa-on-arrival' | 'e-visa' | 'visa-required'
  safetyLevel: number // 1-10
  budgetLevel: 'budget' | 'moderate' | 'expensive' | 'luxury'
  bestMonths: number[] // 1-12
  worstMonths: number[] // 1-12
  highlights: string[]
  warnings: string[]
  transportQuality: number // 1-10
  hotelValue: number // 1-10
  nightlifeLevel: number // 1-10
  natureLevel: number // 1-10
  weatherPatterns: {
    [month: number]: {
      temp: string
      condition: string
      rainfall: 'low' | 'moderate' | 'high'
    }
  }
}

export const countriesKnowledge: CountryKnowledge[] = [
  {
    code: 'FR',
    name: 'France',
    region: 'Western Europe',
    visaEase: 'visa-free',
    safetyLevel: 8,
    budgetLevel: 'expensive',
    bestMonths: [4, 5, 6, 9, 10],
    worstMonths: [12, 1, 2],
    highlights: [
      'World-class museums and art',
      'Exceptional cuisine and wine',
      'Romantic cities and countryside',
      'Rich history and architecture',
    ],
    warnings: [
      'Pickpockets in tourist areas',
      'Expensive accommodation in Paris',
      'August is crowded with tourists',
    ],
    transportQuality: 9,
    hotelValue: 6,
    nightlifeLevel: 8,
    natureLevel: 7,
    weatherPatterns: {
      1: { temp: '5-10°C', condition: 'Cold, rainy', rainfall: 'moderate' },
      4: { temp: '12-18°C', condition: 'Mild, pleasant', rainfall: 'moderate' },
      7: { temp: '20-28°C', condition: 'Warm, sunny', rainfall: 'low' },
      10: { temp: '12-18°C', condition: 'Cool, crisp', rainfall: 'moderate' },
    },
  },
  {
    code: 'TH',
    name: 'Thailand',
    region: 'Southeast Asia',
    visaEase: 'visa-free',
    safetyLevel: 7,
    budgetLevel: 'budget',
    bestMonths: [11, 12, 1, 2],
    worstMonths: [5, 6, 7, 8, 9],
    highlights: [
      'Stunning beaches and islands',
      'Delicious and affordable food',
      'Rich Buddhist culture',
      'Excellent value for money',
    ],
    warnings: [
      'Monsoon season June-October',
      'Tourist scams in major cities',
      'Respect local customs and temples',
    ],
    transportQuality: 7,
    hotelValue: 9,
    nightlifeLevel: 9,
    natureLevel: 9,
    weatherPatterns: {
      1: { temp: '25-32°C', condition: 'Warm, dry', rainfall: 'low' },
      4: { temp: '28-35°C', condition: 'Hot, humid', rainfall: 'moderate' },
      7: { temp: '27-33°C', condition: 'Hot, rainy', rainfall: 'high' },
      11: { temp: '24-31°C', condition: 'Warm, pleasant', rainfall: 'low' },
    },
  },
  {
    code: 'JP',
    name: 'Japan',
    region: 'East Asia',
    visaEase: 'visa-free',
    safetyLevel: 10,
    budgetLevel: 'expensive',
    bestMonths: [3, 4, 10, 11],
    worstMonths: [6, 7, 8],
    highlights: [
      'Cherry blossoms and fall foliage',
      'Unique culture and traditions',
      'Exceptional food and service',
      'Ultra-modern cities and ancient temples',
    ],
    warnings: [
      'Language barrier outside major cities',
      'Expensive accommodation and dining',
      'Typhoon season August-September',
    ],
    transportQuality: 10,
    hotelValue: 5,
    nightlifeLevel: 7,
    natureLevel: 8,
    weatherPatterns: {
      3: { temp: '10-18°C', condition: 'Cool, cherry blossoms', rainfall: 'moderate' },
      6: { temp: '20-28°C', condition: 'Humid, rainy', rainfall: 'high' },
      10: { temp: '15-22°C', condition: 'Pleasant, fall colors', rainfall: 'low' },
      12: { temp: '5-12°C', condition: 'Cold, dry', rainfall: 'low' },
    },
  },
  {
    code: 'IT',
    name: 'Italy',
    region: 'Southern Europe',
    visaEase: 'visa-free',
    safetyLevel: 7,
    budgetLevel: 'moderate',
    bestMonths: [4, 5, 9, 10],
    worstMonths: [7, 8],
    highlights: [
      'World-renowned cuisine',
      'Ancient history and art',
      'Beautiful coastlines',
      'Charming medieval towns',
    ],
    warnings: [
      'Pickpockets in tourist areas',
      'Very crowded in summer',
      'Siesta hours affect business',
    ],
    transportQuality: 7,
    hotelValue: 6,
    nightlifeLevel: 7,
    natureLevel: 8,
    weatherPatterns: {
      4: { temp: '15-22°C', condition: 'Mild, pleasant', rainfall: 'moderate' },
      7: { temp: '25-33°C', condition: 'Hot, crowded', rainfall: 'low' },
      10: { temp: '16-23°C', condition: 'Warm, beautiful', rainfall: 'moderate' },
      1: { temp: '5-12°C', condition: 'Cool, quiet', rainfall: 'moderate' },
    },
  },
  {
    code: 'ES',
    name: 'Spain',
    region: 'Southern Europe',
    visaEase: 'visa-free',
    safetyLevel: 8,
    budgetLevel: 'moderate',
    bestMonths: [4, 5, 6, 9, 10],
    worstMonths: [7, 8],
    highlights: [
      'Vibrant nightlife and festivals',
      'Excellent beaches',
      'Rich cultural heritage',
      'Great food and wine',
    ],
    warnings: [
      'Very hot in summer',
      'Late dining hours',
      'Pickpockets in Barcelona',
    ],
    transportQuality: 8,
    hotelValue: 7,
    nightlifeLevel: 10,
    natureLevel: 7,
    weatherPatterns: {
      5: { temp: '18-25°C', condition: 'Perfect weather', rainfall: 'low' },
      8: { temp: '28-38°C', condition: 'Very hot', rainfall: 'low' },
      10: { temp: '18-25°C', condition: 'Warm, pleasant', rainfall: 'moderate' },
      12: { temp: '10-16°C', condition: 'Mild winter', rainfall: 'moderate' },
    },
  },
  {
    code: 'PT',
    name: 'Portugal',
    region: 'Southern Europe',
    visaEase: 'visa-free',
    safetyLevel: 9,
    budgetLevel: 'moderate',
    bestMonths: [4, 5, 6, 9, 10],
    worstMonths: [12, 1, 2],
    highlights: [
      'Affordable compared to Western Europe',
      'Beautiful coastline and beaches',
      'Historic cities',
      'Excellent wine and seafood',
    ],
    warnings: [
      'Limited English outside tourist areas',
      'Hilly terrain in Lisbon',
      'Can be rainy in winter',
    ],
    transportQuality: 7,
    hotelValue: 8,
    nightlifeLevel: 7,
    natureLevel: 8,
    weatherPatterns: {
      5: { temp: '17-24°C', condition: 'Warm, sunny', rainfall: 'low' },
      8: { temp: '23-30°C', condition: 'Hot, dry', rainfall: 'low' },
      11: { temp: '14-19°C', condition: 'Mild, rainy', rainfall: 'high' },
      2: { temp: '10-16°C', condition: 'Cool, wet', rainfall: 'high' },
    },
  },
  {
    code: 'GR',
    name: 'Greece',
    region: 'Southern Europe',
    visaEase: 'visa-free',
    safetyLevel: 8,
    budgetLevel: 'moderate',
    bestMonths: [5, 6, 9, 10],
    worstMonths: [7, 8],
    highlights: [
      'Ancient history and ruins',
      'Beautiful islands',
      'Mediterranean cuisine',
      'Warm hospitality',
    ],
    warnings: [
      'Very crowded islands in summer',
      'Extremely hot July-August',
      'Ferry schedules can be unreliable',
    ],
    transportQuality: 6,
    hotelValue: 7,
    nightlifeLevel: 8,
    natureLevel: 9,
    weatherPatterns: {
      5: { temp: '20-27°C', condition: 'Perfect weather', rainfall: 'low' },
      8: { temp: '28-35°C', condition: 'Very hot', rainfall: 'low' },
      10: { temp: '20-26°C', condition: 'Warm, pleasant', rainfall: 'moderate' },
      1: { temp: '10-15°C', condition: 'Cool, rainy', rainfall: 'high' },
    },
  },
  {
    code: 'MX',
    name: 'Mexico',
    region: 'North America',
    visaEase: 'visa-free',
    safetyLevel: 6,
    budgetLevel: 'budget',
    bestMonths: [11, 12, 1, 2, 3, 4],
    worstMonths: [6, 7, 8, 9],
    highlights: [
      'Rich culture and history',
      'Beautiful beaches',
      'Delicious cuisine',
      'Affordable prices',
    ],
    warnings: [
      'Safety concerns in some regions',
      'Hurricane season June-November',
      'Avoid tap water',
    ],
    transportQuality: 6,
    hotelValue: 8,
    nightlifeLevel: 8,
    natureLevel: 8,
    weatherPatterns: {
      1: { temp: '20-28°C', condition: 'Warm, dry', rainfall: 'low' },
      5: { temp: '25-32°C', condition: 'Hot, humid', rainfall: 'moderate' },
      8: { temp: '26-33°C', condition: 'Hot, rainy', rainfall: 'high' },
      12: { temp: '18-26°C', condition: 'Pleasant, dry', rainfall: 'low' },
    },
  },
]

export function getCountryKnowledge(code: string): CountryKnowledge | undefined {
  return countriesKnowledge.find(c => c.code === code)
}

export function searchCountries(query: string): CountryKnowledge[] {
  const lowerQuery = query.toLowerCase()
  return countriesKnowledge.filter(
    c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.code.toLowerCase().includes(lowerQuery) ||
      c.region.toLowerCase().includes(lowerQuery)
  )
}
