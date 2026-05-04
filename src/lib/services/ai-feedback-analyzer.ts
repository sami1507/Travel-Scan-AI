// AI Feedback Analyzer - Analyzes user feedback to extract structured insights
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import type { RankedDestination, UserConstraints } from '../analysis/schemas'
import type { RichFeedbackData } from '@/components/travel/rich-feedback-dialog'

const feedbackAnalysisSchema = z.object({
  sentiment: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative']),
  rootCause: z.string().describe('Primary reason for the feedback'),
  affectedDimensions: z.array(z.enum([
    'budget',
    'weather',
    'safety',
    'activities',
    'route_complexity',
    'explanation_clarity',
    'destination_type',
    'timing',
    'value',
    'personalization'
  ])),
  recommendationQuality: z.number().min(1).max(5).describe('Quality of recommendation 1-5'),
  explanationQuality: z.number().min(1).max(5).describe('Quality of explanation 1-5'),
  confidence: z.number().min(0).max(1).describe('Confidence in this analysis'),
  userIntentSignal: z.object({
    preferenceShift: z.boolean(),
    specificRequest: z.string().optional(),
    missingInformation: z.string().optional(),
  }),
  productIssue: z.object({
    hasIssue: z.boolean(),
    issueType: z.enum([
      'scoring_mismatch',
      'missing_data',
      'poor_explanation',
      'route_planning',
      'budget_calculation',
      'seasonal_mismatch',
      'safety_oversight',
      'none'
    ]).optional(),
    severity: z.enum(['low', 'medium', 'high']).optional(),
  }),
  notes: z.string().describe('Additional analysis notes'),
})

export type FeedbackAnalysis = z.infer<typeof feedbackAnalysisSchema>

export interface FeedbackContext {
  feedbackData: RichFeedbackData
  destination: RankedDestination
  userConstraints: UserConstraints
  queryText: string
  destinationRank: number
}

export class AIFeedbackAnalyzer {
  private openai: OpenAI
  private static instance: AIFeedbackAnalyzer | null = null

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    this.openai = new OpenAI({
      apiKey,
    })
  }

  static getInstance(): AIFeedbackAnalyzer {
    if (!this.instance) {
      this.instance = new AIFeedbackAnalyzer()
    }
    return this.instance
  }

  /**
   * Analyze user feedback to extract structured insights
   */
  async analyze(context: FeedbackContext): Promise<FeedbackAnalysis> {
    const prompt = this.buildAnalysisPrompt(context)

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: 'You are a travel recommendation quality analyst. Analyze user feedback to identify root causes, affected dimensions, and product improvement opportunities. Be precise and actionable.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: zodResponseFormat(feedbackAnalysisSchema, 'feedback_analysis'),
        temperature: 0.3,
      })

      const analysis = JSON.parse(completion.choices[0].message.content || '{}')
      return feedbackAnalysisSchema.parse(analysis)
    } catch (error) {
      console.error('AI feedback analysis error:', error)
      // Return default analysis on error
      return this.getDefaultAnalysis(context)
    }
  }

  private buildAnalysisPrompt(context: FeedbackContext): string {
    const { feedbackData, destination, userConstraints, queryText, destinationRank } = context

    return `Analyze this user feedback on a travel recommendation:

FEEDBACK TYPE: ${feedbackData.feedbackType}

USER'S QUERY: "${queryText}"

RECOMMENDATION SHOWN:
- Destination: ${destination.destinationName} (Rank #${destinationRank})
- Match Score: ${destination.totalMatchScore}/100
- Type: ${destination.destinationType}

SCORE BREAKDOWN:
- Budget Fit: ${destination.categoryScores.budgetFit}/10
- Weather Fit: ${destination.categoryScores.weatherFit}/10
- Safety: ${destination.categoryScores.safety}/10
- Nightlife: ${destination.categoryScores.nightlife}/10
- Nature: ${destination.categoryScores.nature}/10
- Transport: ${destination.categoryScores.transport}/10
- Hotel Value: ${destination.categoryScores.hotelValue}/10

WHY RECOMMENDED:
${destination.whyRecommended.map((r, i) => `${i + 1}. ${r}`).join('\n')}

USER CONSTRAINTS:
- Budget: ${userConstraints.budget}
- Travel Months: ${userConstraints.travelMonths?.join(', ') || 'Not specified'}
- Interests: ${userConstraints.interests?.join(', ') || 'Not specified'}

FEEDBACK DETAILS:
Selected Reasons: ${feedbackData.selectedReasons.join(', ') || 'None'}
Comment: ${feedbackData.comment || 'No comment provided'}

PREFERENCE CORRECTIONS:
${JSON.stringify(feedbackData.preferenceCorrections, null, 2)}

Analyze this feedback and identify:
1. The root cause of the feedback
2. Which dimensions are affected (budget, weather, safety, etc.)
3. Quality of the recommendation (1-5)
4. Quality of the explanation (1-5)
5. User intent signals (preference shifts, missing info)
6. Any product issues (scoring mismatch, missing data, etc.)

Be specific and actionable in your analysis.`
  }

  private getDefaultAnalysis(context: FeedbackContext): FeedbackAnalysis {
    return {
      sentiment: context.feedbackData.feedbackType === 'positive' ? 'positive' : 'negative',
      rootCause: 'Unable to analyze - using default',
      affectedDimensions: [],
      recommendationQuality: 3,
      explanationQuality: 3,
      confidence: 0.3,
      userIntentSignal: {
        preferenceShift: false,
      },
      productIssue: {
        hasIssue: false,
        issueType: 'none',
      },
      notes: 'Default analysis due to processing error',
    }
  }

  /**
   * Batch analyze multiple feedback items
   */
  async batchAnalyze(contexts: FeedbackContext[]): Promise<FeedbackAnalysis[]> {
    const analyses: FeedbackAnalysis[] = []

    for (const context of contexts) {
      const analysis = await this.analyze(context)
      analyses.push(analysis)
      
      // Rate limit: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return analyses
  }

  /**
   * Extract common themes from multiple analyses
   */
  extractCommonThemes(analyses: FeedbackAnalysis[]): {
    negativeThemes: Map<string, number>
    positiveThemes: Map<string, number>
    affectedDimensions: Map<string, number>
    productIssues: Map<string, number>
  } {
    const negativeThemes = new Map<string, number>()
    const positiveThemes = new Map<string, number>()
    const affectedDimensions = new Map<string, number>()
    const productIssues = new Map<string, number>()

    for (const analysis of analyses) {
      // Count themes by sentiment
      if (analysis.sentiment === 'negative' || analysis.sentiment === 'very_negative') {
        negativeThemes.set(
          analysis.rootCause,
          (negativeThemes.get(analysis.rootCause) || 0) + 1
        )
      } else if (analysis.sentiment === 'positive' || analysis.sentiment === 'very_positive') {
        positiveThemes.set(
          analysis.rootCause,
          (positiveThemes.get(analysis.rootCause) || 0) + 1
        )
      }

      // Count affected dimensions
      for (const dimension of analysis.affectedDimensions) {
        affectedDimensions.set(
          dimension,
          (affectedDimensions.get(dimension) || 0) + 1
        )
      }

      // Count product issues
      if (analysis.productIssue.hasIssue && analysis.productIssue.issueType) {
        productIssues.set(
          analysis.productIssue.issueType,
          (productIssues.get(analysis.productIssue.issueType) || 0) + 1
        )
      }
    }

    return {
      negativeThemes,
      positiveThemes,
      affectedDimensions,
      productIssues,
    }
  }
}
