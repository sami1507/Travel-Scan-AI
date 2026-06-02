// Global AI candidate generation for worldwide travel recommendations
// This allows OpenAI to suggest destinations beyond hard-coded CSV data

import OpenAI from 'openai'
import { AnalysisRequest } from './engine'
import { logger } from '@/lib/utils'

export interface GlobalCandidate {
  country: string
  routeCities: string[]
  region: string
  whyPotentialFit: string
  likelySeasonFit: string
  estimatedFatigue: 'low' | 'moderate' | 'high'
  budgetFit: 'budget' | 'moderate' | 'comfortable' | 'luxury'
  interestsFit: string[]
  cautions: string
  dataConfidence: 'ai_knowledge' | 'structured_data_enriched'
  dataCoverage: 'full' | 'partial' | 'limited_internal_data'
}

export interface GlobalCandidateResult {
  candidates: GlobalCandidate[]
  openAIUsed: boolean
  globalCandidatesGenerated: number
  countriesGenerated: string[]
  error?: string
}

/**
 * Generate global candidate destinations using OpenAI's travel knowledge
 * This is NOT final selection - it's candidate discovery
 */
export async function generateGlobalCandidates(
  request: AnalysisRequest
): Promise<GlobalCandidateResult> {
  
  // Skip if destination is fixed (user selected specific country)
  if (request.destination) {
    logger.info('Global candidate generation skipped - destination fixed', {
      destination: request.destination,
    })
    return {
      candidates: [],
      openAIUsed: false,
      globalCandidatesGenerated: 0,
      countriesGenerated: [],
    }
  }
  
  try {
    const prompt = buildGlobalCandidatePrompt(request)
    
    logger.info('Generating global candidates with OpenAI', {
      departureCity: request.departureCity,
      tripLength: request.tripLength,
      budget: request.budget,
      travelMonths: request.travelMonths,
      interests: request.interests,
      tripStructure: request.tripStructure,
    })
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a global travel expert. Generate realistic worldwide destination candidates based on user requirements. Return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })
    
    const content = completion.choices[0]?.message?.content || '{}'
    const result = JSON.parse(content)
    const candidates: GlobalCandidate[] = result.candidates || []
    
    // Validate and normalize candidates
    const validCandidates = candidates
      .filter(c => c.country && c.routeCities && c.routeCities.length > 0)
      .map(c => ({
        ...c,
        dataConfidence: 'ai_knowledge' as const,
        dataCoverage: 'limited_internal_data' as const,
      }))
    
    logger.info('Global candidates generated', {
      candidatesGenerated: validCandidates.length,
      countries: validCandidates.map(c => c.country),
      regions: [...new Set(validCandidates.map(c => c.region))],
    })
    
    return {
      candidates: validCandidates,
      openAIUsed: true,
      globalCandidatesGenerated: validCandidates.length,
      countriesGenerated: validCandidates.map(c => c.country),
    }
    
  } catch (error) {
    logger.error('Global candidate generation failed', error)
    return {
      candidates: [],
      openAIUsed: false,
      globalCandidatesGenerated: 0,
      countriesGenerated: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Build prompt for global candidate generation
 */
function buildGlobalCandidatePrompt(request: AnalysisRequest): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const travelMonthsText = request.travelMonths?.map(m => monthNames[m - 1]).join(', ') || 'any'
  
  return `Generate 20-30 realistic worldwide destination candidates for this traveler:

TRAVELER PROFILE:
- Departure: ${request.departureCity || 'flexible'}
- Trip Length: ${request.tripLength || 7} days
- Budget: ${request.budget || 'moderate'}
- Travel Months: ${travelMonthsText}
- Interests: ${request.interests?.join(', ') || 'general travel'}
- Trip Structure: ${request.tripStructure || 'single_country_multi_city'}
- Pace: ${request.pace || 'moderate'}
- Travel Style: ${request.travelStyle || 'flexible'}

REQUIREMENTS:
1. Consider WORLDWIDE destinations, not just Europe
2. For ${request.tripLength || 7} days and ${request.budget || 'moderate'} budget, valid regions include:
   - Europe (Western, Central, Eastern, Southern, Northern, Balkans)
   - Middle East (Turkey, Jordan, UAE, Oman)
   - North Africa (Morocco, Egypt, Tunisia)
   - Caucasus (Georgia, Armenia, Azerbaijan)
   - Central Asia (Uzbekistan, Kazakhstan, Kyrgyzstan)
   - Southeast Asia (Thailand, Vietnam, Malaysia, Singapore, Indonesia)
   - East Asia (Japan, South Korea, Taiwan, China)
   - South Asia (India, Sri Lanka, Nepal)
   - Americas (Mexico, Colombia, Peru, Chile, Argentina, USA, Canada)
   - Other realistic options for duration/budget/season

3. Each candidate must be realistic for:
   - Trip duration (${request.tripLength || 7} days)
   - Budget level (${request.budget || 'moderate'})
   - Travel season (${travelMonthsText})
   - Departure logistics from ${request.departureCity || 'major hub'}

4. Do NOT restrict to only Europe/Caucasus
5. Do NOT force destinations just because they're popular
6. Do NOT invent fake prices or direct flights
7. DO consider visa requirements, safety, and accessibility

Return JSON format:
{
  "candidates": [
    {
      "country": "Japan",
      "routeCities": ["Tokyo", "Kyoto", "Osaka"],
      "region": "East Asia",
      "whyPotentialFit": "Excellent match for ${request.tripLength || 7} days, ${request.interests?.slice(0, 2).join(' and ') || 'diverse experiences'}, ${travelMonthsText} season",
      "likelySeasonFit": "good/excellent/fair",
      "estimatedFatigue": "moderate",
      "budgetFit": "${request.budget || 'moderate'}",
      "interestsFit": ${JSON.stringify(request.interests?.slice(0, 3) || ['culture', 'food', 'sightseeing'])},
      "cautions": "Visa requirements, language barrier, higher costs in peak season"
    }
  ]
}

Generate 20-30 diverse candidates covering multiple regions and styles.`
}
