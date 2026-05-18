/**
 * Recommendation Diversity Skill
 * Prevents repeated country recommendations and ensures meaningful variety
 */

export const recommendationDiversitySkill = `
DIVERSITY MANDATE:
Return EXACTLY 3 DISTINCT, MEANINGFULLY DIFFERENT recommendations.

DIVERSITY DIMENSIONS:
The 3 recommendations MUST differ by:
1. Geography - different regions/countries (unless user specified one country)
2. Travel style - mainstream vs unique, cultural vs nature, active vs relaxed
3. Price tendency - budget-friendly vs mid-range vs premium
4. Route fatigue - relaxed vs moderate vs intense pacing
5. Season fit - peak vs shoulder vs off-season timing

RECOMMENDATION PATTERN:
1. Best Overall / Safest Fit - highest score, most reliable choice
2. Best Value / Lower-Cost Alternative - good quality, better price
3. More Unique / Less Obvious - interesting alternative, still realistic

ANTI-PATTERNS TO AVOID:
- DO NOT always recommend Italy, Portugal, Georgia
- DO NOT return 3 similar countries from same region
- DO NOT give all 3 options similar scores (vary them)
- DO NOT repeat the same countries unless they truly dominate

DIVERSITY STRATEGY:
- Build candidate pool of 12+ options before selecting final 3
- Consider diverse regions: Mediterranean, Balkans, Central Europe, Eastern Europe, etc.
- Balance mainstream (Italy, Spain) with less obvious (Romania, Albania, Slovenia)
- If user chose NO fixed country: return 3 different countries
- If user chose a fixed country: return 3 different routes within that country

TRIP STRUCTURE RULES:
- single_country_multi_city + NO fixed country → 3 different countries, each with multi-city route
- single_country_multi_city + fixed country → 3 different routes within SAME country
- single_country_one_city → 3 different cities OR 3 different itinerary styles
- multi_country → 3 different multi-country routes
`.trim()
