import { describe, it, expect, vi, beforeEach } from 'vitest'

let dbError: unknown = null
let dbThrows = false

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (dbThrows) throw new Error('unreachable')
    return { from: () => ({ select: async () => ({ error: dbError }) }) }
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: new Error('no session') }) },
  }),
}))

import { GET } from './route'

const REQUIRED = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'k',
  SUPABASE_SERVICE_ROLE_KEY: 'k',
  OPENAI_API_KEY: 'k',
}

function request(query = '') {
  return { url: `http://localhost/api/health${query}` } as any
}

beforeEach(() => {
  dbError = null
  dbThrows = false
  for (const [name, value] of Object.entries(REQUIRED)) vi.stubEnv(name, value)
})

describe('GET /api/health', () => {
  it('reports ok (200) when configuration is complete and the database responds', async () => {
    const response = await GET(request())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.checks).toEqual({ database: 'ok', config: 'ok' })
  })

  it('reports degraded (503) when the database query fails', async () => {
    dbError = { message: 'boom' }
    const response = await GET(request())
    expect(response.status).toBe(503)
    expect((await response.json()).checks.database).toBe('down')
  })

  it('reports degraded (503) when the database client cannot be created', async () => {
    dbThrows = true
    expect((await GET(request())).status).toBe(503)
  })

  it('reports degraded (503) when required configuration is missing', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const response = await GET(request())
    const body = await response.json()
    expect(response.status).toBe(503)
    expect(body.checks.config).toBe('incomplete')
  })

  it('does not leak variable names or integration details to anonymous callers', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const text = JSON.stringify(await (await GET(request())).json())
    expect(text).not.toContain('OPENAI_API_KEY')
    expect(text).not.toContain('integrations')
  })

  it('requires an admin for the detailed report', async () => {
    const response = await GET(request('?detail=1'))
    expect([401, 403]).toContain(response.status)
  })
})
