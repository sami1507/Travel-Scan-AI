// Evidence-based Travel Intelligence Agent
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { intelligenceReportSchema, type IntelligenceReport, type Evidence } from './schemas'
import { intelligenceDataTools, type StructuredTravelData } from './tools'
import { rulesEngine } from './rules'
import { logger } from '../utils'

const AGENT_INSTRUCTIONS = `You are a Travel Intelligence Agent - a rigorous, evidence-based analyst.

CORE PRINCIPLE: Interpret facts, never invent facts.

Your role:
- Analyze structured travel data from verified sources
- Generate insights grounded in explicit evidence
- Separate facts, inference, and recommendations clearly
- Provide confidence levels based on evidence strength
- Identify gaps in data that limit conclusions

STRICT REQUIREMENTS:
1. Use ONLY the structured data provided to you
2. Do NOT invent prices, dates, risks, or events
3. Do NOT make unsupported recommendations
4. Every conclusion must cite explicit evidence
5. If evidence is weak, state this explicitly
6. If data is missing, acknowledge the gap
7. Distinguish between verified facts and inferences

Evidence standards:
- VERIFIED: Direct data from source
- INFERRED: Logical conclusion from verified data
- UNCERTAIN: Insufficient data to conclude

Output requirements:
- Facts: Only direct verified facts from data
- Evidence: Structured evidence with sources
- Unsupported gaps: Missing data that limits confidence
- Reasoning: Clear explanation of how facts led to recommendation
- Confidence: Honest assessment (low/medium/high)

Communication style:
- Professional and analytical
- Clear and precise
- Not conversational
- Focus on what the data shows
- Acknowledge uncertainty
- Guide decisions with evidence

When analyzing:
- Start with verified facts
- Apply logical inference only when supported
- Identify patterns in the data
- Assess data quality and completeness
- Provide confidence based on evidence strength
- Recommend actions only when justified by evidence`

export class TravelIntelligenceAgent {
  private openai: OpenAI
  private model: string = 'gpt-4o-2024-08-06'

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      logger.warn('OPENAI_API_KEY not set - Intelligence reports will use basic analysis')
      // Don't throw - allow graceful degradation
      return
    }

    this.openai = new OpenAI({ apiKey })
  }

  /**
   * Generate evidence-based intelligence report
   */
  async generateIntelligenceReport(options?: {
    recordLimit?: number
    changeLimit?: number
    sourceConfigId?: string
  }): Promise<IntelligenceReport> {
    try {
      logger.info('Intelligence Agent: Starting evidence-based analysis', options)

      // Return basic report if OpenAI not available
      if (!this.openai) {
        logger.warn('Intelligence report using basic analysis - OpenAI not configured')
        return this.createBasicReport()
      }

      // Step 1: Gather structured data
      const data = await intelligenceDataTools.getStructuredTravelData(options)

      // Step 2: Apply rules layer
      const ruleOutput = rulesEngine.evaluateSignificance(
        data.metrics,
        data.opportunityMetrics,
        data.riskMetrics
      )

      // Step 3: Validate evidence strength
      const evidenceValidation = rulesEngine.validateEvidenceStrength(
        data.changes.length,
        data.metrics.sourceConfidence,
        data.metrics.dataCompleteness
      )

      // Step 4: Prepare context for agent
      const context = this.prepareEvidenceContext(data, ruleOutput, evidenceValidation)

      // Step 5: Call OpenAI with structured output
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
        response_format: zodResponseFormat(intelligenceReportSchema, 'intelligence_report'),
        temperature: 0.2, // Very low for consistent, grounded analysis
      })

      const report = completion.choices[0].message.parsed

      if (!report) {
        throw new Error('Failed to parse agent response')
      }

      // Step 6: Verify output quality
      const verifiedReport = this.verifyReport(report, evidenceValidation)

      logger.info('Intelligence Agent: Report generated', {
        insightCount: verifiedReport.insights.length,
        opportunities: verifiedReport.topOpportunities.length,
        risks: verifiedReport.topRisks.length,
      })

      return verifiedReport
    } catch (error) {
      logger.error('Intelligence Agent: Analysis failed', error)
      throw error
    }
  }

  /**
   * Prepare evidence-based context for the agent
   */
  private prepareEvidenceContext(
    data: StructuredTravelData,
    ruleOutput: any,
    evidenceValidation: any
  ): string {
    const sections: string[] = []

    // Data quality section
    sections.push('=== DATA QUALITY ===')
    sections.push(`Source Confidence: ${(data.metrics.sourceConfidence * 100).toFixed(1)}%`)
    sections.push(`Data Completeness: ${(data.metrics.dataCompleteness * 100).toFixed(1)}%`)
    sections.push(`Evidence Strength: ${evidenceValidation.isStrong ? 'STRONG' : 'WEAK'}`)
    sections.push(`Max Allowed Confidence: ${evidenceValidation.maxAllowedConfidence.toUpperCase()}`)
    if (evidenceValidation.gaps.length > 0) {
      sections.push(`Data Gaps: ${evidenceValidation.gaps.join(', ')}`)
    }
    sections.push('')

    // Verified metrics section
    sections.push('=== VERIFIED METRICS ===')
    sections.push(`Total Records: ${data.records.length}`)
    sections.push(`Total Changes: ${data.changes.length}`)
    if (data.metrics.priceChangePercentage !== null) {
      sections.push(`Price Change: ${data.metrics.priceChangePercentage.toFixed(2)}%`)
    }
    sections.push(`Volatility Score: ${(data.metrics.volatilityScore * 100).toFixed(1)}%`)
    sections.push(`Opportunity Score: ${(data.metrics.opportunityScore * 100).toFixed(1)}%`)
    sections.push(`Risk Score: ${(data.metrics.riskScore * 100).toFixed(1)}%`)
    sections.push('')

    // Rule-based assessment
    sections.push('=== RULE-BASED ASSESSMENT ===')
    sections.push(`Significant: ${ruleOutput.isSignificant ? 'YES' : 'NO'}`)
    sections.push(`Category: ${ruleOutput.category.toUpperCase()}`)
    sections.push(`Severity: ${ruleOutput.severity.toUpperCase()}`)
    sections.push(`Recommendation Strength: ${ruleOutput.recommendationStrength.toUpperCase()}`)
    sections.push(`Rule Reasons: ${ruleOutput.reasons.join('; ')}`)
    sections.push('')

    // Opportunity evidence
    if (data.opportunityMetrics.evidence.length > 0) {
      sections.push('=== OPPORTUNITY EVIDENCE ===')
      data.opportunityMetrics.evidence.forEach(e => sections.push(`- ${e}`))
      sections.push('')
    }

    // Risk evidence
    if (data.riskMetrics.evidence.length > 0) {
      sections.push('=== RISK EVIDENCE ===')
      data.riskMetrics.evidence.forEach(e => sections.push(`- ${e}`))
      sections.push('')
    }

    // Sample change details (first 10)
    if (data.changes.length > 0) {
      sections.push('=== SAMPLE CHANGE EVENTS (VERIFIED DATA) ===')
      data.changes.slice(0, 10).forEach((change, idx) => {
        sections.push(`${idx + 1}. Type: ${change.change_type}, Detected: ${change.detected_at}`)
        if (change.change_type === 'modified' && change.diff) {
          sections.push(`   Changes: ${JSON.stringify(change.diff).substring(0, 150)}`)
        }
      })
      sections.push('')
    }

    // Source information
    if (data.sources.length > 0) {
      sections.push('=== SOURCE INFORMATION ===')
      data.sources.forEach(source => {
        sections.push(`- ${source.name} (${source.source_type}): ${source.is_active ? 'ACTIVE' : 'INACTIVE'}`)
      })
      sections.push('')
    }

    sections.push('=== INSTRUCTIONS ===')
    sections.push('Based on the VERIFIED DATA above:')
    sections.push('1. Generate insights using ONLY the facts provided')
    sections.push('2. Cite specific evidence for each claim')
    sections.push('3. Acknowledge data gaps explicitly')
    sections.push('4. Set confidence levels based on evidence strength')
    sections.push('5. Do NOT invent facts not present in the data')
    sections.push(`6. Maximum allowed confidence: ${evidenceValidation.maxAllowedConfidence}`)

    return sections.join('\n')
  }

  /**
   * Verify report quality and adjust confidence if needed
   */
  private verifyReport(
    report: IntelligenceReport,
    evidenceValidation: any
  ): IntelligenceReport {
    // Downgrade confidence if evidence doesn't support it
    const verifiedInsights = report.insights.map(insight => {
      let adjustedConfidence = insight.confidence

      // Enforce maximum allowed confidence
      if (evidenceValidation.maxAllowedConfidence === 'low' && insight.confidence !== 'low') {
        adjustedConfidence = 'low'
      } else if (evidenceValidation.maxAllowedConfidence === 'medium' && insight.confidence === 'high') {
        adjustedConfidence = 'medium'
      }

      // Require evidence for high confidence
      if (insight.confidence === 'high' && insight.evidence.length < 3) {
        adjustedConfidence = 'medium'
      }

      return {
        ...insight,
        confidence: adjustedConfidence,
      }
    })

    return {
      ...report,
      insights: verifiedInsights,
    }
  }

  /**
   * Create basic intelligence report when OpenAI is not available
   */
  private createBasicReport(): IntelligenceReport {
    return {
      insights: [],
      topOpportunities: [],
      topRisks: [],
      recommendedActions: [],
      overallAssessment: 'Intelligence analysis unavailable - OpenAI not configured',
      dataQuality: {
        sourceConfidence: 0,
        dataCompleteness: 0,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
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
