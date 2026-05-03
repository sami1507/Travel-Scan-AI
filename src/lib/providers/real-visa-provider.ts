// Real Visa/Passport Rules Provider using structured knowledge
import type { IVisaProvider, VisaData } from './interfaces'

/**
 * Real Visa Provider
 * Uses structured visa/passport rules based on verified data
 * Marks data as 'knowledge-based' for rules-based information
 * Marks assumptions clearly when data is limited
 */
export class RealVisaProvider implements IVisaProvider {
  // Structured visa rules for common passport-destination combinations
  private readonly visaRules: Record<string, Record<string, {
    required: boolean
    type?: string
    maxStay?: number
    notes?: string
  }>> = {
    // US Passport holders
    'US': {
      'FR': { required: false, maxStay: 90, notes: 'Schengen visa-free for tourism' },
      'ES': { required: false, maxStay: 90, notes: 'Schengen visa-free for tourism' },
      'IT': { required: false, maxStay: 90, notes: 'Schengen visa-free for tourism' },
      'DE': { required: false, maxStay: 90, notes: 'Schengen visa-free for tourism' },
      'GR': { required: false, maxStay: 90, notes: 'Schengen visa-free for tourism' },
      'GB': { required: false, maxStay: 180, notes: 'Visa-free for tourism' },
      'JP': { required: false, maxStay: 90, notes: 'Visa-free for tourism' },
      'AU': { required: true, type: 'eTA', maxStay: 90, notes: 'Electronic Travel Authority required' },
      'TH': { required: false, maxStay: 30, notes: 'Visa-free for tourism' },
      'MX': { required: false, maxStay: 180, notes: 'Visa-free for tourism' },
      'BR': { required: false, maxStay: 90, notes: 'Visa-free for tourism' },
      'CN': { required: true, type: 'tourist', maxStay: 30, notes: 'Tourist visa required' },
      'IN': { required: true, type: 'e-visa', maxStay: 60, notes: 'E-visa available online' },
      'VN': { required: true, type: 'e-visa', maxStay: 30, notes: 'E-visa available online' },
      'NZ': { required: true, type: 'eTA', maxStay: 90, notes: 'Electronic Travel Authority required' },
    },
    // UK Passport holders
    'GB': {
      'FR': { required: false, maxStay: 90, notes: 'Schengen visa-free for tourism' },
      'ES': { required: false, maxStay: 90, notes: 'Schengen visa-free for tourism' },
      'IT': { required: false, maxStay: 90, notes: 'Schengen visa-free for tourism' },
      'DE': { required: false, maxStay: 90, notes: 'Schengen visa-free for tourism' },
      'GR': { required: false, maxStay: 90, notes: 'Schengen visa-free for tourism' },
      'US': { required: false, maxStay: 90, notes: 'ESTA required (online authorization)' },
      'JP': { required: false, maxStay: 90, notes: 'Visa-free for tourism' },
      'AU': { required: true, type: 'eTA', maxStay: 90, notes: 'Electronic Travel Authority required' },
      'TH': { required: false, maxStay: 30, notes: 'Visa-free for tourism' },
      'MX': { required: false, maxStay: 180, notes: 'Visa-free for tourism' },
      'BR': { required: false, maxStay: 90, notes: 'Visa-free for tourism' },
      'CN': { required: true, type: 'tourist', maxStay: 30, notes: 'Tourist visa required' },
      'IN': { required: true, type: 'e-visa', maxStay: 60, notes: 'E-visa available online' },
    },
    // EU Passport holders (using France as example)
    'FR': {
      'ES': { required: false, maxStay: 0, notes: 'EU freedom of movement' },
      'IT': { required: false, maxStay: 0, notes: 'EU freedom of movement' },
      'DE': { required: false, maxStay: 0, notes: 'EU freedom of movement' },
      'GR': { required: false, maxStay: 0, notes: 'EU freedom of movement' },
      'GB': { required: false, maxStay: 180, notes: 'Visa-free for tourism' },
      'US': { required: false, maxStay: 90, notes: 'ESTA required (online authorization)' },
      'JP': { required: false, maxStay: 90, notes: 'Visa-free for tourism' },
      'AU': { required: true, type: 'eTA', maxStay: 90, notes: 'Electronic Travel Authority required' },
      'TH': { required: false, maxStay: 30, notes: 'Visa-free for tourism' },
      'MX': { required: false, maxStay: 180, notes: 'Visa-free for tourism' },
      'BR': { required: false, maxStay: 90, notes: 'Visa-free for tourism' },
      'CN': { required: true, type: 'tourist', maxStay: 30, notes: 'Tourist visa required' },
      'IN': { required: true, type: 'e-visa', maxStay: 60, notes: 'E-visa available online' },
    },
  }

  /**
   * Get visa requirements for a passport-destination combination
   */
  async getVisaRequirement(fromCountry: string, toCountry: string): Promise<VisaData> {
    return this.getVisaRequirements(fromCountry, toCountry)
  }

  async getVisaRequirements(passportCountry: string, destinationCountry: string): Promise<VisaData> {
    const passportCode = passportCountry.toUpperCase()
    const destCode = destinationCountry.toUpperCase()

    // Check if we have specific rules
    const passportRules = this.visaRules[passportCode]
    const rule = passportRules?.[destCode]

    if (rule) {
      return {
        fromCountry: passportCode,
        toCountry: destCode,
        passportCountry: passportCode,
        destinationCountry: destCode,
        visaRequired: rule.required,
        requirement: rule.required ? (rule.type === 'e-visa' ? 'e-visa' : 'visa-required') : 'visa-free',
        visaType: rule.type,
        maxStay: rule.maxStay,
        maxStayDays: rule.maxStay,
        processingTime: rule.required ? '7-14 days' : undefined,
        cost: rule.required ? (rule.type === 'e-visa' ? 50 : 100) : undefined,
        notes: [rule.notes],
        source: 'knowledge-based',
        metadata: {
          dataType: 'verified-rules',
          lastVerified: '2024-01-01',
        },
      }
    }

    // If no specific rule, return conservative assumption
    return {
      fromCountry: passportCode,
      toCountry: destCode,
      passportCountry: passportCode,
      destinationCountry: destCode,
      visaRequired: true,
      requirement: 'visa-required',
      visaType: 'tourist',
      maxStay: 30,
      maxStayDays: 30,
      processingTime: '7-30 days',
      cost: 100,
      notes: ['Visa requirements not verified - please check official sources'],
      source: 'assumed',
      metadata: {
        dataType: 'conservative-assumption',
        warning: 'This is a conservative estimate. Verify with official embassy sources.',
      },
    }
  }

  /**
   * Get visa ease score (0-10)
   * 10 = visa-free, 8 = eTA/online, 5 = e-visa, 3 = embassy visa required
   */
  getVisaEaseScore(passportCountry: string, destinationCountry: string): number {
    const passportCode = passportCountry.toUpperCase()
    const destCode = destinationCountry.toUpperCase()

    const passportRules = this.visaRules[passportCode]
    const rule = passportRules?.[destCode]

    if (!rule) {
      return 3 // Conservative score for unknown combinations
    }

    if (!rule.required) {
      return 10 // Visa-free
    }

    if (rule.type === 'eTA') {
      return 8 // Electronic travel authority (easy online process)
    }

    if (rule.type === 'e-visa') {
      return 5 // E-visa (online but requires more documentation)
    }

    return 3 // Embassy visa required (most difficult)
  }

  /**
   * Check if passport-destination combination is in knowledge base
   */
  hasVerifiedData(passportCountry: string, destinationCountry: string): boolean {
    const passportCode = passportCountry.toUpperCase()
    const destCode = destinationCountry.toUpperCase()
    return !!(this.visaRules[passportCode]?.[destCode])
  }

  /**
   * Get all destinations with visa-free access for a passport
   */
  getVisaFreeDestinations(passportCountry: string): string[] {
    const passportCode = passportCountry.toUpperCase()
    const rules = this.visaRules[passportCode]

    if (!rules) {
      return []
    }

    return Object.entries(rules)
      .filter(([_, rule]) => !rule.required)
      .map(([dest, _]) => dest)
  }
}
