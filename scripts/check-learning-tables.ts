/**
 * Check Learning Layer Tables via REST API
 */

import * as fs from 'fs'

const supabaseUrl = 'https://ymcwvxousmqhkjeanmja.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function checkTable(tableName: string): Promise<{ exists: boolean; count: number }> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=id&limit=1`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    })

    if (response.ok) {
      // Get count
      const countResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=count`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'count=exact'
        }
      })
      
      const countHeader = countResponse.headers.get('content-range')
      const count = countHeader ? parseInt(countHeader.split('/')[1]) : 0
      
      return { exists: true, count }
    } else {
      return { exists: false, count: 0 }
    }
  } catch (error) {
    return { exists: false, count: 0 }
  }
}

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('PHASE 1 LEARNING LAYER - DATABASE VERIFICATION')
  console.log('='.repeat(80) + '\n')

  if (!supabaseServiceKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found')
    process.exit(1)
  }

  // Check ENABLE_AI_LEARNING
  console.log('--- Environment Configuration ---\n')
  const envContent = fs.readFileSync('.env.local', 'utf-8')
  const learningEnabled = envContent.includes('ENABLE_AI_LEARNING=true')
  
  if (learningEnabled) {
    console.log('✅ ENABLE_AI_LEARNING=true is set')
  } else {
    console.log('❌ ENABLE_AI_LEARNING is NOT set to true')
    console.log('   Add this line to .env.local: ENABLE_AI_LEARNING=true')
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
    const { exists, count } = await checkTable(table)
    
    if (exists) {
      console.log(`✅ Table '${table}' exists (${count} rows)`)
    } else {
      console.log(`❌ Table '${table}' does NOT exist`)
      allTablesExist = false
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80) + '\n')

  if (!allTablesExist) {
    console.log('❌ MIGRATION NOT APPLIED')
    console.log('\nTo apply the migration:')
    console.log('1. Go to: https://supabase.com/dashboard/project/ymcwvxousmqhkjeanmja/sql/new')
    console.log('2. Copy contents of: supabase/migrations/20260512_ai_learning_layer.sql')
    console.log('3. Paste and click "Run"\n')
    process.exit(1)
  }

  if (!learningEnabled) {
    console.log('⚠️  LEARNING DISABLED')
    console.log('\nTables exist but learning is disabled.')
    console.log('Add to .env.local: ENABLE_AI_LEARNING=true\n')
  } else {
    console.log('✅ LEARNING LAYER READY')
    console.log('\n- All tables exist')
    console.log('- Learning is enabled')
    console.log('- Ready to record events\n')
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})
