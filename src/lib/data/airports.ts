export interface Airport {
  code: string
  city: string
  country: string
  name: string
}

export const MAJOR_AIRPORTS: Airport[] = [
  // North America
  { code: 'JFK', city: 'New York', country: 'USA', name: 'John F. Kennedy International' },
  { code: 'LAX', city: 'Los Angeles', country: 'USA', name: 'Los Angeles International' },
  { code: 'ORD', city: 'Chicago', country: 'USA', name: "O'Hare International" },
  { code: 'ATL', city: 'Atlanta', country: 'USA', name: 'Hartsfield-Jackson Atlanta International' },
  { code: 'DFW', city: 'Dallas', country: 'USA', name: 'Dallas/Fort Worth International' },
  { code: 'DEN', city: 'Denver', country: 'USA', name: 'Denver International' },
  { code: 'SFO', city: 'San Francisco', country: 'USA', name: 'San Francisco International' },
  { code: 'SEA', city: 'Seattle', country: 'USA', name: 'Seattle-Tacoma International' },
  { code: 'LAS', city: 'Las Vegas', country: 'USA', name: 'Harry Reid International' },
  { code: 'MCO', city: 'Orlando', country: 'USA', name: 'Orlando International' },
  { code: 'MIA', city: 'Miami', country: 'USA', name: 'Miami International' },
  { code: 'BOS', city: 'Boston', country: 'USA', name: 'Logan International' },
  { code: 'EWR', city: 'Newark', country: 'USA', name: 'Newark Liberty International' },
  { code: 'IAH', city: 'Houston', country: 'USA', name: 'George Bush Intercontinental' },
  { code: 'PHX', city: 'Phoenix', country: 'USA', name: 'Phoenix Sky Harbor International' },
  { code: 'YYZ', city: 'Toronto', country: 'Canada', name: 'Toronto Pearson International' },
  { code: 'YVR', city: 'Vancouver', country: 'Canada', name: 'Vancouver International' },
  { code: 'YUL', city: 'Montreal', country: 'Canada', name: 'Montréal-Pierre Elliott Trudeau International' },
  { code: 'MEX', city: 'Mexico City', country: 'Mexico', name: 'Mexico City International' },
  
  // Europe
  { code: 'LHR', city: 'London', country: 'UK', name: 'Heathrow' },
  { code: 'LGW', city: 'London', country: 'UK', name: 'Gatwick' },
  { code: 'CDG', city: 'Paris', country: 'France', name: 'Charles de Gaulle' },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', name: 'Schiphol' },
  { code: 'FRA', city: 'Frankfurt', country: 'Germany', name: 'Frankfurt Airport' },
  { code: 'MUC', city: 'Munich', country: 'Germany', name: 'Munich Airport' },
  { code: 'BCN', city: 'Barcelona', country: 'Spain', name: 'Barcelona-El Prat' },
  { code: 'MAD', city: 'Madrid', country: 'Spain', name: 'Adolfo Suárez Madrid-Barajas' },
  { code: 'FCO', city: 'Rome', country: 'Italy', name: 'Leonardo da Vinci-Fiumicino' },
  { code: 'MXP', city: 'Milan', country: 'Italy', name: 'Malpensa' },
  { code: 'IST', city: 'Istanbul', country: 'Turkey', name: 'Istanbul Airport' },
  { code: 'DXB', city: 'Dubai', country: 'UAE', name: 'Dubai International' },
  { code: 'ZRH', city: 'Zurich', country: 'Switzerland', name: 'Zurich Airport' },
  { code: 'VIE', city: 'Vienna', country: 'Austria', name: 'Vienna International' },
  { code: 'CPH', city: 'Copenhagen', country: 'Denmark', name: 'Copenhagen Airport' },
  { code: 'ARN', city: 'Stockholm', country: 'Sweden', name: 'Stockholm Arlanda' },
  { code: 'OSL', city: 'Oslo', country: 'Norway', name: 'Oslo Airport' },
  { code: 'HEL', city: 'Helsinki', country: 'Finland', name: 'Helsinki-Vantaa' },
  { code: 'LIS', city: 'Lisbon', country: 'Portugal', name: 'Lisbon Portela' },
  { code: 'ATH', city: 'Athens', country: 'Greece', name: 'Athens International' },
  
  // Asia Pacific
  { code: 'HND', city: 'Tokyo', country: 'Japan', name: 'Haneda' },
  { code: 'NRT', city: 'Tokyo', country: 'Japan', name: 'Narita International' },
  { code: 'ICN', city: 'Seoul', country: 'South Korea', name: 'Incheon International' },
  { code: 'SIN', city: 'Singapore', country: 'Singapore', name: 'Singapore Changi' },
  { code: 'HKG', city: 'Hong Kong', country: 'Hong Kong', name: 'Hong Kong International' },
  { code: 'BKK', city: 'Bangkok', country: 'Thailand', name: 'Suvarnabhumi' },
  { code: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia', name: 'Kuala Lumpur International' },
  { code: 'SYD', city: 'Sydney', country: 'Australia', name: 'Sydney Kingsford Smith' },
  { code: 'MEL', city: 'Melbourne', country: 'Australia', name: 'Melbourne Airport' },
  { code: 'AKL', city: 'Auckland', country: 'New Zealand', name: 'Auckland Airport' },
  { code: 'PEK', city: 'Beijing', country: 'China', name: 'Beijing Capital International' },
  { code: 'PVG', city: 'Shanghai', country: 'China', name: 'Shanghai Pudong International' },
  { code: 'DEL', city: 'Delhi', country: 'India', name: 'Indira Gandhi International' },
  { code: 'BOM', city: 'Mumbai', country: 'India', name: 'Chhatrapati Shivaji Maharaj International' },
  { code: 'MNL', city: 'Manila', country: 'Philippines', name: 'Ninoy Aquino International' },
  { code: 'CGK', city: 'Jakarta', country: 'Indonesia', name: 'Soekarno-Hatta International' },
  
  // Middle East & Africa
  { code: 'DOH', city: 'Doha', country: 'Qatar', name: 'Hamad International' },
  { code: 'AUH', city: 'Abu Dhabi', country: 'UAE', name: 'Abu Dhabi International' },
  { code: 'CAI', city: 'Cairo', country: 'Egypt', name: 'Cairo International' },
  { code: 'JNB', city: 'Johannesburg', country: 'South Africa', name: 'O.R. Tambo International' },
  { code: 'CPT', city: 'Cape Town', country: 'South Africa', name: 'Cape Town International' },
  
  // South America
  { code: 'GRU', city: 'São Paulo', country: 'Brazil', name: 'São Paulo/Guarulhos International' },
  { code: 'GIG', city: 'Rio de Janeiro', country: 'Brazil', name: 'Rio de Janeiro/Galeão International' },
  { code: 'EZE', city: 'Buenos Aires', country: 'Argentina', name: 'Ministro Pistarini International' },
  { code: 'BOG', city: 'Bogotá', country: 'Colombia', name: 'El Dorado International' },
  { code: 'LIM', city: 'Lima', country: 'Peru', name: 'Jorge Chávez International' },
  { code: 'SCL', city: 'Santiago', country: 'Chile', name: 'Arturo Merino Benítez International' },
]

export function searchAirports(query: string): Airport[] {
  if (!query || query.length < 2) return []
  
  const searchTerm = query.toLowerCase().trim()
  
  return MAJOR_AIRPORTS.filter(airport => 
    airport.code.toLowerCase().includes(searchTerm) ||
    airport.city.toLowerCase().includes(searchTerm) ||
    airport.country.toLowerCase().includes(searchTerm) ||
    airport.name.toLowerCase().includes(searchTerm)
  ).slice(0, 8) // Limit to 8 results for better UX
}

export function formatAirportDisplay(airport: Airport): string {
  return `${airport.city} (${airport.code}) - ${airport.country}`
}
