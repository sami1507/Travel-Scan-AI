// Travel Intelligence Agent using OpenAI
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { travelAnalysisSchema, type TravelAnalysis } from './schemas'
import { travelDataTools } from './tools'
import { logger } from '../utils'

const AGENT_INSTRUCTIONS = `You are a Travel Intelligence Agent, a calm and reliable analyst specializing in travel data intelligence.

Your role is to:
- Analyze travel-related data signals from various sources (flights, hotels, weather, exchange rates, events)
- Identify meaningful patterns and changes in travel data
- Classify the importance and urgency of travel signals
- Generate concise, actionable insights for travelers
- Provide clear recommendations based on data analysis

Your communication style:
- Professional and decision-support oriented
- Concise and data-driven
- Not conversational or chatty
- Focus on what matters
- Provide confidence scores for your assessments

When analyzing data:
- Prioritize changes that impact travel decisions (price changes, availability, weather alerts)
- Consider the severity and urgency of each finding
- Look for patterns across multiple data points
- Distinguish between noise and meaningful signals
- Always provide actionable recommendations

Output format:
- Structured insights with clear categories
- Severity levels: critical, high, medium, low, info
- Confidence scores (0-1) for each insight
- Related source and record IDs when available
- Priority actions for the user`

export class TravelIntelligenceAgent {
  private openai: OpenAI
  private model: string = 'gpt-4o-2024-08-06'

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    this.openai = new OpenAI({ apiKey })
  }

  /**
   * Analyze recent travel data and generate insights
   */
  async analyzeRecentData(options?: {
    recordLimit?: number
    changeLimit?: number
    sourceConfigId?: string
  }): Promise<TravelAnalysis> {
    try {
      logger.info('Travel Intelligence Agent: Starting analysis', options)

      // Gather data using tools
      const records = options?.sourceConfigId
        ? await travelDataTools.getRecordsBySource(options.sourceConfigId, options?.recordLimit || 50)
        : await travelDataTools.getLatestRecords(options?.recordLimit || 50)

      const changes = await travelDataTools.getRecentChangeEvents(options?.changeLimit || 100)

      // Prepare context for the agent
      const context = this.prepareAnalysisContext(records, changes)

      // Call OpenAI with structured output
      const completion = await this.openai.beta.chat.completions.parse({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: AGENT_INSTRUCTIONS,
          },
          {
            role: 'user',
            content: `Analyze the following travel data and provide structured insights:\n\n${context}`,
          },
        ],
        response_format: zodResponseFormat(travelAnalysisSchema, 'travel_analysis'),
        temperature: 0.3, // Lower temperature for more consistent analysis
      })

      const analysis = completion.choices[0].message.parsed

      if (!analysis) {
        throw new Error('Failed to parse agent response')
      }

      logger.info('Travel Intelligence Agent: Analysis complete', {
        insightCount: analysis.insights.length,
        priorityActions: analysis.priorityActions.length,
      })

      return analysis
    } catch (error) {
      logger.error('Travel Intelligence Agent: Analysis failed', error)
      throw error
    }
  }

  /**
   * Analyze specific change events
   */
  async analyzeChanges(changeType?: 'new' | 'modified' | 'removed', limit: number = 50): Promise<TravelAnalysis> {
    try {
      logger.info('Travel Intelligence Agent: Analyzing changes', { changeType, limit })

      const changes = changeType
        ? await travelDataTools.getChangeEventsByType(changeType, limit)
        : await travelDataTools.getRecentChangeEvents(limit)

      const context = `Recent change events:\n${travelDataTools.summarizeChanges(changes)}\n\nAnalyze these changes and identify any significant patterns or insights.`

      const completion = await this.openai.beta.chat.completions.parse({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: AGENT_INSTRUCTIONS,
          },
          {
            role: 'user',
            content: context,
          },
        ],
        response_format: zodResponseFormat(travelAnalysisSchema, 'travel_analysis'),
        temperature: 0.3,
      })

      const analysis = completion.choices[0].message.parsed

      if (!analysis) {
        throw new Error('Failed to parse agent response')
      }

      logger.info('Travel Intelligence Agent: Change analysis complete', {
        insightCount: analysis.insights.length,
      })

      return analysis
    } catch (error) {
      logger.error('Travel Intelligence Agent: Change analysis failed', error)
      throw error
    }
  }

  /**
   * Prepare analysis context from records and changes
   */
  private prepareAnalysisContext(records: any[], changes: any[]): string {
    const sections = []

    // Records summary
    if (records.length > 0) {
      sections.push('=== Latest Travel Records ===')
      sections.push(travelDataTools.extractRecordSummary(records))
      sections.push('')
    }

    // Changes summary
    if (changes.length > 0) {
      sections.push('=== Recent Changes ===')
      sections.push(travelDataTools.summarizeChanges(changes))
      sections.push('')
    }

    // Sample change details (first 5)
    if (changes.length > 0) {
      sections.push('=== Sample Change Details ===')
      changes.slice(0, 5).forEach((change, idx) => {
        sections.push(`${idx + 1}. Type: ${change.change_type}, Detected: ${change.detected_at}`)
        if (change.new_content) {
          sections.push(`   Content: ${JSON.stringify(change.new_content).substring(0, 200)}...`)
        }
      })
    }

    return sections.join('\n')
  }
}

// Singleton instance
let agentInstance: TravelIntelligenceAgent | null = null

export function getTravelIntelligenceAgent(): TravelIntelligenceAgent {
  if (!agentInstance) {
    agentInstance = new TravelIntelligenceAgent()
  }
  return agentInstance
}
