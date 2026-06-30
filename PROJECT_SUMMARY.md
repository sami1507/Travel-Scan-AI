# TravelScan AI — Project Summary

> Generated: 28 June 2026 | Based on commit `e19390c` (HEAD → main)

---

## 1. PROJECT OVERVIEW

TravelScan AI is a Next.js 15 web application that generates AI-powered travel destination recommendations. A user inputs their departure city, budget, travel months, interests, and trip length (via a multi-step wizard form **or** a conversational chat interface). The engine retrieves structured destination knowledge, scores 20+ candidates, calls OpenAI GPT-4o with a compact structured prompt, applies ML re-ranking, optionally runs Claude Anthropic verification, enforces diversity, and returns the top 3 destinations with full route plans, city breakdowns, night allocations, transport logic, and consultant notes. Results can be saved, compared, shared, and exported as a PDF.

| Dimension | Value |
|---|---|
| **Framework** | Next.js 15.5.18, App Router, React 18, TypeScript |
| **Database** | Supabase (PostgreSQL), Row-Level Security on all user tables |
| **Primary AI** | OpenAI GPT-4o (`gpt-4o-2024-08-06`) via structured output / Zod schema |
| **Secondary AI** | Anthropic Claude (model configurable via `CLAUDE_MODEL` env var, default `claude-sonnet-4-6`) for accuracy verification |
| **Chat AI** | Anthropic Claude `claude-3-5-haiku-20241022` for natural-language parameter extraction |
| **Web Search** | Tavily Search API (optional enrichment, gated by `TAVILY_API_KEY`) |
| **Places Data** | Google Places API (New) for live POI enrichment, gated by `ENABLE_GOOGLE_PLACES_ENRICHMENT=true` |
| **Flights** | Duffel API (real, gated by `DUFFEL_API_TOKEN`) |
| **Hotels** | Hotelbeds API (real, gated by `HOTELBEDS_API_KEY` + `HOTELBEDS_API_SECRET`) |
| **Payments** | Stripe (Checkout, Webhook, Portal) |
| **Caching** | Vercel KV / Upstash Redis (optional, gated by `KV_REST_API_URL` + `KV_REST_API_TOKEN`) |
| **Styling** | Tailwind CSS, shadcn/ui, Framer Motion |
| **Deployment** | Vercel (`NEXT_PUBLIC_APP_URL=https://travelscan.vercel.app`) |

---

## 2. ARCHITECTURE — HIGH LEVEL FLOW

All steps below live in the analysis engine or are called by it. The entry point is `POST /api/travel/analyze`.

| Step | What happens | File(s) |
|---|---|---|
| **0. Auth + rate-limit + usage gate** | Verify Supabase session; check in-memory rate limit; call `canUserAnalyze()` → returns 429 `LIMIT_REACHED` if free user exhausted 3/month | `src/app/api/travel/analyze/route.ts`, `src/lib/services/subscription.ts`, `src/lib/rate-limit.ts` |
| **1. User preference load** | If `userId` present, fetch feedback history from DB, run `preferenceInferenceService`, apply personalized scoring weights | `src/lib/analysis/engine.ts`, `src/lib/services/preference-inference.ts`, `src/lib/services/personalized-scoring.ts`, `src/lib/db/preferences.ts` |
| **1b. Tavily web search** | If `TAVILY_API_KEY` set, run real-time travel research queries and store results for prompt injection | `src/lib/services/tavily-search.ts` |
| **1c. AI learning context** | Load past recommendation signals from `ai_recommendation_events` to calibrate confidence/fatigue weights | `src/lib/learning/learning-service.ts` |
| **2. Knowledge retrieval** | Query structured in-memory knowledge base of countries + cities; score by budget/month/interests fit | `src/lib/knowledge/retrieval.ts`, `src/lib/knowledge/base/countries.ts`, `src/lib/knowledge/base/cities.ts`, `src/lib/scoring/engine.ts` |
| **3. Route candidate pool** | If knowledge retrieval returns 0 results, generate candidates two ways: (a) GPT-4o global candidate JSON, (b) curated CSV/structured route data. Merge and de-duplicate. | `src/lib/analysis/global-candidate-generation.ts`, `src/lib/analysis/route-candidate-pool.ts` |
| **4. Provider data gather** | For top 12 scored candidates: fetch weather, currency, visa, flights (Duffel), hotels (Hotelbeds), events (Ticketmaster via enhanced provider). Real providers fall back to demo stubs if keys absent. | `src/lib/providers/duffel-flights-provider.ts`, `src/lib/providers/hotelbeds-hotels-provider.ts`, `src/lib/providers/real-weather-provider.ts`, `src/lib/providers/real-currency-provider.ts`, `src/lib/providers/real-visa-provider.ts`, `src/lib/providers/enhanced-events-provider.ts`, `src/lib/providers/provider-resilience.ts` |
| **5. Re-score with provider data** | Merge live provider scores into scoring engine; re-sort candidates | `src/lib/analysis/engine.ts`, `src/lib/scoring/engine.ts` |
| **6. Route intelligence** | Analyse multi-city route quality (fatigue, transport, realism) for top 10 destinations | `src/lib/services/route-intelligence.ts` |
| **7. OpenAI GPT-4o call** | Build compact prompt + system prompt; call `gpt-4o-2024-08-06` with `zodResponseFormat(compactAnalysisResponseSchema)`, `max_tokens=3500`, `temp=0.3`. Check Redis cache first; bypass if `forceFresh=true`. | `src/lib/analysis/engine.ts`, `src/lib/analysis/compact-prompt.ts`, `src/lib/analysis/compact-schema.ts`, `src/lib/cache/cache-manager.ts` |
| **7b. Validate + repair** | Parse response against contract; if issues found, attempt OpenAI repair call; else deterministic fallback from candidate pool | `src/lib/analysis/analysis-contract.ts`, `src/lib/analysis/engine.ts` (`validateAndRepairAnalysis()`) |
| **8. ML re-ranking** | `MLInferenceEngine.infer()` applies 60% ML / 40% baseline blend using pairwise ranker + feature engineering; adds accommodation recommendations | `src/lib/ml/models/ml-inference.ts`, `src/lib/ml/models/recommendation-ranker.ts`, `src/lib/ml/feature-engineering.ts`, `src/lib/recommendation/pairwise-ranker.ts` |
| **9. Claude verification** | If `ENABLE_CLAUDE_VERIFIER=true` and `ANTHROPIC_API_KEY` set, run parallel accuracy verification for each destination with 8-second timeout; non-blocking if it fails | `src/lib/services/claude-verifier.ts` |
| **9b. Diversity enforcement** | Ensure no two recommendations are from same region; enforce hidden-gems / low-fatigue / cheaper diversity modes if requested | `src/lib/analysis/diversity-enforcement.ts` |
| **9c. Quality gate** | Consultant quality score check; assign diversity labels; generate `querySummary` consultant brief | `src/lib/analysis/consultant-quality-gate.ts`, `src/lib/analysis/consultant-quality-score.ts` |
| **10. Google Places enrichment** | If `ENABLE_GOOGLE_PLACES_ENRICHMENT=true` and key set, fetch live POIs (attractions, restaurants, museums, nature) for each final city in route | `src/lib/services/google-places-service.ts` |
| **11. Finalization + contract check** | Assemble canonical `_meta` object; validate analysis contract; if blocking issues, cap quality score | `src/lib/analysis/finalize-analysis-result.ts`, `src/lib/analysis/analysis-contract.ts` |
| **12. Cache store** | Write finalized result to Redis/KV (cache version `consultant-v8-finalized-analysis-2026-06-02`) | `src/lib/cache/cache-manager.ts` |
| **13. Learning record + usage increment** | Fire-and-forget: record recommendation event to `ai_recommendation_events`, increment `usage_tracking`, add to `analysis_history` | `src/lib/learning/learning-service.ts`, `src/lib/services/subscription.ts`, `src/lib/services/saved-items.ts` |
| **14. Response to UI** | Return `{ success: true, analysis: TravelAnalysisResponse }` to client | `src/app/api/travel/analyze/route.ts` |

---

## 3. KEY FILES MAP

### `src/lib/analysis/`

| File | Purpose |
|---|---|
| `engine.ts` | Main orchestrator class `TravelAnalysisEngine`; singleton; all 13 analysis steps live here |
| `schemas.ts` | Zod schemas for `TravelAnalysisResponse`, `RankedDestination`, `UserConstraints`, `CategoryScores` |
| `compact-schema.ts` | Smaller Zod schema `CompactAnalysisResponse` sent to GPT-4o to reduce token cost |
| `compact-prompt.ts` | Builds the structured user + system prompt strings injected into GPT-4o call |
| `route-candidate-pool.ts` | Curated structured CSV/map of ~50 destination routes with region, price tier, fatigue level |
| `global-candidate-generation.ts` | GPT-4o fallback: generates worldwide destination candidates as JSON when knowledge base returns 0 |
| `diversity-enforcement.ts` | Enforces geographic spread, diversity modes (hidden_gems, cheaper_options, low_fatigue) |
| `consultant-quality-gate.ts` | Applies minimum quality thresholds; assigns diversity labels; generates consultant brief text |
| `consultant-quality-score.ts` | Computes 0–100 quality score for analysis metadata |
| `finalize-analysis-result.ts` | Assembles canonical `_meta` object; single source of truth for all diagnostic fields |
| `analysis-contract.ts` | Validates that final analysis matches the request contract; reports blocking vs warning issues |
| `normalize-recommendation.ts` | Strips city/route suffixes from `destinationName` (e.g. `"Portugal - Lisbon → Porto"` → `"Portugal"`) |
| `normalize-analysis-for-ui.ts` | Final UI normalization; patches missing fields; coerces types for display components |
| `verifier.ts` | Legacy verifier stub (superseded by `claude-verifier.ts`) |
| `evaluator.ts` | Internal quality evaluator (used by admin quality-eval endpoint) |
| `clear-analysis-state.ts` | Client-side helper to reset analysis cache/state in browser |
| `validate-analysis-request.ts` | Client-side form validation before submitting to API |
| `text-normalization.ts` | String utilities for destination name cleaning |
| `skills/` | 8 modular skill definitions (fallback-control, route-and-map, scoring-ranking, seasonality, diversity, professional-reasoning, travel-consultant-core, index) injected into AI prompts |

### `src/lib/services/`

| File | Purpose |
|---|---|
| `claude-verifier.ts` | Anthropic Claude secondary verifier; checks each recommendation for accuracy; 8s timeout |
| `tavily-search.ts` | Tavily API integration for real-time travel web search enrichment |
| `google-places-service.ts` | Google Places API (New) for live POI enrichment of route cities |
| `route-intelligence.ts` | Analyses multi-city route quality: fatigue, transport connections, realism scoring |
| `personalized-scoring.ts` | Generates personalised scoring weights from user preference profile |
| `preference-inference.ts` | Infers user preferences from feedback history (3+ signals required for confidence ≥ 0.3) |
| `orchestrator.ts` | Simple orchestrator wrapper (currently thin, delegates to engine) |
| `saved-items.ts` | CRUD for `saved_analyses`, `saved_destinations`, `saved_routes`, `analysis_history`, `comparison_sessions` |
| `subscription.ts` | `getUserSubscription()`, `canUserAnalyze()`, `incrementAnalysisUsage()` — free/pro gate |
| `stripe.ts` | `getStripe()` singleton, `createCheckoutSession()`, `createPortalSession()` |
| `user-profile.ts` | User profile read/write operations |
| `alerts.ts` | Price alert creation and notification logic |
| `ai-feedback-analyzer.ts` | Uses OpenAI to analyze user feedback patterns |
| `feedback-intelligence-signals.ts` | Aggregates feedback into intelligence signals for admin dashboard |
| `feedback-improvement-loop.ts` | Feedback → learning loop |
| `feedback-quality-loop.ts` | Quality-focused feedback loop |
| `ai/openai-provider.ts` | OpenAI client singleton used by intelligence agent |

### `src/lib/providers/`

| File | Purpose |
|---|---|
| `interfaces.ts` | TypeScript interfaces: `IFlightsProvider`, `IHotelsProvider`, `IWeatherProvider`, etc. |
| `base-provider.ts` | Abstract base class with retry / error handling |
| `demo-providers.ts` | Demo stubs for all providers (flights, hotels, weather, currency, visa, events) — used as fallback |
| `duffel-flights-provider.ts` | **Real** Duffel API flight search (requires `DUFFEL_API_TOKEN`; falls back to demo if absent) |
| `hotelbeds-hotels-provider.ts` | **Real** Hotelbeds API hotel search (requires `HOTELBEDS_API_KEY` + `HOTELBEDS_API_SECRET`) |
| `real-weather-provider.ts` | **Real** weather (WeatherAPI.com, requires `WEATHER_API_KEY`) |
| `real-currency-provider.ts` | **Real** exchange rates (ExchangeRate-API, requires `EXCHANGERATE_API_KEY`) |
| `real-visa-provider.ts` | **Real** visa requirements (knowledge-base backed, no external API currently) |
| `events-provider.ts` | Events provider base |
| `enhanced-events-provider.ts` | Ticketmaster Discovery API (requires `TICKETMASTER_DISCOVERY_API_KEY`) |
| `exchange-rates-provider.ts` | Exchange rate provider abstraction |
| `flights-provider.ts` | Flights provider abstraction |
| `hotels-provider.ts` | Hotels provider abstraction |
| `weather-provider.ts` | Weather provider abstraction |
| `provider-resilience.ts` | Retry + timeout wrapper (`withResilience()`); `ProviderConfigs` timeout values |
| `index.ts` | Re-exports all providers |

---

## 4. DATABASE SCHEMA

All tables are in the Supabase public schema. Row-Level Security is enabled on user-facing tables.

| Table | Key Columns | Purpose | Migration |
|---|---|---|---|
| `source_configs` | `id`, `user_id`, `source_type`, `status`, `polling_interval_minutes` | Tracks data source configurations per user (flights, hotels, etc.) | `20240101000000_initial_schema.sql` |
| `ingestion_runs` | `id`, `source_config_id`, `status`, `records_fetched` | Log of data ingestion job runs | `20240101000000_initial_schema.sql` |
| `raw_payloads` | `id`, `ingestion_run_id`, `payload` (JSONB), `payload_hash` | Stores raw API responses from ingestion | `20240101000000_initial_schema.sql` |
| `normalized_records` | `id`, `source_config_id`, `external_id`, `content` (JSONB), `content_hash` | Domain-agnostic normalized data records | `20240101000000_initial_schema.sql` |
| `record_snapshots` | `id`, `normalized_record_id`, `content` (JSONB) | Point-in-time state snapshots for change detection | `20240101000000_initial_schema.sql` |
| `alerts` | `id`, `user_id`, `alert_type`, `conditions` (JSONB), `status` | User-created price/travel alerts | `20240101000000_initial_schema.sql` |
| `user_feedback` | `id`, `user_id`, `destination_id`, `rating`, `feedback_type` | User destination ratings and feedback | `20260429_create_user_feedback_table.sql` |
| `user_preferences` | `id`, `user_id`, `preferences` (JSONB) | Explicit user travel preferences | `20260429_create_user_preferences_table.sql` |
| `saved_analyses` | `id`, `user_id`, `name`, `query`, `analysis_result` (JSONB), `is_favorite`, `tags` | Full saved analysis results | `20260430_phase1_saved_analyses.sql` |
| `saved_destinations` | `id`, `user_id`, `destination_id`, `destination_data` (JSONB) | Individually saved destination cards | `20260430_phase1_saved_analyses.sql` |
| `saved_routes` | `id`, `user_id`, `route_name`, `route_data` (JSONB) | Saved route plans | `20260430_phase1_saved_analyses.sql` |
| `analysis_history` | `id`, `user_id`, `query`, `top_recommendations` (array), `user_constraints` (JSONB) | Non-saved analysis run history | `20260430_phase1_saved_analyses.sql` |
| `comparison_sessions` | `id`, `user_id`, `destinations` (JSONB array), `notes` | Side-by-side destination comparisons | `20260430_phase1_saved_analyses.sql` |
| `user_profiles` | `id`, `user_id`, `role` (`user`/`admin`), `display_name`, `preferred_language`, `inferred_preferences` (JSONB), `feedback_count` | User profile and personalization data | `20260430_phase2_user_profiles.sql` |
| `notifications` | `id`, `user_id`, `title`, `message`, `type`, `read` | In-app notification inbox | `20260430_phase4_alerts_notifications.sql` |
| `quality_analytics` | `id`, `user_id`, `analysis_id`, `quality_score`, `dimensions` (JSONB) | Quality metrics per analysis run | `20260430_phase5_quality_analytics.sql` |
| `rich_feedback_events` | `id`, `user_id`, `analysis_id`, `signal_type`, `destination_id`, `metadata` (JSONB) | Rich behavioral feedback signals (clicks, saves, time-on-card) | `20260430_rich_feedback_intelligence.sql` |
| `ai_recommendation_events` | `id`, `user_id`, `session_id`, `input_hash`, `departure`, `budget_level`, `trip_structure` | One row per analysis run for learning | `20260512_ai_learning_layer.sql` |
| `ai_recommendation_items` | `id`, `event_id`, `rank`, `destination_title`, `total_score`, `claude_verified` | Per-destination items per learning event | `20260512_ai_learning_layer.sql` |
| `ai_feedback_signals` | `id`, `event_id`, `user_id`, `signal_type`, `destination_title`, `value` | User interaction signals fed back into ML | `20260512_ai_learning_layer.sql` |
| `user_preference_profiles` | `id`, `user_id`, `inferred_weights` (JSONB), `confidence`, `feedback_count` | ML-inferred preference weights | `20260512_ai_learning_layer.sql` |
| `subscription_plans` | `id` (free/pro), `price_monthly`, `analyses_per_month`, `stripe_price_id` | Plan definitions (seeded: free=3/month, pro=unlimited/$9) | `20260609_subscription_system.sql` |
| `user_subscriptions` | `id`, `user_id`, `plan_id`, `stripe_customer_id`, `stripe_subscription_id`, `status` | One row per user; defaults to free | `20260609_subscription_system.sql` |
| `usage_tracking` | `id`, `user_id`, `month` (YYYY-MM), `analyses_count` | Monthly analysis usage counter | `20260609_subscription_system.sql` |

---

## 5. API ROUTES

All routes under `src/app/api/`. `ƒ` = dynamic server-rendered. All routes require auth unless marked **public**.

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/travel/analyze` | POST | Main analysis endpoint — full 13-step pipeline | ✅ Required |
| `/api/chat/travel` | POST | Claude Haiku chat: extract travel params or ask clarifying question | ✅ Required |
| `/api/export/pdf` | POST | Generate PDF travel report via `@react-pdf/renderer` | ✅ Required |
| `/api/saved/analyses` | GET, POST | List / save full analyses | ✅ Required |
| `/api/saved/destinations` | GET, POST, DELETE | List / save / delete individual destinations | ✅ Required |
| `/api/saved/routes` | GET, POST | List / save routes | ✅ Required |
| `/api/saved/history` | GET | Analysis run history | ✅ Required |
| `/api/saved/compare` | GET, POST | Comparison sessions | ✅ Required |
| `/api/share` | POST | Generate shareable link for analysis | ✅ Required |
| `/api/feedback` | POST | Submit destination rating/feedback | ✅ Required |
| `/api/feedback/rich` | POST | Submit rich behavioral signal (click, save, dwell) | ✅ Required |
| `/api/profile` | GET, PATCH | Read / update user profile | ✅ Required |
| `/api/notifications` | GET, PATCH | List / mark-as-read notifications | ✅ Required |
| `/api/alerts` | GET, POST, DELETE | Price/travel alerts CRUD | ✅ Required |
| `/api/places/enrich` | POST | Google Places enrichment for specific cities | ✅ Required |
| `/api/places/health` | GET | Checks if Google Places API key is working | ✅ Required |
| `/api/language` | POST | Detect / set preferred language | ✅ Required |
| `/api/learning/feedback` | POST | Record AI learning feedback signal | ✅ Required |
| `/api/learning/profile` | GET | Get user preference learning profile | ✅ Required |
| `/api/subscription/status` | GET | Get current plan, usage, limits | ✅ Required |
| `/api/subscription/checkout` | POST | Create Stripe Checkout session for Pro upgrade | ✅ Required |
| `/api/subscription/portal` | POST | Create Stripe Billing Portal session | ✅ Required |
| `/api/webhooks/stripe` | POST | Stripe webhook handler (subscription lifecycle) | **Public** (Stripe signature) |
| `/api/intelligence/report` | GET | AI-generated intelligence report for user | ✅ Required |
| `/api/agent/analyze` | POST | Travel intelligence agent (GPT-4o function-calling mode) | ✅ Required |
| `/api/trigger-scan` | POST | Manually trigger a data source scan | ✅ Required |
| `/api/trigger-all` | POST | Trigger all data source scans | ✅ Required |
| `/api/admin/analytics` | GET | Admin: usage analytics | ✅ Admin |
| `/api/admin/feedback-insights` | GET | Admin: feedback intelligence dashboard data | ✅ Admin |
| `/api/admin/intelligence-signals` | GET | Admin: raw intelligence signals | ✅ Admin |
| `/api/admin/learning-insights` | GET | Admin: AI learning system stats | ✅ Admin |
| `/api/admin/ml-monitoring` | GET | Admin: ML model performance metrics | ✅ Admin |
| `/api/admin/ml-quality` | GET | Admin: ML quality evaluation | ✅ Admin |
| `/api/admin/operations` | GET | Admin: system health / operations | ✅ Admin |
| `/api/admin/quality-eval` | GET | Admin: analysis quality evaluation | ✅ Admin |

---

## 6. SUBSCRIPTION / MONETIZATION SYSTEM

### Plans

| Plan | Price | Analyses/month | Features |
|---|---|---|---|
| **Free** | $0 | 3 | Basic routes, standard destinations |
| **Pro** | $9/month | Unlimited | Real-time research, price alerts, save & compare, priority AI |

### How limits are enforced

1. `POST /api/travel/analyze` calls `canUserAnalyze(userId)` before running the engine
2. If `analysesUsed >= 3` and plan is `free`, returns HTTP 429 with `code: "LIMIT_REACHED"`
3. After a successful analysis, `incrementAnalysisUsage(userId)` upserts `usage_tracking` for the current month (format `"YYYY-MM"`)
4. Counter resets automatically at month rollover (new month = new row)

### Stripe integration points

| File | What it does |
|---|---|
| `src/lib/services/stripe.ts` | `createCheckoutSession()` → creates Stripe Checkout for Pro plan; `createPortalSession()` → billing portal |
| `src/app/api/subscription/checkout/route.ts` | POST: creates checkout session, returns URL |
| `src/app/api/subscription/portal/route.ts` | POST: creates portal session, returns URL |
| `src/app/api/subscription/status/route.ts` | GET: returns current plan, usage, limit, reset date |
| `src/app/api/webhooks/stripe/route.ts` | Handles `customer.subscription.created/updated/deleted` events; updates `user_subscriptions` table |

### Required env vars for billing

| Variable | Status in `.env.local` |
|---|---|
| `STRIPE_SECRET_KEY` | **PLACEHOLDER/EMPTY** |
| `STRIPE_WEBHOOK_SECRET` | **PLACEHOLDER/EMPTY** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **PLACEHOLDER/EMPTY** |
| `STRIPE_PRO_PRICE_ID` | **PLACEHOLDER/EMPTY** |

### Current activation status

- **SQL migration**: ✅ `20260609_subscription_system.sql` was created — but **must be run against the Supabase instance manually** (or via `supabase db push`). No CI/CD auto-applies it.
- **Stripe keys**: ❌ All 4 Stripe env vars are placeholder/empty → checkout and webhooks will throw at runtime.
- **Free limit enforcement**: ✅ Code is complete and active. Free users are correctly limited to 3/month even without Stripe keys (the gate only checks the DB, not Stripe).
- **Pro upgrade flow**: ❌ Blocked until Stripe keys are populated and the `STRIPE_PRO_PRICE_ID` is a real Stripe price ID.

---

## 7. UI/UX FEATURES IMPLEMENTED

| Feature | File(s) |
|---|---|
| **Landing page** — hero, feature cards, pricing teaser, CTA | `src/app/page.tsx` |
| **Auth pages** — signup, login, reset password, update password, resend confirmation | `src/app/(auth)/` |
| **Dashboard home** — real-data stat cards (analysis count, saved count), recent analyses, travel insights, onboarding checklist | `src/app/(dashboard)/dashboard/page.tsx` |
| **Onboarding checklist** — dismissible, 3-step, localStorage persisted, auto-hides for non-new users | `src/components/dashboard/onboarding-checklist.tsx` |
| **Navigation** — simplified: 3 primary (bold), 3 secondary (dimmed), conditional admin link, mobile bottom nav | `src/components/dashboard/dashboard-nav.tsx` |
| **Analysis page — Chat Mode (default)** — conversational bubble UI, Claude Haiku extracts params, typing indicator, mini result cards, quick-reply pills | `src/components/travel/chat-analysis.tsx` |
| **Analysis page — Form Mode** — 5-step guided wizard: query → departure → dates → budget → interests | `src/components/travel/guided-analysis-form.tsx` |
| **Mode toggle** — Chat / Form tab switcher (Chat is default) | `src/app/(dashboard)/dashboard/analysis/page.tsx` |
| **Cinematic results loading** — animated travel-themed loading experience | `src/components/ui/travelscan/analysis-loading-experience.tsx` |
| **Enhanced recommendation cards** — score bar, route map, nights breakdown, consultant notes, warnings | `src/components/travel/enhanced-recommendation-card.tsx` |
| **Route-first card** — displays route cities with map integration | `src/components/travel/route-first-card.tsx` |
| **Consultant brief card** — AI-generated summary paragraph | `src/components/travel/consultant-brief-card.tsx` |
| **Why These Three** — reasoning panel for top 3 selection | `src/components/travel/why-these-three.tsx` |
| **Ranking explanation** — score breakdown by category | `src/components/travel/ranking-explanation.tsx` |
| **Season/month strategy display** | `src/components/travel/season-month-strategy.tsx` |
| **Itinerary view** — day-by-day itinerary display | `src/components/travel/itinerary-view.tsx` |
| **Route map** — Google Maps route visualization | `src/components/travel/route-map-view.tsx` |
| **Before-you-book checklist** | `src/components/travel/before-you-book-checklist.tsx` |
| **Save analysis dialog** | `src/components/travel/save-analysis-dialog.tsx` |
| **Share/export dialog** | `src/components/travel/share-export-dialog.tsx` |
| **PDF export** — multi-page PDF: cover, summary, per-destination, checklist | `src/lib/pdf/travel-report.tsx`, `src/app/api/export/pdf/route.tsx` |
| **Compare mode** — side-by-side destination comparison | `src/app/(dashboard)/dashboard/compare/page.tsx` |
| **Saved analyses page** — browse, favorite, delete saved analyses | `src/app/(dashboard)/dashboard/saved/page.tsx` |
| **Pricing page** — Free vs Pro plan cards with Stripe upgrade button | `src/app/(dashboard)/dashboard/pricing/page.tsx` |
| **Admin dashboard** — analytics, ML monitoring, quality evaluation, feedback intelligence | `src/app/(dashboard)/dashboard/admin/` |
| **Intelligence report** — AI-generated travel intelligence summary | `src/app/(dashboard)/dashboard/intelligence/page.tsx` |
| **Personalization indicator** — shows when results are personalized from user history | `src/components/travel/personalization-indicator.tsx` |

---

## 8. KNOWN ISSUES / TECH DEBT

| Category | Issue |
|---|---|
| **Demo data** | `src/lib/providers/demo-providers.ts` provides fake flights (`source: 'demo'`, airline: "Demo Airlines"), fake hotels (`country: 'Demo Country'`), and fake events. These are the fallback when Duffel/Hotelbeds keys are absent. **The flight and hotel data shown in the UI when real API keys are not configured is entirely synthetic.** |
| **Duffel flights** | `DUFFEL_API_TOKEN` is set in `.env.local` but `DUFFEL_ENVIRONMENT` defaults to `'test'` — meaning real flight quotes require the token to be a **live** Duffel token and `DUFFEL_ENVIRONMENT=production`. |
| **Hotelbeds** | `HOTELBEDS_API_KEY` + `HOTELBEDS_API_SECRET` are set but `HOTELBEDS_ENVIRONMENT` defaults to `'test'` — same issue as Duffel. |
| **Stripe not active** | All 4 Stripe env vars are placeholders. Pro upgrade flow will throw at runtime. Free-tier limit enforcement works independently. |
| **Redis/KV caching disabled** | `KV_REST_API_URL` and `KV_REST_API_TOKEN` are not present in `.env.local` → caching is completely disabled (every analysis hits OpenAI fresh). Warning logged at build time: `Cache: Redis/KV not configured, caching disabled`. |
| **DEP0169 deprecation** | Node.js v20.12.1 is below the recommended `^20.19.0 || ^22.13.0` for one ESLint dependency. Non-blocking warning during `npm install`. No functional impact. |
| **Google Places enrichment** | `ENABLE_GOOGLE_PLACES_ENRICHMENT` env var is not set in `.env.local` (or set to a non-`'true'` value) — enrichment is disabled. `GOOGLE_PLACES_API_KEY` is set but irrelevant until the feature flag is enabled. |
| **Claude verifier model** | `CLAUDE_MODEL=claude-sonnet-4-6` is set but this model name may be a pre-release/internal name. If Anthropic rejects it, the verifier times out gracefully (non-blocking). |
| **Tavily key duplicate** | `.env.local` has `TAVILY_API_KEY` set twice — once as `**SET**` and once as `PLACEHOLDER/EMPTY` (the second declaration overrides the first). Tavily search is effectively disabled. |
| **`analysis_history` shape** | The engine writes `topRecommendations` as a plain string array to history, but the display page expects full `RankedDestination` objects. Saved analyses work correctly; history cards show names only. |
| **ML models** | `MLInferenceEngine` uses heuristic feature engineering and pairwise ranking, not a trained neural model. There is no actual model training pipeline wired up yet — `mlEnabled=true` but it falls back to baseline if feature extraction fails. |
| **`any` casts in engine** | Several `(analysis as any).fieldName` assignments exist in `engine.ts` for metadata fields not in the Zod schema. Tech debt from iterative feature additions. |
| **`verifier.ts`** | `src/lib/analysis/verifier.ts` is a legacy stub superseded by `src/lib/services/claude-verifier.ts`. Still imported in some paths. |
| **`DISABLE_ANALYSIS_CACHE`** | Referenced in `engine.ts` but not present in `.env.local`. Treated as absent → caching would be enabled if Redis were configured. |

---

## 9. RECENT COMMIT HISTORY

```
e19390c feat: add chat interface and PDF export
91afe1e feat: improve dashboard UX with smart empty states, simplified nav, and onboarding checklist
dac4b8c feat: add Stripe subscription system with Free/Pro plans
00f129e fix: resolve broken spacing quality gate and Claude timeout
ee11845 fix: resolve Vercel production issues — Claude timeout, Google Places 403, cache eligibility
5a1a622 feat: redesign UI with wizard form, travel identity, and cinematic results
f62ba11 fix: resolve 5 code contradictions in analysis engine and finalizer
d3bf1d5 fix: clean final recommendations and harden google places diagnostics
892d488 feat: add server-side google places enrichment
ba6efc5 chore: audit and stabilize project health
1efd496 fix: make analysis health audit pass
2db13bf fix: complete analysis contract stabilization
40e4717 fix: stabilize analysis contract and final candidate selection
1911320 fix: preserve normalized travel request for fresh analysis
ed0000e fix: harden global candidate JSON parsing
0a0bf72 fix: integrate global candidates and unify itinerary display
084aefb fix: make AI consultant global data-aware and UI consistent
ad5dde5 feat: add AI decision audit and route comparison reasoning
2bd1bd7 fix: clean final cache diagnostics
b3e121a fix: correct trip length and final cache metadata
dea9627 fix: fully integrate finalized analysis result before cache
caefff1 fix: finalize analysis metadata quality and cache ordering - Part 1
822bab0 feat: add fresh and alternative analysis controls
c1dfc2b fix: add fresh diverse analysis controls (Phase 1)
9d324d8 fix: only count Claude verification as success when result is not null
485c78f fix: use CLAUDE_MODEL env var instead of hard-coded model name
eeb0029 fix: apply formatScore to all user-facing score displays
ac4f546 fix: improve travel consultant metadata and data context accuracy
1a44b5e feat: add multi-country routes and improve evaluation logic
ed23542 fix: align travel evaluation region metrics
```

**Grouped summary:**

| Group | Commits | What was accomplished |
|---|---|---|
| **Current session** | `e19390c`, `91afe1e` | Chat interface (Claude Haiku), PDF export, dashboard UX overhaul, onboarding checklist, nav simplification |
| **Monetization** | `dac4b8c` | Stripe Free/Pro subscription system wired end-to-end |
| **Production stability** | `00f129e`, `ee11845`, `f62ba11`, `d3bf1d5` | Fixed Claude timeout crash, Google Places 403, broken quality gate, 5 engine contradictions |
| **UI redesign** | `5a1a622` | Wizard form, travel identity branding, cinematic loading animation |
| **Google Places** | `892d488`, `d3bf1d5` | Server-side POI enrichment added; 403 handling hardened |
| **Engine contract** | `2db13bf`, `40e4717`, `1911320`, `ed0000e` | Analysis contract validation, normalized request preservation, global candidate JSON hardening |
| **Route intelligence** | `0a0bf72`, `084aefb`, `ad5dde5` | Global candidate integration, unified itinerary display, AI decision audit |
| **Cache / metadata** | `2bd1pb7`, `b3e121a`, `dea9627`, `caefff1` | Finalized single-source-of-truth metadata, cache ordering fixes |
| **Fresh/diversity** | `822bab0`, `c1dfc2b` | forceFresh controls, diversity modes (hidden gems, cheaper, low fatigue) |
| **Claude verifier** | `9d324d8`, `485c78f` | Fixed false-positive verification count; externalized model name |
| **Scoring/display** | `eeb0029`, `ac4f546`, `1a44b5e`, `ed23542` | Score formatting, multi-country routes, evaluation region metrics |

---

## 10. ENVIRONMENT VARIABLES REQUIRED

| Variable | Service | Status in `.env.local` | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | OpenAI | ✅ **SET** | Must start with `sk-` or `sk-proj-`; used for GPT-4o main analysis + global candidates + agent |
| `ANTHROPIC_API_KEY` | Anthropic | ✅ **SET** | Used for Claude verifier + chat parameter extraction |
| `CLAUDE_MODEL` | Anthropic | ✅ **SET** | Model name for verifier (currently `claude-sonnet-4-6`) |
| `ENABLE_CLAUDE_VERIFIER` | Feature flag | ✅ **SET** | Must be `'true'` string to activate; anything else disables verifier |
| `TAVILY_API_KEY` | Tavily | ⚠️ **DUPLICATE** (second entry wins = PLACEHOLDER) | Real-time web search enrichment — currently disabled |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | ✅ **SET** | Used client-side and server-side |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase | ✅ **SET** | Anon/publishable key for browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | ✅ **SET** | Admin/service-role key for server-side DB operations |
| `STRIPE_SECRET_KEY` | Stripe | ❌ **PLACEHOLDER** | Backend Stripe API key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | ❌ **PLACEHOLDER** | Frontend Stripe key (for Elements if used) |
| `STRIPE_WEBHOOK_SECRET` | Stripe | ❌ **PLACEHOLDER** | Webhook signature verification secret |
| `STRIPE_PRO_PRICE_ID` | Stripe | ❌ **PLACEHOLDER** | Stripe Price ID for $9/month Pro plan |
| `NEXT_PUBLIC_APP_URL` | App | ✅ **SET** | Base URL (`https://travelscan.vercel.app`) |
| `GOOGLE_PLACES_API_KEY` | Google | ✅ **SET** (via `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) | Used for Maps display + Places enrichment |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google | ✅ **SET** | Public key for Maps JS API in browser |
| `ENABLE_GOOGLE_PLACES_ENRICHMENT` | Feature flag | ❌ **NOT SET** | Must be `'true'` to activate POI enrichment step |
| `DUFFEL_API_TOKEN` | Duffel | ✅ **SET** | Flight search API token (test env by default) |
| `DUFFEL_ENVIRONMENT` | Duffel | Not set (defaults to `'test'`) | Set to `'production'` for live flight prices |
| `HOTELBEDS_API_KEY` | Hotelbeds | ✅ **SET** | Hotel search API key |
| `HOTELBEDS_API_SECRET` | Hotelbeds | ✅ **SET** | Hotel search API secret |
| `HOTELBEDS_ENVIRONMENT` | Hotelbeds | Not set (defaults to `'test'`) | Set to `'production'` for live hotel prices |
| `WEATHER_API_KEY` | WeatherAPI.com | ✅ **SET** | Real weather data |
| `EXCHANGERATE_API_KEY` | ExchangeRate-API | ✅ **SET** | Real currency exchange rates |
| `TICKETMASTER_DISCOVERY_API_KEY` | Ticketmaster | ✅ **SET** | Events data for destinations |
| `KV_REST_API_URL` | Vercel KV / Upstash | ❌ **NOT SET** | Redis URL for analysis caching — caching disabled without this |
| `KV_REST_API_TOKEN` | Vercel KV / Upstash | ❌ **NOT SET** | Redis auth token — caching disabled without this |
| `ENABLE_AI_LEARNING` | Feature flag | ✅ **SET** | Enables recommendation event recording to DB |
| `DISABLE_ANALYSIS_CACHE` | Feature flag | Not set | If `'true'`, bypasses Redis cache for all requests |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps | ✅ **SET** | Duplicate of `GOOGLE_PLACES_API_KEY` (both reference same key) |

---

*End of PROJECT_SUMMARY.md — last updated 28 June 2026*
