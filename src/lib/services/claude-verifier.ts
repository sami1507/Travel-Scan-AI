// Claude Verifier - Optional accuracy verification for travel recommendations
import { logger } from '../utils'
import { errorTracker } from '../monitoring/error-tracker'
import type { RankedDestination } from '../analysis/schemas'

export interface ClaudeVerificationResult {
  verified: boolean
  accuracyNotes: string[]
  correctedWarnings: string[]
  suggestedScoreAdjustment?: number
  consultantCorrection?: string
  shouldSimplifyRoute?: boolean
  suggestedAlternative?: string
}

export interface ClaudeVerifierConfig {
  enabled: boolean
  apiKey?: string
  timeout: number
}

export class ClaudeVerifierService {
  private enabled: boolean = false
  private apiKey?: string
  private timeout: number = 15000 // 15 seconds
  private Anthropic: any = null

  constructor() {
    // Check feature flag
    this.enabled = process.env.ENABLE_CLAUDE_VERIFIER === 'true'
    this.apiKey = process.env.ANTHROPIC_API_KEY

    if (!this.enabled) {
      logger.info('Claude verifier disabled via ENABLE_CLAUDE_VERIFIER flag')
      return
    }

    if (!this.apiKey) {
      logger.warn('ANTHROPIC_API_KEY not set - Claude verifier will be skipped')
      this.enabled = false
      return
    }

    // Dynamically import Anthropic SDK only if enabled
    try {
      const AnthropicSDK = require('@anthropic-ai/sdk')
      this.Anthropic = new AnthropicSDK.default({
        apiKey: this.apiKey,
      })
      logger.info('Claude verifier initialized successfully')
    } catch (error) {
      logger.warn('Failed to initialize Claude verifier - @anthropic-ai/sdk not installed', error)
      this.enabled = false
    }
  }

  /**
   * Verify a single recommendation for accuracy
   */
  async verifyRecommendation(
    recommendation: RankedDestination,
    tripLength: number,
    tripStructure: string
  ): Promise<ClaudeVerificationResult | null> {
    if (!this.enabled || !this.Anthropic) {
      return null
    }

    try {
      const verificationPrompt = this.buildVerificationPrompt(recommendation, tripLength, tripStructure)
      
      const response = await Promise.race([
        this.Anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: verificationPrompt,
          }],
          temperature: 0.3,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Claude verification timeout')), this.timeout)
        ),
      ])

      const result = this.parseVerificationResponse(response)
      
      logger.info('Claude verification completed', {
        destination: recommendation.destinationName,
        verified: result.verified,
      })

      return result
    } catch (error) {
      logger.warn('Claude verification failed - continuing without verification', {
        destination: recommendation.destinationName,
        error: error instanceof Error ? error.message : String(error),
      })
      
      errorTracker.trackProviderError('claude', error, 'verification', {
        destination: recommendation.destinationName,
        nonBlocking: true,
      })

      return null
    }
  }

  /**
   * Build verification prompt for Claude
   */
  private buildVerificationPrompt(
    recommendation: RankedDestination,
    tripLength: number,
    tripStructure: string
  ): string {
    return `You are a travel accuracy verifier. Review this travel recommendation and check for realism issues.

RECOMMENDATION:
Destination: ${recommendation.destinationName}
Type: ${recommendation.destinationType}
Trip Type: ${recommendation.tripType || tripStructure}
Trip Length: ${tripLength} days
Suggested Route: ${recommendation.suggestedRoute?.join(' → ') || 'Single destination'}
Recommended Nights: ${JSON.stringify(recommendation.recommendedNights || {})}
Route Realism Score: ${recommendation.routeRealismScore || 'N/A'}/100
Travel Fatigue: ${recommendation.travelFatigueLevel || 'N/A'}
Transport: ${recommendation.transportLogic || 'N/A'}
Consultant Notes: ${recommendation.realisticConsultantNotes || 'N/A'}
Current Warnings: ${recommendation.routeWarnings?.join(', ') || 'None'}

VERIFICATION CHECKLIST:
1. Is the route geographically logical?
2. Is the number of stops realistic for ${tripLength} days?
3. Is the travel fatigue level accurate?
4. Is the route realism score reasonable?
5. Is the transport logic realistic?
6. Are warnings missing?
7. Are alternatives needed?
8. Is the recommendation too rushed or too spread out?
9. Does it respect the trip structure (${tripStructure})?

Respond in JSON format:
{
  "verified": true/false,
  "accuracyNotes": ["note1", "note2"],
  "correctedWarnings": ["warning1", "warning2"],
  "suggestedScoreAdjustment": -10 to +10 or null,
  "consultantCorrection": "improved consultant note" or null,
  "shouldSimplifyRoute": true/false,
  "suggestedAlternative": "alternative suggestion" or null
}

Keep it concise and practical. Only suggest changes if there are clear accuracy issues.`
  }

  /**
   * Parse Claude's verification response
   */
  private parseVerificationResponse(response: any): ClaudeVerificationResult {
    try {
      const content = response.content?.[0]?.text || ''
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        verified: parsed.verified ?? true,
        accuracyNotes: Array.isArray(parsed.accuracyNotes) ? parsed.accuracyNotes : [],
        correctedWarnings: Array.isArray(parsed.correctedWarnings) ? parsed.correctedWarnings : [],
        suggestedScoreAdjustment: typeof parsed.suggestedScoreAdjustment === 'number' ? parsed.suggestedScoreAdjustment : undefined,
        consultantCorrection: parsed.consultantCorrection || undefined,
        shouldSimplifyRoute: parsed.shouldSimplifyRoute ?? false,
        suggestedAlternative: parsed.suggestedAlternative || undefined,
      }
    } catch (error) {
      logger.warn('Failed to parse Claude verification response', error)
      return {
        verified: true,
        accuracyNotes: [],
        correctedWarnings: [],
      }
    }
  }

  /**
   * Apply verification results to recommendation
   */
  applyVerification(
    recommendation: RankedDestination,
    verification: ClaudeVerificationResult | null
  ): RankedDestination {
    if (!verification) {
      return recommendation
    }

    const updated = { ...recommendation }

    // Add accuracy notes to why recommended
    if (verification.accuracyNotes.length > 0) {
      updated.whyRecommended = [
        ...(updated.whyRecommended || []),
        ...verification.accuracyNotes.slice(0, 2), // Add max 2 notes
      ]
    }

    // Update warnings if Claude found issues
    if (verification.correctedWarnings.length > 0) {
      updated.routeWarnings = verification.correctedWarnings
    }

    // Adjust realism score if suggested
    if (verification.suggestedScoreAdjustment && updated.routeRealismScore) {
      const newScore = Math.max(0, Math.min(100, updated.routeRealismScore + verification.suggestedScoreAdjustment))
      updated.routeRealismScore = newScore
      updated.totalMatchScore = newScore
    }

    // Update consultant notes if Claude has a better version
    if (verification.consultantCorrection) {
      updated.realisticConsultantNotes = verification.consultantCorrection
    }

    // Add alternative if suggested
    if (verification.suggestedAlternative) {
      updated.routeAlternatives = verification.suggestedAlternative
    }

    return updated
  }

  /**
   * Check if verifier is enabled and available
   */
  isAvailable(): boolean {
    return this.enabled && this.Anthropic !== null
  }
}

// Singleton instance
let claudeVerifierInstance: ClaudeVerifierService | null = null

export function getClaudeVerifier(): ClaudeVerifierService {
  if (!claudeVerifierInstance) {
    claudeVerifierInstance = new ClaudeVerifierService()
  }
  return claudeVerifierInstance
}
