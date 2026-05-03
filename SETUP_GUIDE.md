# Travel Scan AI - Complete Setup Guide

This guide will walk you through setting up Travel Scan AI from scratch.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Supabase account (free tier is fine)
- An OpenAI API key (optional for MVP)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd travel-scan-ai
npm install
```

This will install all required packages including Next.js, Supabase, OpenAI, and UI components.

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - Project name: `travel-scan-ai`
   - Database password: (choose a strong password)
   - Region: (choose closest to you)
4. Wait for project to be created (~2 minutes)

### 3. Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### 4. Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/20240101000000_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run**
6. You should see "Success. No rows returned"

This creates all tables, indexes, RLS policies, and triggers.

### 5. Configure Environment Variables

1. Copy the example env file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your credentials:

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI (OPTIONAL - app works without it using fallback summaries)
OPENAI_API_KEY=sk-your-openai-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the landing page!

### 7. Create Your First User

1. Click **Get Started** or **Sign Up**
2. Enter email and password
3. Click **Create Account**
4. You'll be redirected to the dashboard

### 8. Seed Sample Data (Optional)

To populate the database with sample sources and data:

```bash
npm run seed
```

This will create:
- 5 sample source configurations (flights, hotels, weather, exchange rates, events)
- 1 sample ingestion run
- 1 sample scan result with AI summary
- 2 sample alerts

### 9. Test the System

#### Manual Scan Test

1. Go to **Dashboard** → **Sources**
2. You should see 5 sample sources (if you ran the seed)
3. Click **Run Scan** on any source
4. Wait a few seconds
5. Go to **Scans** tab to see the results
6. Go to **Alerts** tab to see generated alerts

#### API Test

You can also trigger scans via API:

```bash
# Get a source config ID from the dashboard, then:
curl -X POST http://localhost:3000/api/trigger-scan \
  -H "Content-Type: application/json" \
  -d '{"sourceConfigId": "your-source-id-here"}'
```

## Verification Checklist

- [ ] Landing page loads at http://localhost:3000
- [ ] Can sign up and create account
- [ ] Can log in
- [ ] Dashboard shows stats (0s if no seed data)
- [ ] Can view Sources page
- [ ] Can view Alerts page
- [ ] Can view Scans page
- [ ] Can manually trigger a scan
- [ ] Scan completes successfully
- [ ] Alerts are generated
- [ ] Can log out

## Common Issues

### "Invalid API key" error

- Make sure you copied the correct keys from Supabase
- Check that there are no extra spaces in `.env.local`
- Restart the dev server after changing env variables

### Database migration fails

- Make sure you're using the SQL Editor in Supabase dashboard
- Check that your project is fully initialized (wait 2-3 minutes after creation)
- Try running the migration in smaller chunks if needed

### "User not found" after signup

- Check Supabase dashboard → Authentication → Users
- Make sure email confirmation is disabled (Settings → Auth → Email Auth → Confirm email = OFF)

### Scans not running

- Check browser console for errors
- Check terminal for server errors
- Verify source config status is "active"
- Check that SUPABASE_SERVICE_ROLE_KEY is set correctly

## Next Steps

### Get OpenAI API Key (Optional)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to **API Keys**
4. Click **Create new secret key**
5. Copy the key and add to `.env.local`
6. Restart dev server

With OpenAI configured, you'll get much better AI summaries and alerts!

### Configure Real APIs (Future)

The app currently uses mock providers. To integrate real APIs:

1. Get API keys from:
   - Skyscanner (flights)
   - Booking.com (hotels)
   - OpenWeather (weather)
   - ExchangeRate-API (exchange rates)
   - Ticketmaster (events)

2. Create new provider classes in `src/lib/providers/`
3. Implement the `TravelProvider` interface
4. Update the provider registry

### Deploy to Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

## Support

If you encounter issues:

1. Check the [README.md](./README.md) for general information
2. Review the code comments for implementation details
3. Check Supabase logs in the dashboard
4. Check browser console and terminal for errors

## Architecture Overview

```
User → Dashboard → API Routes → Orchestrator
                                     ↓
                    ┌────────────────┴────────────────┐
                    ↓                                 ↓
            Ingestion Engine                   Scan Engine
                    ↓                                 ↓
            Providers (Mock)                   AI Provider
                    ↓                                 ↓
                    └────────────────┬────────────────┘
                                     ↓
                              Supabase Database
```

## File Structure

Key files to know:

- `src/app/(dashboard)/dashboard/page.tsx` - Main dashboard
- `src/lib/services/orchestrator.ts` - Coordinates everything
- `src/lib/services/ingestion/ingestion-engine.ts` - Data fetching & change detection
- `src/lib/services/scan/scan-engine.ts` - AI analysis & alerts
- `src/lib/providers/` - Data source implementations
- `supabase/migrations/` - Database schema

## Development Tips

### Hot Reload

The dev server supports hot reload. Changes to code will automatically refresh the browser.

### Database Changes

If you need to modify the database schema:

1. Create a new migration file in `supabase/migrations/`
2. Run it in Supabase SQL Editor
3. Update TypeScript types in `src/lib/types/`
4. Update Zod schemas in `src/lib/schemas/`

### Adding New Source Types

1. Add type to `SourceType` in `src/lib/types/index.ts`
2. Create provider in `src/lib/providers/your-provider.ts`
3. Register in `src/lib/providers/index.ts`
4. Update UI in dashboard

### Testing

For manual testing:
- Use the seed script to populate data
- Use the dashboard UI to trigger scans
- Check Supabase dashboard to verify data

For automated testing (future):
- Add Jest for unit tests
- Add Playwright for E2E tests

---

**You're all set! 🎉**

Start monitoring your travel data and let AI help you find the best deals!
