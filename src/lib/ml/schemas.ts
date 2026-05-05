// ML Dataset Schemas - typed schemas for machine learning training data
import { z } from 'zod'

/**
 * User Features - characteristics of the user making the request
 */
export const userFeaturesSchema = z.object({
  // Explicit preferences
  explicitBudget: z.enum(['low', 'moderate', 'high', 'luxury']).optional(),
  explicitInterests: z.array(z.string()).optional(),
  explicitTravelStyle: z.enum(['solo', 'couple', 'family', 'friends']).optional(),
  explicitPace: z.enum(['relaxed', 'moderate', 'fast']).optional(),

  // Inferred preferences (from feedback history)
  inferredBudgetSensitivity: z.number().min(0).max(1).optional(),
  inferredNightlifePreference: z.number().min(0).max(1).optional(),
  inferredNaturePreference: z.number().min(0).max(1).optional(),
  inferredSafetyImportance: z.number().min(0).max(1).optional(),
  inferredAccommodationPreference: z.enum(['hotel', 'apartment', 'mixed']).optional(),

  // Historical interaction features
  totalFeedbackCount: z.number().default(0),
  thumbsUpCount: z.number().default(0),
  thumbsDownCount: z.number().default(0),
  savedTripsCount: z.number().default(0),
  dismissedCount: z.number().default(0),
  viewedDetailsCount: z.number().default(0),

  // Preference confidence
  preferenceConfidence: z.number().min(0).max(1).default(0),
  feedbackRecency: z.number().optional(), // Days since last feedback
})

/**
 * Item Features - characteristics of the destination/recommendation
 */
export const itemFeaturesSchema = z.object({
  // Destination identity
  destinationId: z.string(),
  destinationName: z.string(),
  destinationType: z.enum(['country', 'city']),

  // Score features
  totalMatchScore: z.number().min(0).max(100),
  budgetFitScore: z.number().min(0).max(10),
  weatherFitScore: z.number().min(0).max(10),
  passportEaseScore: z.number().min(0).max(10),
  nightlifeScore: z.number().min(0).max(10),
  natureScore: z.number().min(0).max(10),
  transportScore: z.number().min(0).max(10),
  hotelValueScore: z.number().min(0).max(10),
  safetyScore: z.number().min(0).max(10),
  flightValueScore: z.number().min(0).max(10).optional(),

  // Route quality features (if part of route)
  routeCoherence: z.number().min(0).max(10).optional(),
  routeTransferSimplicity: z.number().min(0).max(10).optional(),
  routeTransportConvenience: z.number().min(0).max(10).optional(),
  routeBudgetEfficiency: z.number().min(0).max(10).optional(),
  routeSeasonalCompatibility: z.number().min(0).max(10).optional(),
  routeDestinationSynergy: z.number().min(0).max(10).optional(),
  routeFatiguePenalty: z.number().min(0).max(10).optional(),
  totalRouteQuality: z.number().min(0).max(100).optional(),

  // Accommodation features
  hotelValueLevel: z.number().min(0).max(10),
  apartmentSuitability: z.number().min(0).max(10).optional(),
  rentalSuitability: z.number().min(0).max(10).optional(),

  // Evidence quality
  dataQuality: z.enum(['knowledge-based', 'estimated', 'demo']),
  sourceCount: z.number().default(0),
  evidenceStrength: z.number().min(0).max(1).default(0),
  confidence: z.number().min(0).max(1),

  // Ranking position
  recommendationRank: z.number().min(1),
})

/**
 * Context Features - characteristics of the query/request context
 */
export const contextFeaturesSchema = z.object({
  // Timing context
  travelMonths: z.array(z.number()).optional(),
  seasonalContext: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  isFlexibleTiming: z.boolean().default(false),

  // Budget context
  budgetLevel: z.enum(['low', 'moderate', 'high', 'luxury']),
  budgetFlexibility: z.number().min(0).max(1).default(0.5),

  // Interest context
  primaryInterests: z.array(z.string()).optional(),
  interestDiversity: z.number().min(0).max(1).default(0.5),

  // Query complexity
  queryLength: z.number().default(0),
  querySpecificity: z.number().min(0).max(1).default(0.5),
  hasExplicitDestination: z.boolean().default(false),

  // Contradiction indicators
  hasContradictions: z.boolean().default(false),
  contradictionScore: z.number().min(0).max(1).default(0),
})

/**
 * Outcome - what happened with this recommendation
 */
export const outcomeSchema = z.object({
  // Primary outcome
  wasAccepted: z.boolean(),
  feedbackType: z.enum([
    'thumbs-up',
    'thumbs-down',
    'save-trip',
    'select-destination',
    'dismiss-recommendation',
    'view-details',
    'no-interaction',
  ]),

  // Interaction details
  timeToInteraction: z.number().optional(), // Seconds
  interactionDepth: z.enum(['none', 'view', 'save', 'select']).default('none'),

  // Feedback signals
  richFeedbackComment: z.string().optional(),
  selectedFeedbackReasons: z.array(z.string()).optional(),
  preferenceCorrection: z.record(z.any()).optional(),

  // Outcome quality
  outcomeConfidence: z.number().min(0).max(1).default(1.0),
  isIdealExample: z.boolean().default(false),
})

/**
 * Complete Training Example
 */
export const trainingExampleSchema = z.object({
  // Unique identifier
  exampleId: z.string(),
  userId: z.string(),
  sessionId: z.string(),
  analysisId: z.string().optional(),
  timestamp: z.string(),

  // Features
  userFeatures: userFeaturesSchema,
  itemFeatures: itemFeaturesSchema,
  contextFeatures: contextFeaturesSchema,

  // Outcome
  outcome: outcomeSchema,

  // Metadata
  dataVersion: z.string().default('1.0'),
  exampleType: z.enum([
    'recommendation-acceptance',
    'destination-relevance',
    'route-suitability',
    'accommodation-suitability',
  ]),
  qualityScore: z.number().min(0).max(1).default(0.5),
})

/**
 * ML Dataset Metadata
 */
export const datasetMetadataSchema = z.object({
  datasetId: z.string(),
  version: z.string(),
  createdAt: z.string(),
  exampleCount: z.number(),
  userCount: z.number(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  featureStats: z.object({
    userFeatureCount: z.number(),
    itemFeatureCount: z.number(),
    contextFeatureCount: z.number(),
  }),
  outcomeDistribution: z.record(z.number()),
  qualityMetrics: z.object({
    avgQualityScore: z.number(),
    highQualityCount: z.number(),
    idealExampleCount: z.number(),
  }),
})

// Type exports
export type UserFeatures = z.infer<typeof userFeaturesSchema>
export type ItemFeatures = z.infer<typeof itemFeaturesSchema>
export type ContextFeatures = z.infer<typeof contextFeaturesSchema>
export type Outcome = z.infer<typeof outcomeSchema>
export type TrainingExample = z.infer<typeof trainingExampleSchema>
export type DatasetMetadata = z.infer<typeof datasetMetadataSchema>
