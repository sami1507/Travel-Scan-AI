// Compact production prompt builder for fast OpenAI analysis
// Target: <=4500 characters to reduce timeout risk

import { AnalysisRequest } from './engine'
import { RouteCandidate } from './route-candidate-pool'

export interface TravelDataContext {
  routeCandidates?: RouteCandidate[]
  attractions?: Map<string, any[]>
  weather?: Map<string, any[]>
}

export function buildCompactTravelAnalysisPrompt(
  request: AnalysisRequest,
  travelDataContext?: TravelDataContext
): string {
  // Build travel data section if available
  let travelDataSection = ''
  
  if (travelDataContext?.routeCandidates && travelDataContext.routeCandidates.length > 0) {
    const topRoutes = travelDataContext.routeCandidates.slice(0, 6)
    
    travelDataSection = `\nTRAVEL DATA CONTEXT (use as planning reference):
${topRoutes.map(route => {
  const attractions = travelDataContext.attractions?.get(route.id) || []
  const weather = travelDataContext.weather?.get(route.id) || []
  
  return `• ${route.country} - ${route.routeCities.join(' → ')}
  Days: ${route.routeCities.length * 2}-${route.routeCities.length * 3} | Budget: ${route.priceTier} | Fatigue: ${route.travelFatigue}
  Best months: ${route.bestMonths.slice(0, 5).join(',')} | Interests: ${route.interestsFit.slice(0, 4).join(', ')}
  Why: ${route.whyCandidateFits.slice(0, 100)}${route.whyCandidateFits.length > 100 ? '...' : ''}
  ${route.watchOut ? `⚠️ ${route.watchOut.slice(0, 80)}${route.watchOut.length > 80 ? '...' : ''}` : ''}
  ${attractions.length > 0 ? `Attractions: ${attractions.slice(0, 3).map((a: any) => a.name).join(', ')}` : ''}
  ${weather.length > 0 ? `Weather: avg ${Math.round(weather.reduce((sum: number, w: any) => sum + parseInt(w.weather_score), 0) / weather.length)}/100` : ''}`
}).join('\n\n')}

Note: This data is planning-level guidance from curated sources. Use it as context but apply your travel expertise.
`
  }

  const prompt = `You are a professional travel consultant. You are NOT allowed to simply list destinations.

COMPARISON REQUIREMENT:
First, internally compare the candidate routes provided using:
• Trip length match (${request.tripLength || 7} days)
• Trip structure fit (${request.tripStructure?.replace(/_/g, ' ')})
• Budget alignment (${request.budget || 'moderate'})
• Travel months/season (${request.travelMonths?.map(m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]).join(', ') || 'any'})
• User interests (${request.interests?.join(', ') || 'general travel'})
• Route fatigue level
• Route realism and transport practicality
• Attractions match
• Weather/crowd considerations
• Value and practicality

Then choose exactly 3 recommendations with these roles:
1. **Best Overall Fit** - Highest match across all criteria
2. **Best Practical/Value Option** - Best balance of cost, ease, and quality
3. **Different Vibe/Unique Discovery** - Distinct alternative worth considering

For each final recommendation, you MUST explain:
• Why this route fits the user input
• Why it beat other candidate routes
• What tradeoff the user should know
• Why this option is different from the other two
• What to verify before booking

DATA HONESTY:
• Do NOT claim live prices, live events, or direct flights unless real live data is available
• Use "estimated", "typical", or "planning-level" for uncertain data
• If candidate data is limited, acknowledge in assumptions
${travelDataSection}

TRIP STRUCTURE RULES:
${request.tripStructure === 'single_country_one_city' ? '- Focus on one city deep-dive routes' : ''}
${request.tripStructure === 'single_country_multi_city' ? '- Each recommendation must be a single country with 2-4 cities' : ''}
${request.tripStructure === 'multi_country' ? '- Each recommendation can be multi-country or single country with multiple cities' : ''}
${request.destination ? `- User selected ${request.destination}, so all 3 must be routes within this country` : '- Compare 3 different countries/routes'}

DIVERSITY RULES:
- Final 3 must differ by region, style, or value when possible
- Avoid all-mainstream Mediterranean set (Spain/Greece/Italy) unless clearly best
- Include at least one less-mainstream or unique option if alternatives score within 20 points
- Labels: "Best Overall", "Best Value", "Unique Discovery"
${request.excludeCountries && request.excludeCountries.length > 0 ? `\n⚠️ AVOID REPEATING: ${request.excludeCountries.join(', ')} - User already saw these. Only repeat if clearly the best fit and explain why.` : ''}
${request.diversityMode === 'alternative_ideas' ? '\n🔄 MODE: Alternative Ideas - Return different valid alternatives from the travel data context. Avoid excluded countries if possible.' : ''}
${request.diversityMode === 'hidden_gems' ? '\n💎 MODE: Hidden Gems - Prioritize less obvious, unique destinations over mainstream options.' : ''}
${request.diversityMode === 'cheaper_options' ? '\n💰 MODE: Value Focus - Prioritize budget-friendly routes with good value for money.' : ''}
${request.diversityMode === 'low_fatigue' ? '\n🧘 MODE: Low Fatigue - Prioritize relaxed routes with minimal travel between cities.' : ''}

SCORING HONESTY:
- Use realistic scores 70-95, not inflated
- Budget fit, weather fit, transport, safety matter most
- Lower scores for rushed routes, expensive transport, or poor timing

ROUTE REQUIREMENTS:
- suggestedRoute: ordered city list
- recommendedNights: nights per city
- transportLogic: how to travel between stops
- routeWarnings: if rushed, expensive, or impractical

DATA HONESTY:
- If candidate data is limited, acknowledge in assumptions
- Don't invent specific prices or flight times
- Use "estimated" or "typical" for uncertain data

BREVITY:
- querySummary: 1-2 sentences max
- destinationSummary: 2-3 sentences max
- whyRecommended: 2-3 bullet points max
- possibleDownsides: 1-2 bullet points max
- realisticConsultantNotes: 2-3 sentences max
- routeWarnings: 1-3 items max
- Set itineraryMapPlan, travelStrategyTips, seasonMonthStrategy to null

REQUIRED OUTPUT:
- Exactly 3 rankedDestinations
- Each with destinationName, destinationSummary, diversityLabel, totalMatchScore, whyRecommended, possibleDownsides, suggestedRoute, recommendedNights, transportLogic, realisticConsultantNotes, routeWarnings, seasonality (compact)
- warnings array (if any)
- assumptions array (if data is limited)

Keep all text short and consultant-realistic.`

  return prompt
}

export function getCompactSystemInstructions(): string {
  return `You are a realistic travel consultant AI. Return structured JSON with exactly 3 travel recommendations.

Rules:
1. Be honest about scores, timing, and feasibility
2. Keep all text brief and practical
3. Respect trip structure preference
4. Ensure diversity across final 3 options
5. Acknowledge data limitations in assumptions
6. Use null for heavy optional fields to reduce token usage

Output format: CompactAnalysisResponse with 3 rankedDestinations.`
}
