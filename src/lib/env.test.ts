import { describe, it, expect } from 'vitest'
import { getEnvReport, REQUIRED_ENV } from './env'

const allRequired = Object.fromEntries(REQUIRED_ENV.map((name) => [name, 'value']))

describe('getEnvReport', () => {
  it('is ok when every required variable is set', () => {
    const report = getEnvReport(allRequired)
    expect(report.ok).toBe(true)
    expect(report.missingRequired).toEqual([])
  })

  it('lists exactly which required variables are missing', () => {
    const report = getEnvReport({ ...allRequired, OPENAI_API_KEY: undefined })
    expect(report.ok).toBe(false)
    expect(report.missingRequired).toEqual(['OPENAI_API_KEY'])
  })

  it('treats blank values as missing', () => {
    const report = getEnvReport({ ...allRequired, SUPABASE_SERVICE_ROLE_KEY: '   ' })
    expect(report.missingRequired).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('enables an integration only when all of its variables are set', () => {
    const partial = getEnvReport({ ...allRequired, HOTELBEDS_API_KEY: 'k' })
    expect(partial.integrations.hotelbeds.enabled).toBe(false)
    expect(partial.integrations.hotelbeds.missing).toEqual(['HOTELBEDS_API_SECRET'])

    const full = getEnvReport({ ...allRequired, HOTELBEDS_API_KEY: 'k', HOTELBEDS_API_SECRET: 's' })
    expect(full.integrations.hotelbeds.enabled).toBe(true)
  })

  it('never includes secret values in the report', () => {
    const report = JSON.stringify(getEnvReport({ ...allRequired, OPENAI_API_KEY: 'sk-super-secret' }))
    expect(report).not.toContain('sk-super-secret')
  })
})
