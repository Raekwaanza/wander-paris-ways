import { distanceKm } from "./geo";
import type { NavigationLocationFix } from "./navigation-location";
import type { Poi } from "./types";

export const NAVIGATION_POI_ARRIVAL_DISTANCE_METERS = 40;
export const NAVIGATION_POI_ARRIVAL_MAX_ACCURACY_METERS = 50;
export const NAVIGATION_POI_ARRIVAL_CONSECUTIVE_FIXES = 2;

export interface PoiArrivalState {
  arrivedPoiIds: string[];
  consecutiveFixesByPoiId: Record<string, number>;
  lastFixTimestamp: number | null;
}

export interface PoiArrivalUpdate {
  state: PoiArrivalState;
  newlyArrived: Poi[];
}

export function initialPoiArrivalState(): PoiArrivalState {
  return { arrivedPoiIds: [], consecutiveFixesByPoiId: {}, lastFixTimestamp: null };
}

/** Requires two accurate, time-ordered GPS fixes near the POI's real coordinates. */
export function updatePoiArrivals(
  previous: PoiArrivalState,
  fix: NavigationLocationFix,
  pois: readonly Poi[],
): PoiArrivalUpdate {
  if (previous.lastFixTimestamp !== null && fix.timestamp <= previous.lastFixTimestamp) {
    return { state: previous, newlyArrived: [] };
  }
  if (
    fix.accuracyMeters === null ||
    fix.accuracyMeters > NAVIGATION_POI_ARRIVAL_MAX_ACCURACY_METERS
  ) {
    return {
      state: { ...previous, consecutiveFixesByPoiId: {}, lastFixTimestamp: fix.timestamp },
      newlyArrived: [],
    };
  }

  const arrived = new Set(previous.arrivedPoiIds);
  const counts: Record<string, number> = {};
  const newlyArrived: Poi[] = [];
  for (const poi of pois) {
    if (arrived.has(poi.id)) continue;
    const close = distanceKm(fix.point, poi) * 1_000 <= NAVIGATION_POI_ARRIVAL_DISTANCE_METERS;
    const count = close ? (previous.consecutiveFixesByPoiId[poi.id] ?? 0) + 1 : 0;
    if (count >= NAVIGATION_POI_ARRIVAL_CONSECUTIVE_FIXES) {
      arrived.add(poi.id);
      newlyArrived.push(poi);
    } else if (count > 0) {
      counts[poi.id] = count;
    }
  }
  return {
    state: {
      arrivedPoiIds: [...arrived],
      consecutiveFixesByPoiId: counts,
      lastFixTimestamp: fix.timestamp,
    },
    newlyArrived,
  };
}
