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
Pages, or custom-domain bindings.

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

The native API currently has validation, bounded request sizes, timeouts, and a narrow CORS policy,
but it does not have rate limiting or client authentication. A successful technical deployment is
appropriate for controlled validation, not a broad public beta. Add an explicit abuse-control plan
before advertising the endpoint widely.
