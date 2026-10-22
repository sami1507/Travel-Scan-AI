import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockUser: { id: string } | null = null

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: mockUser },
        error: mockUser ? null : new Error('no session'),
      }),
    },
  }),
}))

vi.mock('@/lib/db/feedback', () => ({
  createFeedback: vi.fn(async () => ({ id: 'fb-1', feedback_type: 'thumbs-up' })),
  getUserFeedback: vi.fn(async () => []),
}))

vi.mock('@/lib/ml/improvement/signal-tracker', () => ({
  signalTracker: { trackUserSignal: vi.fn() },
}))

import { POST, GET } from './route'

function makeRequest(body: unknown) {
  return {
    json: async () => body,
    cookies: { get: () => undefined },
  } as any
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    mockUser = null
  })

  it('rejects unauthenticated requests with 401', async () => {
    const response = await POST(makeRequest({ feedback_type: 'thumbs-up' }))
    expect(response.status).toBe(401)
  })

  it('rejects invalid payloads with 400', async () => {
    mockUser = { id: 'user-1' }
    const response = await POST(makeRequest({ feedback_type: 'not-a-real-type' }))
    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.error).toBe('Invalid feedback data')
    // Must not leak internal error details to the client
    expect(body.details).toBeUndefined()
  })

  it('accepts valid feedback with 201', async () => {
    mockUser = { id: 'user-1' }
    const response = await POST(makeRequest({
      feedback_type: 'thumbs-up',
      destination_id: 'PT',
      destination_name: 'Portugal',
    }))
    expect(response.status).toBe(201)

    const body = await response.json()
    expect(body.success).toBe(true)
  })
})

describe('GET /api/feedback', () => {
  beforeEach(() => {
    mockUser = null
  })

  it('rejects unauthenticated requests with 401', async () => {
    const response = await GET({ url: 'http://localhost/api/feedback' } as any)
    expect(response.status).toBe(401)
  })

  it('returns the user feedback history when authenticated', async () => {
    mockUser = { id: 'user-1' }
    const response = await GET({ url: 'http://localhost/api/feedback?limit=10' } as any)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(Array.isArray(body.feedback)).toBe(true)
  })
})
