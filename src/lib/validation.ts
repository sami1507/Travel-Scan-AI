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
    travelMonths: z.array(z.number().min(1).max(12)).max(12).optional(),
    interests: z.array(z.string().max(50)).max(20).optional(),
    travelStyle: z.enum(['solo', 'couple', 'family', 'friends', 'business']).optional(),
    pace: z.enum(['relaxed', 'moderate', 'fast', 'very-fast']).optional(),
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

  // Rich feedback
  richFeedback: z.object({
    feedbackType: z.enum(['positive', 'negative']),
    selectedReasons: z.array(z.string().max(100)).max(10),
    comment: z.string().max(2000).optional(),
    destinationId: z.string().max(255),
    destinationName: z.string().max(255),
    destinationRank: z.number().int().min(1).max(100).optional(),
    totalMatchScore: z.number().min(0).max(100).optional(),
    scoreBreakdown: z.record(z.number()).optional(),
    whyRecommended: z.array(z.string().max(500)).max(10).optional(),
    routeId: z.string().uuid().optional(),
    routeData: z.record(z.any()).optional(),
    userConstraints: z.record(z.any()).optional(),
    personalizationApplied: z.boolean().optional(),
    preferenceCorrections: z.record(z.any()).optional(),
    queryText: z.string().max(500).optional(),
    sessionId: z.string().max(100).optional(),
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
