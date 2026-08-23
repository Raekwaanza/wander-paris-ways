# Direct Cloudflare deployment

Scenic Route deploys its TanStack Start SSR application directly to Cloudflare Workers. Lovable is
not part of this deployment path. The official Cloudflare Vite plugin builds the browser assets and
Worker together, while `wrangler.jsonc` points at the repository's custom `src/server.ts` entry.

The dedicated Capacitor build remains independent: `vite.mobile.config.ts` does not load the
Cloudflare plugin and produces only the local SPA bundle copied into the native projects.

## Prerequisites

- Bun and the checked-in lockfile dependencies
- A Cloudflare account with permission to deploy Workers
- OpenRouteService and MapTiler provider credentials
- Wrangler authentication on the deployment machine

Install and validate the checked-in dependency graph:

```sh
bun install --frozen-lockfile
bun run test
bun run build
```

The Worker is named `scenic-route`. Its configuration uses the current compatibility date in
`wrangler.jsonc`, the `nodejs_compat` flag required by the application runtime, and an explicit
`workers_dev: true` production route. Version preview URLs are disabled so the standard
`workers.dev` hostname is its only configured route. It has no database, storage, queue, analytics,
Pages, or custom-domain bindings. Its only additional resources are the five native API Rate
Limiting bindings below.

## Native API rate limiting

Every allowed-origin `POST /api/v1/*` request is checked against a global burst limiter, a global
sustained limiter, and exactly one provider-operation class limiter before its JSON body is read or
validated. `OPTIONS` does not consume quota, and a disallowed origin is still rejected with `403`
before any limiter runs.

| Binding                             | Namespace |            Limit | Scope                        |
| ----------------------------------- | --------: | ---------------: | ---------------------------- |
| `SCENIC_API_BURST_RATE_LIMITER`     |   `21001` |  30 / 10 seconds | Every native API POST        |
| `SCENIC_API_SUSTAINED_RATE_LIMITER` |   `21002` | 120 / 60 seconds | Every native API POST        |
| `SCENIC_GEOCODING_RATE_LIMITER`     |   `21003` |  60 / 60 seconds | Search and reverse geocoding |
| `SCENIC_ROUTING_RATE_LIMITER`       |   `21004` |  30 / 60 seconds | Ordinary and via routing     |
| `SCENIC_MATRIX_RATE_LIMITER`        |   `21005` |  12 / 60 seconds | Duration Matrix              |

These positive integer namespace IDs are intentionally unique within Scenic Route. Do not reuse
one for a different binding: Cloudflare bindings with the same namespace share counters.

The limiter key is Cloudflare's `CF-Connecting-IP`; the local simulator's deterministic fallback is
`unknown-client`. The key is never returned, persisted, or logged. No device ID, fingerprint,
mobile credential, shared bearer token, or other client secret is introduced. IP-based protection
is deliberately coarse: a carrier, household, or other NAT can group legitimate clients under one
counter. Cloudflare applies these counters per location and with eventually consistent,
intentionally permissive semantics, so this is abuse resistance rather than exact quota or billing
accounting.

The first failed check stops processing and returns `429` JSON
`{"error":"rate_limited","retryAfterSeconds":N}` with matching `Retry-After`,
`Cache-Control: no-store`, and the endpoint's existing allowed-origin CORS headers. A binding error
fails closed with controlled `503 {"status":"unavailable"}` and does not call a provider. The
native transport treats both responses as its existing unavailable result, preserving seeded and
Preview fallbacks where designed.

Use `bun run build`, then `bunx wrangler dev --local` to test bindings without touching production
counters. Repeated invalid Matrix bodies should return `400` through attempt 12, then `429`; after
the 60-second class window, invalid traffic should return `400` again. Do not lower production
limits for testing.

## Authenticate and configure secrets

Check the active Cloudflare identity:

```sh
bun run cf:whoami
```

If Wrangler is not authenticated, run `bunx wrangler login` and approve the browser authorization.
Then add both provider keys through Wrangler's private interactive prompt:

```sh
bunx wrangler secret put OPENROUTESERVICE_API_KEY
bunx wrangler secret put MAPTILER_API_KEY
```

Paste each value only into its Wrangler prompt. Never place provider credentials in chat, shell
arguments, `wrangler.jsonc`, a `VITE_*` variable, Capacitor configuration, or a tracked file. Local
`.dev.vars*` and `.env*` files are ignored, apart from the safe `.env.example` template.

## Deploy and validate

Deploy the production build:

```sh
bun run deploy
```

Wrangler prints the deployed `workers.dev` origin. Validate the home page and all five JSON API
routes against that exact origin. Confirm successful provider-backed routing, via routing, Matrix,
search, and reverse-geocoding requests; the controlled malformed-request responses; the narrow
Capacitor CORS allowlist; and that disallowed origins receive `403`.

The current internal L2 deployment origin is:

```text
https://scenic-route.derrickhunt0.workers.dev
```

Use this exact HTTPS origin as `VITE_SCENIC_API_BASE_URL` for the next internal mobile build. Keep
the value environment-specific rather than hardcoding it in application or Capacitor source.

For a mobile build, set only the public backend origin and then rebuild and sync:

```powershell
$env:VITE_SCENIC_API_BASE_URL = "https://scenic-route.derrickhunt0.workers.dev"
bun run mobile:sync
Remove-Item Env:VITE_SCENIC_API_BASE_URL
```

For repeated local mobile work, the same public value may be placed in the ignored
`.env.mobile.local` file. It is an origin, not a credential. Never point a production mobile build
at localhost or plain HTTP.

## Updating and rollback

Run the full validation suite before every deployment, then rerun `bun run deploy`. Wrangler keeps
deployment versions in Cloudflare so an operator can roll back to a known-good version from the
Workers dashboard or with Wrangler's version deployment commands. Do not rewrite published Git
history: this repository is still connected to Lovable for source synchronization even though
runtime publishing is direct to Cloudflare.

On 2026-08-22, Worker version `9b7aa57d-8b7d-45cf-b457-1ef4848ab207` was deployed to
`https://scenic-route.derrickhunt0.workers.dev`. The home page and all five provider-backed APIs
returned `200`; production invalid Matrix traffic returned the documented `429`, and a valid Matrix
request returned `200` after counter recovery. Capacitor preflight remained `204`, and an arbitrary
origin remained `403`.

Coarse provider-quota abuse protection is now active and removes rate limiting from the broad-beta
blocker list. This does not make the API impossible to abuse. Distributed botnets, rotating proxy
pools, determined attackers with many source IPs, authentication, exact user-level quotas, and
billing/accounting remain future hardening concerns. Depending on scale and product design, later
controls can include authenticated accounts, Cloudflare WAF/bot controls, Turnstile where it fits a
human action, and provider-side commercial limits. Worker HTTP status logs/traces are sufficient
for L2.1 observability; no request identifiers, client IPs, Analytics Engine, or new database were
added.
