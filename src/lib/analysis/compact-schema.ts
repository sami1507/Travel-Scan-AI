// Compact core schema for fast OpenAI analysis
// This is used for the main analysis call to reduce timeout risk
import { z } from 'zod'

export const compactSeasonalitySchema = z.object({
  peakSeason: z.string().nullable(),
  weatherReality: z.string().nullable(),
  crowdReality: z.string().nullable(),
  priceReality: z.string().nullable(),
  honestConsultantNote: z.string().nullable(),
})

export const compactRouteSchema = z.object({
  suggestedRoute: z.array(z.string()).nullable(),
  recommendedNights: z.record(z.number()).nullable(),
  transportLogic: z.string().nullable(),
  routeWarnings: z.array(z.string()).nullable(),
})

export const compactDestinationSchema = z.object({
  destinationId: z.string(),
  destinationName: z.string(),
  destinationType: z.enum(['country', 'city']),
  destinationSummary: z.string().nullable(),
  diversityLabel: z.string().nullable(),
  totalMatchScore: z.number().min(0).max(100),
  whyRecommended: z.array(z.string()).max(3),
  possibleDownsides: z.array(z.string()).max(2),
  bestMonths: z.array(z.number()),
  seasonality: compactSeasonalitySchema.nullable(),
  estimatedBudgetLevel: z.string(),
  // Route fields
  tripType: z.string().nullable(),
  suggestedRoute: z.array(z.string()).nullable(),
  recommendedNights: z.record(z.number()).nullable(),
  transportLogic: z.string().nullable(),
  realisticConsultantNotes: z.string().nullable(),
  routeWarnings: z.array(z.string()).nullable(),
})

export const compactAnalysisResponseSchema = z.object({
  querySummary: z.string(),
  topRecommendations: z.array(z.string()),
  rankedDestinations: z.array(compactDestinationSchema).length(3),
  warnings: z.array(z.string()),
  assumptions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

export type CompactDestination = z.infer<typeof compactDestinationSchema>
export type CompactAnalysisResponse = z.infer<typeof compactAnalysisResponseSchema>
