# Testing and the pre-field-test gate

## Deterministic browser E2E

The deterministic Playwright suite runs in Chromium against real local TanStack
Start server processes. Its primary server receives the server-only
`SCENIC_E2E_FIXTURES=1` switch, so ORS-shaped route candidates pass through the
normal normalization, corridor analysis, scoring, selection, rendering, and
navigation-eligibility code. Fixture mode is disabled when
`NODE_ENV=production` and is never controlled by a public `VITE_*` variable.

A second credential-free server keeps fixtures disabled and exercises the
deterministic Preview fallback. Both servers explicitly blank ORS and MapTiler
credentials. Browser map-style requests are intercepted by the specs, so this
suite depends on no external APIs or internet access.

Install Chromium once, then run:

```bash
bunx playwright install chromium
bun run test:e2e
```

The six browser tests cover route planning, Fastest/Scenic/Explorer selection,
discovery details, provider-shaped navigation eligibility, Preview-only
navigation prevention, and missing-trip recovery. Generated HTML reports and
per-test output are written under `playwright-report/` and `test-results/` and
are ignored by Git.

Deterministic browser E2E requires no `OPENROUTESERVICE_API_KEY` or
`MAPTILER_API_KEY`, even when those variables exist in the developer's shell.

## Live ORS browser smoke

The live suite is deliberately one Chromium smoke test, not a duplicate of the
deterministic suite. It selects seeded Opéra Garnier and Place des Vosges data,
requests a route through Scenic Route's server/provider/domain pipeline, checks
for live OpenRouteService attribution and positive route facts, verifies that
navigation is enabled, and enters `/navigate` using the Fastest provider route.

The server explicitly receives `SCENIC_E2E_FIXTURES=0` and an empty
`MAPTILER_API_KEY`, so this smoke exercises ORS only. It uses no Playwright
retries and normally requires one ORS alternatives request; the navigation page
reuses the application route cache. Missing ORS credentials fail immediately
rather than skipping or passing against Preview/fixture data.

Run on shells that support inline environment assignment:

```bash
OPENROUTESERVICE_API_KEY=<server-side-key> bun run test:e2e:live
```

PowerShell equivalent:

```powershell
$env:OPENROUTESERVICE_API_KEY="<server-side-key>"
bun run test:e2e:live
Remove-Item Env:OPENROUTESERVICE_API_KEY
```

The key remains in the server process environment. It is never placed in a
`VITE_*` variable, URL, browser context, local storage, test assertion, report,
or application route state. MapTiler is not required because the smoke chooses
places from Scenic Route's seeded list.

`bun run build` deliberately removes provider credentials from the Vite child
process before producing production artifacts. Cloudflare deployment secrets
remain remote bindings; a credential present for the live smoke is therefore
not copied into `dist/server/.dev.vars` by a later local build.

## Pre-field-test gate

**REAL-WORLD DATA COLLECTION IS BLOCKED** until every command below has
genuinely executed successfully in the intended development environment:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run test
bunx playwright install chromium
bun run test:e2e
OPENROUTESERVICE_API_KEY=<server-side-key> bun run test:e2e:live
bun run build
```

Implementing the infrastructure or skipping the credential-dependent smoke is
not proof that this complete gate passed. The optional MapTiler live-geocoding
smoke remains deferred.

## Automatic CI regression gate

`.github/workflows/ci.yml` runs automatically for every pull request and every
push to `main`. It can also be started manually with `workflow_dispatch`. The
workflow contains four independent, credential-free jobs that run in parallel:

- **Unit Tests** — frozen install and `bun run test`;
- **Typecheck** — frozen install and `bun run typecheck`;
- **Production Build** — frozen install and `bun run build`; and
- **Browser E2E** — frozen install, Chromium installation, and deterministic
  `bun run test:e2e`.

Browser E2E uploads `playwright-report/` and `test-results/` only on failure,
with seven-day retention. No regular CI job receives ORS or MapTiler
credentials.

The automatic regression gate does not run `bun run test:e2e:live` and does not
claim to validate ORS availability. The live ORS smoke remains a deliberate
manual integration and field-readiness check that requires a real server-side
ORS credential. A separate manual secret-backed workflow can be added later if
the repository secret is configured and that operational cost is desired.

Repository-wide lint remains outside this gate and should be addressed
separately.
