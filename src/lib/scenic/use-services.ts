import { useEffect, useMemo, useState } from "react";
import { services } from "./services";
import { learnedPreferenceSignature } from "./preference-learning";
import type { BuildOptions } from "./routing";
import type {
  InterestId,
  LatLng,
  LearnedPreferenceSnapshot,
  RouteProfile,
  ScenicRoute,
  WanderRoute,
} from "./types";

interface ServiceResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function requestLearnedPreferences(signature: string): LearnedPreferenceSnapshot | undefined {
  if (!signature) return;
  const interestAffinities: LearnedPreferenceSnapshot["interestAffinities"] = {};
  for (const entry of signature.split("|")) {
    const [interest, value] = entry.split(":");
    if (interest && value) interestAffinities[interest as InterestId] = Number(value);
  }
  return { version: 1, interestAffinities, sourceFeedbackCount: 0 };
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
  const learnedSignature = learnedPreferenceSignature(opts.learnedPreferences);
  const learnedPreferences = useMemo(
    () => requestLearnedPreferences(learnedSignature),
    [learnedSignature],
  );

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
          ...(learnedPreferences ? { learnedPreferences } : {}),
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
  }, [
    fromLat,
    fromLng,
    toLat,
    toLng,
    interests,
    detourCap,
    pace,
    learnedSignature,
    learnedPreferences,
    enabled,
  ]);

  return result;
}

export function useWanderRoute(
  from: LatLng,
  to: LatLng,
  minutes: number,
  opts: BuildOptions,
  enabled = true,
): ServiceResult<WanderRoute> {
  const [result, setResult] = useState<ServiceResult<WanderRoute>>({
    data: null,
    loading: enabled,
    error: null,
  });
  const interests = opts.interests.join(",");
  const { lat: fromLat, lng: fromLng } = from;
  const { lat: toLat, lng: toLng } = to;
  const { detourCap, pace } = opts;
  const learnedSignature = learnedPreferenceSignature(opts.learnedPreferences);
  const learnedPreferences = useMemo(
    () => requestLearnedPreferences(learnedSignature),
    [learnedSignature],
  );

  useEffect(() => {
    let current = true;
    if (!enabled) {
      setResult({ data: null, loading: false, error: null });
      return () => {
        current = false;
      };
    }
    setResult({ data: null, loading: true, error: null });
    const timer = window.setTimeout(() => {
      services.routing
        .wander({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng }, minutes, {
          interests: interests.split(",").filter(Boolean) as InterestId[],
          detourCap,
          ...(pace ? { pace } : {}),
          ...(learnedPreferences ? { learnedPreferences } : {}),
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
    }, 300);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [
    fromLat,
    fromLng,
    toLat,
    toLng,
    minutes,
    interests,
    detourCap,
    pace,
    learnedSignature,
    learnedPreferences,
    enabled,
  ]);

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
  const learnedSignature = learnedPreferenceSignature(opts.learnedPreferences);
  const learnedPreferences = useMemo(
    () => requestLearnedPreferences(learnedSignature),
    [learnedSignature],
  );

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
              ...(learnedPreferences ? { learnedPreferences } : {}),
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
                ...(learnedPreferences ? { learnedPreferences } : {}),
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
    learnedSignature,
    learnedPreferences,
    mode,
    profile,
    wanderMinutes,
    enabled,
  ]);

  return result;
}
