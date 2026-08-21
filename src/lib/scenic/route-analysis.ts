import { nearestPointOnPath } from "./geo";
import type { Poi, RouteCorridorAnalysis, RouteCorridorPoi, WalkingRouteCandidate } from "./types";

export const DEFAULT_ROUTE_CORRIDOR_RADIUS_METERS = 120;
export const MAX_ROUTE_CORRIDOR_RADIUS_METERS = 500;

export function normalizeCorridorRadius(radiusMeters?: number): number {
  if (radiusMeters === undefined) return DEFAULT_ROUTE_CORRIDOR_RADIUS_METERS;
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return DEFAULT_ROUTE_CORRIDOR_RADIUS_METERS;
  }
  return Math.min(radiusMeters, MAX_ROUTE_CORRIDOR_RADIUS_METERS);
}

/** Pure corridor analysis over an already-fetched candidate and curated POIs. */
export function analyzeRouteCorridor(
  candidate: WalkingRouteCandidate,
  pois: Poi[],
  radiusMeters?: number,
): RouteCorridorAnalysis {
  const corridorRadiusMeters = normalizeCorridorRadius(radiusMeters);
  const corridorPois: RouteCorridorPoi[] = [];

  for (const poi of pois) {
    const projection = nearestPointOnPath(poi, candidate.path);
    if (!projection) continue;
    const distanceFromRouteMeters = projection.distanceKm * 1_000;
    if (distanceFromRouteMeters > corridorRadiusMeters) continue;
    corridorPois.push({
      poi,
      distanceFromRouteMeters,
      distanceAlongRouteMeters: projection.pathDistanceKm * 1_000,
      progress: projection.progress,
    });
  }

  corridorPois.sort(
    (a, b) =>
      a.distanceAlongRouteMeters - b.distanceAlongRouteMeters ||
      a.distanceFromRouteMeters - b.distanceFromRouteMeters ||
      a.poi.id.localeCompare(b.poi.id),
  );

  return { candidate, corridorRadiusMeters, pois: corridorPois };
}
