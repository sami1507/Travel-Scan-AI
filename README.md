# Travel Scan AI

**AI-Powered Travel Analysis & Route Intelligence Platform**

A production-ready web application that provides intelligent travel destination analysis, personalized recommendations, multi-city route planning, and comprehensive travel intelligence using AI, deterministic scoring, and real-time data.

## 🚀 Features

### Core Capabilities
- **AI-Powered Travel Analysis**: GPT-4 powered destination analysis with structured JSON output
- **Deterministic Scoring Engine**: 8-factor scoring system (budget, weather, passport, nightlife, nature, transport, hotels, safety)
- **Route Intelligence**: Intelligent multi-city route planning with 7-factor route scoring
- **Personalization Layer**: User preference learning from feedback with confidence-based adjustments
- **Events & Seasonality**: Peak/off-peak analysis, major events detection, timing intelligence
- **Provider Integration**: Flights, hotels, weather, currency, visa, and events data
- **Admin Analytics**: Comprehensive insights into user behavior and recommendation performance
- **Feedback System**: Thumbs up/down, saves, dismissals for continuous improvement
- **Beautiful Dashboard**: Modern, responsive UI with structured analysis display
- **Secure Authentication**: Supabase Auth with email/password

### Technical Highlights
- **Structured Output**: Zod-validated JSON schemas for all analysis responses
- **Deterministic Logic**: Transparent, inspectable scoring and route selection
- **Modular Architecture**: Clean separation of concerns (RAG, scoring, providers, services)
- **Type-Safe**: Full TypeScript with Zod validation throughout
- **Production-Ready**: Error handling, logging, auth, and deployment-safe code

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Dashboard UI                          │
│  (Next.js App Router + React + Tailwind + shadcn/ui)       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator Layer                        │
│         (Coordinates ingestion + scanning)                   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│ Ingestion Engine │                  │   Scan Engine    │
│  - Fetch data    │                  │  - AI summaries  │
│  - Normalize     │                  │  - Generate      │
│  - Detect changes│                  │    alerts        │
└──────────────────┘                  └──────────────────┘
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│    Providers     │                  │   AI Provider    │
│  - Flights       │                  │  - OpenAI GPT-4  │
│  - Hotels        │                  │  - Fallback      │
│  - Weather       │                  │    summaries     │
│  - Exchange      │                  └──────────────────┘
│  - Events        │
└──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
│  (PostgreSQL with RLS, migrations, indexes)                 │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: OpenAI GPT-4
- **Validation**: Zod
- **Deployment**: Vercel (ready)

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- OpenAI API key (optional for MVP - uses fallback)

### Installation

1. **Clone and install dependencies**:
```bash
cd travel-scan-ai
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI (Required for AI-powered analysis)
OPENAI_API_KEY=your_openai_api_key

# App URL (Update for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Set up Supabase**:

Create a new Supabase project, then run all migrations in order:

```bash
# Run each migration file in supabase/migrations/ in your Supabase SQL Editor
# Start with the earliest timestamp and work forward
```

4. **Run development server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

5. **Seed sample data** (optional):
```bash
# First create a user account via the UI at /signup
# Then run:
npm run seed
```

## 📖 Usage Guide

### 1. Create an Account
- Visit `/signup` and create an account
- Confirm your email (if email confirmation is enabled in Supabase)
- Login at `/login`

### 2. Request Travel Analysis
- Navigate to Dashboard → Analysis
- Enter your travel query (e.g., "Best beach destinations in Europe for July")
- Specify budget, travel months, interests, travel style
- Submit for AI-powered analysis

### 3. View Recommendations
- Review top destination recommendations with scores
- See route intelligence (single-destination vs multi-city)
- Check personalization indicators (if you have feedback history)
- Explore detailed score breakdowns and reasoning

### 4. Provide Feedback
- Thumbs up/down on recommendations
- Save trips you're interested in
- Dismiss recommendations you don't like
- System learns your preferences over time

### 5. Admin Analytics (Admin Users)
- Navigate to Dashboard → Admin
- View user behavior insights
- Analyze recommendation performance
- Monitor feedback patterns and personalization effectiveness

## 🔄 Data Flow

1. **Ingestion**: Provider fetches data → Validates → Normalizes → Stores raw payload
2. **Change Detection**: Compares with previous records → Generates diffs → Creates change events
3. **Scanning**: Analyzes changes → AI summarization → Generates alerts
4. **Notification**: Stores alerts → (Future: sends emails/SMS)

## 🗂️ Project Structure

```
travel-scan-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login, signup)
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── api/               # API routes
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── dashboard/         # Dashboard-specific components
│   ├── lib/
│   │   ├── providers/         # Data source providers
│   │   ├── services/          # Business logic
│   │   │   ├── ingestion/    # Ingestion engine
│   │   │   ├── ai/           # AI providers
│   │   │   └── scan/         # Scan engine
│   │   ├── db/               # Database access layer
│   │   ├── types/            # TypeScript types
│   │   ├── schemas/          # Zod schemas
│   │   └── utils/            # Utilities
│   ├── supabase/
│   │   └── migrations/       # Database migrations
│   └── scripts/              # Utility scripts
├── public/                   # Static assets
└── package.json
```

## 🔌 API Endpoints

### `POST /api/trigger-scan`
Manually trigger a scan for a specific source.

**Request**:
```json
{
  "sourceConfigId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Scan started successfully",
  "sourceConfigId": "uuid"
}
```

### `POST /api/trigger-all`
Trigger scans for all active sources.

**Response**:
```json
{
  "success": true,
  "message": "Scans started successfully",
  "count": 5
}
```

## ⏰ Scheduling (Production)

### Option 1: Vercel Cron (Recommended)

Already configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/trigger-all",
    "schedule": "*/5 * * * *"
  }]
}
```

### Option 2: GitHub Actions

Create `.github/workflows/scheduled-scan.yml`:
```yaml
name: Scheduled Scan
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger scan
        run: |
          curl -X POST https://your-app.vercel.app/api/trigger-all \
            -H "Content-Type: application/json"
```

### Option 3: External Cron Service

Use services like cron-job.org to hit `/api/trigger-all` every 5 minutes.

## 🧪 Development

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

### Build
```bash
npm run build
```

## 🔐 Security

- **Row Level Security (RLS)**: Enabled on all Supabase tables
- **Server-Side Secrets**: All API keys stay server-side
- **Authentication Required**: All dashboard routes protected
- **Input Validation**: Zod schemas on all inputs
- **SQL Injection Protection**: Parameterized queries via Supabase client

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Add Environment Variables**
   Set these in Vercel dashboard → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` (from Supabase project settings)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (from Supabase project settings)
   - `SUPABASE_SERVICE_ROLE_KEY` (from Supabase project settings → API)
   - `OPENAI_API_KEY` (from OpenAI dashboard)
   - `NEXT_PUBLIC_APP_URL` (your Vercel deployment URL, e.g., https://your-app.vercel.app)

4. **Configure Supabase Auth Redirect URLs**
   In Supabase dashboard → Authentication → URL Configuration:
   - Add your Vercel URL to "Site URL"
   - Add `https://your-app.vercel.app/auth/callback` to "Redirect URLs"

5. **Deploy**
   - Vercel will automatically deploy on push to main branch
   - First deployment may take 2-3 minutes

### Post-Deployment Checklist

- ✅ Test signup/login flow
- ✅ Verify email confirmation works (if enabled)
- ✅ Test travel analysis request
- ✅ Check personalization rendering
- ✅ Verify admin analytics access
- ✅ Test feedback interactions
- ✅ Confirm route intelligence displays correctly

## 🔮 Future Enhancements

- [ ] Email notifications via Resend/SendGrid
- [ ] SMS notifications via Twilio
- [ ] Real API integrations (Skyscanner, Booking.com, etc.)
- [ ] Advanced filtering and search
- [ ] Data visualization charts
- [ ] Export to CSV/PDF
- [ ] Webhook support
- [ ] Multi-user teams
- [ ] Custom alert rules
- [ ] Mobile app (React Native)

## 🏢 Domain-Agnostic Design

This platform can be easily adapted for other monitoring use cases:

- **Job Monitoring**: Track job postings, salary changes, new positions
- **Real Estate**: Monitor property listings, price changes, new availability
- **Finance**: Track stock prices, crypto, market indicators
- **E-commerce**: Monitor product prices, availability, reviews
- **News**: Aggregate news, detect trending topics
- **Social Media**: Track mentions, sentiment, engagement

Simply create new providers implementing the `TravelProvider` interface!

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database by [Supabase](https://supabase.com/)
- AI by [OpenAI](https://openai.com/)

---

**Built with ❤️ using Next.js, Supabase, and OpenAI**
