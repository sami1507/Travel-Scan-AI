// Feedback logging foundation for future learning and personalization
export interface UserFeedback {
  id: string
  userId: string
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'save_trip' | 'select_destination' | 'dismiss_recommendation'
  targetId: string // destination ID, recommendation ID, etc.
  targetType: 'destination' | 'recommendation' | 'route' | 'analysis'
  context?: {
    query?: string
    budget?: string
    travelMonths?: number[]
    interests?: string[]
  }
  metadata?: Record<string, any>
  timestamp: string
}

export interface TripSave {
  id: string
  userId: string
  destinationId: string
  destinationName: string
  analysisId?: string
  savedAt: string
}

export interface DestinationSelection {
  id: string
  userId: string
  destinationId: string
  destinationName: string
  score: number
  rank: number // position in recommendations
  analysisId?: string
  selectedAt: string
}

export interface RecommendationDismissal {
  id: string
  userId: string
  destinationId: string
  destinationName: string
  reason?: string
  analysisId?: string
  dismissedAt: string
}

export interface FeedbackStats {
  userId: string
  totalFeedback: number
  thumbsUp: number
  thumbsDown: number
  tripsSaved: number
  destinationsSelected: number
  recommendationsDismissed: number
  lastFeedbackAt?: string
}
