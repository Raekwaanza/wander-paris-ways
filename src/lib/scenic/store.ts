import { useCallback, useSyncExternalStore } from "react";
import type { Poi, Preferences, SavedRoute, TripPlan } from "./types";
import { migrateLegacyTripEndpoint, validateTripEndpoint } from "./trip-endpoints";

const KEY = "scenic-route:v1";

interface State {
  version: 2;
  prefs: Preferences;
  savedRoutes: SavedRoute[];
  savedDiscoveries: string[];
  trip: TripPlan | null;
}

const DEFAULT_STATE: State = {
  version: 2,
  prefs: {
    interests: [],
    detourCap: 20,
    pace: "steady",
    units: "km",
    seenIntro: false,
  },
  savedRoutes: [],
  savedDiscoveries: [],
  trip: null,
};

let state: State = DEFAULT_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — preferences stay in memory only */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) return;
      const { prefs, savedRoutes, savedDiscoveries, trip } = parsed;
      state = {
        ...DEFAULT_STATE,
        prefs: isRecord(prefs) ? { ...DEFAULT_STATE.prefs, ...prefs } : DEFAULT_STATE.prefs,
        savedRoutes: Array.isArray(savedRoutes) ? (savedRoutes as SavedRoute[]) : [],
        savedDiscoveries: Array.isArray(savedDiscoveries)
          ? savedDiscoveries.filter((id): id is string => typeof id === "string")
          : [],
        trip: hydrateTrip(trip),
      };
      // Rewrite legacy or malformed trip data in the validated v2 shape while
      // retaining independently stored preferences and saved items.
      persist();
      emit();
    }
  } catch {
    /* ignore malformed storage */
  }
}

function hydrateTrip(value: unknown): TripPlan | null {
  if (!isRecord(value)) return null;
  const { from: rawFrom, to: rawTo, fromId, toId, ...fields } = value;
  const { interests, detourCap, mode, wanderMinutes, createdAt } = fields;
  const from = validateTripEndpoint(rawFrom) ?? migrateLegacyTripEndpoint(fromId);
  const to = validateTripEndpoint(rawTo) ?? migrateLegacyTripEndpoint(toId);
  if (
    !from ||
    !to ||
    !Array.isArray(interests) ||
    !interests.every((interest) => typeof interest === "string") ||
    typeof detourCap !== "number" ||
    !Number.isFinite(detourCap) ||
    (mode !== "route" && mode !== "wander") ||
    typeof createdAt !== "number" ||
    !Number.isFinite(createdAt) ||
    (wanderMinutes !== undefined &&
      (typeof wanderMinutes !== "number" || !Number.isFinite(wanderMinutes)))
  ) {
    return null;
  }
  return {
    from,
    to,
    interests: interests as TripPlan["interests"],
    detourCap,
    mode,
    ...(typeof wanderMinutes === "number" ? { wanderMinutes } : {}),
    createdAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(updater: (s: State) => State) {
  state = updater(state);
  persist();
  emit();
}

function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(DEFAULT_STATE),
  );
}

export function usePreferences() {
  const prefs = useStore((s) => s.prefs);
  const update = useCallback((patch: Partial<Preferences>) => {
    setState((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
  }, []);
  return [prefs, update] as const;
}

export function useTrip() {
  const trip = useStore((s) => s.trip);
  const setTrip = useCallback((next: TripPlan | null) => {
    setState((s) => ({ ...s, trip: next }));
  }, []);
  return [trip, setTrip] as const;
}

export function useSavedRoutes() {
  const savedRoutes = useStore((s) => s.savedRoutes);
  const saveRoute = useCallback((route: SavedRoute) => {
    setState((s) => ({
      ...s,
      savedRoutes: [route, ...s.savedRoutes.filter((r) => r.id !== route.id)],
    }));
  }, []);
  const removeRoute = useCallback((id: string) => {
    setState((s) => ({ ...s, savedRoutes: s.savedRoutes.filter((r) => r.id !== id) }));
  }, []);
  return { savedRoutes, saveRoute, removeRoute };
}

export function useSavedDiscoveries() {
  const saved = useStore((s) => s.savedDiscoveries);
  const toggle = useCallback((poi: Poi) => {
    setState((s) => ({
      ...s,
      savedDiscoveries: s.savedDiscoveries.includes(poi.id)
        ? s.savedDiscoveries.filter((id) => id !== poi.id)
        : [poi.id, ...s.savedDiscoveries],
    }));
  }, []);
  return { saved, toggle };
}
