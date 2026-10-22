// Static Exchange Rates Provider (estimated data — not a live feed)
import { BaseProvider } from './base-provider'
import type { ProviderResponse, SourceConfig, NormalizedRecord } from '../types'
import { sleep } from '../utils'
import { exchangeRatesPayloadSchema } from '../schemas/provider-schemas'

// Snapshot date of the static fallback rates — do not bump without updating the rates
const STATIC_RATES_AS_OF = '2024-06-01T00:00:00.000Z'

export class ExchangeRatesProvider extends BaseProvider {
  name = 'Static Exchange Rates Provider (estimated)'
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
          source: 'estimated',
        }
      ),
    ]
  }

  private generateMockRates(from: string, to: string) {
    // Static snapshot rates (approximate real-world rates as of STATIC_RATES_AS_OF)
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

    const baseRate = baseRates[key] ?? (baseRates[reverseKey] ? 1 / baseRates[reverseKey] : 1.0)
    const rate = baseRate

    return {
      from,
      to,
      rate: Math.round(rate * 10000) / 10000,
      inverse_rate: Math.round((1 / rate) * 10000) / 10000,
      bid: Math.round((rate * 0.999) * 10000) / 10000,
      ask: Math.round((rate * 1.001) * 10000) / 10000,
      high_24h: Math.round((rate * 1.005) * 10000) / 10000,
      low_24h: Math.round((rate * 0.995) * 10000) / 10000,
      change_24h: 0,
      change_percent_24h: 0,
      timestamp: STATIC_RATES_AS_OF,
    }
  }
}
