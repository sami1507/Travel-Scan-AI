/**
 * End-to-end verification of database integration
 * Checks if the app can interact with all required tables
 */

const supabaseUrl = 'https://ymcwvxousmqhkjeanmja.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function checkTableAccess(tableName: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*&limit=1`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    })
    return response.ok
  } catch {
    return false
  }
}

async function checkRowCount(tableName: string): Promise<number> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=count`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'count=exact'
      }
    })
    
    if (response.ok) {
      const countHeader = response.headers.get('content-range')
      return countHeader ? parseInt(countHeader.split('/')[1]) : 0
    }
    return 0
  } catch {
    return 0
  }
}

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('END-TO-END DATABASE VERIFICATION')
  console.log('='.repeat(80) + '\n')

  if (!supabaseServiceKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found')
    process.exit(1)
  }

  console.log('--- Database Connectivity ---\n')

  // Check learning tables
  const learningTables = [
    'ai_recommendation_events',
    'ai_recommendation_items',
    'ai_feedback_signals',
    'user_preference_profiles'
  ]

  let allAccessible = true
  for (const table of learningTables) {
    const accessible = await checkTableAccess(table)
    const count = await checkRowCount(table)
    
    if (accessible) {
      console.log(`✅ ${table} - Accessible (${count} rows)`)
    } else {
      console.log(`❌ ${table} - NOT accessible`)
      allAccessible = false
    }
  }

  console.log('\n--- Core Application Tables ---\n')

  const coreTables = [
    'user_profiles',
    'saved_analyses',
    'saved_destinations',
    'saved_routes',
    'user_feedback'
  ]

  for (const table of coreTables) {
    const accessible = await checkTableAccess(table)
    const count = await checkRowCount(table)
    
    if (accessible) {
      console.log(`✅ ${table} - Accessible (${count} rows)`)
    } else {
      console.log(`❌ ${table} - NOT accessible`)
      allAccessible = false
    }
  }

  console.log('\n--- Manual Testing Instructions ---\n')
  
  console.log('To complete end-to-end verification:')
  console.log('')
  console.log('1. Open browser: http://localhost:3000')
  console.log('2. Log in with a user account')
  console.log('3. Navigate to: /dashboard/analysis')
  console.log('4. Submit a travel analysis query')
  console.log('5. After results appear, check:')
  console.log('   - ai_recommendation_events should have 1 new row')
  console.log('   - ai_recommendation_items should have 3+ new rows')
  console.log('6. Perform a feedback action (save, thumbs up, etc.)')
  console.log('7. Check ai_feedback_signals for new row')
  console.log('8. Test saved trips, profile, admin access')
  console.log('')

  console.log('\n--- Quick Database Check Commands ---\n')
  console.log('Check recommendation events:')
  console.log('  echo "SELECT COUNT(*) FROM ai_recommendation_events;" | npx supabase db query --linked')
  console.log('')
  console.log('Check recommendation items:')
  console.log('  echo "SELECT COUNT(*) FROM ai_recommendation_items;" | npx supabase db query --linked')
  console.log('')
  console.log('Check feedback signals:')
  console.log('  echo "SELECT COUNT(*) FROM ai_feedback_signals;" | npx supabase db query --linked')
  console.log('')

  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80) + '\n')

  if (allAccessible) {
    console.log('✅ All database tables are accessible')
    console.log('✅ Ready for manual end-to-end testing')
    console.log('')
    console.log('Dev server should be running at: http://localhost:3000')
    console.log('')
  } else {
    console.log('❌ Some tables are not accessible')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})
