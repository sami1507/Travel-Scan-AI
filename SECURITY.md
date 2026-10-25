# Security

## Model

| Layer | Control |
|---|---|
| Transport/headers | CSP with per-request nonce + `strict-dynamic`, `object-src 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests` (prod), `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Authentication | Supabase Auth. `/dashboard/*` is guarded by middleware; **every API route authenticates itself** (middleware does not cover `/api`). |
| Authorization | Admin routes use `requireAdmin()`. User data is protected by Postgres RLS because user-scoped operations run through the caller's own session client. |
| Abuse/cost control | Per-user rate limits on every route that calls a paid provider (OpenAI, Anthropic, Tavily, Google Places, PDF rendering). Redis-backed when `KV_REST_API_*` is set. |
| Input | Zod validation with bounded sizes on every body; UUID checks on ids; text sanitising on free-form comments. |
| Secrets | Server-side only. `/api/health` never returns values; `?detail=1` (admin) lists only variable *names*. |
| Billing integrity | Free-tier usage counter increments atomically in Postgres (`increment_analysis_usage`). |
| Scheduled jobs | `/api/trigger-all` requires `Authorization: Bearer $CRON_SECRET` or an admin session. |

## Regression protection

`src/app/api/auth-matrix.test.ts` discovers every `route.ts` and fails CI if a handler answers an anonymous caller with anything other than 401/403. Intentionally public handlers (`language`, `webhooks/stripe`, `share GET`, `health`) are listed explicitly in that file.

## Known limitations

- **Build-time dependency advisories.** After `npm audit fix`, 9 advisories remain (postcss/braces/tailwind chain and the postcss bundled inside Next). They affect CSS processing at build time with trusted input, not request handling. Clearing them requires major upgrades (Tailwind 4, Next 16) and should be tracked separately.
- `style-src` keeps `'unsafe-inline'` (Tailwind/framer-motion emit inline style attributes). Inline styles cannot execute script.
- Visa, events and (fallback) weather data are curated or estimated. They are labelled as such in API output and the UI, and users must confirm entry requirements with official sources.
- No automated penetration test has been run; the controls above are verified by unit/route tests and code review only.

## Reporting

Please report vulnerabilities privately to the repository owner rather than opening a public issue.
