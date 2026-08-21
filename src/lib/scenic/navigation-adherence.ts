/** Conservative, accuracy-aware thresholds for local route-adherence decisions. */
export const NAVIGATION_OFF_ROUTE_BASE_METERS = 70;
export const NAVIGATION_OFF_ROUTE_ACCURACY_MULTIPLIER = 1.5;
export const NAVIGATION_ON_ROUTE_BASE_METERS = 40;
export const NAVIGATION_ON_ROUTE_ACCURACY_MULTIPLIER = 1;
export const NAVIGATION_OFF_ROUTE_CONSECUTIVE_FIXES = 3;
export const NAVIGATION_ON_ROUTE_RECOVERY_FIXES = 2;

export type RouteAdherenceStatus = "unknown" | "on-route" | "suspected-off-route" | "off-route";

export interface RouteAdherenceState {
  status: RouteAdherenceStatus;
  consecutiveAwayFixes: number;
  consecutiveRecoveryFixes: number;
  lastFixTimestamp: number | null;
}

export interface RouteAdherenceObservation {
  distanceToRouteMeters: number;
  accuracyMeters: number;
  timestamp: number;
}

export function initialRouteAdherenceState(): RouteAdherenceState {
  return {
    status: "unknown",
    consecutiveAwayFixes: 0,
    consecutiveRecoveryFixes: 0,
    lastFixTimestamp: null,
  };
}

export function offRouteThresholdMeters(accuracyMeters: number): number {
  return Math.max(
    NAVIGATION_OFF_ROUTE_BASE_METERS,
    accuracyMeters * NAVIGATION_OFF_ROUTE_ACCURACY_MULTIPLIER,
  );
}

export function onRouteThresholdMeters(accuracyMeters: number): number {
  return Math.max(
    NAVIGATION_ON_ROUTE_BASE_METERS,
    accuracyMeters * NAVIGATION_ON_ROUTE_ACCURACY_MULTIPLIER,
  );
}

/**
 * Evaluates one already-accepted GPS fix. The nearest geometric segment can be
 * ambiguous on self-crossing routes; continuity-aware map matching is deferred.
 */
export function updateRouteAdherence(
  previous: RouteAdherenceState,
  observation: RouteAdherenceObservation,
): RouteAdherenceState {
  if (previous.lastFixTimestamp !== null && observation.timestamp <= previous.lastFixTimestamp) {
    return previous;
  }

  if (previous.status === "off-route") {
    const recovering =
      observation.distanceToRouteMeters <= onRouteThresholdMeters(observation.accuracyMeters);
    const consecutiveRecoveryFixes = recovering ? previous.consecutiveRecoveryFixes + 1 : 0;
    if (consecutiveRecoveryFixes >= NAVIGATION_ON_ROUTE_RECOVERY_FIXES) {
      return {
        status: "on-route",
        consecutiveAwayFixes: 0,
        consecutiveRecoveryFixes: 0,
        lastFixTimestamp: observation.timestamp,
      };
    }
    return {
      status: "off-route",
      consecutiveAwayFixes: 0,
      consecutiveRecoveryFixes,
      lastFixTimestamp: observation.timestamp,
    };
  }

  const away =
    observation.distanceToRouteMeters > offRouteThresholdMeters(observation.accuracyMeters);
  if (!away) {
    return {
      status: "on-route",
      consecutiveAwayFixes: 0,
      consecutiveRecoveryFixes: 0,
      lastFixTimestamp: observation.timestamp,
    };
  }

  const consecutiveAwayFixes = previous.consecutiveAwayFixes + 1;
  return {
    status:
      consecutiveAwayFixes >= NAVIGATION_OFF_ROUTE_CONSECUTIVE_FIXES
        ? "off-route"
        : "suspected-off-route",
    consecutiveAwayFixes,
    consecutiveRecoveryFixes: 0,
    lastFixTimestamp: observation.timestamp,
  };
}
