// User travel profile types and services
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface UserTravelProfile {
  id: string
  user_id: string
  
  // Budget
  preferred_budget_level?: 'budget' | 'moderate' | 'comfortable' | 'luxury'
  budget_flexibility?: 'strict' | 'flexible' | 'very-flexible'
  
  // Travel Style (1-10 scale)
  nightlife_importance?: number
  nature_importance?: number
  comfort_vs_adventure?: number // 1=comfort, 10=adventure
  transport_importance?: number
  safety_importance?: number
  hotel_quality_importance?: number
  
  // Trip Style
  preferred_trip_style?: 'solo' | 'couple' | 'family' | 'friends' | 'business'
  preferred_pace?: 'relaxed' | 'moderate' | 'fast' | 'very-fast'
  
  // Additional
  preferred_interests?: string[]
  avoid_destinations?: string[]
  
  // Metadata
  profile_completeness: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BudgetBreakdown {
  id: string
  destination_id: string
  destination_name: string
  
  // Flight
  flight_cost_min?: number
  flight_cost_max?: number
  flight_cost_currency?: string
  flight_data_quality?: 'real' | 'estimated' | 'demo'
  
  // Accommodation
  accommodation_cost_per_night_min?: number
  accommodation_cost_per_night_max?: number
  accommodation_currency?: string
  accommodation_data_quality?: 'real' | 'estimated' | 'demo'
  
  // Daily
  daily_cost_min?: number
  daily_cost_max?: number
  daily_cost_currency?: string
  daily_cost_breakdown?: {
    food?: { min: number; max: number }
    transport?: { min: number; max: number }
    activities?: { min: number; max: number }
  }
  daily_cost_data_quality?: 'real' | 'estimated' | 'demo'
  
  // Total
  total_trip_cost_min?: number
  total_trip_cost_max?: number
  trip_duration_days?: number
  total_cost_currency?: string
  
  budget_level?: string
  notes?: string
  data_sources?: string[]
  created_at: string
}

export class UserProfileService {
  // Get or create user profile
  static async getProfile(userId: string): Promise<UserTravelProfile | null> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('user_travel_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data
  }

  // Create profile
  static async createProfile(userId: string, profile: Partial<UserTravelProfile>): Promise<UserTravelProfile> {
    const supabase = await createServerSupabaseClient()
    
    const completeness = this.calculateCompleteness(profile)
    
    const { data, error } = await supabase
      .from('user_travel_profiles')
      .insert({
        user_id: userId,
        ...profile,
        profile_completeness: completeness,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Update profile
  static async updateProfile(
    userId: string,
    updates: Partial<UserTravelProfile>
  ): Promise<UserTravelProfile> {
    const supabase = await createServerSupabaseClient()
    
    const completeness = this.calculateCompleteness(updates)
    
    const { data, error } = await supabase
      .from('user_travel_profiles')
      .update({
        ...updates,
        profile_completeness: completeness,
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Calculate profile completeness
  private static calculateCompleteness(profile: Partial<UserTravelProfile>): number {
    const fields = [
      'preferred_budget_level',
      'nightlife_importance',
      'nature_importance',
      'comfort_vs_adventure',
      'transport_importance',
      'safety_importance',
      'hotel_quality_importance',
      'preferred_trip_style',
      'preferred_pace',
    ]
    
    const filledFields = fields.filter(field => {
      const value = profile[field as keyof UserTravelProfile]
      return value !== undefined && value !== null
    }).length
    
    return Math.round((filledFields / fields.length) * 100)
  }
}

export class FlexibleDateService {
  // Parse flexible date input
  static parseFlexibleDate(input: string): {
    type: string
    months: number[]
    season?: string
    description: string
  } {
    const normalized = input.toLowerCase().trim()
    
    // This month
    if (normalized.includes('this month')) {
      const currentMonth = new Date().getMonth() + 1
      return {
        type: 'specific_month',
        months: [currentMonth],
        description: `Current month (${this.getMonthName(currentMonth)})`,
      }
    }
    
    // Early/Late/Mid month patterns
    const monthMatch = normalized.match(/(early|late|mid)\s+(\w+)/)
    if (monthMatch) {
      const [, timing, monthName] = monthMatch
      const month = this.parseMonthName(monthName)
      if (month) {
        return {
          type: `${timing}_month`,
          months: [month],
          description: `${timing.charAt(0).toUpperCase() + timing.slice(1)} ${this.getMonthName(month)}`,
        }
      }
    }
    
    // Between months
    const betweenMatch = normalized.match(/between\s+(\w+)\s+and\s+(\w+)/)
    if (betweenMatch) {
      const [, month1Name, month2Name] = betweenMatch
      const month1 = this.parseMonthName(month1Name)
      const month2 = this.parseMonthName(month2Name)
      if (month1 && month2) {
        const months = this.getMonthRange(month1, month2)
        return {
          type: 'month_range',
          months,
          description: `${this.getMonthName(month1)} to ${this.getMonthName(month2)}`,
        }
      }
    }
    
    // Season patterns
    const seasons: Record<string, number[]> = {
      spring: [3, 4, 5],
      summer: [6, 7, 8],
      fall: [9, 10, 11],
      autumn: [9, 10, 11],
      winter: [12, 1, 2],
    }
    
    for (const [season, months] of Object.entries(seasons)) {
      if (normalized.includes(season)) {
        return {
          type: 'season',
          months,
          season,
          description: `${season.charAt(0).toUpperCase() + season.slice(1)} season`,
        }
      }
    }
    
    // Best window patterns
    if (normalized.includes('best') && (normalized.includes('week') || normalized.includes('window'))) {
      return {
        type: 'best_window',
        months: [], // Will be determined by analysis
        description: 'Best available window',
      }
    }
    
    // Default: flexible
    return {
      type: 'flexible',
      months: [],
      description: 'Flexible timing',
    }
  }

  private static parseMonthName(name: string): number | null {
    const months: Record<string, number> = {
      january: 1, jan: 1,
      february: 2, feb: 2,
      march: 3, mar: 3,
      april: 4, apr: 4,
      may: 5,
      june: 6, jun: 6,
      july: 7, jul: 7,
      august: 8, aug: 8,
      september: 9, sep: 9, sept: 9,
      october: 10, oct: 10,
      november: 11, nov: 11,
      december: 12, dec: 12,
    }
    return months[name.toLowerCase()] || null
  }

  private static getMonthName(month: number): string {
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return names[month - 1] || ''
  }

  private static getMonthRange(start: number, end: number): number[] {
    const months: number[] = []
    let current = start
    
    while (current !== end) {
      months.push(current)
      current = current === 12 ? 1 : current + 1
      if (months.length > 12) break // Safety
    }
    months.push(end)
    
    return months
  }
}

export class BudgetBreakdownService {
  // Generate budget breakdown for destination
  static generateBreakdown(
    destinationId: string,
    destinationName: string,
    budgetLevel: string,
    durationDays: number = 7
  ): BudgetBreakdown {
    // Budget multipliers based on level
    const multipliers: Record<string, number> = {
      budget: 0.6,
      moderate: 1.0,
      comfortable: 1.5,
      luxury: 2.5,
    }
    
    const multiplier = multipliers[budgetLevel] || 1.0
    
    // Base estimates (moderate level, per day)
    const baseDailyCost = {
      food: { min: 25, max: 50 },
      transport: { min: 10, max: 25 },
      activities: { min: 15, max: 40 },
    }
    
    // Apply multiplier
    const dailyBreakdown = {
      food: {
        min: Math.round(baseDailyCost.food.min * multiplier),
        max: Math.round(baseDailyCost.food.max * multiplier),
      },
      transport: {
        min: Math.round(baseDailyCost.transport.min * multiplier),
        max: Math.round(baseDailyCost.transport.max * multiplier),
      },
      activities: {
        min: Math.round(baseDailyCost.activities.min * multiplier),
        max: Math.round(baseDailyCost.activities.max * multiplier),
      },
    }
    
    const dailyMin = dailyBreakdown.food.min + dailyBreakdown.transport.min + dailyBreakdown.activities.min
    const dailyMax = dailyBreakdown.food.max + dailyBreakdown.transport.max + dailyBreakdown.activities.max
    
    // Flight estimates (demo data)
    const flightMin = Math.round(300 * multiplier)
    const flightMax = Math.round(800 * multiplier)
    
    // Accommodation estimates (per night)
    const accomMin = Math.round(50 * multiplier)
    const accomMax = Math.round(150 * multiplier)
    
    // Total trip cost
    const totalMin = flightMin + (accomMin * durationDays) + (dailyMin * durationDays)
    const totalMax = flightMax + (accomMax * durationDays) + (dailyMax * durationDays)
    
    return {
      id: crypto.randomUUID(),
      destination_id: destinationId,
      destination_name: destinationName,
      
      flight_cost_min: flightMin,
      flight_cost_max: flightMax,
      flight_cost_currency: 'USD',
      flight_data_quality: 'estimated',
      
      accommodation_cost_per_night_min: accomMin,
      accommodation_cost_per_night_max: accomMax,
      accommodation_currency: 'USD',
      accommodation_data_quality: 'estimated',
      
      daily_cost_min: dailyMin,
      daily_cost_max: dailyMax,
      daily_cost_currency: 'USD',
      daily_cost_breakdown: dailyBreakdown,
      daily_cost_data_quality: 'estimated',
      
      total_trip_cost_min: totalMin,
      total_trip_cost_max: totalMax,
      trip_duration_days: durationDays,
      total_cost_currency: 'USD',
      
      budget_level: budgetLevel,
      data_sources: ['internal_estimates'],
      created_at: new Date().toISOString(),
    }
  }

  // Get breakdown for destination
  static async getBreakdown(destinationId: string): Promise<BudgetBreakdown | null> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('budget_breakdowns')
      .select('*')
      .eq('destination_id', destinationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    return data
  }
}
