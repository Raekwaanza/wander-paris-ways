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
flows do not require a MapTiler credential. Step 15.3 will add CI; this step does
not add GitHub Actions or begin field collection.
