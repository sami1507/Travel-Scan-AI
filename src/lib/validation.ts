// Server-side validation utilities
import { z } from 'zod'

// Common validation schemas
export const schemas = {
  // Travel analysis request
  analysisRequest: z.object({
    query: z.string().min(3).max(500),
    destination: z.string().max(200).optional(),
    departureCity: z.string().max(200).optional(),
    budget: z.enum(['budget', 'moderate', 'comfortable', 'luxury']).optional(),
    tripLength: z.number().min(1).max(365).optional(),
    travelMonths: z.array(z.number().min(1).max(12)).max(12).optional(),
    interests: z.array(z.string().max(50)).max(20).optional(),
    travelStyle: z.enum(['solo', 'couple', 'family', 'friends', 'business']).optional(),
    pace: z.enum(['relaxed', 'moderate', 'fast', 'very-fast']).optional(),
    tripStructure: z.enum(['single_country_one_city', 'single_country_multi_city', 'multi_country']).optional(),
    // Fresh analysis controls
    forceFresh: z.boolean().optional(),
    freshRunId: z.string().max(100).optional(),
    excludeCountries: z.array(z.string().max(100)).max(50).optional(),
    diversityMode: z.enum(['best_fit', 'alternative_ideas', 'hidden_gems', 'cheaper_options', 'low_fatigue']).optional(),
  }),

  // Feedback submission
  feedback: z.object({
    feedbackType: z.enum(['thumbs-up', 'thumbs-down', 'save-trip', 'select-destination', 'dismiss-recommendation', 'view-details']),
    sessionId: z.string().max(100),
    analysisId: z.string().max(100).optional(),
    destinationId: z.string().max(255).optional(),
    destinationName: z.string().max(255).optional(),
    recommendationRank: z.number().int().min(1).max(100).optional(),
    totalScore: z.number().min(0).max(100).optional(),
    categoryScores: z.record(z.number()).optional(),
    queryContext: z.record(z.any()).optional(),
    feedbackMetadata: z.record(z.any()).optional(),
  }),

  // Rich feedback submission (matches the actual body sent by rich-feedback-dialog.tsx)
  richFeedback: z.object({
    feedbackData: z.object({
      feedbackType: z.enum(['positive', 'negative']),
      selectedReasons: z.array(z.string().max(100)).max(10),
      comment: z.string().max(2000).optional(),
      preferenceCorrections: z.record(z.any()).optional(),
    }),
    destination: z.object({
      destinationId: z.string().max(255),
      destinationName: z.string().max(255),
    }).passthrough(),
    userConstraints: z.record(z.any()).optional(),
    queryText: z.string().max(500).optional(),
    destinationRank: z.number().int().min(1).max(100).optional(),
    routeData: z.record(z.any()).optional(),
  }),

  // Profile update
  profileUpdate: z.object({
    displayName: z.string().min(1).max(100).optional(),
    email: z.string().email().max(255).optional(),
    avatarUrl: z.string().url().max(500).optional(),
    preferences: z.record(z.any()).optional(),
  }),

  // Share content
  shareContent: z.object({
    contentType: z.enum(['analysis', 'route', 'destination', 'comparison']),
    contentData: z.record(z.any()),
    isPublic: z.boolean().optional(),
    expiresInDays: z.number().int().min(1).max(365).optional(),
  }),

  // Saved analysis
  savedAnalysis: z.object({
    name: z.string().min(1).max(255),
    query: z.string().min(1).max(500),
    analysisResult: z.record(z.any()),
    userConstraints: z.record(z.any()),
    isFavorite: z.boolean().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    notes: z.string().max(2000).optional(),
  }),

  // Notification update
  notificationUpdate: z.object({
    isRead: z.boolean().optional(),
    isDismissed: z.boolean().optional(),
  }),

  // Alert update
  alertUpdate: z.object({
    isRead: z.boolean().optional(),
    isDismissed: z.boolean().optional(),
  }),

  // Intelligence agent / report requests (bounded to prevent unbounded-cost AI calls)
  intelligenceRequest: z.object({
    recordLimit: z.number().int().min(1).max(500).optional(),
    changeLimit: z.number().int().min(1).max(1000).optional(),
    sourceConfigId: z.string().max(255).optional(),
  }),

  // Chat-mode travel message
  chatTravel: z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(4000),
    })).min(1).max(50),
  }),

  // PDF export
  pdfExport: z.object({
    analysis: z.record(z.any()),
    queryContext: z.record(z.any()).optional(),
  }),

  // User travel profile (preferences used to personalize recommendations)
  travelProfileUpdate: z.object({
    preferred_budget_level: z.enum(['budget', 'moderate', 'comfortable', 'luxury']).optional(),
    budget_flexibility: z.enum(['strict', 'flexible', 'very-flexible']).optional(),
    nightlife_importance: z.number().min(1).max(10).optional(),
    nature_importance: z.number().min(1).max(10).optional(),
    comfort_vs_adventure: z.number().min(1).max(10).optional(),
    transport_importance: z.number().min(1).max(10).optional(),
    safety_importance: z.number().min(1).max(10).optional(),
    hotel_quality_importance: z.number().min(1).max(10).optional(),
    preferred_trip_style: z.enum(['solo', 'couple', 'family', 'friends', 'business']).optional(),
    preferred_pace: z.enum(['relaxed', 'moderate', 'fast', 'very-fast']).optional(),
    preferred_interests: z.array(z.string().max(50)).max(20).optional(),
    avoid_destinations: z.array(z.string().max(100)).max(50).optional(),
  }),

  // Generic saved-item update (saved destinations/analyses/routes) — ownership is
  // enforced by RLS via the caller's own session, this just bounds the payload shape.
  savedItemUpdate: z.object({
    id: z.string().uuid(),
    updates: z.record(z.any()).refine(
      (obj) => Object.keys(obj).length > 0 && Object.keys(obj).length <= 20,
      { message: 'updates must be a non-empty object with at most 20 fields' }
    ),
  }),

  // Alert mark-as-read / dismiss
  alertAction: z.object({
    alertId: z.string().uuid(),
    action: z.enum(['read', 'dismiss']),
  }),
}

/**
 * Validate request body against a schema
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return {
        success: false,
        error: `Validation error: ${firstError.path.join('.')}: ${firstError.message}`,
      }
    }
    return { success: false, error: 'Invalid request data' }
  }
}

/**
 * Sanitize text input (remove potential XSS vectors)
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .trim()
}

/**
 * Validate UUID format
 * @param id - ID to validate
 * @returns True if valid UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}
