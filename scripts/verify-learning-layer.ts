/**
 * Verify Phase 1 Learning Layer with Real Supabase Database
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const learningEnabled = process.env.ENABLE_AI_LEARNING

interface VerificationResult {
  step: string
  status: 'pass' | 'fail' | 'skip' | 'info'
  message: string
  details?: any
}

const results: VerificationResult[] = []

function addResult(step: string, status: 'pass' | 'fail' | 'skip' | 'info', message: string, details?: any) {
  results.push({ step, status, message, details })
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : status === 'skip' ? '⏭️' : 'ℹ️'
  console.log(`${icon} ${step}: ${message}`)
  if (details) {
    console.log(`   Details:`, details)
  }
}

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('PHASE 1 LEARNING LAYER - DATABASE VERIFICATION')
  console.log('='.repeat(80) + '\n')

  // Step 1: Check environment configuration
  if (!supabaseUrl || !supabaseServiceKey) {
    addResult('Environment Check', 'fail', 'Supabase credentials not configured')
    console.log('\n❌ Cannot proceed without Supabase configuration')
    process.exit(1)
  }

  addResult('Environment Check', 'pass', 'Supabase credentials found')
  addResult('Learning Flag', 'info', `ENABLE_AI_LEARNING=${learningEnabled || 'not set'}`)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Step 2: Check if migration tables exist
  console.log('\n--- Checking Migration Status ---\n')

  const tables = [
    'ai_recommendation_events',
    'ai_recommendation_items',
    'ai_feedback_signals',
    'user_preference_profiles'
  ]

  let allTablesExist = true

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(0)

    if (error) {
      addResult(`Table: ${table}`, 'fail', `Table does not exist or is not accessible`, { error: error.message })
      allTablesExist = false
    } else {
      addResult(`Table: ${table}`, 'pass', 'Table exists and is accessible')
    }
  }

  if (!allTablesExist) {
    console.log('\n⚠️  Migration not applied. To apply the migration:')
    console.log('   1. Go to Supabase Dashboard → SQL Editor')
    console.log('   2. Run the migration file: supabase/migrations/20260512_ai_learning_layer.sql')
    console.log('   3. Or use: npx supabase db push (if using local/remote link)\n')
    
    addResult('Migration Status', 'fail', 'Learning layer tables not found - migration needs to be applied')
  } else {
    addResult('Migration Status', 'pass', 'All learning layer tables exist')
  }

  // Step 3: Check existing data
  console.log('\n--- Checking Existing Data ---\n')

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

  addResult('Recommendation Events', 'info', `${eventsCount || 0} events in database`)
  addResult('Recommendation Items', 'info', `${itemsCount || 0} items in database`)
  addResult('Feedback Signals', 'info', `${signalsCount || 0} signals in database`)
  addResult('User Profiles', 'info', `${profilesCount || 0} profiles in database`)

  // Step 4: Check RLS policies
  console.log('\n--- Checking RLS Policies ---\n')

  try {
    const { data: policies, error: policiesError } = await supabase
      .rpc('pg_policies')
      .select('*')
      .in('tablename', tables)

    if (policiesError || !policies) {
      addResult('RLS Policies', 'skip', 'Cannot verify RLS policies (requires admin access)')
    } else {
      const policyCount = policies?.length || 0
      addResult('RLS Policies', policyCount > 0 ? 'pass' : 'info', `${policyCount} RLS policies found`)
    }
  } catch {
    addResult('RLS Policies', 'skip', 'Cannot verify RLS policies (RPC not available)')
  }

  // Step 5: Test learning service availability
  console.log('\n--- Testing Learning Service ---\n')

  if (learningEnabled !== 'true') {
    addResult('Learning Service', 'info', 'Learning is DISABLED (ENABLE_AI_LEARNING not set to true)')
    addResult('Learning Service', 'info', 'Set ENABLE_AI_LEARNING=true in .env.local to enable learning')
  } else {
    addResult('Learning Service', 'pass', 'Learning is ENABLED')
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('VERIFICATION SUMMARY')
  console.log('='.repeat(80) + '\n')

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const skipped = results.filter(r => r.status === 'skip').length
  const info = results.filter(r => r.status === 'info').length

  console.log(`Total Checks: ${results.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Info: ${info}\n`)

  if (failed > 0) {
    console.log('❌ Verification failed. Please review the errors above.\n')
    process.exit(1)
  } else if (!allTablesExist) {
    console.log('⚠️  Migration needs to be applied to Supabase database.\n')
    process.exit(1)
  } else {
    console.log('✅ Learning layer database verification complete!\n')
    
    if (learningEnabled !== 'true') {
      console.log('ℹ️  To enable learning, add to .env.local:')
      console.log('   ENABLE_AI_LEARNING=true\n')
    } else {
      console.log('✅ Learning is enabled and ready to use!\n')
    }
  }
}

main().catch(error => {
  console.error('\n❌ Verification error:', error)
  process.exit(1)
})
