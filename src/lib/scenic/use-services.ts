import { useEffect, useState } from "react";
import { services } from "./services";
import type { BuildOptions } from "./routing";
import type { InterestId, LatLng, RouteProfile, ScenicRoute } from "./types";

interface ServiceResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * React adapter for the asynchronous routing boundary. Each effect ignores a
 * result after its inputs change or its consumer unmounts, so an older provider
 * response can never replace a newer route selection.
 */
export function useRoutes(
  from: LatLng,
  to: LatLng,
  opts: BuildOptions,
  enabled = true,
): ServiceResult<ScenicRoute[]> {
  const [result, setResult] = useState<ServiceResult<ScenicRoute[]>>({
    data: null,
    loading: enabled,
    error: null,
  });
  const interests = opts.interests.join(",");
  const { lat: fromLat, lng: fromLng } = from;
  const { lat: toLat, lng: toLng } = to;
  const { detourCap, pace } = opts;

  useEffect(() => {
    let current = true;
    if (!enabled) {
      setResult({ data: null, loading: false, error: null });
      return () => {
        current = false;
      };
    }
    setResult({ data: null, loading: true, error: null });
    services.routing
      .routes(
        { lat: fromLat, lng: fromLng },
        { lat: toLat, lng: toLng },
        {
          interests: interests.split(",").filter(Boolean) as InterestId[],
          detourCap,
          ...(pace ? { pace } : {}),
        },
      )
      .then(
        (data) => current && setResult({ data, loading: false, error: null }),
        (error: unknown) =>
          current &&
          setResult({
            data: null,
            loading: false,
            error: error instanceof Error ? error : new Error("Unable to build routes"),
          }),
      );
    return () => {
      current = false;
    };
  }, [fromLat, fromLng, toLat, toLng, interests, detourCap, pace, enabled]);

  return result;
}

export function useWanderRoute(
  from: LatLng,
  to: LatLng,
  minutes: number,
  opts: BuildOptions,
  enabled = true,
): ServiceResult<ScenicRoute> {
  const [result, setResult] = useState<ServiceResult<ScenicRoute>>({
    data: null,
    loading: enabled,
    error: null,
  });
  const interests = opts.interests.join(",");
  const { lat: fromLat, lng: fromLng } = from;
  const { lat: toLat, lng: toLng } = to;
  const { detourCap, pace } = opts;

  useEffect(() => {
    let current = true;
    if (!enabled) {
      setResult({ data: null, loading: false, error: null });
      return () => {
        current = false;
      };
    }
    setResult({ data: null, loading: true, error: null });
    services.routing
      .wander({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng }, minutes, {
        interests: interests.split(",").filter(Boolean) as InterestId[],
        detourCap,
        ...(pace ? { pace } : {}),
      })
      .then(
        (data) => current && setResult({ data, loading: false, error: null }),
        (error: unknown) =>
          current &&
          setResult({
            data: null,
            loading: false,
            error: error instanceof Error ? error : new Error("Unable to build a wander"),
          }),
      );
    return () => {
      current = false;
    };
  }, [fromLat, fromLng, toLat, toLng, minutes, interests, detourCap, pace, enabled]);

  return result;
}

export function useTripRoute(
  from: LatLng,
  to: LatLng,
  opts: BuildOptions,
  mode: "route" | "wander",
  profile: RouteProfile,
  wanderMinutes = 45,
  enabled = true,
): ServiceResult<ScenicRoute> {
  const [result, setResult] = useState<ServiceResult<ScenicRoute>>({
    data: null,
    loading: enabled,
    error: null,
  });
  const interests = opts.interests.join(",");
  const { lat: fromLat, lng: fromLng } = from;
  const { lat: toLat, lng: toLng } = to;
  const { detourCap, pace } = opts;

  useEffect(() => {
    let current = true;
    if (!enabled) {
      setResult({ data: null, loading: false, error: null });
      return () => {
        current = false;
      };
    }
    setResult({ data: null, loading: true, error: null });
    const request =
      mode === "wander"
        ? services.routing.wander(
            { lat: fromLat, lng: fromLng },
            { lat: toLat, lng: toLng },
            wanderMinutes,
            {
              interests: interests.split(",").filter(Boolean) as InterestId[],
              detourCap,
              ...(pace ? { pace } : {}),
            },
          )
        : services.routing
            .routes(
              { lat: fromLat, lng: fromLng },
              { lat: toLat, lng: toLng },
              {
                interests: interests.split(",").filter(Boolean) as InterestId[],
                detourCap,
                ...(pace ? { pace } : {}),
              },
            )
            .then((routes) => routes.find((route) => route.profile === profile) ?? routes[1]!);
    request.then(
      (data) => current && setResult({ data, loading: false, error: null }),
      (error: unknown) =>
        current &&
        setResult({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error("Unable to build route"),
        }),
    );
    return () => {
      current = false;
    };
  }, [
    fromLat,
    fromLng,
    toLat,
    toLng,
    interests,
    detourCap,
    pace,
    mode,
    profile,
    wanderMinutes,
    enabled,
  ]);

  return result;
}
