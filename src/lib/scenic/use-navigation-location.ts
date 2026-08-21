import { useEffect, useState } from "react";
import {
  NAVIGATION_LOCATION_OPTIONS,
  navigationErrorStatus,
  navigationFixFromPosition,
  navigationFixStatus,
  type NavigationLocationFix,
  type NavigationLocationStatus,
} from "./navigation-location";

interface NavigationLocationState {
  fix: NavigationLocationFix | null;
  status: NavigationLocationStatus;
}

/** Keeps the latest usable navigation fix in memory and never updates the trip endpoint. */
export function useNavigationLocation(enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<NavigationLocationState>({ fix: null, status: "idle" });

  useEffect(() => {
    if (!enabled) {
      setState({ fix: null, status: "idle" });
      return;
    }
    if (typeof window === "undefined" || !window.isSecureContext || !("geolocation" in navigator)) {
      setState((current) => ({ ...current, status: "unavailable" }));
      return;
    }

    setState((current) => ({ ...current, status: "requesting" }));
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const fix = navigationFixFromPosition(position);
        const status = navigationFixStatus(fix);
        setState((current) => ({
          status,
          // Poor or unsupported-area measurements never replace the last usable raw fix.
          fix: status === "tracking" ? fix : current.fix,
        }));
      },
      (error) => {
        setState((current) => ({ ...current, status: navigationErrorStatus(error) }));
      },
      NAVIGATION_LOCATION_OPTIONS,
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, attempt]);

  return {
    ...state,
    retry: () => setAttempt((value) => value + 1),
  };
}
