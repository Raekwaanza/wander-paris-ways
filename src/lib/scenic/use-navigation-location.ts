import { useEffect, useState } from "react";
import {
  NAVIGATION_LOCATION_OPTIONS,
  navigationErrorStatus,
  navigationFixFromMeasurement,
  navigationFixStatus,
  type NavigationLocationFix,
  type NavigationLocationStatus,
} from "./navigation-location";
import type { LocationWatchHandle } from "./location-contracts";
import { scenicLocationProvider } from "./location-provider";

interface NavigationLocationState {
  fix: NavigationLocationFix | null;
  status: NavigationLocationStatus;
}

/** Keeps the latest usable navigation fix in memory and never updates the trip endpoint. */
export function useNavigationLocation(enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [foreground, setForeground] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  );
  const [state, setState] = useState<NavigationLocationState>({ fix: null, status: "idle" });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const updateForeground = () => setForeground(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", updateForeground);
    return () => document.removeEventListener("visibilitychange", updateForeground);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ fix: null, status: "idle" });
      return;
    }
    if (!foreground) {
      setState((current) => ({ ...current, status: "idle" }));
      return;
    }

    setState((current) => ({ ...current, status: "requesting" }));
    let disposed = false;
    let watchHandle: LocationWatchHandle | null = null;
    void scenicLocationProvider
      .watchPosition(
        NAVIGATION_LOCATION_OPTIONS,
        (measurement) => {
          if (disposed) return;
          const fix = navigationFixFromMeasurement(measurement);
          const status = navigationFixStatus(fix);
          setState((current) => ({
            status,
            // Poor or unsupported-area measurements never replace the last usable raw fix.
            fix: status === "tracking" ? fix : current.fix,
          }));
        },
        (error) => {
          if (!disposed) {
            setState((current) => ({ ...current, status: navigationErrorStatus(error) }));
          }
        },
      )
      .then((handle) => {
        if (disposed) void scenicLocationProvider.clearWatch(handle);
        else watchHandle = handle;
      })
      .catch((error) => {
        if (!disposed) {
          setState((current) => ({ ...current, status: navigationErrorStatus(error) }));
        }
      });

    return () => {
      disposed = true;
      if (watchHandle) void scenicLocationProvider.clearWatch(watchHandle);
    };
  }, [enabled, attempt, foreground]);

  return {
    ...state,
    retry: () => setAttempt((value) => value + 1),
  };
}
