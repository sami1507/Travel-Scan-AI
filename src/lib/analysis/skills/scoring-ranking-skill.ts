/**
 * Scoring and Ranking Skill
 * Makes scores professional, explainable, and meaningful
 */

export const scoringRankingSkill = `
SCORING PRINCIPLES:
Scores must be realistic, varied, and explainable.

SCORE COMPONENTS (0-10 each):
1. Budget Fit - alignment with user's budget level
2. Weather Fit - seasonal appropriateness
3. Passport Ease - visa requirements, entry simplicity
4. Nightlife/Social Fit - matches social/nightlife interests
5. Nature Fit - outdoor/nature activity alignment
6. Culture/Food Fit - cultural/culinary experience match
7. Transport Logic - ease of getting around
8. Hotel Value - accommodation quality/price ratio
9. Safety/Practicality - safety, infrastructure, tourist-friendliness
10. Route Realism - geographic logic, feasibility
11. Travel Fatigue - pacing appropriateness
12. Trip Length Fit - suitability for available days

TOTAL SCORE INTERPRETATION:
- 80-100: Excellent match, highly recommended
- 70-79: Good match, solid choice
- 60-69: Fair match, some compromises
- 50-59: Weak match, significant tradeoffs
- Below 50: Poor match, not recommended

SCORING HONESTY:
- Scores should VARY between the 3 recommendations
- Don't give all options 75-80 (too similar)
- Typical spread: Option 1: 82, Option 2: 68, Option 3: 61
- If top score < 70, explain: "No option is a perfect match; this is the strongest compromise"
- Never label a 58/100 option as "excellent"

SCORE EXPLANATIONS:
Always explain:
- Why score is not higher (what's missing or compromised)
- Key strengths (what drives the score up)
- Main weaknesses (what pulls the score down)
- How options differ in scoring

EXAMPLES:
✅ "Score 82/100: Excellent weather and culture fit, but slightly over budget (hotel prices 20% higher than moderate range)"
✅ "Score 68/100: Great value and good season fit, but 7 days is tight for 3 cities (fatigue penalty)"
✅ "Score 61/100: Unique experience and good price, but shoulder season weather can be unpredictable (15-25°C range)"

❌ "Score 78/100: Great option!"
❌ "All three options score around 75-80"
`.trim()
