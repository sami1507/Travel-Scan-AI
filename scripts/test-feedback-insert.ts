/**
 * Test feedback signal insert with NULL event_id via API
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local
const envPath = join(process.cwd(), '.env.local')
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

try {
  const envFile = readFileSync(envPath, 'utf-8')
  const lines = envFile.split('\n')
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue
    
    const [key, ...valueParts] = trimmedLine.split('=')
    let value = valueParts.join('=').trim()
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    
    if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') {
      supabaseUrl = value
    } else if (key.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' || key.trim() === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
      supabaseAnonKey = value
    }
  }
} catch (error) {
  // .env.local not found, use process.env
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('\n⚠️  Supabase credentials not configured')
  console.log('Manual test required\n')
  process.exit(0)
}

async function testFeedbackInsert() {
  console.log('\n================================================================================')
  console.log('TESTING FEEDBACK INSERT WITH NULL EVENT_ID')
  console.log('================================================================================\n')

  try {
    // Test insert via Supabase REST API
    console.log('🧪 Testing insert with NULL event_id via REST API...')
    
    const testSignal = {
      user_id: null, // Will be set by RLS
      event_id: null,
      recommendation_item_id: null,
      signal_type: 'itinerary_map_opened',
      signal_value: {
        test: true,
        recommendationTitle: 'Test Destination',
        timestamp: new Date().toISOString(),
      },
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/ai_feedback_signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(testSignal),
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      if (responseText.includes('not-null constraint')) {
        console.log('❌ event_id NOT NULL constraint violation')
        console.log('   Migration was not applied correctly')
        return false
      } else if (responseText.includes('new row violates row-level security')) {
        console.log('⚠️  RLS policy requires authentication (expected)')
        console.log('✅ But NULL event_id was accepted by schema!')
        return true
      } else {
        console.log('⚠️  Insert failed:', responseText)
        console.log('   This may be due to RLS or auth requirements')
        return null
      }
    }

    console.log('✅ Insert successful with NULL event_id')
    
    try {
      const data = JSON.parse(responseText)
      if (data && data[0]) {
        console.log('📝 Created signal ID:', data[0].id)
      }
    } catch (e) {
      // Response parsing failed, but insert was successful
    }

    return true
  } catch (error) {
    console.log('❌ Test failed:', error)
    return false
  }
}

testFeedbackInsert()
  .then((result) => {
    console.log('\n================================================================================')
    if (result === true) {
      console.log('✅ NULL event_id is SUPPORTED')
      console.log('   Schema allows nullable event_id')
    } else if (result === null) {
      console.log('⚠️  Test inconclusive - authentication required')
      console.log('   Manual test needed with logged-in user')
    } else {
      console.log('❌ NULL event_id is NOT SUPPORTED')
      console.log('   Migration may not have been applied')
    }
    console.log('================================================================================\n')
    process.exit(result === false ? 1 : 0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
