import { nearestPointOnPath } from "./geo";
import type { LatLng } from "./types";

export const NAVIGATION_BACKTRACK_JITTER_METERS = 30;
export const NAVIGATION_ARRIVAL_PROGRESS = 0.985;
export const NAVIGATION_ARRIVAL_DISTANCE_METERS = 50;
export const NAVIGATION_ARRIVAL_CONSECUTIVE_FIXES = 2;

export interface NavigationRouteMatch {
  progress: number;
  distanceAlongRouteMeters: number;
  distanceToRouteMeters: number;
  projectedPoint: LatLng;
}

export function matchNavigationPosition(
  point: LatLng,
  routePath: LatLng[],
): NavigationRouteMatch | null {
  const nearest = nearestPointOnPath(point, routePath);
  if (!nearest) return null;
  return {
    progress: nearest.progress,
    distanceAlongRouteMeters: nearest.pathDistanceKm * 1_000,
    distanceToRouteMeters: nearest.distanceKm * 1_000,
    projectedPoint: nearest.nearestPoint,
  };
}

/** Suppresses only small backwards changes; genuine backtracking remains visible. */
export function stabilizeNavigationMatch(
  previous: NavigationRouteMatch | null,
  next: NavigationRouteMatch,
): NavigationRouteMatch {
  if (
    previous &&
    next.distanceAlongRouteMeters < previous.distanceAlongRouteMeters &&
    previous.distanceAlongRouteMeters - next.distanceAlongRouteMeters <
      NAVIGATION_BACKTRACK_JITTER_METERS
  ) {
    return {
      ...next,
      progress: previous.progress,
      distanceAlongRouteMeters: previous.distanceAlongRouteMeters,
    };
  }
  return next;
}
