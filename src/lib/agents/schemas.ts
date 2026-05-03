// Agent output schemas
import { z } from 'zod'

export const severitySchema = z.enum(['critical', 'high', 'medium', 'low', 'info'])

export const travelInsightSchema = z.object({
  summary: z.string().describe('Concise summary of the travel intelligence finding'),
  category: z.enum(['price_change', 'availability', 'weather_alert', 'rate_fluctuation', 'event_detected', 'general']).describe('Category of the insight'),
  severity: severitySchema.describe('Severity level of the insight'),
  recommendation: z.string().describe('Actionable recommendation for the user'),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  relatedSourceIds: z.array(z.string()).optional().describe('Related source config IDs'),
  relatedRecordIds: z.array(z.string()).optional().describe('Related normalized record IDs'),
  metadata: z.record(z.any()).optional().describe('Additional metadata'),
})

export const travelAnalysisSchema = z.object({
  insights: z.array(travelInsightSchema).describe('List of travel insights discovered'),
  overallAssessment: z.string().describe('Overall assessment of the travel data'),
  priorityActions: z.array(z.string()).describe('Priority actions for the user'),
  timestamp: z.string().describe('Analysis timestamp'),
})

export type TravelInsight = z.infer<typeof travelInsightSchema>
export type TravelAnalysis = z.infer<typeof travelAnalysisSchema>
export type Severity = z.infer<typeof severitySchema>
