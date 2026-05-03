// Structured JSON schemas for travel analysis output
import { z } from 'zod'

export const userConstraintsSchema = z.object({
  budget: z.string(),
  travelMonths: z.array(z.number()).optional(),
  interests: z.array(z.string()).optional(),
  travelStyle: z.string().optional(),
  pace: z.string().optional(),
})

export const categoryScoresSchema = z.object({
  budgetFit: z.number().min(0).max(10),
  weatherFit: z.number().min(0).max(10),
  passportEase: z.number().min(0).max(10),
  nightlife: z.number().min(0).max(10),
  nature: z.number().min(0).max(10),
  transport: z.number().min(0).max(10),
  hotelValue: z.number().min(0).max(10),
  safety: z.number().min(0).max(10),
  flightValue: z.number().min(0).max(10).optional(),
})

export const rankedDestinationSchema = z.object({
  destinationId: z.string(),
  destinationName: z.string(),
  destinationType: z.enum(['country', 'city']),
  totalMatchScore: z.number().min(0).max(100),
  categoryScores: categoryScoresSchema,
  whyRecommended: z.array(z.string()),
  possibleDownsides: z.array(z.string()),
  bestMonths: z.array(z.number()),
  estimatedBudgetLevel: z.string(),
  passportEase: z.string(),
  nightlifeLevel: z.number().min(0).max(10),
  natureLevel: z.number().min(0).max(10),
  transportLevel: z.number().min(0).max(10),
  hotelValueLevel: z.number().min(0).max(10),
  safetyLevel: z.number().min(0).max(10),
  confidence: z.number().min(0).max(1),
  sourceLabels: z.array(z.string()),
  dataQuality: z.enum(['knowledge-based', 'estimated', 'demo']),
})

export const routeStopSchema = z.object({
  destinationId: z.string(),
  destinationName: z.string(),
  destinationType: z.enum(['country', 'city']),
  totalScore: z.number(),
  daysRecommended: z.number(),
  orderInRoute: z.number(),
})

export const routeScoreSchema = z.object({
  coherence: z.number().min(0).max(10).describe('Geographic/cultural flow'),
  transferSimplicity: z.number().min(0).max(10).describe('Ease of transfers'),
  transportConvenience: z.number().min(0).max(10).describe('Transport quality'),
  budgetEfficiency: z.number().min(0).max(10).describe('Value across stops'),
  seasonalCompatibility: z.number().min(0).max(10).describe('Weather/timing alignment'),
  destinationSynergy: z.number().min(0).max(10).describe('How well destinations complement'),
  fatiguePenalty: z.number().min(0).max(10).describe('Lower = more fatigue'),
  totalRouteQuality: z.number().min(0).max(100).describe('Weighted total score'),
})

export const recommendedRouteSchema = z.object({
  routeType: z.enum(['single-destination', '2-city', '3-city', 'multi-city']),
  routeName: z.string(),
  orderedStops: z.array(routeStopSchema),
  routeScore: routeScoreSchema,
  whyThisRoute: z.array(z.string()),
  transferNotes: z.array(z.string()),
  routeWarnings: z.array(z.string()),
  estimatedTripIntensity: z.enum(['relaxed', 'moderate', 'intense', 'very-intense']),
  bestFor: z.array(z.string()),
  routeConfidence: z.number().min(0).max(1),
  totalDays: z.number(),
  estimatedCost: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string(),
  }),
  highlights: z.array(z.string()),
  bestMonths: z.array(z.number()),
  dataQuality: z.enum(['knowledge-based', 'estimated', 'demo']),
})

export const travelAnalysisResponseSchema = z.object({
  querySummary: z.string().describe('Summary of what the user is looking for'),
  userConstraints: userConstraintsSchema.describe('Extracted user preferences and constraints'),
  topRecommendations: z.array(z.string()).describe('Top 3-5 destination recommendations'),
  rankedDestinations: z.array(rankedDestinationSchema).describe('All destinations ranked by match score'),
  scoreBreakdown: z.string().describe('Explanation of how scores were calculated'),
  reasons: z.array(z.string()).describe('Key reasons for recommendations'),
  warnings: z.array(z.string()).describe('Important warnings or considerations'),
  assumptions: z.array(z.string()).describe('Assumptions made due to limited data'),
  dataFreshness: z.object({
    knowledgeBase: z.string(),
    providerData: z.string(),
    lastUpdated: z.string(),
  }).describe('Data freshness indicators'),
  confidence: z.number().min(0).max(1).describe('Overall confidence in recommendations'),
  sourcesUsed: z.array(z.string()).describe('Data sources used for analysis'),
  recommendedRoutes: z.array(recommendedRouteSchema).optional().describe('Suggested multi-destination routes'),
  nextBestAlternatives: z.array(z.string()).optional().describe('Alternative destinations to consider'),
  personalization: z.object({
    isPersonalized: z.boolean().describe('Whether recommendations are personalized'),
    confidence: z.number().min(0).max(1).describe('Confidence in personalization'),
    explanations: z.array(z.string()).describe('How personalization affected recommendations'),
    feedbackCount: z.number().optional().describe('Number of feedback events used'),
  }).optional().describe('Personalization metadata'),
})

export type UserConstraints = z.infer<typeof userConstraintsSchema>
export type CategoryScores = z.infer<typeof categoryScoresSchema>
export type RankedDestination = z.infer<typeof rankedDestinationSchema>
export type RouteStop = z.infer<typeof routeStopSchema>
export type RouteScore = z.infer<typeof routeScoreSchema>
export type RecommendedRoute = z.infer<typeof recommendedRouteSchema>
export type TravelAnalysisResponse = z.infer<typeof travelAnalysisResponseSchema>
