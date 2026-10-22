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

vi.mock('@/lib/services/google-places-service', () => ({
  enrichRouteCities: vi.fn(async () => ({ places: [], byCategory: {}, byCity: {} })),
}))

import { POST } from './route'

function makeRequest(body: unknown) {
  return { json: async () => body } as any
}

describe('POST /api/places/enrich', () => {
  beforeEach(() => {
    mockUser = null
    delete process.env.GOOGLE_PLACES_API_KEY
    delete process.env.ENABLE_GOOGLE_PLACES_ENRICHMENT
  })

  it('rejects unauthenticated requests with 401 (prevents quota burn)', async () => {
    const response = await POST(makeRequest({ country: 'Portugal', routeCities: ['Lisbon'] }))
    expect(response.status).toBe(401)
  })

  it('rejects requests missing country or routeCities with 400', async () => {
    mockUser = { id: 'user-1' }
    const response = await POST(makeRequest({}))
    expect(response.status).toBe(400)
  })

  it('reports disabled (without calling Google) when the API key is not configured', async () => {
    mockUser = { id: 'user-1' }
    const response = await POST(makeRequest({ country: 'Portugal', routeCities: ['Lisbon'] }))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.enabled).toBe(false)
    expect(body.reason).toBe('missing_google_places_key')
  })
})
