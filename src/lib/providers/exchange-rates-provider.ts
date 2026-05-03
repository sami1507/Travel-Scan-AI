// Mock Exchange Rates Provider
import { BaseProvider } from './base-provider'
import type { ProviderResponse, SourceConfig, NormalizedRecord } from '../types'
import { sleep } from '../utils'
import { exchangeRatesPayloadSchema } from '../schemas/provider-schemas'

export class ExchangeRatesProvider extends BaseProvider {
  name = 'Mock Exchange Rates Provider'
  type = 'exchange_rates' as const

  async fetch(config: SourceConfig): Promise<ProviderResponse> {
    try {
      await sleep(200 + Math.random() * 300)

      const settings = config.parser_settings as {
        from?: string
        to?: string
      }

      const mockRates = this.generateMockRates(
        settings.from || 'USD',
        settings.to || 'EUR'
      )

      return {
        success: true,
        data: mockRates,
        metadata: {
          provider: this.name,
          fetched_at: new Date().toISOString(),
        },
      }
    } catch (error) {
      return this.handleError(error, 'fetch')
    }
  }

  validate(data: any): boolean {
    try {
      exchangeRatesPayloadSchema.parse(data)
      return true
    } catch {
      return false
    }
  }

  normalize(data: any, config: SourceConfig, ingestionRunId: string): NormalizedRecord[] {
    if (!this.validate(data)) {
      throw new Error('Invalid exchange rate data structure')
    }

    return [
      this.createNormalizedRecord(
        config.id,
        ingestionRunId,
        `${data.from}-${data.to}`,
        'exchange_rate',
        {
          from_currency: data.from,
          to_currency: data.to,
          rate: data.rate,
          inverse_rate: data.inverse_rate,
          bid: data.bid,
          ask: data.ask,
          high_24h: data.high_24h,
          low_24h: data.low_24h,
          change_24h: data.change_24h,
          change_percent_24h: data.change_percent_24h,
        },
        {
          timestamp: data.timestamp,
          source: 'mock',
        }
      ),
    ]
  }

  private generateMockRates(from: string, to: string) {
    // Base rates (approximate real-world rates)
    const baseRates: Record<string, number> = {
      'USD-EUR': 0.92,
      'USD-GBP': 0.79,
      'USD-JPY': 149.5,
      'USD-CAD': 1.36,
      'USD-AUD': 1.52,
      'EUR-GBP': 0.86,
      'EUR-USD': 1.09,
      'GBP-USD': 1.27,
    }

    const key = `${from}-${to}`
    const reverseKey = `${to}-${from}`
    
    let baseRate = baseRates[key] || baseRates[reverseKey] ? 1 / baseRates[reverseKey] : 1.0
    
    // Add small random variation (±0.5%)
    const variation = (Math.random() - 0.5) * 0.01
    const rate = baseRate * (1 + variation)
    
    const change24h = (Math.random() - 0.5) * 0.02 * baseRate
    const changePercent24h = (change24h / baseRate) * 100

    return {
      from,
      to,
      rate: Math.round(rate * 10000) / 10000,
      inverse_rate: Math.round((1 / rate) * 10000) / 10000,
      bid: Math.round((rate * 0.999) * 10000) / 10000,
      ask: Math.round((rate * 1.001) * 10000) / 10000,
      high_24h: Math.round((rate * 1.005) * 10000) / 10000,
      low_24h: Math.round((rate * 0.995) * 10000) / 10000,
      change_24h: Math.round(change24h * 10000) / 10000,
      change_percent_24h: Math.round(changePercent24h * 100) / 100,
      timestamp: new Date().toISOString(),
    }
  }
}
