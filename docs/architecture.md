# Scenic Route architecture

This document expands the implementation overview in [README.md](../README.md). It describes the current code rather than the historical product brief.

## Domain and service boundary

Domain contracts live in [`src/lib/scenic/types.ts`](../src/lib/scenic/types.ts). UI routes and Scenic components assemble user flows, while [`services.ts`](../src/lib/scenic/services.ts) owns the provider-facing interfaces for geocoding, reverse geocoding, POIs, walking routing, Wander, and route analysis. React request lifecycle handling lives in [`use-services.ts`](../src/lib/scenic/use-services.ts).

```mermaid
flowchart TD
  Pages[UI routes] --> Hooks[use-services.ts]
  Pages --> Services[services.ts]
  Hooks --> Services
  Services --> Curated[Curated POI and analysis modules]
  Services --> MapTiler[MapTiler server functions]
  Services --> ORS[ORS directions and Matrix server functions]
```

Credential-bearing HTTP requests must remain in server functions:

- [`maptiler-geocoding.server.ts`](../src/lib/scenic/maptiler-geocoding.server.ts) handles forward and reverse MapTiler requests. [`reverse-geocoding.server.ts`](../src/lib/scenic/reverse-geocoding.server.ts) provides the reverse-geocoding compatibility export.
- [`openrouteservice-routing.server.ts`](../src/lib/scenic/openrouteservice-routing.server.ts) handles ordinary alternatives and fixed via routes.
- [`openrouteservice-matrix.server.ts`](../src/lib/scenic/openrouteservice-matrix.server.ts) handles Wander duration matrices.
- [`e2e-provider-fixtures.server.ts`](../src/lib/scenic/e2e-provider-fixtures.server.ts) supplies deterministic provider results only under the guarded server-side test flag.

`VITE_SCENIC_DATA_MODE` currently configures the hybrid boundary rather than switching off keyed server operations. The hybrid set uses curated POIs, attempts MapTiler/ORS server calls when keys exist, and safely falls back when they do not. A complete `live` provider set is not implemented, so configured `live` mode warns and the service reports its active mode as `mock`.

## Ordinary route generation

1. The UI resolves the `TripPlan` endpoints into runtime `Place` values.
2. The route service requests ORS `foot-walking` directions with a bounded alternatives request.
3. Valid, distinct GeoJSON `LineString` features become `WalkingRouteCandidate` values. Provider rank zero is the direct baseline.
4. [`route-analysis.ts`](../src/lib/scenic/route-analysis.ts) projects curated POIs onto every candidate and retains those inside the default 120-metre corridor.
5. [`route-scoring.ts`](../src/lib/scenic/route-scoring.ts) evaluates existing corridor facts against the direct baseline. It does not route, insert POIs, or mutate geometry.
6. [`route-selection.ts`](../src/lib/scenic/route-selection.ts) chooses the best eligible Scenic candidate and, when available, a distinct discovery-focused Explorer candidate.
7. [`services.ts`](../src/lib/scenic/services.ts) materializes the chosen candidates as `ScenicRoute` objects using their original provider paths.

```mermaid
flowchart LR
  ORS[ORS LineStrings] --> Normalize[Validate and normalize]
  Normalize --> Analyze[Corridor POI analysis]
  Analyze --> Score[Deterministic scoring]
  Score --> Select[Scenic and Explorer selection]
  Select --> Route[ScenicRoute]
```

### Geometry and identity

Provider path vertices are never replaced with a hand-built POI path. This preserves the meaning of provider distance/duration, network walkability, map display, GPS projection, and stable route identity. The MapLibre source uses zero tolerance to avoid route simplification; the legacy renderer avoids smoothing real ORS routes.

Ordinary stable IDs separate Fastest identity from alternative candidate geometry. Sharing uses those IDs to detect a route that can no longer be reconstructed. Test fixture geometry is permitted only as an ORS test double outside production and still flows through normalization, analysis, scoring, and selection.

### Route semantics

- **Fastest** is provider rank zero, materialized as the direct unpersonalized baseline and selected by default on Plan.
- **Scenic** is the highest internal score that satisfies the detour cap, with a baseline fallback inside the real-candidate selection policy.
- **Explorer** considers discovery-backed, within-cap candidates and prioritizes discovery count and spread while avoiding Scenic duplication when possible.
- If ORS or a suitable real alternative is unavailable, corresponding synthetic routes from [`routing.ts`](../src/lib/scenic/routing.ts) remain Preview-only and fail the navigation guard.

## Wander planning

Wander's input is a total time budget and a required destination. It deliberately ignores the ordinary route detour-cap value.

1. Request the direct ORS route and analyze its corridor.
2. Return an `insufficient-time` direct route when the destination cannot fit within the bounded budget tolerance.
3. Return `direct-only` if insufficient extra room or no useful anchors exist.
4. [`wander-routing.ts`](../src/lib/scenic/wander-routing.ts) shortlists curated anchors using geometry, editorial value, explicit interests, and bounded learned preferences.
5. Request an ORS `foot-walking` duration Matrix for start, anchors, and destination.
6. Evaluate feasible one-/two-anchor sequences, then make a bounded number of fixed via-directions attempts.
7. Recheck the real via duration, analyze its actual corridor discoveries, score successful candidates, and materialize the chosen `targeted` route.
8. When direct ORS routing is unavailable, return a synthetic `preview` Wander route.

Routing anchors are not automatically claimed as discoveries. Displayed discoveries still come from corridor analysis of the returned route.

## Location and navigation pipeline

Current-location endpoint acquisition and active navigation are distinct:

- [`current-location.ts`](../src/lib/scenic/current-location.ts) performs a one-time high-accuracy `getCurrentPosition`, keeps the fix in module memory, and requests a best-effort reverse label.
- [`trip-endpoints.ts`](../src/lib/scenic/trip-endpoints.ts) converts that place into a persistable `live-current-location` sentinel.
- [`use-navigation-location.ts`](../src/lib/scenic/use-navigation-location.ts) starts and clears `watchPosition` for live navigation. It never updates the persisted trip endpoint.

```mermaid
flowchart TD
  Watch[watchPosition] --> Quality[Paris bounds and accuracy check]
  Quality --> Project[nearestPointOnPath]
  Project --> Adherence[Adherence hysteresis]
  Adherence -->|on route| Stabilize[Suppress small backward jitter]
  Adherence -->|confirmed off route| Freeze[Freeze displayed progress]
  Stabilize --> Progress[Along-route progress]
  Freeze --> Recovery[Consecutive near-route fixes]
  Recovery --> Progress
  Progress --> Discovery[Projected discovery selection]
  Progress --> Arrival[Progress plus destination distance]
```

[`navigation-location.ts`](../src/lib/scenic/navigation-location.ts) rejects fixes outside supported bounds or with missing/greater-than-100-metre accuracy. [`navigation-progress.ts`](../src/lib/scenic/navigation-progress.ts) projects a usable fix onto physical route length and suppresses only sub-30-metre backwards jitter. Larger backwards movement is retained.

[`navigation-adherence.ts`](../src/lib/scenic/navigation-adherence.ts) applies accuracy-aware near/far thresholds. Three consecutive away fixes confirm off-route; two consecutive reliable near-route fixes recover. The route page freezes displayed progress during confirmed off-route state. Arrival requires at least 98.5% route progress and physical proximity within 50 metres for two fixes. These thresholds are implementation constants, not provider guarantees.

[`navigation-discoveries.ts`](../src/lib/scenic/navigation-discoveries.ts) independently projects discoveries onto the selected path and sequences them by physical distance along it. Skip state is component memory only; no fabricated ETA is calculated.

## Persistence, privacy, and learning

[`store.ts`](../src/lib/scenic/store.ts) persists version 4 under `scenic-route:v1`. Hydration validates/migrates the trip and validates feedback and its optional learning snapshot. Persisted classes are preferences, saved route summaries, saved discovery IDs, the current trip, and up to 100 explicit feedback records.

Precise coordinates for a MapTiler-selected static endpoint are part of that endpoint, but a current-location endpoint persists only its sentinel. Continuous navigation fixes, adherence counters/history, arrival counters, and skipped discoveries never enter the store.

When a route or Wander trip is created, the UI derives a snapshot from recent valid feedback and stores that abstract snapshot on the `TripPlan`. The route hooks use the frozen trip value. Complete-page feedback is therefore future-facing and cannot rerank the trip just completed. [`preference-learning.ts`](../src/lib/scenic/preference-learning.ts) bounds recent evidence and affinity strength; [`route-scoring.ts`](../src/lib/scenic/route-scoring.ts) further caps learned blending so an explicit POI interest match remains stronger.

## Sharing and reconstruction

[`shared-route.ts`](../src/lib/scenic/shared-route.ts) defines a versioned, bounded payload encoded into the URL fragment. Only real ORS routes can produce it. It contains static rounded endpoints, route mode/profile/identity, explicit interests and planning options, discovery IDs, expected summaries, and validated targeted-Wander anchor IDs when applicable.

The payload deliberately excludes geometry, learned preferences, feedback, and GPS history. A current-location trip must pass the Complete-page disclosure before its resolved static endpoints enter the fragment.

The shared page decodes and validates the payload, then the routing service requests ORS again:

- Fastest must reproduce its stable endpoint-derived identity.
- Scenic/Explorer must contain the geometry-derived candidate identity among the new candidates.
- Wander must reproduce the stable identity for its direct or validated curated-anchor via route.

The result is `exact`, `changed`, or `unavailable`; input from an arbitrary URL is never trusted as route geometry.

## Maps and graceful fallback

[`ParisMap.tsx`](../src/components/scenic/ParisMap.tsx) dynamically starts MapLibre using the configured public style. It renders paths as GeoJSON, browser location separately from route endpoints, and curated discovery markers. Startup failure, WebGL failure, or a timeout activates [`LegacyParisMap.tsx`](../src/components/scenic/LegacyParisMap.tsx). This map fallback is separate from a route Preview fallback: map rendering can fall back while the underlying route remains real.

## Safety boundaries for future changes

- Do not put credentials in `VITE_*`, UI modules, localStorage, or shared payloads.
- Do not mutate real provider geometry to pass through curated POIs.
- Do not bypass `services.ts` with direct provider calls from route pages.
- Do not make Preview geometry navigable.
- Do not activate server fixtures in production or expose their flag publicly.
- Preserve the current-location sentinel and runtime-only navigation state unless a deliberate privacy/schema change is designed and migrated.
- Keep explicit interests stronger than learned preference unless product semantics are intentionally revised and tested.
