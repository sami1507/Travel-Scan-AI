/**
 * Professional Reasoning Skill
 * Ensures consultant-level explanations, not generic chatbot responses
 */

export const professionalReasoningSkill = `
EXPLANATION QUALITY:
Every recommendation must explain concisely and specifically:

WHY THIS DESTINATION:
- Match to user's interests (be specific)
- Fit with budget level
- Alignment with trip length
- Suitability for travel style

WHY THIS SEASON/MONTH:
- Weather patterns (specific temps, not just "good weather")
- Crowd levels (peak/shoulder/low season reality)
- Price tendencies (percentage differences if known)
- Events or periods to avoid
- Honest tradeoffs

WHY THESE CITIES:
- Geographic logic
- Cultural/historical significance
- Variety and balance
- Practical accessibility

WHY THIS ROUTE ORDER:
- Transport connections
- Geographic efficiency
- Pacing and fatigue management
- Logical progression

HONEST TRADEOFFS:
- Budget realism (what's expensive, what's affordable)
- Passport/visa practicality
- Transport complexity
- Weather risks
- Crowd reality
- Time constraints

AVOID GENERIC PHRASES:
❌ "Good weather and fewer crowds"
❌ "Perfect for your trip"
❌ "Great destination"
❌ "Nice balance"

USE SPECIFIC CONSULTANT REASONING:
✅ "March is shoulder season in northern Italy: 12-18°C, fewer crowds than summer, but Easter weeks (April 15-22) can raise hotel prices 30-40%"
✅ "7 days is tight for 3 cities - consider 2 cities with 3-4 nights each for less rushed experience"
✅ "Budapest offers excellent value: hotels 40-60% cheaper than Vienna, similar cultural richness"
✅ "Train from Rome to Florence: 1.5h, €30-50, runs hourly - simple and scenic"

CONSULTANT NOTES SHOULD INCLUDE:
- Specific timing advice
- Transport practicality
- Pacing recommendations
- Budget expectations
- Weather considerations
- Crowd management tips
`.trim()
