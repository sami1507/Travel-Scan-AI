/**
 * Verify Phase 1 Learning Layer Database
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabaseUrl = 'https://ymcwvxousmqhkjeanmja.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Disable realtime to avoid WebSocket issues
const supabaseOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {}
  },
  db: {
    schema: 'public'
  }
}

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('PHASE 1 LEARNING LAYER - DATABASE VERIFICATION')
  console.log('='.repeat(80) + '\n')

  if (!supabaseServiceKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
    console.log('   Please set it before running this script\n')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, supabaseOptions)

  // Check ENABLE_AI_LEARNING
  console.log('--- Environment Configuration ---\n')
  const envContent = fs.readFileSync('.env.local', 'utf-8')
  const learningEnabled = envContent.includes('ENABLE_AI_LEARNING=true')
  
  if (learningEnabled) {
    console.log('✅ ENABLE_AI_LEARNING=true is set')
  } else {
    console.log('❌ ENABLE_AI_LEARNING is not set to true')
    console.log('   Add this line to .env.local: ENABLE_AI_LEARNING=true\n')
  }

  // Check migration tables
  console.log('\n--- Migration Status ---\n')
  
  const tables = [
    'ai_recommendation_events',
    'ai_recommendation_items',
    'ai_feedback_signals',
    'user_preference_profiles'
  ]

  let allTablesExist = true

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1)

    if (error) {
      console.log(`❌ Table '${table}' does not exist`)
      console.log(`   Error: ${error.message}`)
      allTablesExist = false
    } else {
      console.log(`✅ Table '${table}' exists`)
    }
  }

  if (!allTablesExist) {
    console.log('\n⚠️  Migration not applied. To apply:')
    console.log('   1. Go to Supabase Dashboard → SQL Editor')
    console.log('   2. Run: supabase/migrations/20260512_ai_learning_layer.sql\n')
    process.exit(1)
  }

  // Check existing data
  console.log('\n--- Current Data ---\n')

  const { count: eventsCount } = await supabase
    .from('ai_recommendation_events')
    .select('*', { count: 'exact', head: true })

  const { count: itemsCount } = await supabase
    .from('ai_recommendation_items')
    .select('*', { count: 'exact', head: true })

  const { count: signalsCount } = await supabase
    .from('ai_feedback_signals')
    .select('*', { count: 'exact', head: true })

  const { count: profilesCount } = await supabase
    .from('user_preference_profiles')
    .select('*', { count: 'exact', head: true })

  console.log(`Recommendation Events: ${eventsCount || 0}`)
  console.log(`Recommendation Items: ${itemsCount || 0}`)
  console.log(`Feedback Signals: ${signalsCount || 0}`)
  console.log(`User Profiles: ${profilesCount || 0}`)

  // Show recent events
  if (eventsCount && eventsCount > 0) {
    console.log('\n--- Recent Events ---\n')
    const { data: recentEvents } = await supabase
      .from('ai_recommendation_events')
      .select('id, created_at, trip_structure, provider_used, fallback_used, recommendation_count')
      .order('created_at', { ascending: false })
      .limit(5)

    recentEvents?.forEach((event, idx) => {
      console.log(`${idx + 1}. Event ${event.id.substring(0, 8)}...`)
      console.log(`   Created: ${new Date(event.created_at).toLocaleString()}`)
      console.log(`   Trip Structure: ${event.trip_structure || 'N/A'}`)
      console.log(`   Provider: ${event.provider_used}`)
      console.log(`   Fallback: ${event.fallback_used}`)
      console.log(`   Recommendations: ${event.recommendation_count}`)
    })
  }

  // Show recent signals
  if (signalsCount && signalsCount > 0) {
    console.log('\n--- Recent Feedback Signals ---\n')
    const { data: recentSignals } = await supabase
      .from('ai_feedback_signals')
      .select('id, created_at, signal_type, event_id')
      .order('created_at', { ascending: false })
      .limit(5)

    recentSignals?.forEach((signal, idx) => {
      console.log(`${idx + 1}. Signal ${signal.id.substring(0, 8)}...`)
      console.log(`   Created: ${new Date(signal.created_at).toLocaleString()}`)
      console.log(`   Type: ${signal.signal_type}`)
      console.log(`   Event: ${signal.event_id.substring(0, 8)}...`)
    })
  }

  // Show user profiles
  if (profilesCount && profilesCount > 0) {
    console.log('\n--- User Profiles ---\n')
    const { data: profiles } = await supabase
      .from('user_preference_profiles')
      .select('user_id, signal_count, confidence_score, fatigue_tolerance, route_complexity_preference')
      .order('signal_count', { ascending: false })
      .limit(5)

    profiles?.forEach((profile, idx) => {
      console.log(`${idx + 1}. User ${profile.user_id.substring(0, 8)}...`)
      console.log(`   Signals: ${profile.signal_count}`)
      console.log(`   Confidence: ${profile.confidence_score}`)
      console.log(`   Fatigue Tolerance: ${profile.fatigue_tolerance}`)
      console.log(`   Route Preference: ${profile.route_complexity_preference}`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('VERIFICATION COMPLETE')
  console.log('='.repeat(80) + '\n')

  if (allTablesExist && learningEnabled) {
    console.log('✅ Learning layer is ready!')
    console.log('   - All tables exist')
    console.log('   - Learning is enabled')
    console.log('   - Ready to record events\n')
  } else if (allTablesExist && !learningEnabled) {
    console.log('⚠️  Learning layer tables exist but learning is disabled')
    console.log('   Add to .env.local: ENABLE_AI_LEARNING=true\n')
  }
}

main().catch(error => {
  console.error('\n❌ Verification error:', error.message)
  process.exit(1)
})
