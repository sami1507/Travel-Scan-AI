// Evidence-based intelligence schemas
import { z } from 'zod'

export const evidenceSchema = z.object({
  fact: z.string().describe('Direct verified fact from data'),
  source: z.string().describe('Source of this fact'),
  timestamp: z.string().optional().describe('When this fact was recorded'),
  confidence: z.enum(['verified', 'inferred', 'uncertain']).describe('Confidence in this fact'),
})

export const insightCategorySchema = z.enum([
  'opportunity',
  'risk',
  'monitoring',
  'mixed',
])

export const insightSeveritySchema = z.enum([
  'info',
  'important',
  'urgent',
])

export const confidenceLevelSchema = z.enum([
  'low',
  'medium',
  'high',
])

export const travelInsightSchema = z.object({
  summary: z.string().describe('Concise user-facing summary'),
  category: insightCategorySchema.describe('Type of insight'),
  severity: insightSeveritySchema.describe('Urgency level'),
  recommendation: z.string().describe('Clear actionable recommendation'),
  confidence: confidenceLevelSchema.describe('Overall confidence level'),
  facts: z.array(z.string()).describe('Direct verified facts only'),
  evidence: z.array(evidenceSchema).describe('Structured evidence supporting this insight'),
  unsupportedGaps: z.array(z.string()).describe('Missing data that limits confidence'),
  relatedSourceIds: z.array(z.string()).optional().describe('Related source config IDs'),
  relatedRecordIds: z.array(z.string()).optional().describe('Related normalized record IDs'),
  reasoning: z.string().describe('Clear explanation of how facts led to recommendation'),
})

export const intelligenceReportSchema = z.object({
  insights: z.array(travelInsightSchema).describe('List of evidence-based insights'),
  topOpportunities: z.array(z.string()).describe('Most important opportunities'),
  topRisks: z.array(z.string()).describe('Most important risks'),
  recommendedActions: z.array(z.string()).describe('Priority actions for user'),
  overallAssessment: z.string().describe('Overall assessment of travel intelligence'),
  dataQuality: z.object({
    sourceConfidence: z.number().describe('Source confidence score 0-1'),
    dataCompleteness: z.number().describe('Data completeness score 0-1'),
    lastUpdated: z.string().describe('When data was last updated'),
  }).describe('Data quality metrics'),
  timestamp: z.string().describe('Report generation timestamp'),
})

export type Evidence = z.infer<typeof evidenceSchema>
export type InsightCategory = z.infer<typeof insightCategorySchema>
export type InsightSeverity = z.infer<typeof insightSeveritySchema>
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>
export type TravelInsight = z.infer<typeof travelInsightSchema>
export type IntelligenceReport = z.infer<typeof intelligenceReportSchema>
