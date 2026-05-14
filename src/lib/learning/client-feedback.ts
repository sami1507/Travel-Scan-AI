'use client'

interface LearningFeedbackPayload {
  signalType: string
  eventId?: string
  recommendationItemId?: string
  signalValue?: Record<string, unknown>
}

/**
 * Log learning feedback signal to the backend
 * Safe for client-side use - never throws UI-breaking errors
 */
export async function logLearningFeedback(
  payload: LearningFeedbackPayload
): Promise<boolean> {
  try {
    const response = await fetch('/api/learning/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Learning Feedback] Failed to log signal:', {
          status: response.status,
          signalType: payload.signalType,
        })
      }
      return false
    }

    return true
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Learning Feedback] Error logging signal:', error)
    }
    return false
  }
}
