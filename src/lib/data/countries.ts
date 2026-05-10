export interface Country {
  code: string
  name: string
  region: string
}

export const COUNTRIES: Country[] = [
  // North America
  { code: 'US', name: 'United States', region: 'North America' },
  { code: 'CA', name: 'Canada', region: 'North America' },
  { code: 'MX', name: 'Mexico', region: 'North America' },
  
  // Europe
  { code: 'GB', name: 'United Kingdom', region: 'Europe' },
  { code: 'FR', name: 'France', region: 'Europe' },
  { code: 'DE', name: 'Germany', region: 'Europe' },
  { code: 'IT', name: 'Italy', region: 'Europe' },
  { code: 'ES', name: 'Spain', region: 'Europe' },
  { code: 'NL', name: 'Netherlands', region: 'Europe' },
  { code: 'BE', name: 'Belgium', region: 'Europe' },
  { code: 'CH', name: 'Switzerland', region: 'Europe' },
  { code: 'AT', name: 'Austria', region: 'Europe' },
  { code: 'SE', name: 'Sweden', region: 'Europe' },
  { code: 'NO', name: 'Norway', region: 'Europe' },
  { code: 'DK', name: 'Denmark', region: 'Europe' },
  { code: 'FI', name: 'Finland', region: 'Europe' },
  { code: 'IE', name: 'Ireland', region: 'Europe' },
  { code: 'PT', name: 'Portugal', region: 'Europe' },
  { code: 'GR', name: 'Greece', region: 'Europe' },
  { code: 'PL', name: 'Poland', region: 'Europe' },
  { code: 'CZ', name: 'Czech Republic', region: 'Europe' },
  { code: 'HU', name: 'Hungary', region: 'Europe' },
  { code: 'RO', name: 'Romania', region: 'Europe' },
  { code: 'BG', name: 'Bulgaria', region: 'Europe' },
  { code: 'HR', name: 'Croatia', region: 'Europe' },
  { code: 'SI', name: 'Slovenia', region: 'Europe' },
  { code: 'SK', name: 'Slovakia', region: 'Europe' },
  { code: 'EE', name: 'Estonia', region: 'Europe' },
  { code: 'LV', name: 'Latvia', region: 'Europe' },
  { code: 'LT', name: 'Lithuania', region: 'Europe' },
  { code: 'IS', name: 'Iceland', region: 'Europe' },
  { code: 'LU', name: 'Luxembourg', region: 'Europe' },
  { code: 'MT', name: 'Malta', region: 'Europe' },
  { code: 'CY', name: 'Cyprus', region: 'Europe' },
  
  // Asia
  { code: 'JP', name: 'Japan', region: 'Asia' },
  { code: 'CN', name: 'China', region: 'Asia' },
  { code: 'KR', name: 'South Korea', region: 'Asia' },
  { code: 'IN', name: 'India', region: 'Asia' },
  { code: 'SG', name: 'Singapore', region: 'Asia' },
  { code: 'TH', name: 'Thailand', region: 'Asia' },
  { code: 'MY', name: 'Malaysia', region: 'Asia' },
  { code: 'ID', name: 'Indonesia', region: 'Asia' },
  { code: 'PH', name: 'Philippines', region: 'Asia' },
  { code: 'VN', name: 'Vietnam', region: 'Asia' },
  { code: 'HK', name: 'Hong Kong', region: 'Asia' },
  { code: 'TW', name: 'Taiwan', region: 'Asia' },
  { code: 'PK', name: 'Pakistan', region: 'Asia' },
  { code: 'BD', name: 'Bangladesh', region: 'Asia' },
  { code: 'LK', name: 'Sri Lanka', region: 'Asia' },
  { code: 'NP', name: 'Nepal', region: 'Asia' },
  { code: 'MM', name: 'Myanmar', region: 'Asia' },
  { code: 'KH', name: 'Cambodia', region: 'Asia' },
  { code: 'LA', name: 'Laos', region: 'Asia' },
  { code: 'MN', name: 'Mongolia', region: 'Asia' },
  
  // Middle East
  { code: 'AE', name: 'United Arab Emirates', region: 'Middle East' },
  { code: 'SA', name: 'Saudi Arabia', region: 'Middle East' },
  { code: 'QA', name: 'Qatar', region: 'Middle East' },
  { code: 'KW', name: 'Kuwait', region: 'Middle East' },
  { code: 'BH', name: 'Bahrain', region: 'Middle East' },
  { code: 'OM', name: 'Oman', region: 'Middle East' },
  { code: 'IL', name: 'Israel', region: 'Middle East' },
  { code: 'JO', name: 'Jordan', region: 'Middle East' },
  { code: 'LB', name: 'Lebanon', region: 'Middle East' },
  { code: 'TR', name: 'Turkey', region: 'Middle East' },
  { code: 'EG', name: 'Egypt', region: 'Middle East' },
  
  // Oceania
  { code: 'AU', name: 'Australia', region: 'Oceania' },
  { code: 'NZ', name: 'New Zealand', region: 'Oceania' },
  { code: 'FJ', name: 'Fiji', region: 'Oceania' },
  
  // South America
  { code: 'BR', name: 'Brazil', region: 'South America' },
  { code: 'AR', name: 'Argentina', region: 'South America' },
  { code: 'CL', name: 'Chile', region: 'South America' },
  { code: 'CO', name: 'Colombia', region: 'South America' },
  { code: 'PE', name: 'Peru', region: 'South America' },
  { code: 'VE', name: 'Venezuela', region: 'South America' },
  { code: 'EC', name: 'Ecuador', region: 'South America' },
  { code: 'BO', name: 'Bolivia', region: 'South America' },
  { code: 'PY', name: 'Paraguay', region: 'South America' },
  { code: 'UY', name: 'Uruguay', region: 'South America' },
  
  // Africa
  { code: 'ZA', name: 'South Africa', region: 'Africa' },
  { code: 'KE', name: 'Kenya', region: 'Africa' },
  { code: 'NG', name: 'Nigeria', region: 'Africa' },
  { code: 'GH', name: 'Ghana', region: 'Africa' },
  { code: 'TZ', name: 'Tanzania', region: 'Africa' },
  { code: 'UG', name: 'Uganda', region: 'Africa' },
  { code: 'ET', name: 'Ethiopia', region: 'Africa' },
  { code: 'MA', name: 'Morocco', region: 'Africa' },
  { code: 'TN', name: 'Tunisia', region: 'Africa' },
  { code: 'SN', name: 'Senegal', region: 'Africa' },
  { code: 'CI', name: 'Ivory Coast', region: 'Africa' },
  { code: 'CM', name: 'Cameroon', region: 'Africa' },
  { code: 'ZW', name: 'Zimbabwe', region: 'Africa' },
  { code: 'BW', name: 'Botswana', region: 'Africa' },
  { code: 'NA', name: 'Namibia', region: 'Africa' },
  { code: 'MU', name: 'Mauritius', region: 'Africa' },
  { code: 'SC', name: 'Seychelles', region: 'Africa' },
  
  // Caribbean & Central America
  { code: 'CR', name: 'Costa Rica', region: 'Central America' },
  { code: 'PA', name: 'Panama', region: 'Central America' },
  { code: 'GT', name: 'Guatemala', region: 'Central America' },
  { code: 'BZ', name: 'Belize', region: 'Central America' },
  { code: 'SV', name: 'El Salvador', region: 'Central America' },
  { code: 'HN', name: 'Honduras', region: 'Central America' },
  { code: 'NI', name: 'Nicaragua', region: 'Central America' },
  { code: 'JM', name: 'Jamaica', region: 'Caribbean' },
  { code: 'BS', name: 'Bahamas', region: 'Caribbean' },
  { code: 'BB', name: 'Barbados', region: 'Caribbean' },
  { code: 'TT', name: 'Trinidad and Tobago', region: 'Caribbean' },
  { code: 'DO', name: 'Dominican Republic', region: 'Caribbean' },
  { code: 'CU', name: 'Cuba', region: 'Caribbean' },
]

export function searchCountries(query: string): Country[] {
  if (!query || query.length < 2) return []
  
  const searchTerm = query.toLowerCase().trim()
  
  return COUNTRIES.filter(country => 
    country.name.toLowerCase().includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm) ||
    country.region.toLowerCase().includes(searchTerm)
  ).slice(0, 8) // Limit to 8 results for better UX
}

export function formatCountryDisplay(country: Country): string {
  return country.name
}
