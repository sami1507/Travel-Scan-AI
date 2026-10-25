import { describe, it, expect } from 'vitest'
import { checkRateLimit, createRateLimitResponse, getClientIdentifier, rateLimit } from './rate-limiter'

// KV_REST_API_* are unset in tests, so this exercises the in-memory fallback path.
const unique = () => `test-${Math.random().toString(36).slice(2)}`

describe('checkRateLimit (in-memory fallback)', () => {
  it('allows requests up to the limit and then blocks', async () => {
    const id = unique()
    const config = { maxRequests: 3, windowMs: 60_000 }

    const results = []
    for (let i = 0; i < 5; i++) results.push(await checkRateLimit(id, config))

    expect(results.map((r) => r.success)).toEqual([true, true, true, false, false])
    expect(results[0].remaining).toBe(2)
    expect(results[3].remaining).toBe(0)
  })

  it('tracks identifiers independently', async () => {
    const config = { maxRequests: 1, windowMs: 60_000 }
    const a = unique()
    const b = unique()
    expect((await checkRateLimit(a, config)).success).toBe(true)
    expect((await checkRateLimit(a, config)).success).toBe(false)
    expect((await checkRateLimit(b, config)).success).toBe(true)
  })

  it('starts a fresh window once the previous one has expired', async () => {
    const id = unique()
    const config = { maxRequests: 1, windowMs: 20 }
    expect((await checkRateLimit(id, config)).success).toBe(true)
    expect((await checkRateLimit(id, config)).success).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect((await checkRateLimit(id, config)).success).toBe(true)
  })
})

describe('rateLimit helper', () => {
  it('returns null while allowed and a 429 response once exceeded', async () => {
    const id = unique()
    const config = { maxRequests: 1, windowMs: 60_000 }
    expect(await rateLimit(id, config)).toBeNull()

    const blocked = await rateLimit(id, config)
    expect(blocked?.status).toBe(429)
    expect(blocked?.headers.get('Retry-After')).toBeTruthy()
    expect(blocked?.headers.get('X-RateLimit-Remaining')).toBe('0')
  })
})

describe('createRateLimitResponse', () => {
  it('describes the limit in the JSON body', async () => {
    const response = createRateLimitResponse({ success: false, limit: 10, remaining: 0, reset: Math.floor(Date.now() / 1000) + 30 })
    const body = await response.json()
    expect(response.status).toBe(429)
    expect(body).toMatchObject({ error: 'Too many requests', limit: 10, remaining: 0 })
  })
})

describe('getClientIdentifier', () => {
  it('prefers the user id', () => {
    expect(getClientIdentifier('user-1')).toBe('user-1')
  })

  it('falls back to the first forwarded IP for anonymous requests', () => {
    const request = new Request('http://localhost', { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } })
    expect(getClientIdentifier(undefined, request)).toBe('ip:203.0.113.7')
  })

  it('returns "unknown" when nothing identifies the caller', () => {
    expect(getClientIdentifier()).toBe('unknown')
  })
})
