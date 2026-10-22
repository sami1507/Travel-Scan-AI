// Real Currency Provider using structured exchange rate data
import type { ICurrencyProvider, CurrencyData } from './interfaces'
import { logger } from '../utils'

// Snapshot date of the static fallback rates below — do not bump without updating the rates
const STATIC_RATES_AS_OF = '2024-06-01T00:00:00.000Z'
const LIVE_CACHE_TTL_MS = 24 * 60 * 60 * 1000

const liveRateCache = new Map<string, { rates: Record<string, number>; fetchedAt: number }>()

/**
 * Real Currency Provider
 * Fetches live rates from exchangerate-api.com when EXCHANGERATE_API_KEY is configured.
 * Otherwise falls back to a static rate snapshot clearly marked as estimated/stale.
 */
export class RealCurrencyProvider implements ICurrencyProvider {
  // Base exchange rates (relative to USD)
  private readonly baseRates: Record<string, number> = {
    'USD': 1.00,
    'EUR': 0.92,
    'GBP': 0.79,
    'JPY': 149.50,
    'AUD': 1.53,
    'CAD': 1.36,
    'CHF': 0.88,
    'CNY': 7.24,
    'INR': 83.12,
    'MXN': 17.08,
    'BRL': 4.97,
    'ZAR': 18.65,
    'THB': 35.48,
    'SGD': 1.34,
    'NZD': 1.65,
    'KRW': 1320.00,
    'TRY': 28.50,
    'AED': 3.67,
    'SEK': 10.45,
    'NOK': 10.68,
    'DKK': 6.86,
    'PLN': 3.98,
    'CZK': 22.45,
    'HUF': 355.00,
    'RUB': 92.50,
    'ARS': 350.00,
    'CLP': 890.00,
    'COP': 3950.00,
    'PEN': 3.72,
    'VND': 24350.00,
    'IDR': 15650.00,
    'MYR': 4.68,
    'PHP': 56.20,
  }

  /**
   * Get exchange rate between two currencies
   * Uses live exchangerate-api.com data when configured; otherwise falls back to
   * a static snapshot marked with its real snapshot date (not "now").
   */
  async getExchangeRate(from: string, to: string): Promise<CurrencyData> {
    const fromUpper = from.toUpperCase()
    const toUpper = to.toUpperCase()

    const live = await this.getLiveRates(fromUpper)
    if (live && live.rates[toUpper]) {
      return {
        from: fromUpper,
        to: toUpper,
        rate: live.rates[toUpper],
        lastUpdated: new Date(live.fetchedAt).toISOString(),
        source: 'api',
        metadata: {
          dataType: 'live-rates',
          provider: 'exchangerate-api.com',
        },
      }
    }

    // Static fallback — snapshot rates, clearly labeled as estimated
    const fromRate = this.baseRates[fromUpper] || 1.0
    const toRate = this.baseRates[toUpper] || 1.0
    const rate = toRate / fromRate

    return {
      from: fromUpper,
      to: toUpper,
      rate,
      lastUpdated: STATIC_RATES_AS_OF,
      source: 'structured',
      metadata: {
        dataType: 'estimated-static-rates',
        ratesAsOf: STATIC_RATES_AS_OF,
      },
    }
  }

  /**
   * Fetch live rates for a base currency from exchangerate-api.com (cached 24h).
   * Returns null when the API key is not configured or the request fails.
   */
  private async getLiveRates(
    base: string
  ): Promise<{ rates: Record<string, number>; fetchedAt: number } | null> {
    const apiKey = process.env.EXCHANGERATE_API_KEY
    if (!apiKey) return null

    const cached = liveRateCache.get(base)
    if (cached && Date.now() - cached.fetchedAt < LIVE_CACHE_TTL_MS) {
      return cached
    }

    try {
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`)
      if (!res.ok) {
        logger.warn('Currency Provider: live rate request failed', { base, status: res.status })
        return null
      }

      const data = await res.json()
      if (data.result !== 'success' || !data.conversion_rates) {
        logger.warn('Currency Provider: unexpected live rate response', { base, result: data.result })
        return null
      }

      const entry = { rates: data.conversion_rates as Record<string, number>, fetchedAt: Date.now() }
      liveRateCache.set(base, entry)
      return entry
    } catch (error) {
      logger.warn('Currency Provider: live rate fetch error, using static fallback', {
        base,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  /**
   * Get multiple exchange rates for a base currency
   */
  async getMultipleRates(base: string, targets: string[]): Promise<CurrencyData[]> {
    const rates = await Promise.all(
      targets.map(target => this.getExchangeRate(base, target))
    )
    return rates
  }

  /**
   * Check if a currency is supported
   */
  isSupported(currency: string): boolean {
    return currency.toUpperCase() in this.baseRates
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): string[] {
    return Object.keys(this.baseRates)
  }

  /**
   * Get currency info for a country
   */
  getCurrencyForCountry(countryCode: string): string {
    const countryToCurrency: Record<string, string> = {
      'US': 'USD',
      'GB': 'GBP',
      'FR': 'EUR',
      'DE': 'EUR',
      'IT': 'EUR',
      'ES': 'EUR',
      'GR': 'EUR',
      'JP': 'JPY',
      'AU': 'AUD',
      'CA': 'CAD',
      'CH': 'CHF',
      'CN': 'CNY',
      'IN': 'INR',
      'MX': 'MXN',
      'BR': 'BRL',
      'ZA': 'ZAR',
      'TH': 'THB',
      'SG': 'SGD',
      'NZ': 'NZD',
      'KR': 'KRW',
      'TR': 'TRY',
      'AE': 'AED',
      'SE': 'SEK',
      'NO': 'NOK',
      'DK': 'DKK',
      'PL': 'PLN',
      'CZ': 'CZK',
      'HU': 'HUF',
      'RU': 'RUB',
      'AR': 'ARS',
      'CL': 'CLP',
      'CO': 'COP',
      'PE': 'PEN',
      'VN': 'VND',
      'ID': 'IDR',
      'MY': 'MYR',
      'PH': 'PHP',
    }

    return countryToCurrency[countryCode.toUpperCase()] || 'USD'
  }
}
