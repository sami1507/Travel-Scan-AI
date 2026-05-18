/**
 * Fallback Control Skill
 * Ensures fallback behavior is honest and useful
 */

export const fallbackControlSkill = `
FALLBACK HONESTY:
When using fallback/estimated data, be transparent.

FALLBACK SCENARIOS:
1. Missing live API data (flights, hotels)
2. Empty knowledge base results
3. Timeout or provider failure
4. Insufficient data for specific destination

FALLBACK BEHAVIOR:
- Never silently present fallback as live truth
- Label data source clearly: fallback_estimate
- Provide useful conservative estimates
- Explain what's known vs unknown
- Suggest where to verify

FALLBACK DIVERSITY:
Even in fallback mode:
- DO NOT always return Rome/Lisbon/Tbilisi
- Select diverse routes from fallback library
- Ensure 3 different countries/regions
- Match user preferences (budget, interests, season)
- Vary by trip structure

FALLBACK QUALITY:
Fallback recommendations should still include:
- Realistic route suggestions
- Honest season timing
- Transport logic
- Fatigue assessment
- Budget estimates (ranges, not exact)
- Warnings about data limitations

FALLBACK METADATA:
Always include in response:
- dataQuality: 'fallback_estimate' or 'demo'
- confidence: lower confidence scores (0.4-0.6)
- assumptions: list what was assumed
- dataFreshness: indicate fallback was used

EXAMPLES:
✅ "Based on historical patterns (fallback estimate): Rome hotels typically €80-150/night in spring"
✅ "Live flight data unavailable - typical range: €150-300 from Tel Aviv to Athens"
✅ "Knowledge base limited for this destination - recommendations based on regional patterns"

❌ "Flights cost €180" (when using fallback)
❌ "Hotels are €120/night" (when using fallback)
❌ Presenting fallback data as if it's live/verified
`.trim()
