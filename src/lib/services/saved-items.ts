// API service for saved analyses, destinations, routes, and comparisons
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { TravelAnalysisResponse, RankedDestination, RecommendedRoute, UserConstraints } from '@/lib/analysis/schemas'

export interface SavedAnalysis {
  id: string
  user_id: string
  name: string
  query: string
  analysis_result: TravelAnalysisResponse
  user_constraints: UserConstraints
  is_favorite: boolean
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SavedDestination {
  id: string
  user_id: string
  destination_id: string
  destination_name: string
  destination_type: string
  destination_data: RankedDestination
  source_analysis_id: string | null
  is_favorite: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SavedRoute {
  id: string
  user_id: string
  route_name: string
  route_data: RecommendedRoute
  source_analysis_id: string | null
  is_favorite: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AnalysisHistoryEntry {
  id: string
  user_id: string
  query: string
  user_constraints: UserConstraints
  top_recommendations: string[]
  created_at: string
}

export interface ComparisonSession {
  id: string
  user_id: string
  comparison_type: 'destinations' | 'routes'
  item_a_id: string
  item_b_id: string
  item_a_data: RankedDestination | RecommendedRoute
  item_b_data: RankedDestination | RecommendedRoute
  comparison_notes: string | null
  created_at: string
}

export class SavedItemsService {
  // Saved Analyses
  static async saveAnalysis(
    userId: string,
    name: string,
    query: string,
    analysisResult: TravelAnalysisResponse,
    userConstraints: UserConstraints,
    tags: string[] = []
  ): Promise<SavedAnalysis> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('saved_analyses')
      .insert({
        user_id: userId,
        name,
        query,
        analysis_result: analysisResult,
        user_constraints: userConstraints,
        tags,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getSavedAnalyses(userId: string, limit = 50): Promise<SavedAnalysis[]> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('saved_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  static async getSavedAnalysis(id: string): Promise<SavedAnalysis | null> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('saved_analyses')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data
  }

  static async updateAnalysis(
    id: string,
    updates: Partial<Pick<SavedAnalysis, 'name' | 'is_favorite' | 'tags' | 'notes'>>
  ): Promise<SavedAnalysis> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('saved_analyses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteAnalysis(id: string): Promise<void> {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('saved_analyses')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Saved Destinations
  static async saveDestination(
    userId: string,
    destination: RankedDestination,
    sourceAnalysisId?: string
  ): Promise<SavedDestination> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('saved_destinations')
      .insert({
        user_id: userId,
        destination_id: destination.destinationId,
        destination_name: destination.destinationName,
        destination_type: destination.destinationType,
        destination_data: destination,
        source_analysis_id: sourceAnalysisId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getSavedDestinations(userId: string, limit = 50): Promise<SavedDestination[]> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('saved_destinations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  static async updateDestination(
    id: string,
    updates: Partial<Pick<SavedDestination, 'is_favorite' | 'notes'>>
  ): Promise<SavedDestination> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('saved_destinations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteDestination(id: string): Promise<void> {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('saved_destinations')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Saved Routes
  static async saveRoute(
    userId: string,
    route: RecommendedRoute,
    sourceAnalysisId?: string
  ): Promise<SavedRoute> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('saved_routes')
      .insert({
        user_id: userId,
        route_name: route.routeName,
        route_data: route,
        source_analysis_id: sourceAnalysisId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getSavedRoutes(userId: string, limit = 50): Promise<SavedRoute[]> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('saved_routes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  static async updateRoute(
    id: string,
    updates: Partial<Pick<SavedRoute, 'route_name' | 'is_favorite' | 'notes'>>
  ): Promise<SavedRoute> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('saved_routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteRoute(id: string): Promise<void> {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('saved_routes')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Analysis History
  static async addToHistory(
    userId: string,
    query: string,
    userConstraints: UserConstraints,
    topRecommendations: string[]
  ): Promise<void> {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('analysis_history')
      .insert({
        user_id: userId,
        query,
        user_constraints: userConstraints,
        top_recommendations: topRecommendations,
      })

    if (error) throw error
  }

  static async getHistory(userId: string, limit = 20): Promise<AnalysisHistoryEntry[]> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('analysis_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // Comparison Sessions
  static async createComparison(
    userId: string,
    type: 'destinations' | 'routes',
    itemA: RankedDestination | RecommendedRoute,
    itemB: RankedDestination | RecommendedRoute,
    itemAId: string,
    itemBId: string
  ): Promise<ComparisonSession> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('comparison_sessions')
      .insert({
        user_id: userId,
        comparison_type: type,
        item_a_id: itemAId,
        item_b_id: itemBId,
        item_a_data: itemA,
        item_b_data: itemB,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getComparisons(userId: string, limit = 10): Promise<ComparisonSession[]> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('comparison_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }
}
