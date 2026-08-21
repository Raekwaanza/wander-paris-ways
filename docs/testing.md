# Testing and the pre-field-test gate

## Browser test architecture

The deterministic browser suite uses Chromium, the local TanStack Start server,
and the server-only `SCENIC_E2E_FIXTURES=1` provider seam. The seam is disabled
when `NODE_ENV=production`; it never uses a public `VITE_*` flag. The separate
live suite inherits `OPENROUTESERVICE_API_KEY` only in the server process.

## Pre-field-test gate

**REAL-WORLD DATA COLLECTION IS BLOCKED** until every command below has genuinely
executed successfully. A skipped live smoke test does not satisfy the gate.

```bash
bun install --frozen-lockfile
npm test
bunx playwright install chromium
npm run test:e2e
OPENROUTESERVICE_API_KEY=<server-side-env> npm run test:e2e:live
npm run build
```

PowerShell users should set the live key for the current process without adding
it to source control:

```powershell
$env:OPENROUTESERVICE_API_KEY="<server-side-env>"
npm run test:e2e:live
Remove-Item Env:OPENROUTESERVICE_API_KEY
```

The optional MapTiler live-geocoding smoke is deferred. Seeded-place browser
flows do not require a MapTiler credential. CI scaffolding does not satisfy this
gate or begin field collection.

## CI status

`.github/workflows/ci.yml` is intentionally manual-only (`workflow_dispatch`)
while the frozen dependency install and test stack await local validation. Its
presence is CI scaffolding, not evidence that any check passes. It uses the
official `oven-sh/setup-bun@v2` action with Bun `1.2.14`, pinned because the
repository does not currently declare another Bun version.

The workflow provides independent, read-only checks on Ubuntu with bounded
timeouts:

- **Unit tests** runs `bun install --frozen-lockfile` and `npm test`. It requires
  no ORS or MapTiler credentials.
- **Production build** runs `bun install --frozen-lockfile` and
  `npm run build`. It receives no provider credentials and does not enable
  `SCENIC_E2E_FIXTURES`.

The frozen install intentionally has no unlocked fallback: a mismatch between
`package.json` and `bun.lock` must fail. The jobs are separate and can run in
parallel so unit-test and production-compilation failures remain distinct.

The repository does not yet contain `@playwright/test`, a `test:e2e` package
script, `playwright.config.ts`, or E2E specs. Therefore the CI workflow does not
include a dead Browser E2E job. Once Step 15.2's Playwright structure exists,
add an independent **Browser E2E** job (20-minute timeout) that runs:

```text
bun install --frozen-lockfile
bunx playwright install --with-deps chromium
npm run test:e2e
```

That job must use only the server-side deterministic fixtures, require no ORS
or MapTiler credential, and upload `playwright-report/` and `test-results/` with
`actions/upload-artifact@v4` only on failure, with seven-day retention. No
browser, Bun, Node, or operating-system matrix is planned for this initial CI.

The live Playwright config and `test:e2e:live` script are also absent, so no live
routing workflow is scaffolded. If added later, it must remain manual-only,
validate the server-side `OPENROUTESERVICE_API_KEY` repository secret without
printing it, and must never become a normal pull-request gate.

Repository-wide lint is deliberately not a CI gate yet. Recent runs report
historical debt of approximately 37 errors and 6 warnings; omitting a knowingly
red lint job does not erase that debt, and it should be addressed separately.

### Future automatic activation

Only after the complete local pre-field gate above succeeds, change the trigger
from:

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

After the deterministic jobs have actually run green, branch protection may
optionally require the stable checks **Unit tests**, **Production build**, and
**Browser E2E**. Branch protection is not configured during CI scaffolding.
