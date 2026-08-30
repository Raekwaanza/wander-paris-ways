# Testing and the pre-field-test gate

## Deterministic browser E2E

The implemented Playwright suite runs in Chromium against real local TanStack
Start server processes. Its primary server receives the server-only
`SCENIC_E2E_FIXTURES=1` switch, so ORS-shaped route candidates pass through the
normal route normalization, corridor analysis, scoring, selection, rendering,
and navigation-eligibility code. Fixture mode is disabled when
`NODE_ENV=production` and is never controlled by a public `VITE_*` variable.

A second credential-free local server keeps fixtures disabled and exercises the
existing deterministic Preview fallback. This verifies that estimated geometry
cannot start navigation. Both servers explicitly receive empty ORS and MapTiler
credentials, and browser map-tile requests are blocked by the specs, so the
suite does not depend on external APIs or internet access.

Install Chromium once, then run the suite:

```bash
bunx playwright install chromium
npm run test:e2e
```

The browser tests cover:

- choosing seeded start/destination data and generating Fastest, Scenic, and
  Explorer routes through the planner;
- selecting every route profile and observing its explanation and navigation
  action;
- opening and dismissing a Scenic discovery detail;
- entering navigation for provider-shaped deterministic geometry;
- preventing navigation for deterministic Preview geometry; and
- recovering from direct planning entry without required trip state.

Playwright writes its HTML report to `playwright-report/` and per-test output to
`test-results/`. Screenshots are retained on failure, and traces are captured on
the first retry. These generated directories are ignored by Git.

Deterministic browser E2E requires no `OPENROUTESERVICE_API_KEY` or
`MAPTILER_API_KEY`.

## Pre-field-test gate

**REAL-WORLD DATA COLLECTION IS BLOCKED** until every applicable gate has
genuinely executed successfully. The implemented local checks are:

```bash
bun install --frozen-lockfile
npm test
bunx playwright install chromium
npm run test:e2e
npm run build
```

Live-provider Playwright E2E and the `test:e2e:live` script are still deferred.
They must eventually validate server-side ORS behavior with a real
`OPENROUTESERVICE_API_KEY`; the optional MapTiler live-geocoding smoke is also
deferred. Until that live smoke exists and passes, the complete pre-field-test
gate has not passed. CI scaffolding and a green deterministic suite do not begin
field collection.

When live-provider tests are added, PowerShell users should set the key only for
the current process without adding it to source control:

```powershell
$env:OPENROUTESERVICE_API_KEY="<server-side-env>"
npm run test:e2e:live
Remove-Item Env:OPENROUTESERVICE_API_KEY
```

## CI status

`.github/workflows/ci.yml` remains intentionally manual-only
(`workflow_dispatch`) until the complete local pre-field gate is ready for
automatic enforcement. Its presence is scaffolding, not evidence that any check
passes. It uses the official `oven-sh/setup-bun@v2` action with Bun `1.2.14`,
pinned because the repository does not currently declare another Bun version.

The workflow currently provides independent Unit tests and Production build
jobs on Ubuntu. A future Browser E2E job should run the following with a bounded
20-minute timeout:

```text
bun install --frozen-lockfile
bunx playwright install --with-deps chromium
npm run test:e2e
```

That job must use only the server-side deterministic fixtures, require no ORS
or MapTiler credentials, and upload `playwright-report/` and `test-results/`
with `actions/upload-artifact@v4` only on failure and seven-day retention. No
browser, Bun, Node, or operating-system matrix is planned for this initial CI.

The live-provider suite must remain manual-only when it is implemented, validate
the server-side repository secret without printing it, and never become a normal
pull-request gate.

Repository-wide lint is deliberately not a CI gate yet. Historical lint debt
must be addressed separately from browser E2E.

### Future automatic activation

Only after the complete local pre-field gate succeeds, change the trigger from:

```yaml
on:
  workflow_dispatch:
```

to:

```yaml
on:
  pull_request:
  push:
    branches:
      - main
  workflow_dispatch:
```

Branch protection is not configured during this step.
