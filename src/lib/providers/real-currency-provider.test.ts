import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

const originalKey = process.env.EXCHANGERATE_API_KEY

beforeEach(() => {
  vi.resetModules() // the live-rate cache is module-level; start each test clean
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalKey === undefined) delete process.env.EXCHANGERATE_API_KEY
  else process.env.EXCHANGERATE_API_KEY = originalKey
})

async function loadProvider() {
  const { RealCurrencyProvider } = await import('./real-currency-provider')
  return new RealCurrencyProvider()
}

describe('RealCurrencyProvider without an API key', () => {
  it('uses the static snapshot, labelled with its real date and as estimated', async () => {
    delete process.env.EXCHANGERATE_API_KEY
    const provider = await loadProvider()
    const result = await provider.getExchangeRate('USD', 'EUR')

    expect(result.source).toBe('structured')
    expect(result.rate).toBeCloseTo(0.92, 5)
    expect(result.lastUpdated).toBe('2024-06-01T00:00:00.000Z')
    expect(result.metadata?.dataType).toBe('estimated-static-rates')
  })

  it('is deterministic (no random jitter) and handles cross rates', async () => {
    delete process.env.EXCHANGERATE_API_KEY
    const provider = await loadProvider()
    const a = await provider.getExchangeRate('EUR', 'JPY')
    const b = await provider.getExchangeRate('EUR', 'JPY')
    expect(a.rate).toBe(b.rate)
    expect(a.rate).toBeCloseTo(149.5 / 0.92, 5)
  })

  it('normalises currency codes to upper case', async () => {
    delete process.env.EXCHANGERATE_API_KEY
    const provider = await loadProvider()
    const result = await provider.getExchangeRate('usd', 'gbp')
    expect(result.from).toBe('USD')
    expect(result.to).toBe('GBP')
  })
})

describe('RealCurrencyProvider with an API key', () => {
  it('returns live rates, cached after the first call', async () => {
    process.env.EXCHANGERATE_API_KEY = 'test-key'
    const fetchMock = vi.fn(async () => Response.json({ result: 'success', conversion_rates: { EUR: 0.9, JPY: 150 } }))
    vi.stubGlobal('fetch', fetchMock)

    const provider = await loadProvider()
    const first = await provider.getExchangeRate('USD', 'EUR')
    const second = await provider.getExchangeRate('USD', 'JPY')

    expect(first.source).toBe('api')
    expect(first.rate).toBe(0.9)
    expect(second.rate).toBe(150)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to the static snapshot when the live request fails', async () => {
    process.env.EXCHANGERATE_API_KEY = 'test-key'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))

    const provider = await loadProvider()
    const result = await provider.getExchangeRate('USD', 'EUR')
    expect(result.source).toBe('structured')
  })

  it('falls back when the response is malformed', async () => {
    process.env.EXCHANGERATE_API_KEY = 'test-key'
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ result: 'error' })))

    const provider = await loadProvider()
    expect((await provider.getExchangeRate('USD', 'EUR')).source).toBe('structured')
  })
})

describe('currency helpers', () => {
  it('maps countries to currencies with a USD default', async () => {
    const provider = await loadProvider()
    expect(provider.getCurrencyForCountry('jp')).toBe('JPY')
    expect(provider.getCurrencyForCountry('FR')).toBe('EUR')
    expect(provider.getCurrencyForCountry('ZZ')).toBe('USD')
  })

  it('reports supported currencies', async () => {
    const provider = await loadProvider()
    expect(provider.isSupported('eur')).toBe(true)
    expect(provider.isSupported('XYZ')).toBe(false)
    expect(provider.getSupportedCurrencies()).toContain('USD')
  })
})
