# Operations

## Health

`GET /api/health` — public, `Cache-Control: no-store`.

- `200 {"status":"ok"}` when required configuration is present **and** the database answers within 3 s.
- `503 {"status":"degraded","checks":{"database","config"}}` otherwise.
- `GET /api/health?detail=1` (admin session) additionally lists `missingRequired` variable names and which optional integrations are enabled.

Point your uptime monitor at `/api/health`. On server start, `src/instrumentation.ts` logs missing required variables and which optional integrations are running on fallbacks.

## Configuration

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.

Optional integrations (each degrades gracefully when absent) are documented in `.env.example` and reported by `src/lib/env.ts`:

| Integration | Without it |
|---|---|
| Duffel / Hotelbeds | Prices are AI-estimated and labelled as such |
| Tavily | No web-search price estimation |
| Anthropic | Chat intake and Claude verification disabled |
| Google Places | No venue enrichment |
| Stripe | Subscriptions disabled |
| Upstash Redis (`KV_REST_API_*`) | Rate limiting and cache are per-instance (not shared) — **set this in production** |
| `EXCHANGERATE_API_KEY` | Currency uses a dated static snapshot |
| `CRON_SECRET` | Scheduled scans cannot authenticate |

Weather needs no key (Open-Meteo).

## Deployment checklist

1. Run all migrations in `supabase/migrations/` **in filename order**. The atomic usage counter needs `20260817_atomic_usage_and_plan_rls.sql`.
2. Set the required variables, plus `KV_REST_API_URL/TOKEN` and `CRON_SECRET` for production.
3. Supabase Auth: set the Site URL and add the `/auth/callback` redirect URLs; enable Google if used.
4. Stripe (if used): webhook to `/api/webhooks/stripe` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
5. Deploy, then verify `GET /api/health` returns 200.
6. Set `ENABLE_TRIGGER_ROUTES=true` only if the daily cron in `vercel.json` should run in production.

## Failure behaviour

| Failure | Behaviour |
|---|---|
| OpenAI error/timeout | Deterministic fallback recommendations (schema-valid) |
| Open-Meteo unreachable | Seasonal weather fallback, labelled `structured` |
| Exchange-rate API unreachable | Static snapshot, labelled with its snapshot date |
| Redis unreachable | In-memory rate limiting |
| Database unreachable | `/api/health` returns 503; routes return generic 500s (details only in server logs) |

## Quality gates

`npm run typecheck && npm run lint && npm test` (also run in CI). `npx vitest run --coverage` for coverage.
