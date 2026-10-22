// Seed script for development data
// Populates the tables the current dashboard actually reads from
// (saved_analyses, saved_destinations, user_alerts, user_feedback, usage_tracking).
// Run with: npm run seed

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function sampleDestination(id: string, name: string, score: number) {
  return {
    destinationId: id,
    destinationName: name,
    destinationType: 'country' as const,
    totalMatchScore: score,
    categoryScores: {
      budgetFit: score - 5,
      weather: score + 2,
      passportStrength: 90,
      nightlife: score - 10,
      nature: score + 5,
      transport: score,
      hotels: score - 3,
      safety: 85,
    },
    whyRecommended: [
      `Strong budget fit for a moderate-spend trip to ${name}`,
      'Favorable weather during the selected travel window',
    ],
  }
}

async function seed() {
  console.log('🌱 Starting database seed...')

  try {
    const { data: users } = await supabase.auth.admin.listUsers()

    if (!users || users.users.length === 0) {
      console.log('No users found. Please create a user account first.')
      console.log('Visit http://localhost:3000/signup to create an account.')
      return
    }

    const userId = users.users[0].id
    console.log(`Using user: ${users.users[0].email}`)

    const destinations = [
      sampleDestination('ES', 'Spain', 88),
      sampleDestination('JP', 'Japan', 84),
      sampleDestination('TH', 'Thailand', 79),
    ]

    // Saved analysis (what /dashboard/saved reads)
    console.log('Creating sample saved analysis...')
    const { data: savedAnalysis, error: analysisError } = await supabase
      .from('saved_analyses')
      .insert({
        user_id: userId,
        name: 'Summer trip ideas',
        query: 'Warm beach destinations for a 10-day trip in July, moderate budget',
        analysis_result: { topRecommendations: destinations },
        user_constraints: { budget: 'moderate', tripLength: 10, travelMonths: [7], interests: ['beach', 'food'] },
        is_favorite: true,
        tags: ['summer', 'beach'],
      })
      .select()
      .single()

    if (analysisError) {
      console.error('Error creating saved analysis:', analysisError)
    } else {
      console.log('✅ Created saved analysis')
    }

    // Saved destinations (what /dashboard/compare reads)
    console.log('Creating sample saved destinations...')
    const { error: destError } = await supabase.from('saved_destinations').insert(
      destinations.map((dest) => ({
        user_id: userId,
        destination_id: dest.destinationId,
        destination_name: dest.destinationName,
        destination_type: dest.destinationType,
        destination_data: dest,
        source_analysis_id: savedAnalysis?.id ?? null,
        is_favorite: dest.destinationId === 'ES',
      }))
    )

    if (destError) {
      console.error('Error creating saved destinations:', destError)
    } else {
      console.log(`✅ Created ${destinations.length} saved destinations`)
    }

    // User feedback (what admin analytics / quality metrics read)
    console.log('Creating sample feedback...')
    const sessionId = `seed-session-${Date.now()}`
    const { error: feedbackError } = await supabase.from('user_feedback').insert(
      destinations.map((dest, i) => ({
        user_id: userId,
        session_id: sessionId,
        feedback_type: i === 0 ? 'save-trip' : 'thumbs-up',
        destination_id: dest.destinationId,
        destination_name: dest.destinationName,
        recommendation_rank: i + 1,
        total_score: dest.totalMatchScore,
        category_scores: dest.categoryScores,
        query_context: { budget: 'moderate', travel_months: [7], interests: ['beach', 'food'] },
      }))
    )

    if (feedbackError) {
      console.error('Error creating feedback:', feedbackError)
    } else {
      console.log(`✅ Created ${destinations.length} feedback events`)
    }

    // Alerts (what /dashboard/alerts and /dashboard/opportunities read)
    console.log('Creating sample alerts...')
    const { error: alertError } = await supabase.from('user_alerts').insert([
      {
        user_id: userId,
        alert_type: 'value_opportunity',
        title: 'Hotel prices dropped for Spain',
        message: 'Average hotel prices for your Spain trip are down 12% compared to last week.',
        trigger_reason: 'Price monitoring detected a drop across saved hotel options',
        destination_id: 'ES',
        destination_name: 'Spain',
        severity: 'medium',
        is_read: false,
        is_dismissed: false,
      },
      {
        user_id: userId,
        alert_type: 'timing_change',
        title: 'Better travel window for Thailand',
        message: 'Shifting your trip by two weeks would avoid peak-season crowds and pricing.',
        trigger_reason: 'Seasonality model detected a lower-cost, lower-crowd window',
        destination_id: 'TH',
        destination_name: 'Thailand',
        severity: 'low',
        is_read: false,
        is_dismissed: false,
      },
    ])

    if (alertError) {
      console.error('Error creating alerts:', alertError)
    } else {
      console.log('✅ Created sample alerts')
    }

    // Usage tracking (what the subscription/usage indicator reads)
    console.log('Creating usage tracking row...')
    const month = new Date().toISOString().slice(0, 7)
    const { error: usageError } = await supabase
      .from('usage_tracking')
      .upsert(
        { user_id: userId, month, analyses_count: 1 },
        { onConflict: 'user_id,month' }
      )

    if (usageError) {
      console.error('Error creating usage tracking row:', usageError)
    } else {
      console.log('✅ Created usage tracking row')
    }

    console.log('\n✨ Seed completed successfully!')
    console.log('Visit http://localhost:3000/dashboard/saved, /dashboard/alerts, and /dashboard/opportunities to see the data')
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
}

seed()
