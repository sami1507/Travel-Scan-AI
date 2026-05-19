// Structured JSON schemas for travel analysis output
import { z } from 'zod'

export const userConstraintsSchema = z.object({
  budget: z.string(),
  travelMonths: z.array(z.number()).nullable(),
  interests: z.array(z.string()).nullable(),
  travelStyle: z.string().nullable(),
  pace: z.string().nullable(),
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
  flightValue: z.number().min(0).max(10).nullable(),
})

// Itinerary Map Plan Schemas
export const itineraryStopSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  country: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  day: z.number(),
  recommendedTimeOfDay: z.enum(['morning', 'afternoon', 'evening', 'full-day']),
  durationEstimate: z.string(),
  type: z.enum(['landmark', 'museum', 'food', 'nature', 'market', 'viewpoint', 'neighborhood', 'transport', 'hotel_area', 'day_trip']),
  whyVisit: z.string(),
  whatToDo: z.string(),
  whatToSee: z.string(),
  practicalTip: z.string(),
  costLevel: z.enum(['free', 'low', 'moderate', 'high', 'unknown']),
})

export const dayPlanSchema = z.object({
  day: z.number(),
  title: z.string(),
  areaFocus: z.string(),
  whyThisArea: z.string(),
  morning: z.string(),
  afternoon: z.string(),
  evening: z.string(),
  foodSuggestion: z.string(),
  transportTip: z.string(),
  walkingIntensity: z.enum(['low', 'moderate', 'high']),
  warnings: z.array(z.string()),
})

export const routeReasoningSchema = z.object({
  whyThisRoute: z.string(),
  whyThisOrder: z.string(),
  whyTheseAreas: z.string(),
  fatigueReasoning: z.string(),
  transportReasoning: z.string(),
  budgetReasoning: z.string(),
})

export const itineraryMapPlanSchema = z.object({
  routeTitle: z.string(),
  mapAvailable: z.boolean(),
  center: z.object({
    lat: z.number(),
    lng: z.number(),
  }).nullable(),
  zoomLevel: z.number().nullable(),
  routePolyline: z.object({
    encodedPolyline: z.string().nullable(),
    coordinates: z.array(z.object({
      lat: z.number(),
      lng: z.number(),
      label: z.string(),
      day: z.number(),
      type: z.string(),
    })).nullable(),
  }).nullable(),
  stops: z.array(itineraryStopSchema),
  dayPlans: z.array(dayPlanSchema),
  routeReasoning: routeReasoningSchema,
})

// Travel Strategy Tips Schemas
export const idealDateScannerSchema = z.object({
  title: z.string(),
  suggestedDateWindow: z.string(),
  whyThisWindow: z.string(),
  estimatedPriceTendency: z.enum(['lower', 'moderate', 'higher', 'unknown']),
  weatherNote: z.string(),
  crowdNote: z.string(),
  flexibilityTip: z.string(),
  dataConfidence: z.number().min(0).max(1),
  sourceLabel: z.enum(['live_provider', 'structured_knowledge', 'ai_estimate', 'fallback_estimate']),
})

export const alternativeAirportStrategySchema = z.object({
  title: z.string(),
  primaryAirport: z.string(),
  alternativeAirports: z.array(z.string()),
  nearbyArrivalCities: z.array(z.string()),
  routeLogic: z.string(),
  possibleSavingsNote: z.string(),
  riskWarnings: z.array(z.string()),
  dataConfidence: z.number().min(0).max(1),
  sourceLabel: z.enum(['live_provider', 'structured_knowledge', 'ai_estimate', 'fallback_estimate']),
})

export const smartRouteOptimizerSchema = z.object({
  title: z.string(),
  optimizedRoute: z.array(z.string()),
  originalRouteIssue: z.string().nullable(),
  transportLogic: z.string(),
  connectionSimplicity: z.string(),
  fatigueImpact: z.string(),
  routeRealismImpact: z.string(),
  riskWarnings: z.array(z.string()),
})

export const verifiedDealsDetectorSchema = z.object({
  title: z.string(),
  dealType: z.string(),
  whereToCheck: z.array(z.string()),
  verificationNeeded: z.boolean(),
  estimatedSavingsPotential: z.string(),
  sourceLabel: z.enum(['live_provider', 'structured_knowledge', 'ai_estimate', 'fallback_estimate']),
  confidence: z.number().min(0).max(1),
})

export const extraFeesBreakdownSchema = z.object({
  title: z.string(),
  likelyExtraFees: z.array(z.object({
    feeType: z.string(),
    estimatedAmount: z.string(),
    avoidable: z.boolean(),
  })),
  howToAvoid: z.array(z.string()),
  bookingChecklist: z.array(z.string()),
  riskLevel: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(1),
})

export const negotiationEmailSchema = z.object({
  title: z.string(),
  emailSubject: z.string(),
  emailBody: z.string(),
  negotiationAngle: z.string(),
  whenToUse: z.string(),
  expectedOutcome: z.string(),
  riskWarnings: z.array(z.string()),
})

export const flexibilityRiskAnalysisSchema = z.object({
  title: z.string(),
  flexibilityScore: z.number().min(0).max(10),
  mainRisks: z.array(z.string()),
  whatCanGoWrong: z.array(z.string()),
  saferAlternative: z.string(),
  changeDateImpact: z.string(),
  routeRisk: z.string(),
  budgetRisk: z.string(),
  cancellationRisk: z.string(),
  recommendation: z.string(),
})

export const nearbyDestinationStrategySchema = z.object({
  title: z.string(),
  nearbyDestinations: z.array(z.object({
    name: z.string(),
    distanceKm: z.number().nullable(),
    transportOptions: z.array(z.string()),
  })),
  whyTheyMayHelp: z.string(),
  onwardTransport: z.string(),
  riskWarnings: z.array(z.string()),
  sourceLabel: z.enum(['live_provider', 'structured_knowledge', 'ai_estimate', 'fallback_estimate']),
  confidence: z.number().min(0).max(1),
})

export const travelStrategyTipsSchema = z.object({
  idealDateScanner: idealDateScannerSchema.nullable(),
  alternativeAirportStrategy: alternativeAirportStrategySchema.nullable(),
  smartRouteOptimizer: smartRouteOptimizerSchema.nullable(),
  verifiedDealsAndPromotionsDetector: verifiedDealsDetectorSchema.nullable(),
  extraFeesBreakdown: extraFeesBreakdownSchema.nullable(),
  negotiationEmail: negotiationEmailSchema.nullable(),
  flexibilityAndRiskAnalysis: flexibilityRiskAnalysisSchema.nullable(),
  nearbyDestinationStrategy: nearbyDestinationStrategySchema.nullable(),
})

// Season Month Strategy Schemas
export const monthOptionSchema = z.object({
  title: z.string(),
  month: z.number().min(1).max(12),
  optionType: z.enum(['bestValue', 'bestExperience', 'lowestFatigue']),
  suggestedRoute: z.array(z.string()),
  recommendedNights: z.record(z.number()).nullable(),
  whyRecommended: z.string(),
  budgetNote: z.string(),
  weatherNote: z.string(),
  crowdNote: z.string(),
  routeLogic: z.string(),
  riskWarnings: z.array(z.string()),
  dataConfidence: z.number().min(0).max(1),
  sourceLabel: z.enum(['live_provider', 'structured_knowledge', 'ai_estimate', 'fallback_estimate']),
})

export const seasonMonthStrategySchema = z.object({
  season: z.string(),
  months: z.array(z.object({
    month: z.number().min(1).max(12),
    monthName: z.string(),
    options: z.array(monthOptionSchema),
  })),
})

const seasonalitySchema = z.object({
  peakSeason: z.string().nullable().describe('Peak season months'),
  shoulderSeason: z.string().nullable().describe('Shoulder season months'),
  lowSeason: z.string().nullable().describe('Low season months'),
  weatherReality: z.string().nullable().describe('Honest weather assessment for selected period'),
  crowdReality: z.string().nullable().describe('Honest crowd level assessment'),
  priceReality: z.string().nullable().describe('Honest price tendency assessment'),
  whenToAvoid: z.string().nullable().describe('Months or periods to avoid'),
  honestConsultantNote: z.string().nullable().describe('Realistic consultant advice about timing'),
})

export const rankedDestinationSchema = z.object({
  destinationId: z.string(),
  destinationName: z.string(),
  destinationType: z.enum(['country', 'city']),
  destinationSummary: z.string().optional().describe('Consultant-grade summary of the route'),
  diversityLabel: z.string().optional().describe('Best Overall, Best Value, or Unique Discovery'),
  totalMatchScore: z.number().min(0).max(100),
  categoryScores: categoryScoresSchema,
  whyRecommended: z.array(z.string()),
  possibleDownsides: z.array(z.string()),
  bestMonths: z.array(z.number()),
  seasonality: seasonalitySchema.nullable().describe('Realistic seasonality information'),
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
  // Route-aware fields
  tripType: z.string().nullable().describe('Single Country - One City, Single Country - Multi-City, or Multi-Country Route'),
  suggestedRoute: z.array(z.string()).nullable().describe('Ordered list of cities/stops in the route'),
  recommendedNights: z.record(z.number()).nullable().describe('Nights per stop, e.g., {"Vienna": 4, "Budapest": 6}'),
  routeRealismScore: z.number().min(0).max(100).nullable().describe('How realistic/practical the route is'),
  travelFatigueLevel: z.enum(['Low', 'Medium', 'High']).nullable().describe('Expected travel fatigue level'),
  transportLogic: z.string().nullable().describe('Explanation of transport between stops'),
  realisticConsultantNotes: z.string().nullable().describe('Practical advice like a travel consultant would give'),
  routeWarnings: z.array(z.string()).nullable().describe('Warnings about the route (rushed, expensive, etc.)'),
  routeAlternatives: z.string().nullable().describe('Alternative route suggestion if current is not optimal'),
  // Itinerary Map Plan
  itineraryMapPlan: itineraryMapPlanSchema.nullable().describe('Smart itinerary map with day-by-day plan and route reasoning'),
  // Travel Strategy Tips
  travelStrategyTips: travelStrategyTipsSchema.nullable().describe('AI travel consultant strategy tips'),
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
  recommendedRoutes: z.array(recommendedRouteSchema).nullable().describe('Suggested multi-destination routes'),
  nextBestAlternatives: z.array(z.string()).nullable().describe('Alternative destinations to consider'),
  personalization: z.object({
    isPersonalized: z.boolean().describe('Whether recommendations are personalized'),
    confidence: z.number().min(0).max(1).describe('Confidence in personalization'),
    explanations: z.array(z.string()).describe('How personalization affected recommendations'),
    feedbackCount: z.number().nullable().describe('Number of feedback events used'),
  }).nullable().describe('Personalization metadata'),
  seasonMonthStrategy: seasonMonthStrategySchema.nullable().describe('Month-by-month strategy for season-based queries'),
})

export type UserConstraints = z.infer<typeof userConstraintsSchema>
export type CategoryScores = z.infer<typeof categoryScoresSchema>
export type RankedDestination = z.infer<typeof rankedDestinationSchema>
export type RouteStop = z.infer<typeof routeStopSchema>
export type RouteScore = z.infer<typeof routeScoreSchema>
export type RecommendedRoute = z.infer<typeof recommendedRouteSchema>
export type TravelAnalysisResponse = z.infer<typeof travelAnalysisResponseSchema>
export type TravelStrategyTips = z.infer<typeof travelStrategyTipsSchema>
export type IdealDateScanner = z.infer<typeof idealDateScannerSchema>
export type AlternativeAirportStrategy = z.infer<typeof alternativeAirportStrategySchema>
export type SmartRouteOptimizer = z.infer<typeof smartRouteOptimizerSchema>
export type VerifiedDealsDetector = z.infer<typeof verifiedDealsDetectorSchema>
export type ExtraFeesBreakdown = z.infer<typeof extraFeesBreakdownSchema>
export type NegotiationEmail = z.infer<typeof negotiationEmailSchema>
export type FlexibilityRiskAnalysis = z.infer<typeof flexibilityRiskAnalysisSchema>
export type NearbyDestinationStrategy = z.infer<typeof nearbyDestinationStrategySchema>
export type SeasonMonthStrategy = z.infer<typeof seasonMonthStrategySchema>
export type MonthOption = z.infer<typeof monthOptionSchema>
export type ItineraryMapPlan = z.infer<typeof itineraryMapPlanSchema>
export type ItineraryStop = z.infer<typeof itineraryStopSchema>
export type DayPlan = z.infer<typeof dayPlanSchema>
export type RouteReasoning = z.infer<typeof routeReasoningSchema>
