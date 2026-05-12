// Input validation and sanitization for API routes

import { z } from 'zod'

// Maximum lengths for text inputs
export const MAX_LENGTHS = {
  QUERY: 1000,
  DESTINATION: 200,
  NOTES: 2000,
  FEEDBACK_TEXT: 5000,
  SHARE_MESSAGE: 500,
  CITY_NAME: 100,
  COUNTRY_NAME: 100,
  AIRPORT_CODE: 10,
} as const

// Maximum payload size (in bytes)
export const MAX_PAYLOAD_SIZE = 100 * 1024 // 100KB

/**
 * Sanitize text input to prevent injection attacks
 * Removes control characters and limits length
 */
export function sanitizeText(text: string, maxLength: number): string {
  if (!text) return ''
  
  // Remove control characters except newlines and tabs
  const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  // Trim and limit length
  return cleaned.trim().slice(0, maxLength)
}

/**
 * Validate and sanitize user query for AI analysis
 */
export function sanitizeUserQuery(query: string): string {
  return sanitizeText(query, MAX_LENGTHS.QUERY)
}

/**
 * Validate and sanitize feedback text
 */
export function sanitizeFeedback(text: string): string {
  return sanitizeText(text, MAX_LENGTHS.FEEDBACK_TEXT)
}

/**
 * Validate and sanitize share message
 */
export function sanitizeShareMessage(message: string): string {
  return sanitizeText(message, MAX_LENGTHS.SHARE_MESSAGE)
}

/**
 * Validate request body size
 */
export function validatePayloadSize(body: any): boolean {
  const size = JSON.stringify(body).length
  return size <= MAX_PAYLOAD_SIZE
}

/**
 * Schema for travel analysis request
 */
export const TravelAnalysisRequestSchema = z.object({
  query: z.string().min(1).max(MAX_LENGTHS.QUERY),
  destination: z.string().max(MAX_LENGTHS.DESTINATION).optional(),
  departureCity: z.string().max(MAX_LENGTHS.CITY_NAME).optional(),
  budget: z.enum(['low', 'moderate', 'high', 'luxury']).optional(),
  travelMonths: z.array(z.number().min(1).max(12)).max(12).optional(),
  tripLength: z.number().min(1).max(365).optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  travelStyle: z.enum(['solo', 'couple', 'family', 'friends']).optional(),
  pace: z.enum(['relaxed', 'moderate', 'fast']).optional(),
  tripStructure: z.enum(['single_country_one_city', 'single_country_multi_city', 'multi_country']).optional(),
})

/**
 * Schema for feedback submission
 */
export const FeedbackSchema = z.object({
  destinationId: z.string().uuid().optional(),
  rating: z.number().min(1).max(5),
  helpful: z.boolean().optional(),
  accurate: z.boolean().optional(),
  feedbackText: z.string().max(MAX_LENGTHS.FEEDBACK_TEXT).optional(),
  category: z.enum(['recommendation_quality', 'accuracy', 'personalization', 'explanation', 'other']).optional(),
})

/**
 * Schema for rich feedback
 */
export const RichFeedbackSchema = z.object({
  destinationId: z.string().uuid().optional(),
  analysisId: z.string().uuid().optional(),
  rating: z.number().min(1).max(5),
  helpful: z.boolean().optional(),
  accurate: z.boolean().optional(),
  feedbackText: z.string().max(MAX_LENGTHS.FEEDBACK_TEXT).optional(),
  category: z.enum(['recommendation_quality', 'accuracy', 'personalization', 'explanation', 'other']).optional(),
  specificIssues: z.array(z.string().max(200)).max(10).optional(),
  suggestedImprovements: z.string().max(MAX_LENGTHS.NOTES).optional(),
})

/**
 * Schema for profile update
 */
export const ProfileUpdateSchema = z.object({
  displayName: z.string().max(100).optional(),
  preferredLanguage: z.string().max(10).optional(),
  travelPreferences: z.object({
    budget: z.enum(['low', 'moderate', 'high', 'luxury']).optional(),
    pace: z.enum(['relaxed', 'moderate', 'fast']).optional(),
    travelStyle: z.enum(['solo', 'couple', 'family', 'friends']).optional(),
  }).optional(),
})

/**
 * Schema for share request
 */
export const ShareSchema = z.object({
  destinationId: z.string().uuid().optional(),
  analysisId: z.string().uuid().optional(),
  message: z.string().max(MAX_LENGTHS.SHARE_MESSAGE).optional(),
  expiresIn: z.number().min(1).max(90).optional(), // days
})

/**
 * Validate and parse request body with schema
 */
export function validateRequest<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return {
        success: false,
        error: `Invalid ${firstError.path.join('.')}: ${firstError.message}`,
      }
    }
    return { success: false, error: 'Invalid request data' }
  }
}
