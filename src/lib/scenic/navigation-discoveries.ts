import { nearestPointOnPath } from "./geo";
import { DEFAULT_ROUTE_CORRIDOR_RADIUS_METERS } from "./route-analysis";
import type { LatLng, Poi } from "./types";

/** Keeps a discovery active briefly after its route anchor to absorb projection noise. */
export const NAVIGATION_DISCOVERY_PASSED_BUFFER_METERS = 60;
export const NAVIGATION_DISCOVERY_CURRENT_AHEAD_METERS = 80;
export const NAVIGATION_DISCOVERY_CURRENT_BEHIND_METERS = 40;

export interface NavigationDiscoveryPlacement {
  poi: Poi;
  distanceAlongRouteMeters: number;
  distanceFromRouteMeters: number;
  progress: number;
}

export type NavigationDiscoveryState = "upcoming" | "current" | "passed";

/** Projects displayed discoveries onto the selected route without changing either input. */
export function placeDiscoveriesAlongRoute(
  discoveries: readonly Poi[],
  routePath: LatLng[],
): NavigationDiscoveryPlacement[] {
  if (routePath.length === 0) return [];

  return discoveries
    .flatMap((poi): NavigationDiscoveryPlacement[] => {
      const nearest = nearestPointOnPath(poi, routePath);
      if (!nearest) return [];

      const placement = {
        poi,
        distanceAlongRouteMeters: nearest.pathDistanceKm * 1_000,
        distanceFromRouteMeters: nearest.distanceKm * 1_000,
        progress: nearest.progress,
      };
      const validPlacement =
        Number.isFinite(placement.distanceAlongRouteMeters) &&
        Number.isFinite(placement.distanceFromRouteMeters) &&
        Number.isFinite(placement.progress) &&
        placement.distanceFromRouteMeters <= DEFAULT_ROUTE_CORRIDOR_RADIUS_METERS;
      return validPlacement ? [placement] : [];
    })
    .sort(
      (a, b) =>
        a.distanceAlongRouteMeters - b.distanceAlongRouteMeters || a.poi.id.localeCompare(b.poi.id),
    );
}

/** Selects the first non-skipped discovery that is not sufficiently behind route progress. */
export function selectNavigationDiscovery(
  placements: readonly NavigationDiscoveryPlacement[],
  userDistanceAlongRouteMeters: number | null,
  skippedPoiIds: ReadonlySet<string>,
): NavigationDiscoveryPlacement | null {
  const minimumDistance =
    userDistanceAlongRouteMeters === null
      ? Number.NEGATIVE_INFINITY
      : userDistanceAlongRouteMeters - NAVIGATION_DISCOVERY_PASSED_BUFFER_METERS;

  return (
    placements.find(
      ({ poi, distanceAlongRouteMeters }) =>
        !skippedPoiIds.has(poi.id) && distanceAlongRouteMeters >= minimumDistance,
    ) ?? null
  );
}

export function navigationDiscoveryState(
  placement: NavigationDiscoveryPlacement,
  userDistanceAlongRouteMeters: number,
): NavigationDiscoveryState {
  const delta = placement.distanceAlongRouteMeters - userDistanceAlongRouteMeters;
  if (delta < -NAVIGATION_DISCOVERY_PASSED_BUFFER_METERS) return "passed";
  if (
    delta >= -NAVIGATION_DISCOVERY_CURRENT_BEHIND_METERS &&
    delta <= NAVIGATION_DISCOVERY_CURRENT_AHEAD_METERS
  ) {
    return "current";
  }
  return "upcoming";
}
