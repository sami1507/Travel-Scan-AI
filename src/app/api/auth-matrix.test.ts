/// <reference types="vite/client" />
// Security regression net: every API route handler must refuse an unauthenticated caller.
// Routes are discovered with import.meta.glob, so a NEW route that forgets its auth check
// fails this test automatically. Intentionally-public handlers are listed explicitly below.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: null }, error: new Error('no session') }),
    },
    from: () => {
      throw new Error('database must not be touched before authentication')
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    throw new Error('admin client must not be touched before authentication')
  },
}))

const routeModules = import.meta.glob('./**/route.{ts,tsx}', { eager: true })

// Handlers that are public on purpose, with the status an anonymous caller should get.
const PUBLIC_HANDLERS: Record<string, number | number[]> = {
  'language POST': [200, 400], // sets the locale cookie; needs no session
  'webhooks/stripe POST': 400, // authenticated by Stripe signature, not a session
  'share GET': 400, // public share-link lookup: rejects a missing token
  'health GET': [200, 503], // liveness endpoint for uptime monitors; minimal public output
}

const METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const

function makeRequest(url: string) {
  const request = {
    url,
    method: 'POST',
    headers: new Headers(),
    cookies: { get: () => undefined, getAll: () => [] },
    nextUrl: new URL(url),
    json: async () => ({}),
    text: async () => '',
  }
  return request as any
}

describe('API auth matrix', () => {
  it('discovers the API routes', () => {
    expect(Object.keys(routeModules).length).toBeGreaterThan(30)
  })

  for (const [file, mod] of Object.entries(routeModules) as Array<[string, Record<string, unknown>]>) {
    const routeName = file.replace(/^\.\//, '').replace(/\/route\.tsx?$/, '')

    for (const method of METHODS) {
      if (typeof mod[method] !== 'function') continue // route does not implement this method

      it(`${method} /api/${routeName} rejects anonymous callers`, async () => {
        const handler = mod[method] as (req: unknown) => Promise<Response>
        const response = await handler(makeRequest(`http://localhost/api/${routeName}`))
        const publicExpectation = PUBLIC_HANDLERS[`${routeName} ${method}`]

        if (publicExpectation !== undefined) {
          const allowed = Array.isArray(publicExpectation) ? publicExpectation : [publicExpectation]
          expect(allowed).toContain(response.status)
        } else {
          expect([401, 403]).toContain(response.status)
        }
      })
    }
  }
})
