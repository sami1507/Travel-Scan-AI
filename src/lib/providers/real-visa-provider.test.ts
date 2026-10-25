import { describe, it, expect } from 'vitest'
import { RealVisaProvider } from './real-visa-provider'

const provider = new RealVisaProvider()

describe('RealVisaProvider', () => {
  it('returns curated rules with source "knowledge-based" for known pairs', async () => {
    const result = await provider.getVisaRequirement('US', 'FR')
    expect(result.source).toBe('knowledge-based')
    expect(result.visaRequired).toBe(false)
    expect(result.requirement).toBe('visa-free')
    expect(result.maxStayDays).toBe(90)
  })

  it('does not claim a specific verification date it cannot back up', async () => {
    const result = await provider.getVisaRequirement('US', 'FR')
    expect(result.metadata).not.toHaveProperty('lastVerified')
  })

  it('treats an eTA as an online authorisation, not an embassy visa', async () => {
    const result = await provider.getVisaRequirement('US', 'AU')
    expect(result.visaRequired).toBe(true)
    expect(result.requirement).toBe('e-visa')
    expect(result.cost).toBeLessThan(50)
  })

  it('marks embassy visas and e-visas differently', async () => {
    const china = await provider.getVisaRequirement('US', 'CN')
    const india = await provider.getVisaRequirement('US', 'IN')
    expect(china.requirement).toBe('visa-required')
    expect(india.requirement).toBe('e-visa')
  })

  it('applies the shared EU rule set to other EU passports', async () => {
    const german = await provider.getVisaRequirement('DE', 'JP')
    const french = await provider.getVisaRequirement('FR', 'JP')
    expect(german.source).toBe('knowledge-based')
    expect(german.requirement).toBe(french.requirement)
  })

  it('is case-insensitive', async () => {
    const lower = await provider.getVisaRequirement('us', 'fr')
    expect(lower.passportCountry).toBe('US')
    expect(lower.source).toBe('knowledge-based')
  })

  it('falls back to a clearly labelled conservative assumption for unknown pairs', async () => {
    const result = await provider.getVisaRequirement('ZZ', 'QQ')
    expect(result.source).toBe('assumed')
    expect(result.visaRequired).toBe(true)
    expect(String(result.notes)).toContain('not verified')
    expect(result.metadata?.warning).toBeTruthy()
  })

  it('scores ease: visa-free > eTA > e-visa > embassy/unknown', () => {
    const free = provider.getVisaEaseScore('US', 'FR')
    const eta = provider.getVisaEaseScore('US', 'AU')
    const evisa = provider.getVisaEaseScore('US', 'IN')
    const embassy = provider.getVisaEaseScore('US', 'CN')
    expect(free).toBeGreaterThan(eta)
    expect(eta).toBeGreaterThan(evisa)
    expect(evisa).toBeGreaterThan(embassy)
    expect(provider.getVisaEaseScore('ZZ', 'QQ')).toBe(embassy)
  })

  it('reports verified-data coverage and lists visa-free destinations', () => {
    expect(provider.hasVerifiedData('US', 'FR')).toBe(true)
    expect(provider.hasVerifiedData('ZZ', 'QQ')).toBe(false)
    expect(provider.getVisaFreeDestinations('US')).toContain('FR')
    expect(provider.getVisaFreeDestinations('US')).not.toContain('CN')
    expect(provider.getVisaFreeDestinations('ZZ')).toEqual([])
  })
})
