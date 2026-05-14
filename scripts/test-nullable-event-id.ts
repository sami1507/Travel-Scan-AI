/**
 * Test nullable event_id support in ai_feedback_signals
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local
const envPath = join(process.cwd(), '.env.local')
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    } else if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') {
      supabaseServiceKey = value
    }
  }
} catch (error) {
  // .env.local not found, use process.env
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('\n⚠️  SUPABASE_SERVICE_ROLE_KEY not configured')
  console.log('Manual test required in production environment\n')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 0,
    },
  },
  global: {
    headers: {
      'x-client-info': 'test-script',
    },
  },
})

async function testNullableEventId() {
  console.log('\n================================================================================')
  console.log('TESTING NULLABLE EVENT_ID SUPPORT')
  console.log('================================================================================\n')

  try {
    // Test 1: Check table schema
    console.log('📋 Checking ai_feedback_signals schema...')
    const { data: columns, error: schemaError } = await supabase
      .from('ai_feedback_signals')
      .select('*')
      .limit(0)

    if (schemaError) {
      console.log('❌ Schema check failed:', schemaError.message)
      return false
    }

    console.log('✅ Table exists\n')

    // Test 2: Try to insert a signal with NULL event_id
    console.log('🧪 Testing insert with NULL event_id...')
    
    const testSignal = {
      user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      event_id: null,
      recommendation_item_id: null,
      signal_type: 'itinerary_map_opened',
      signal_value: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    }

    const { data, error } = await supabase
      .from('ai_feedback_signals')
      .insert(testSignal)
      .select()

    if (error) {
      if (error.message.includes('violates not-null constraint')) {
        console.log('❌ event_id is NOT NULL - migration needed')
        console.log('   Error:', error.message)
        return false
      } else if (error.message.includes('foreign key')) {
        console.log('⚠️  Foreign key constraint (expected for test UUID)')
        console.log('   This is OK - it means NULL is accepted')
        return true
      } else {
        console.log('❌ Insert failed:', error.message)
        return false
      }
    }

    console.log('✅ Insert successful with NULL event_id')
    
    // Clean up test data
    if (data && data[0]) {
      await supabase
        .from('ai_feedback_signals')
        .delete()
        .eq('id', data[0].id)
      console.log('🧹 Test data cleaned up')
    }

    return true
  } catch (error) {
    console.log('❌ Test failed:', error)
    return false
  }
}

testNullableEventId()
  .then((success) => {
    console.log('\n================================================================================')
    if (success) {
      console.log('✅ NULL event_id is supported')
    } else {
      console.log('❌ NULL event_id is NOT supported - apply migration')
    }
    console.log('================================================================================\n')
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
