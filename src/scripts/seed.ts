// Seed script for development data
// Run with: npm run seed

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seed() {
  console.log('🌱 Starting database seed...')

  try {
    // Get the first user (or create a test user)
    const { data: users } = await supabase.auth.admin.listUsers()
    
    if (!users || users.users.length === 0) {
      console.log('No users found. Please create a user account first.')
      console.log('Visit http://localhost:3000/signup to create an account.')
      return
    }

    const userId = users.users[0].id
    console.log(`Using user: ${users.users[0].email}`)

    // Create sample source configs
    const sourceConfigs = [
      {
        user_id: userId,
        name: 'NYC to London Flights',
        source_type: 'flights',
        status: 'active',
        polling_interval_minutes: 60,
        parser_settings: {
          origin: 'JFK',
          destination: 'LHR',
          departure_date: '2024-06-15',
          passengers: 1,
        },
      },
      {
        user_id: userId,
        name: 'London Hotels',
        source_type: 'hotels',
        status: 'active',
        polling_interval_minutes: 120,
        parser_settings: {
          city: 'London',
          check_in: '2024-06-15',
          check_out: '2024-06-20',
          guests: 2,
        },
      },
      {
        user_id: userId,
        name: 'London Weather',
        source_type: 'weather',
        status: 'active',
        polling_interval_minutes: 30,
        parser_settings: {
          city: 'London',
          country: 'GB',
        },
      },
      {
        user_id: userId,
        name: 'USD to GBP Exchange',
        source_type: 'exchange_rates',
        status: 'active',
        polling_interval_minutes: 60,
        parser_settings: {
          from: 'USD',
          to: 'GBP',
        },
      },
      {
        user_id: userId,
        name: 'London Events',
        source_type: 'events',
        status: 'active',
        polling_interval_minutes: 240,
        parser_settings: {
          city: 'London',
          start_date: '2024-06-15',
          end_date: '2024-06-20',
        },
      },
    ]

    console.log('Creating source configs...')
    const { data: createdSources, error: sourceError } = await supabase
      .from('source_configs')
      .insert(sourceConfigs)
      .select()

    if (sourceError) {
      console.error('Error creating source configs:', sourceError)
      return
    }

    console.log(`✅ Created ${createdSources.length} source configs`)

    // Create a sample ingestion run
    if (createdSources.length > 0) {
      const sampleSource = createdSources[0]
      
      console.log('Creating sample ingestion run...')
      const { data: ingestionRun, error: runError } = await supabase
        .from('ingestion_runs')
        .insert({
          source_config_id: sampleSource.id,
          status: 'success',
          started_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          completed_at: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
          records_fetched: 25,
          records_new: 3,
          records_changed: 2,
          records_removed: 0,
          metadata: {
            duration_ms: 60000,
            api_calls: 1,
          },
        })
        .select()
        .single()

      if (runError) {
        console.error('Error creating ingestion run:', runError)
      } else {
        console.log('✅ Created sample ingestion run')

        // Create a sample scan result
        console.log('Creating sample scan result...')
        const { data: scanResult, error: scanError } = await supabase
          .from('scan_results')
          .insert({
            ingestion_run_id: ingestionRun.id,
            source_config_id: sampleSource.id,
            total_changes: 5,
            new_records: 3,
            modified_records: 2,
            removed_records: 0,
            ai_summary: 'Found 3 new flight options with competitive pricing. 2 existing flights have price changes.',
            insights: [
              'New direct flight option available at $450',
              'Morning flight price dropped by $75',
              'Weekend flights showing higher demand',
            ],
            metadata: {
              average_price: 525,
              lowest_price: 450,
              highest_price: 680,
            },
          })
          .select()
          .single()

        if (scanError) {
          console.error('Error creating scan result:', scanError)
        } else {
          console.log('✅ Created sample scan result')

          // Create sample alerts
          console.log('Creating sample alerts...')
          const alerts = [
            {
              scan_result_id: scanResult.id,
              source_config_id: sampleSource.id,
              user_id: userId,
              severity: 'high',
              title: 'Significant Price Drop Detected',
              description: 'The morning flight to London has dropped by $75 (14%). This is a good opportunity to book.',
              change_event_ids: [],
              is_read: false,
              is_dismissed: false,
            },
            {
              scan_result_id: scanResult.id,
              source_config_id: sampleSource.id,
              user_id: userId,
              severity: 'medium',
              title: 'New Flight Option Available',
              description: 'A new direct flight option is now available at $450, which is below your target price.',
              change_event_ids: [],
              is_read: false,
              is_dismissed: false,
            },
          ]

          const { error: alertError } = await supabase
            .from('alerts')
            .insert(alerts)

          if (alertError) {
            console.error('Error creating alerts:', alertError)
          } else {
            console.log('✅ Created sample alerts')
          }
        }
      }

      // Update source config with last run info
      await supabase
        .from('source_configs')
        .update({
          last_run_at: new Date(Date.now() - 240000).toISOString(),
          last_success_at: new Date(Date.now() - 240000).toISOString(),
        })
        .eq('id', sampleSource.id)
    }

    console.log('\n✨ Seed completed successfully!')
    console.log('You can now visit http://localhost:3000/dashboard to see the data')
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
}

seed()
