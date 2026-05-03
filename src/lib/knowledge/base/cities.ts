// Travel knowledge base - Cities
export interface CityKnowledge {
  id: string
  name: string
  country: string
  countryCode: string
  region: string
  budgetLevel: 'budget' | 'moderate' | 'expensive' | 'luxury'
  bestMonths: number[]
  highlights: string[]
  nightlifeScore: number // 1-10
  natureScore: number // 1-10
  cultureScore: number // 1-10
  foodScore: number // 1-10
  transportScore: number // 1-10
  hotelValueScore: number // 1-10
  safetyScore: number // 1-10
  practicalNotes: string[]
  avgDailyBudget: {
    budget: number
    moderate: number
    luxury: number
  }
}

export const citiesKnowledge: CityKnowledge[] = [
  {
    id: 'paris-fr',
    name: 'Paris',
    country: 'France',
    countryCode: 'FR',
    region: 'Western Europe',
    budgetLevel: 'expensive',
    bestMonths: [4, 5, 6, 9, 10],
    highlights: [
      'Eiffel Tower and iconic landmarks',
      'World-class museums (Louvre, Orsay)',
      'Exceptional dining and cafes',
      'Romantic atmosphere',
    ],
    nightlifeScore: 8,
    natureScore: 5,
    cultureScore: 10,
    foodScore: 10,
    transportScore: 9,
    hotelValueScore: 5,
    safetyScore: 7,
    practicalNotes: [
      'Metro is efficient and covers most areas',
      'Many museums closed on Mondays',
      'Book restaurants in advance',
      'Learn basic French phrases',
    ],
    avgDailyBudget: {
      budget: 80,
      moderate: 200,
      luxury: 500,
    },
  },
  {
    id: 'bangkok-th',
    name: 'Bangkok',
    country: 'Thailand',
    countryCode: 'TH',
    region: 'Southeast Asia',
    budgetLevel: 'budget',
    bestMonths: [11, 12, 1, 2],
    highlights: [
      'Grand Palace and temples',
      'Street food paradise',
      'Vibrant nightlife',
      'Affordable luxury',
    ],
    nightlifeScore: 10,
    natureScore: 4,
    cultureScore: 9,
    foodScore: 10,
    transportScore: 7,
    hotelValueScore: 10,
    safetyScore: 7,
    practicalNotes: [
      'Use Grab for reliable transport',
      'Dress modestly at temples',
      'Bargain at markets',
      'Avoid tap water',
    ],
    avgDailyBudget: {
      budget: 30,
      moderate: 80,
      luxury: 250,
    },
  },
  {
    id: 'tokyo-jp',
    name: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    region: 'East Asia',
    budgetLevel: 'expensive',
    bestMonths: [3, 4, 10, 11],
    highlights: [
      'Blend of tradition and technology',
      'Exceptional food scene',
      'Safe and clean',
      'Unique cultural experiences',
    ],
    nightlifeScore: 8,
    natureScore: 6,
    cultureScore: 10,
    foodScore: 10,
    transportScore: 10,
    hotelValueScore: 4,
    safetyScore: 10,
    practicalNotes: [
      'Get JR Pass for train travel',
      'Cash is still king in many places',
      'Learn basic Japanese etiquette',
      'Book accommodations early',
    ],
    avgDailyBudget: {
      budget: 70,
      moderate: 180,
      luxury: 450,
    },
  },
  {
    id: 'rome-it',
    name: 'Rome',
    country: 'Italy',
    countryCode: 'IT',
    region: 'Southern Europe',
    budgetLevel: 'moderate',
    bestMonths: [4, 5, 9, 10],
    highlights: [
      'Ancient Roman ruins',
      'Vatican City',
      'Authentic Italian cuisine',
      'Historic architecture',
    ],
    nightlifeScore: 6,
    natureScore: 5,
    cultureScore: 10,
    foodScore: 10,
    transportScore: 6,
    hotelValueScore: 6,
    safetyScore: 7,
    practicalNotes: [
      'Book Colosseum tickets in advance',
      'Wear comfortable walking shoes',
      'Avoid restaurants near tourist sites',
      'Watch for pickpockets',
    ],
    avgDailyBudget: {
      budget: 60,
      moderate: 150,
      luxury: 400,
    },
  },
  {
    id: 'barcelona-es',
    name: 'Barcelona',
    country: 'Spain',
    countryCode: 'ES',
    region: 'Southern Europe',
    budgetLevel: 'moderate',
    bestMonths: [4, 5, 6, 9, 10],
    highlights: [
      'Gaudi architecture',
      'Beautiful beaches',
      'Vibrant nightlife',
      'Excellent food scene',
    ],
    nightlifeScore: 10,
    natureScore: 7,
    cultureScore: 9,
    foodScore: 9,
    transportScore: 8,
    hotelValueScore: 7,
    safetyScore: 6,
    practicalNotes: [
      'Book Sagrada Familia tickets early',
      'Watch for pickpockets on Las Ramblas',
      'Dinner starts late (9-10pm)',
      'Beach is crowded in summer',
    ],
    avgDailyBudget: {
      budget: 55,
      moderate: 140,
      luxury: 350,
    },
  },
  {
    id: 'lisbon-pt',
    name: 'Lisbon',
    country: 'Portugal',
    countryCode: 'PT',
    region: 'Southern Europe',
    budgetLevel: 'moderate',
    bestMonths: [4, 5, 6, 9, 10],
    highlights: [
      'Charming neighborhoods',
      'Affordable prices',
      'Great seafood',
      'Historic trams',
    ],
    nightlifeScore: 7,
    natureScore: 7,
    cultureScore: 8,
    foodScore: 9,
    transportScore: 7,
    hotelValueScore: 8,
    safetyScore: 9,
    practicalNotes: [
      'Hilly terrain - wear good shoes',
      'Try pastéis de nata',
      'Get a Lisboa Card for transport',
      'Visit Sintra as day trip',
    ],
    avgDailyBudget: {
      budget: 45,
      moderate: 110,
      luxury: 280,
    },
  },
  {
    id: 'athens-gr',
    name: 'Athens',
    country: 'Greece',
    countryCode: 'GR',
    region: 'Southern Europe',
    budgetLevel: 'moderate',
    bestMonths: [4, 5, 6, 9, 10],
    highlights: [
      'Ancient Acropolis',
      'Greek cuisine',
      'Gateway to islands',
      'Affordable compared to Western Europe',
    ],
    nightlifeScore: 7,
    natureScore: 6,
    cultureScore: 10,
    foodScore: 9,
    transportScore: 6,
    hotelValueScore: 7,
    safetyScore: 7,
    practicalNotes: [
      'Visit Acropolis early morning',
      'Use metro for transport',
      'Avoid August heat',
      'Book island ferries in advance',
    ],
    avgDailyBudget: {
      budget: 50,
      moderate: 120,
      luxury: 300,
    },
  },
  {
    id: 'cancun-mx',
    name: 'Cancun',
    country: 'Mexico',
    countryCode: 'MX',
    region: 'North America',
    budgetLevel: 'moderate',
    bestMonths: [12, 1, 2, 3, 4],
    highlights: [
      'Beautiful beaches',
      'Mayan ruins nearby',
      'All-inclusive resorts',
      'Water activities',
    ],
    nightlifeScore: 9,
    natureScore: 9,
    cultureScore: 6,
    foodScore: 7,
    transportScore: 6,
    hotelValueScore: 7,
    safetyScore: 7,
    practicalNotes: [
      'Stay in hotel zone for safety',
      'Visit Tulum and Chichen Itza',
      'Avoid hurricane season',
      'Use authorized taxis only',
    ],
    avgDailyBudget: {
      budget: 50,
      moderate: 130,
      luxury: 350,
    },
  },
  {
    id: 'amsterdam-nl',
    name: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    region: 'Western Europe',
    budgetLevel: 'expensive',
    bestMonths: [4, 5, 6, 9],
    highlights: [
      'Canal cruises',
      'World-class museums',
      'Bike-friendly city',
      'Liberal culture',
    ],
    nightlifeScore: 8,
    natureScore: 5,
    cultureScore: 9,
    foodScore: 7,
    transportScore: 9,
    hotelValueScore: 5,
    safetyScore: 8,
    practicalNotes: [
      'Rent a bike to explore',
      'Book Anne Frank House months ahead',
      'Watch for bikes when walking',
      'Accommodation is expensive',
    ],
    avgDailyBudget: {
      budget: 70,
      moderate: 180,
      luxury: 450,
    },
  },
  {
    id: 'dubai-ae',
    name: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    region: 'Middle East',
    budgetLevel: 'luxury',
    bestMonths: [11, 12, 1, 2, 3],
    highlights: [
      'Luxury shopping',
      'Modern architecture',
      'Desert experiences',
      'World-class hotels',
    ],
    nightlifeScore: 7,
    natureScore: 6,
    cultureScore: 6,
    foodScore: 8,
    transportScore: 8,
    hotelValueScore: 6,
    safetyScore: 9,
    practicalNotes: [
      'Extremely hot May-September',
      'Dress modestly in public',
      'Alcohol only in hotels',
      'Taxis are affordable',
    ],
    avgDailyBudget: {
      budget: 80,
      moderate: 220,
      luxury: 600,
    },
  },
]

export function getCityKnowledge(id: string): CityKnowledge | undefined {
  return citiesKnowledge.find(c => c.id === id)
}

export function searchCities(query: string): CityKnowledge[] {
  const lowerQuery = query.toLowerCase()
  return citiesKnowledge.filter(
    c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.country.toLowerCase().includes(lowerQuery) ||
      c.region.toLowerCase().includes(lowerQuery)
  )
}

export function getCitiesByCountry(countryCode: string): CityKnowledge[] {
  return citiesKnowledge.filter(c => c.countryCode === countryCode)
}
