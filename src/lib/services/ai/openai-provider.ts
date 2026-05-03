// OpenAI provider for AI summarization
import OpenAI from 'openai'
import type { AIProvider, AISummaryResult, AIAlertResult, ChangeEvent } from '@/lib/types'
import { logger, retryWithBackoff } from '@/lib/utils'

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI'
  private client: OpenAI | null = null

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    } else {
      logger.warn('OpenAI API key not configured, using fallback summaries')
    }
  }

  async summarize(changes: ChangeEvent[], context: Record<string, any>): Promise<AISummaryResult> {
    if (!this.client) {
      return this.fallbackSummary(changes, context)
    }

    try {
      const prompt = this.buildSummaryPrompt(changes, context)

      const response = await retryWithBackoff(async () => {
        return await this.client!.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that analyzes travel data changes and provides concise, actionable summaries. Focus on price changes, availability, and important trends.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        })
      }, 3, 1000)

      const content = response.choices[0]?.message?.content || ''
      const insights = this.extractInsights(content)

      return {
        summary: content,
        insights,
        confidence: 0.9,
      }
    } catch (error) {
      logger.error('OpenAI summarization failed, using fallback', error)
      return this.fallbackSummary(changes, context)
    }
  }

  async generateAlerts(changes: ChangeEvent[], context: Record<string, any>): Promise<AIAlertResult[]> {
    if (!this.client) {
      return this.fallbackAlerts(changes, context)
    }

    try {
      const prompt = this.buildAlertPrompt(changes, context)

      const response = await retryWithBackoff(async () => {
        return await this.client!.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that identifies important travel alerts from data changes. Generate alerts for significant price drops, availability changes, weather warnings, and other actionable insights. Return alerts as JSON array with severity, title, description, and relevantChangeIds.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        })
      }, 3, 1000)

      const content = response.choices[0]?.message?.content || '{}'
      const parsed = JSON.parse(content)
      
      return parsed.alerts || this.fallbackAlerts(changes, context)
    } catch (error) {
      logger.error('OpenAI alert generation failed, using fallback', error)
      return this.fallbackAlerts(changes, context)
    }
  }

  private buildSummaryPrompt(changes: ChangeEvent[], context: Record<string, any>): string {
    const changesSummary = changes.slice(0, 20).map((change, idx) => {
      return `${idx + 1}. ${change.change_type.toUpperCase()}: ${JSON.stringify(change.new_content).substring(0, 200)}`
    }).join('\n')

    return `Analyze these travel data changes and provide a concise summary:

Source Type: ${context.sourceType || 'Unknown'}
Total Changes: ${changes.length}
New Records: ${changes.filter(c => c.change_type === 'new').length}
Modified Records: ${changes.filter(c => c.change_type === 'modified').length}
Removed Records: ${changes.filter(c => c.change_type === 'removed').length}

Recent Changes:
${changesSummary}

Provide a 2-3 sentence summary highlighting the most important changes and actionable insights.`
  }

  private buildAlertPrompt(changes: ChangeEvent[], context: Record<string, any>): string {
    const significantChanges = changes.slice(0, 15).map((change, idx) => {
      return {
        id: change.id,
        type: change.change_type,
        content: change.new_content,
        diff: change.diff,
      }
    })

    return `Analyze these travel data changes and generate alerts for significant events:

Source Type: ${context.sourceType || 'Unknown'}
Changes: ${JSON.stringify(significantChanges, null, 2)}

Generate alerts as JSON in this format:
{
  "alerts": [
    {
      "severity": "high|medium|low|info|critical",
      "title": "Brief alert title",
      "description": "Detailed description with actionable information",
      "relevantChangeIds": ["change_id_1", "change_id_2"]
    }
  ]
}

Focus on:
- Significant price drops (>10%)
- Limited availability warnings
- Weather alerts
- New opportunities
- Important changes requiring action`
  }

  private extractInsights(summary: string): string[] {
    const insights: string[] = []
    
    // Extract bullet points or numbered items
    const bulletPoints = summary.match(/[•\-\*]\s*(.+?)(?=\n|$)/g)
    if (bulletPoints) {
      insights.push(...bulletPoints.map(p => p.replace(/^[•\-\*]\s*/, '').trim()))
    }

    // Extract sentences with key phrases
    const sentences = summary.split(/[.!?]+/)
    for (const sentence of sentences) {
      if (
        sentence.match(/drop|increase|new|available|warning|alert|opportunity/i) &&
        sentence.length > 20 &&
        sentence.length < 150
      ) {
        insights.push(sentence.trim())
      }
    }

    return insights.slice(0, 5)
  }

  private fallbackSummary(changes: ChangeEvent[], context: Record<string, any>): AISummaryResult {
    const newCount = changes.filter(c => c.change_type === 'new').length
    const modifiedCount = changes.filter(c => c.change_type === 'modified').length
    const removedCount = changes.filter(c => c.change_type === 'removed').length

    const summary = `Detected ${changes.length} changes in ${context.sourceType || 'data'}: ${newCount} new records, ${modifiedCount} modified, and ${removedCount} removed. Review the details for specific changes.`

    const insights = []
    if (newCount > 0) insights.push(`${newCount} new items available`)
    if (modifiedCount > 0) insights.push(`${modifiedCount} items have been updated`)
    if (removedCount > 0) insights.push(`${removedCount} items are no longer available`)

    return {
      summary,
      insights,
      confidence: 0.5,
    }
  }

  private fallbackAlerts(changes: ChangeEvent[], context: Record<string, any>): AIAlertResult[] {
    const alerts: AIAlertResult[] = []

    const newChanges = changes.filter(c => c.change_type === 'new')
    const modifiedChanges = changes.filter(c => c.change_type === 'modified')

    if (newChanges.length > 5) {
      alerts.push({
        severity: 'medium',
        title: `${newChanges.length} New Items Available`,
        description: `${newChanges.length} new ${context.sourceType || 'items'} have been added. Review them for potential opportunities.`,
        relevantChangeIds: newChanges.slice(0, 5).map(c => c.id),
      })
    }

    if (modifiedChanges.length > 3) {
      alerts.push({
        severity: 'low',
        title: `${modifiedChanges.length} Items Updated`,
        description: `${modifiedChanges.length} ${context.sourceType || 'items'} have been modified. Check for price or availability changes.`,
        relevantChangeIds: modifiedChanges.slice(0, 5).map(c => c.id),
      })
    }

    return alerts
  }
}

export const openAIProvider = new OpenAIProvider()
