import { describe, it, expect } from 'vitest'
import { buildCsp, generateNonce } from './csp'

describe('generateNonce', () => {
  it('returns a base64 string and is unique per call', () => {
    const a = generateNonce()
    const b = generateNonce()
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(a.length).toBeGreaterThanOrEqual(22)
    expect(a).not.toBe(b)
  })
})

describe('buildCsp', () => {
  it('authorises scripts by nonce + strict-dynamic, never unsafe-inline', () => {
    const csp = buildCsp('abc123', true)
    const scriptSrc = csp.split('; ').find((d) => d.startsWith('script-src'))!
    expect(scriptSrc).toContain("'nonce-abc123'")
    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  it('allows unsafe-eval only outside production', () => {
    expect(buildCsp('n', false)).toContain("'unsafe-eval'")
    expect(buildCsp('n', true)).not.toContain("'unsafe-eval'")
  })

  it('locks down plugins, framing and base URI', () => {
    const csp = buildCsp('n', true)
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain('upgrade-insecure-requests')
  })

  it('does not force https upgrades in development', () => {
    expect(buildCsp('n', false)).not.toContain('upgrade-insecure-requests')
  })
})
