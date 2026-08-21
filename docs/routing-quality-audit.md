# Step 8.3 routing quality audit

## Geometry flow and findings

1. **Requested points:** MapTiler place coordinates or the in-memory current GPS position are passed as the ORS request's two coordinates. Current-location privacy is unchanged.
2. **ORS network geometry:** each valid GeoJSON `LineString` coordinate is normalized directly from `[lng, lat]` to `{ lat, lng }`. No interpolation, POI insertion, or weaving occurs. The normalizer measures requested-to-route endpoint offsets in meters.
3. **Product geometry:** Fastest uses the provider-rank-zero candidate's `path`; Scenic and Explorer use their selected candidate's same `path`. `routeGeometrySignature` provides deterministic, six-decimal, value-based comparison across these layers. Corridor POIs influence selection and presentation, not geometry.
4. **Rendered geometry:** MapLibre creates its `LineString` by mapping each `route.path` point back to `[lng, lat]`, in order. Its route source now uses `tolerance: 0`, disabling source simplification without modifying stored geometry. The fallback SVG map uses straight line segments for real ORS routes rather than Catmull-Rom smoothing; mock previews retain their illustrative smoothing.

The code audit found no application modification of real route geometry. `weavePath` is confined to mock route construction. Before this milestone MapLibre's route GeoJSON source did not override its simplification tolerance, and the legacy renderer curved all route paths. These are rendering-layer risks; both were corrected without changing routing or candidate selection.

## Live-provider audit status

`OPENROUTESERVICE_API_KEY` was not available in the implementation environment. Consequently no endpoint snap distances, candidate selections, suspicious-segment classifications, or before/after visual conclusions are claimed for the five requested Paris pairs:

- Opéra → Place des Vosges
- Louvre → Luxembourg Gardens
- Musée Rodin → Hôtel de Ville
- Panthéon → Musée d'Orsay
- Palais Royal → Centre Pompidou

Production Directions requests had no explicit `radiuses` before this audit and remain unchanged. There was therefore no request-semantics or route-cache version change. Evidence does not currently justify a production snap limit.

## Developer audit tool

```bash
OPENROUTESERVICE_API_KEY=... node scripts/audit-walking-route.mjs \
  2.3316 48.8719 2.3655 48.8555 --geojson
```

The script uses the HeiGIT `foot-walking` Directions and Snap endpoints. Directions retains production's `shortest` preference and alternative-route settings, explicitly requests unsimplified geometry (`geometry_simplify: false`), and adds instructions plus `waytype`, `waycategory`, `surface`, and `suitability`. Snap uses a diagnostic-only 400 m radius. The report separates Snap API `snapped_distance` from geometric route endpoint offsets and includes candidate rank, summary, endpoints, vertex count, bounds, geometry signature, extras summaries, and restrained steps. `--raw` includes raw responses; `--geojson [file]` exports untracked visual-inspection data.

The next evidence-gathering action is to run the five-pair matrix with a valid key, inspect exported candidates at neighborhood, street, and building zoom, and classify endpoint-local versus mid-route anomalies. A production radius or provider/OSM escalation should follow only from those observations; local hand-drawn correction, building intersection APIs, candidate rejection, scoring changes, and alternate providers remain intentionally out of scope.
