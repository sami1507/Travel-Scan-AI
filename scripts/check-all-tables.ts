/**
 * Check all required tables in Supabase database
 */

const supabaseUrl = 'https://ymcwvxousmqhkjeanmja.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function checkTable(tableName: string): Promise<{ exists: boolean; count: number }> {
  try {
    // Try with * to handle tables with different primary keys
    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*&limit=1`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    })

    if (response.ok) {
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
  console.log('TRAVELSCAN AI - COMPLETE DATABASE SCHEMA VERIFICATION')
  console.log('='.repeat(80) + '\n')

  if (!supabaseServiceKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found')
    process.exit(1)
  }

  const learningTables = [
    'ai_recommendation_events',
    'ai_recommendation_items',
    'ai_feedback_signals',
    'user_preference_profiles'
  ]

  const coreTables = [
    'user_profiles',
    'saved_analyses',
    'saved_destinations',
    'saved_routes',
    'user_feedback',
    'user_alerts',
    'user_notifications',
    'alerts',
    'notification_events',
    'source_configs',
    'ingestion_runs',
    'raw_payloads',
    'normalized_records',
    'record_snapshots',
    'change_events',
    'scan_results',
    'audit_logs'
  ]

  console.log('--- Learning Layer Tables ---\n')
  
  const learningResults: Record<string, boolean> = {}
  for (const table of learningTables) {
    const { exists, count } = await checkTable(table)
    learningResults[table] = exists
    
    if (exists) {
      console.log(`✅ ${table} (${count} rows)`)
    } else {
      console.log(`❌ ${table} - MISSING`)
    }
  }

  console.log('\n--- Core Application Tables ---\n')
  
  const coreResults: Record<string, boolean> = {}
  for (const table of coreTables) {
    const { exists, count } = await checkTable(table)
    coreResults[table] = exists
    
    if (exists) {
      console.log(`✅ ${table} (${count} rows)`)
    } else {
      console.log(`❌ ${table} - MISSING`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80) + '\n')

  const learningMissing = learningTables.filter(t => !learningResults[t])
  const coreMissing = coreTables.filter(t => !coreResults[t])

  console.log(`Learning Tables: ${learningTables.length - learningMissing.length}/${learningTables.length} exist`)
  console.log(`Core Tables: ${coreTables.length - coreMissing.length}/${coreTables.length} exist`)

  if (learningMissing.length > 0) {
    console.log(`\n❌ Missing Learning Tables: ${learningMissing.join(', ')}`)
  }

  if (coreMissing.length > 0) {
    console.log(`\n❌ Missing Core Tables: ${coreMissing.join(', ')}`)
  }

  if (learningMissing.length === 0 && coreMissing.length === 0) {
    console.log('\n✅ All required tables exist!\n')
  } else {
    console.log('\n⚠️  Some tables are missing and need to be created.\n')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})
