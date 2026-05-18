/**
 * Seasonality Skill
 * Ensures realistic, honest timing advice
 */

export const seasonalitySkill = `
SEASON REALITY:
Provide honest, specific timing advice for each recommendation.

REQUIRED SEASON FIELDS:
- peakSeason: months with highest crowds and prices
- shoulderSeason: months with moderate crowds, good weather
- lowSeason: months with lowest crowds, potential weather issues
- weatherReality: specific temperature ranges, precipitation patterns
- crowdReality: honest crowd levels by season
- priceReality: price tendencies (percentage differences if known)
- whenToAvoid: specific months or periods to skip
- honestConsultantNote: balanced timing recommendation

SEASON HONESTY:
- Don't say "good weather" - give temperature ranges
- Don't say "fewer crowds" - specify peak vs shoulder vs low
- Don't hide weather risks - mention rain, heat, cold
- Don't ignore price spikes - Easter, summer, holidays
- Don't oversimplify - shoulder season can vary

SPECIFIC EXAMPLES:
✅ "Peak: June-August (28-35°C, very crowded, hotels 50-70% more expensive)"
✅ "Shoulder: April-May, September-October (18-25°C, moderate crowds, 20-30% premium)"
✅ "Low: November-March (8-15°C, quiet, best prices, but shorter days and rain risk)"
✅ "Avoid: August (extreme heat, peak crowds, many locals on vacation)"
✅ "Best timing: Late April-May or September-early October for weather/crowd/price balance"

❌ "Spring has good weather and fewer crowds"
❌ "Summer is the best time to visit"
❌ "Avoid winter"

MONTH-BY-MONTH STRATEGY:
If user selected a season (not specific month):
- Compare months within that season
- Explain differences (early vs late spring, etc.)
- Provide 3 options per month: bestValue, bestExperience, lowestFatigue
- Include specific weather, crowd, and price notes for each

TIMING TRADEOFFS:
- Peak season: best weather, worst crowds/prices
- Shoulder season: balanced weather/crowds/prices
- Low season: best prices, weather risks, shorter days
- Be honest about what user gains and loses with each choice
`.trim()
