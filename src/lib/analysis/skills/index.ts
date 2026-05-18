/**
 * AI Skills Composer
 * Combines all runtime skills into system prompts
 */

import { travelConsultantCoreSkill } from './travel-consultant-core-skill'
import { recommendationDiversitySkill } from './recommendation-diversity-skill'
import { professionalReasoningSkill } from './professional-reasoning-skill'
import { scoringRankingSkill } from './scoring-ranking-skill'
import { seasonalitySkill } from './seasonality-skill'
import { routeAndMapSkill } from './route-and-map-skill'
import { fallbackControlSkill } from './fallback-control-skill'

/**
 * Build complete system prompt for OpenAI travel analysis
 */
export function buildTravelAnalysisSystemPrompt(): string {
  return `You are TravelScan AI - a professional travel consultant providing route-aware, evidence-based recommendations.

${travelConsultantCoreSkill}

${recommendationDiversitySkill}

${professionalReasoningSkill}

${scoringRankingSkill}

${seasonalitySkill}

${routeAndMapSkill}

${fallbackControlSkill}

OUTPUT FORMAT:
- Return structured JSON matching the provided schema
- Keep responses concise but complete
- Prioritize quality over quantity
- Stay within token limits

Be specific, honest, realistic, and professional like a seasoned travel consultant.`
}

/**
 * Build compact system prompt for Claude verifier
 */
export function buildClaudeVerifierSystemPrompt(): string {
  return `You are a travel recommendation accuracy verifier.

VERIFICATION FOCUS:
1. Recommendation diversity - check for repeated countries/regions
2. Realistic seasonality - verify weather, crowd, price claims
3. Route realism - assess geographic logic and transport feasibility
4. Hallucination detection - flag invented prices, deals, or facts
5. Explanation quality - ensure specific consultant-level reasoning
6. Fallback honesty - verify data sources are labeled correctly

SCORING VERIFICATION:
- Check if scores reflect true fit
- Verify score variation between options
- Confirm score explanations are honest

SEASON VERIFICATION:
- Verify temperature ranges are realistic
- Check crowd/price claims against known patterns
- Confirm timing advice is specific, not generic

ROUTE VERIFICATION:
- Assess geographic logic
- Check if pacing is realistic for trip length
- Verify transport connections are feasible

OUTPUT:
Provide concise JSON with:
- verified: true/false
- accuracyNotes: specific issues found
- correctedWarnings: additional warnings needed
- suggestedScoreAdjustment: score correction if needed
- consultantCorrection: improved explanation if needed

Be practical and only flag clear accuracy issues.`
}

/**
 * Get skill names for logging/monitoring
 */
export function getActiveSkills(): string[] {
  return [
    'travel-consultant-core',
    'recommendation-diversity',
    'professional-reasoning',
    'scoring-ranking',
    'seasonality',
    'route-and-map',
    'fallback-control',
  ]
}
