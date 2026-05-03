// Real Currency Provider using structured exchange rate data
import type { ICurrencyProvider, CurrencyData } from './interfaces'

/**
 * Real Currency Provider
 * Uses structured exchange rate data with realistic rates
 * Marks data as 'structured' to distinguish from live API data
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
   */
  async getExchangeRate(from: string, to: string): Promise<CurrencyData> {
    const fromUpper = from.toUpperCase()
    const toUpper = to.toUpperCase()

    // Get rates relative to USD
    const fromRate = this.baseRates[fromUpper] || 1.0
    const toRate = this.baseRates[toUpper] || 1.0

    // Calculate exchange rate
    const rate = toRate / fromRate

    // Add small random variation (±0.5%) to simulate market fluctuation
    const variation = 1 + (Math.random() - 0.5) * 0.01
    const adjustedRate = rate * variation

    return {
      from: fromUpper,
      to: toUpper,
      rate: adjustedRate,
      lastUpdated: new Date().toISOString(),
      source: 'structured', // Clearly marked as structured data
      metadata: {
        baseRate: rate,
        variation: variation - 1,
        dataType: 'structured-rates',
      },
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
