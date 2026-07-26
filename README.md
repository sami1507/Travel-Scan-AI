# TravelScan AI

**AI-Powered Travel Intelligence & Destination Analysis Platform**

A full-stack, production-ready web application that delivers intelligent travel destination analysis, personalized recommendations, multi-city route planning, real-time pricing estimates, Google Places venue enrichment, and comprehensive travel intelligence — powered by GPT-4o, Claude, Tavily web search, and a deterministic multi-factor scoring engine.

---

## ✨ Features

### Analysis Engine
- **Dual-Mode Input**: Chat interface (conversational) + Guided Form (structured 4-step wizard)
- **Deterministic Scoring**: 8-factor scoring per destination — budget fit, weather, passport strength, nightlife, nature, transport, hotels, safety
- **Multi-City Route Intelligence**: 7-factor route scoring, gap analysis, transport mode selection, fatigue modeling
- **AI-Estimated Pricing**: Tavily web search + GPT-4o mini extracts real-time flight and hotel price ranges when live API data is unavailable
- **Google Places Enrichment**: Verified real-world restaurants, attractions, and accommodations per destination
- **Claude Verification** (optional): Anthropic Claude as an async sanity-check layer on top of GPT-4o recommendations
- **Global Candidate Pool**: 200+ destination candidates scored before ranking
- **Events & Seasonality**: Peak/off-peak detection, major events awareness, timing intelligence

### Personalization & Learning
- **Feedback System**: Thumbs up/down, save, dismiss on every recommendation
- **AI Learning Layer**: Infers user preferences from feedback history with confidence scoring
- **Personalized Scoring**: Adjusts base scores using learned user preferences
- **Feedback Intelligence Signals**: Tracks patterns across users to improve global recommendations
- **ML Pipeline**: Feature engineering, dataset building, model evaluation, and retraining hooks

### Data Providers
- **Flights**: Duffel API (real-time, optional) → AI-estimated fallback
- **Hotels**: Hotelbeds API (real-time, optional) → AI-estimated fallback
- **Weather**: Real weather provider with seasonal intelligence
- **Currency**: Live exchange rates
- **Visa**: Real visa requirement lookup by passport + destination
- **Events**: Enhanced events provider for local happenings

### User Features
- **Saved Trips**: Bookmark and revisit full analysis results
- **Destination Comparison**: Side-by-side analysis of multiple destinations
- **PDF Export**: Download full trip analysis as a PDF report
- **Alerts & Notifications**: Price drop alerts, deal notifications
- **Opportunities Feed**: Curated travel opportunity suggestions
- **Travel Intelligence**: Aggregated insights from across the platform

### Subscription & Monetization
- **Free Tier**: 3 analyses included
- **Pro Subscription**: Unlimited analyses via Stripe Checkout
- **Customer Portal**: Self-service billing management via Stripe Portal
- **Stripe Webhooks**: Automated subscription status sync

### Internationalization
- **10 Languages**: English 🇬🇧, Arabic 🇸🇦, Hebrew 🇮🇱, Spanish 🇪🇸, Portuguese 🇧🇷, French 🇫🇷, German 🇩🇪, Italian 🇮🇹, Turkish 🇹🇷, Japanese 🇯🇵
- **Automatic RTL**: Arabic and Hebrew switch to right-to-left layout automatically
- **Language Switcher**: Globe-icon dropdown on all nav bars, persisted via cookie

### Admin & Analytics
- **Admin Dashboard**: User behavior, recommendation performance, feedback patterns
- **Feedback Intelligence**: Signal analysis and quality scoring
- **ML Monitoring**: Model drift detection, performance metrics
- **Operations Console**: System health, scan history, data sources
- **Quality Analytics**: Recommendation quality breakdown

### Security
- **Row Level Security (RLS)**: All Supabase tables fully protected
- **Content Security Policy**: Strict CSP headers via middleware
- **Rate Limiting**: Per-user and per-IP via Upstash Redis
- **Input Validation**: Zod schemas on all API inputs
- **Server-Side Secrets**: All API keys remain server-side only
- **Protected Routes**: All dashboard pages require authentication

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Next.js 15 App Router                    │
│         Landing · Auth · Dashboard · Admin · API Routes       │
└──────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
   ┌─────────────────┐ ┌───────────┐ ┌──────────────┐
   │  Analysis Engine │ │  Scoring  │ │    Route     │
   │  (engine.ts)    │ │  Engine   │ │ Intelligence │
   │  GPT-4o + Zod   │ │ 8-factor  │ │  7-factor   │
   └─────────────────┘ └───────────┘ └──────────────┘
              │
   ┌──────────┴──────────────────────────────┐
   │               Data Layer                 │
   │  Duffel · Hotelbeds · Weather · Visa    │
   │  Currency · Events · Google Places      │
   │  Tavily AI Price Estimation             │
   └─────────────────────────────────────────┘
              │
   ┌──────────┴──────────┐
   │   Supabase (PG)     │   ←  Upstash Redis (rate limiting)
   │   13 migrations     │
   │   Full RLS          │
   └─────────────────────┘
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| Animation | Framer Motion |
| Charts | Recharts |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Primary AI | OpenAI GPT-4o |
| Verifier AI | Anthropic Claude (optional) |
| Web Search | Tavily (price estimation + travel context) |
| Flights | Duffel API (optional) |
| Hotels | Hotelbeds API (optional) |
| Maps | Google Places API (optional) |
| Payments | Stripe (subscriptions + webhooks) |
| Caching/Rate Limiting | Upstash Redis |
| PDF Export | @react-pdf/renderer |
| i18n | next-intl (10 languages) |
| Validation | Zod |
| Analytics | Vercel Analytics |
| Deployment | Vercel |

---

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- OpenAI API key

### 1. Clone and Install

```bash
git clone https://github.com/sami1507/Travel-Scan-AI.git
cd travel-scan-ai
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Supabase (Required) ──────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ── OpenAI (Required) ────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ── App URL ──────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Anthropic Claude (Optional — async verification layer) ───
ANTHROPIC_API_KEY=sk-ant-...
ENABLE_CLAUDE_VERIFIER=true
CLAUDE_MODEL=claude-sonnet-4-5          # default if omitted

# ── Tavily (Optional — AI price estimation + travel context) ─
TAVILY_API_KEY=tvly-...

# ── Google Places (Optional — venue enrichment) ───────────────
GOOGLE_PLACES_API_KEY=AIza...

# ── Duffel (Optional — real flight data) ─────────────────────
DUFFEL_API_TOKEN=duffel_live_...
DUFFEL_ENVIRONMENT=live                 # or "test"

# ── Hotelbeds (Optional — real hotel data) ───────────────────
HOTELBEDS_API_KEY=your_hotelbeds_key
HOTELBEDS_API_SECRET=your_hotelbeds_secret
HOTELBEDS_ENVIRONMENT=live              # or "test"

# ── Stripe (Optional — subscriptions) ────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Upstash Redis (Optional — rate limiting + caching) ────────
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=AX...

# ── Feature Flags (Optional) ─────────────────────────────────
ENABLE_AI_LEARNING=true
```

> **Minimum required to run:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`

### 3. Set Up the Database

In your Supabase project, open the **SQL Editor** and run the migration files from `supabase/migrations/` **in order**:

| # | File | Description |
|---|---|---|
| 1 | `20240101000000_initial_schema.sql` | Core tables, source configs, scan results |
| 2 | `20260429_create_user_feedback_table.sql` | User feedback (thumbs up/down) |
| 3 | `20260429_create_user_preferences_table.sql` | Stored user preferences |
| 4 | `20260430_phase1_saved_analyses.sql` | Saved trip analyses |
| 5 | `20260430_phase2_user_profiles.sql` | User profiles |
| 6 | `20260430_phase4_alerts_notifications.sql` | Alerts & notifications |
| 7 | `20260430_phase5_quality_analytics.sql` | Quality scoring analytics |
| 8 | `20260430_rich_feedback_intelligence.sql` | Rich feedback signals |
| 9 | `20260504_security_hardening_rls.sql` | Full RLS hardening |
| 10 | `20260511_additional_rls_policies.sql` | Additional RLS policies |
| 11 | `20260512_ai_learning_layer.sql` | AI learning layer tables |
| 12 | `20260514_fix_nullable_event_id.sql` | Nullable event_id fix |
| 13 | `20260609_subscription_system.sql` | Stripe subscription tables |

### 4. Configure Supabase Auth

In your Supabase dashboard → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` (or your production URL)
- **Redirect URLs**: Add `http://localhost:3000/auth/callback`

For Google OAuth, enable the Google provider under **Authentication → Providers**.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📖 Usage Guide

### Create an Account
Visit `/signup`, create an account, and confirm your email if required. Sign in at `/login` (email/password or Google OAuth).

### Run a Travel Analysis
1. Navigate to **Dashboard → Analysis**
2. Choose **Chat Mode** (conversational) or **Form Mode** (4-step guided wizard)
3. Provide departure city, passport country, travel dates/season, interests, and budget
4. Submit — the engine scores 200+ destinations, ranks the top matches, and enriches them with real data

### Explore Results
- **Score breakdowns** for each destination (8 factors)
- **Route intelligence** for multi-city itineraries
- **Pricing data** (live from Duffel/Hotelbeds, or AI-estimated from Tavily)
- **Verified venues** from Google Places
- **Pre-booking checklist** per destination

### Save & Compare
- Save trips to **Dashboard → Saved Trips**
- Compare destinations side-by-side at **Dashboard → Compare**
- Export a full PDF report

### Feedback & Personalization
Thumbs up/down, save, or dismiss any recommendation. The system learns your preferences and adjusts future scores automatically.

### Subscription
Free users get **3 analyses**. Upgrade to Pro at **Dashboard → Pricing** via Stripe Checkout for unlimited access.

---

## 🗂️ Project Structure

```
travel-scan-ai/
├── src/
│   ├── app/
│   │   ├── (auth)/                   # Login, signup, password reset
│   │   ├── (dashboard)/dashboard/    # All protected dashboard pages
│   │   │   ├── analysis/             # Main analysis page
│   │   │   ├── saved/                # Saved trips
│   │   │   ├── compare/              # Destination comparison
│   │   │   ├── intelligence/         # Travel intelligence feed
│   │   │   ├── alerts/               # Price alerts
│   │   │   ├── opportunities/        # Opportunity feed
│   │   │   ├── notifications/        # Notifications
│   │   │   ├── profile/              # User profile
│   │   │   ├── pricing/              # Subscription plans
│   │   │   └── admin/                # Admin analytics (5 sub-pages)
│   │   ├── api/
│   │   │   ├── travel/analyze/       # Main analysis endpoint
│   │   │   ├── chat/travel/          # Chat-mode analysis
│   │   │   ├── agent/                # Travel intelligence agent
│   │   │   ├── feedback/             # Feedback submission
│   │   │   ├── saved/                # Saved trips CRUD
│   │   │   ├── profile/              # User profile CRUD
│   │   │   ├── alerts/               # Alerts management
│   │   │   ├── notifications/        # Notifications
│   │   │   ├── intelligence/         # Intelligence signals
│   │   │   ├── places/               # Google Places enrichment
│   │   │   ├── export/               # PDF/CSV export
│   │   │   ├── share/                # Share analysis link
│   │   │   ├── learning/             # ML learning signals
│   │   │   ├── subscription/         # Stripe checkout + portal + status
│   │   │   ├── webhooks/stripe/      # Stripe webhook handler
│   │   │   ├── trigger-scan/         # Manual scan trigger
│   │   │   ├── trigger-all/          # Trigger all scans
│   │   │   └── admin/                # Admin API endpoints
│   │   └── page.tsx                  # Landing page
│   ├── components/
│   │   ├── ui/                       # shadcn/ui + custom UI components
│   │   ├── travel/                   # Analysis, results, maps, forms (30 files)
│   │   ├── dashboard/                # Nav, layout components
│   │   ├── admin/                    # Admin dashboard components
│   │   ├── subscription/             # Pricing & billing components
│   │   └── landing/                  # Landing page
│   ├── i18n/
│   │   ├── config.ts                 # Locale list, names, flags, RTL config
│   │   ├── request.ts                # next-intl server config
│   │   └── messages/                 # 10 JSON translation files
│   ├── lib/
│   │   ├── analysis/                 # Analysis engine + schemas (26 files)
│   │   ├── providers/                # Data providers (flights, hotels, weather…)
│   │   ├── services/                 # Business logic (20 files)
│   │   │   ├── price-estimation.ts   # Tavily + GPT-4o price estimation
│   │   │   ├── route-intelligence.ts # Multi-city route scoring
│   │   │   ├── google-places-service.ts
│   │   │   ├── claude-verifier.ts
│   │   │   ├── personalized-scoring.ts
│   │   │   ├── subscription.ts
│   │   │   └── stripe.ts
│   │   ├── ml/                       # ML pipeline (15 files)
│   │   ├── agents/                   # Travel intelligence agent
│   │   ├── intelligence/             # Intelligence signals (7 files)
│   │   ├── learning/                 # AI preference learning
│   │   ├── security/                 # Rate limiting, CSP
│   │   ├── cache/                    # Cache manager (Upstash)
│   │   └── db/                       # Database access layer
│   └── middleware.ts                 # Auth + CSP headers + locale detection
├── supabase/
│   └── migrations/                   # 13 ordered SQL migrations
├── public/
└── package.json
```

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/travel/analyze` | Main analysis — scores destinations, returns ranked results |
| `POST` | `/api/chat/travel` | Chat-based conversational analysis |
| `POST` | `/api/agent` | Travel intelligence agent (tool-calling) |
| `GET/POST` | `/api/feedback` | Submit thumbs up/down/save/dismiss |
| `GET/POST/DELETE` | `/api/saved` | Saved trips management |
| `GET/PUT` | `/api/profile` | User profile read/update |
| `GET` | `/api/places/enrich` | Google Places venue enrichment |
| `POST` | `/api/export` | Export analysis as PDF or CSV |
| `GET` | `/api/subscription/status` | Current subscription tier |
| `POST` | `/api/subscription/checkout` | Create Stripe Checkout session |
| `POST` | `/api/subscription/portal` | Open Stripe Customer Portal |
| `POST` | `/api/webhooks/stripe` | Stripe webhook (subscription events) |
| `POST` | `/api/trigger-scan` | Manual data scan trigger |
| `POST` | `/api/trigger-all` | Trigger scans for all sources |

---

## 🧪 Development Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run typecheck  # TypeScript type check (tsc --noEmit)
npm run lint       # ESLint
npm run seed       # Seed sample data (requires .env.local)
```

---

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub** (already done if you cloned this repo)

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com) → New Project
   - Import the GitHub repository

3. **Add Environment Variables**
   In Vercel → Settings → Environment Variables, add all variables from the [Environment Variables](#2-configure-environment-variables) section above.
   At minimum, set the four required variables.

4. **Update Supabase Auth URLs**
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

5. **Update `NEXT_PUBLIC_APP_URL`**
   Set it to your Vercel deployment URL.

6. **Stripe Webhook** (if using subscriptions)
   - In Stripe Dashboard → Webhooks → Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
   - Events to listen: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET`

### Post-Deployment Checklist

- ✅ Sign up / log in works
- ✅ Email confirmation (if enabled in Supabase)
- ✅ Google OAuth redirect resolves correctly
- ✅ Travel analysis returns results
- ✅ Pricing page loads + Stripe checkout opens
- ✅ PDF export downloads
- ✅ Language switcher changes language
- ✅ RTL renders correctly for Arabic / Hebrew
- ✅ Admin routes accessible for admin users

---

## 🔐 Security

| Measure | Detail |
|---|---|
| Row Level Security | Enabled on all 13 Supabase tables |
| Content Security Policy | Strict CSP headers set in `middleware.ts` |
| Rate Limiting | Per-user limits via Upstash Redis |
| Auth Guards | All `/dashboard` routes require valid session |
| Server-Side Secrets | All API keys are never exposed to the client |
| Input Validation | Zod schemas on every API route handler |
| SQL Injection | Prevented via Supabase parameterized client |

---

## 🌍 Internationalization

| Locale | Language | RTL |
|---|---|---|
| `en` | English 🇬🇧 | No |
| `ar` | العربية 🇸🇦 | **Yes** |
| `he` | עברית 🇮🇱 | **Yes** |
| `es` | Español 🇪🇸 | No |
| `pt` | Português 🇧🇷 | No |
| `fr` | Français 🇫🇷 | No |
| `de` | Deutsch 🇩🇪 | No |
| `it` | Italiano 🇮🇹 | No |
| `tr` | Türkçe 🇹🇷 | No |
| `ja` | 日本語 🇯🇵 | No |

Language is persisted via the `NEXT_LOCALE` cookie, auto-detected from `Accept-Language` on first visit, and switchable at any time from the nav bar.

---

## 📄 License

MIT License — free to use for personal or commercial projects.

---

## 🙏 Built With

- [Next.js](https://nextjs.org/) — Framework
- [Supabase](https://supabase.com/) — Database & Auth
- [OpenAI](https://openai.com/) — GPT-4o analysis
- [Anthropic](https://www.anthropic.com/) — Claude verification
- [Tavily](https://tavily.com/) — Web search & price estimation
- [Duffel](https://duffel.com/) — Flight data
- [Hotelbeds](https://www.hotelbeds.com/) — Hotel data
- [Google Places](https://developers.google.com/maps/documentation/places/) — Venue enrichment
- [Stripe](https://stripe.com/) — Payments
- [Upstash](https://upstash.com/) — Redis rate limiting
- [shadcn/ui](https://ui.shadcn.com/) — UI components
- [Framer Motion](https://www.framer.com/motion/) — Animations
- [next-intl](https://next-intl-docs.vercel.app/) — Internationalization

---

**Built with ❤️ — TravelScan AI**
