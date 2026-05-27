/**
 * Client-side validation for analysis requests
 * Prevents invalid requests from reaching the API
 */

export interface AnalysisRequestValidation {
  valid: boolean
  errors: string[]
}

const ALLOWED_BUDGETS = ['budget', 'moderate', 'luxury', 'flexible']
const ALLOWED_TRIP_STRUCTURES = [
  'single_country_one_city',
  'single_country_multi_city',
  'multi_country',
]

export function validateAnalysisRequest(request: {
  query?: string
  departureCity?: string
  tripLength?: number
  travelMonths?: number[]
  interests?: string[]
  budget?: string
  tripStructure?: string
}): AnalysisRequestValidation {
  const errors: string[] = []

  // Validate query/departure city
  if (!request.query || request.query.trim().length === 0) {
    if (!request.departureCity || request.departureCity.trim().length === 0) {
      errors.push('Please enter a destination or departure city')
    }
  }

  // Validate trip length if provided
  if (request.tripLength !== undefined) {
    if (typeof request.tripLength !== 'number' || !isFinite(request.tripLength)) {
      errors.push('Trip length must be a valid number')
    } else if (request.tripLength < 1) {
      errors.push('Trip length must be at least 1 day')
    } else if (request.tripLength > 365) {
      errors.push('Trip length cannot exceed 365 days')
    }
  }

  // Validate travel months
  if (request.travelMonths !== undefined) {
    if (!Array.isArray(request.travelMonths)) {
      errors.push('Travel months must be an array')
    } else {
      const invalidMonths = request.travelMonths.filter(
        m => typeof m !== 'number' || m < 1 || m > 12
      )
      if (invalidMonths.length > 0) {
        errors.push('Travel months must be numbers between 1 and 12')
      }
    }
  }

  // Validate interests
  if (request.interests !== undefined) {
    if (!Array.isArray(request.interests)) {
      errors.push('Interests must be an array')
    }
  }

  // Validate budget
  if (request.budget !== undefined) {
    if (typeof request.budget !== 'string') {
      errors.push('Budget must be a string')
    } else if (!ALLOWED_BUDGETS.includes(request.budget.toLowerCase())) {
      errors.push(`Budget must be one of: ${ALLOWED_BUDGETS.join(', ')}`)
    }
  }

  // Validate trip structure
  if (request.tripStructure !== undefined) {
    if (typeof request.tripStructure !== 'string') {
      errors.push('Trip structure must be a string')
    } else if (!ALLOWED_TRIP_STRUCTURES.includes(request.tripStructure)) {
      errors.push(`Trip structure must be one of: ${ALLOWED_TRIP_STRUCTURES.join(', ')}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Sanitize analysis request before sending to API
 */
export function sanitizeAnalysisRequest(request: any): any {
  return {
    query: typeof request.query === 'string' ? request.query.trim() : '',
    departureCity: typeof request.departureCity === 'string' ? request.departureCity.trim() : undefined,
    tripLength: typeof request.tripLength === 'number' && isFinite(request.tripLength) 
      ? Math.max(1, Math.min(365, Math.round(request.tripLength)))
      : undefined,
    travelMonths: Array.isArray(request.travelMonths)
      ? request.travelMonths.filter(m => typeof m === 'number' && m >= 1 && m <= 12)
      : undefined,
    interests: Array.isArray(request.interests)
      ? request.interests.filter(i => typeof i === 'string' && i.trim().length > 0)
      : undefined,
    budget: typeof request.budget === 'string' && ALLOWED_BUDGETS.includes(request.budget.toLowerCase())
      ? request.budget.toLowerCase()
      : undefined,
    tripStructure: typeof request.tripStructure === 'string' && ALLOWED_TRIP_STRUCTURES.includes(request.tripStructure)
      ? request.tripStructure
      : undefined,
  }
}
