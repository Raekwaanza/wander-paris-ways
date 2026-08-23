import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Flag } from "lucide-react";
import { ParisMap } from "@/components/scenic/ParisMap";
import { SplitShell } from "@/components/scenic/SplitShell";
import { DiscoveryCard } from "@/components/scenic/DiscoveryCard";
import { DiscoveryDetail } from "@/components/scenic/DiscoveryDetail";
import { WhyThisRoute } from "@/components/scenic/WhyThisRoute";
import { CURRENT_LOCATION_ID } from "@/lib/scenic/places";
import { services } from "@/lib/scenic/services";
import { useTripRoute } from "@/lib/scenic/use-services";
import { ScenicLoader } from "@/components/scenic/ScenicLoader";
import { distanceKm } from "@/lib/scenic/geo";
import { usePreferences, useTrip } from "@/lib/scenic/store";
import type { Poi, RouteProfile } from "@/lib/scenic/types";
import { LocationRecovery } from "@/components/scenic/LocationRecovery";
import { resolveTripEndpoint, resolvedPlace } from "@/lib/scenic/trip-endpoints";
import { isNetworkNavigableRoute } from "@/lib/scenic/navigation";
import { useNavigationLocation } from "@/lib/scenic/use-navigation-location";
import {
  matchNavigationPosition,
  NAVIGATION_ARRIVAL_CONSECUTIVE_FIXES,
  NAVIGATION_ARRIVAL_DISTANCE_METERS,
  NAVIGATION_ARRIVAL_PROGRESS,
  stabilizeNavigationMatch,
  type NavigationRouteMatch,
} from "@/lib/scenic/navigation-progress";
import {
  initialRouteAdherenceState,
  updateRouteAdherence,
  type RouteAdherenceState,
} from "@/lib/scenic/navigation-adherence";
import {
  navigationDiscoveryState,
  placeDiscoveriesAlongRoute,
  selectNavigationDiscovery,
} from "@/lib/scenic/navigation-discoveries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/navigate")({
  validateSearch: (s: Record<string, unknown>) => ({
    profile: (["fastest", "scenic", "explorer"].includes(String(s["profile"]))
      ? String(s["profile"])
      : "scenic") as RouteProfile,
  }),
  head: () => ({
    meta: [
      { title: "Walking route — Scenic Route Paris" },
      {
        name: "description",
        content: "View your selected walking route with curated discoveries shown nearby.",
      },
      { property: "og:title", content: "Walking route — Scenic Route" },
      {
        property: "og:description",
        content: "View a walking route with curated discoveries shown nearby.",
      },
    ],
  }),
  component: NavigatePage,
});

function NavigatePage() {
  const navigate = useNavigate();
  const { profile } = Route.useSearch();
  const [trip] = useTrip();
  const [prefs] = usePreferences();
  const [detail, setDetail] = useState<Poi | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [routeMatch, setRouteMatch] = useState<NavigationRouteMatch | null>(null);
  const [routeAdherence, setRouteAdherence] = useState<RouteAdherenceState>(() =>
    initialRouteAdherenceState(),
  );
  const routeAdherenceRef = useRef(routeAdherence);
  const arrivalCountRef = useRef(0);

  const fromResolution = trip ? resolveTripEndpoint(trip.from) : null;
  const toResolution = trip ? resolveTripEndpoint(trip.to) : null;
  const resolvedFrom = fromResolution ? resolvedPlace(fromResolution) : undefined;
  const resolvedTo = toResolution ? resolvedPlace(toResolution) : undefined;
  const missingEndpoint =
    (fromResolution && fromResolution.status !== "resolved") ||
    (toResolution && toResolution.status !== "resolved");
  const from = resolvedFrom ?? services.geocoding.byId(CURRENT_LOCATION_ID)!;
  const to = resolvedTo ?? services.geocoding.byId("place-des-vosges")!;

  const { data: route, error } = useTripRoute(
    from,
    to,
    {
      interests: trip?.interests ?? prefs.interests,
      detourCap: trip?.detourCap ?? prefs.detourCap,
      pace: prefs.pace,
      ...(trip?.learnedPreferences ? { learnedPreferences: trip.learnedPreferences } : {}),
    },
    trip?.mode ?? "route",
    profile,
    trip?.wanderMinutes,
    Boolean(trip && !missingEndpoint),
  );
  const networkNavigable = Boolean(route && isNetworkNavigableRoute(route));
  const navigationLocation = useNavigationLocation(networkNavigable);
  const discoveryPlacements = useMemo(
    () => (route ? placeDiscoveriesAlongRoute(route.discoveries, route.path) : []),
    [route],
  );
  const skippedIds = useMemo(() => new Set(skipped), [skipped]);
  const activeDiscovery = selectNavigationDiscovery(
    discoveryPlacements,
    routeMatch?.distanceAlongRouteMeters ?? null,
    skippedIds,
  );
  const navigationDiscoveries = useMemo(
    () => discoveryPlacements.map(({ poi }) => poi),
    [discoveryPlacements],
  );

  useEffect(() => {
    setRouteMatch(null);
    setSkipped([]);
    setDetail(null);
    const resetAdherence = initialRouteAdherenceState();
    routeAdherenceRef.current = resetAdherence;
    setRouteAdherence(resetAdherence);
    arrivalCountRef.current = 0;
  }, [route?.id]);

  useEffect(() => {
    if (navigationLocation.status !== "tracking") {
      const resetAdherence = initialRouteAdherenceState();
      routeAdherenceRef.current = resetAdherence;
      setRouteAdherence(resetAdherence);
      arrivalCountRef.current = 0;
    }
  }, [navigationLocation.status]);

  useEffect(() => {
    const fix = navigationLocation.fix;
    if (!route || navigationLocation.status !== "tracking" || !fix || fix.accuracyMeters === null)
      return;
    const next = matchNavigationPosition(fix.point, route.path);
    if (!next) return;
    if (
      routeAdherenceRef.current.lastFixTimestamp !== null &&
      fix.timestamp <= routeAdherenceRef.current.lastFixTimestamp
    )
      return;
    const nextAdherence = updateRouteAdherence(routeAdherenceRef.current, {
      distanceToRouteMeters: next.distanceToRouteMeters,
      accuracyMeters: fix.accuracyMeters,
      timestamp: fix.timestamp,
    });
    routeAdherenceRef.current = nextAdherence;
    setRouteAdherence(nextAdherence);

    if (nextAdherence.status === "off-route") {
      arrivalCountRef.current = 0;
      return;
    }

    setRouteMatch((previous) => stabilizeNavigationMatch(previous, next));

    if (nextAdherence.status !== "on-route") {
      arrivalCountRef.current = 0;
      return;
    }

    const destination = route.path.at(-1);
    const arrived =
      next.progress >= NAVIGATION_ARRIVAL_PROGRESS &&
      Boolean(
        destination &&
        distanceKm(fix.point, destination) * 1_000 <= NAVIGATION_ARRIVAL_DISTANCE_METERS,
      );
    arrivalCountRef.current = arrived ? arrivalCountRef.current + 1 : 0;
    if (arrivalCountRef.current >= NAVIGATION_ARRIVAL_CONSECUTIVE_FIXES) {
      navigate({
        to: "/complete",
        search: { profile, routeId: route.id, completion: "arrival" },
      });
    }
  }, [navigate, navigationLocation.fix, navigationLocation.status, profile, route]);

  if (missingEndpoint) {
    const missingLocation =
      fromResolution?.status === "missing-current-location" ||
      toResolution?.status === "missing-current-location";
    return <LocationRecovery reason={missingLocation ? "location" : "route-details"} />;
  }

  if (!route) {
    return (
      <SplitShell
        showNav={false}
        map={<ParisMap start={from} end={to} padding={6} />}
        panel={
          error ? (
            <div className="p-6 text-sm text-muted-foreground">
              We couldn't load this route right now. Please go back and try again.
            </div>
          ) : (
            <ScenicLoader />
          )
        }
      />
    );
  }

  if (!isNetworkNavigableRoute(route)) {
    return (
      <SplitShell
        showNav={false}
        map={<ParisMap start={from} end={to} padding={6} />}
        panel={
          <div className="space-y-4 px-5 pt-8 pb-6">
            <div>
              <p className="text-eyebrow text-muted-foreground">Route preview</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                This route is preview-only
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Real pedestrian routing isn't available for this route right now, so walking
                directions are disabled.
              </p>
            </div>
            <Button asChild size="lg" className="w-full shadow-lift">
              <Link to="/plan">Back to routes</Link>
            </Button>
          </div>
        }
      />
    );
  }

  const progress = routeMatch?.progress ?? null;
  const remainingMin =
    progress === null ? route.minutes : Math.max(0, Math.round(route.minutes * (1 - progress)));
  const remainingKm =
    progress === null ? route.km : Math.round(route.km * (1 - progress) * 10) / 10;

  const discoveryContext =
    routeMatch === null
      ? "Route discovery"
      : activeDiscovery &&
          navigationDiscoveryState(activeDiscovery, routeMatch.distanceAlongRouteMeters) ===
            "current"
        ? "Nearby"
        : activeDiscovery &&
            activeDiscovery.distanceAlongRouteMeters >= routeMatch.distanceAlongRouteMeters
          ? "Coming up near the route"
          : undefined;

  return (
    <>
      <SplitShell
        showNav={false}
        map={
          <ParisMap
            routes={[{ route, active: true }]}
            start={from}
            end={to}
            user={navigationLocation.fix?.point}
            discoveries={navigationDiscoveries}
            activeDiscoveryId={activeDiscovery?.poi.id ?? null}
            onSelectDiscovery={setDetail}
            padding={6}
          />
        }
        header={
          <div className="pointer-events-auto flex items-center justify-between gap-2">
            <Link
              to="/plan"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/90 shadow-card backdrop-blur"
              aria-label="Back to routes"
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} />
            </Link>
            <div className="rounded-full border border-border bg-card/90 px-3.5 py-2 text-sm shadow-card backdrop-blur">
              {progress === null ? (
                <>
                  <span className="font-semibold tabular-nums">About {remainingMin} min</span>
                  <span className="text-muted-foreground"> · {remainingKm} km</span>
                </>
              ) : (
                <>
                  <span className="font-semibold tabular-nums">≈{remainingMin} min</span>
                  <span className="text-muted-foreground"> · ≈{remainingKm} km left</span>
                </>
              )}
            </div>
            <div className="size-10" aria-hidden="true" />
          </div>
        }
        panel={
          <div className="space-y-4 px-5 pt-4 pb-6">
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-eyebrow text-muted-foreground">
                  Walking route · {route.title} · {to.name}
                </p>
                {progress !== null && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Route progress {Math.round(progress * 100)}%
                  </span>
                )}
              </div>
              {progress !== null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              )}
              <NavigationLocationMessage
                status={navigationLocation.status}
                onRetry={navigationLocation.retry}
              />
            </div>

            {navigationLocation.status === "tracking" && routeAdherence.status === "off-route" && (
              <div
                className="surface-card border border-primary/40 bg-secondary/80 p-4"
                aria-live="polite"
                role="status"
              >
                <p className="text-sm font-semibold">You may be off the planned route</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your location has stayed away from the highlighted route for several GPS updates.
                  The route hasn't changed. Return to the highlighted route when it is safe and
                  convenient.
                </p>
              </div>
            )}

            {activeDiscovery ? (
              <DiscoveryCard
                key={activeDiscovery.poi.id}
                poi={activeDiscovery.poi}
                contextLabel={discoveryContext}
                onLearnMore={() => setDetail(activeDiscovery.poi)}
                onSkip={() => setSkipped((s) => [...s, activeDiscovery.poi.id])}
              />
            ) : (
              <div className="surface-card p-4">
                <p className="text-sm font-medium">Continue the route to {to.name}.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No more curated discoveries remain in this route sequence.
                </p>
              </div>
            )}

            <WhyThisRoute route={route} />

            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() =>
                navigate({
                  to: "/complete",
                  search: { profile, routeId: route.id, completion: "manual" },
                })
              }
              className="w-full"
            >
              <Flag className="size-4" strokeWidth={1.75} />
              Finish route
            </Button>
          </div>
        }
      />
      <DiscoveryDetail poi={detail} onOpenChange={() => setDetail(null)} />
    </>
  );
}

function NavigationLocationMessage({
  status,
  onRetry,
}: {
  status: ReturnType<typeof useNavigationLocation>["status"];
  onRetry: () => void;
}) {
  if (status === "tracking" || status === "idle") return null;
  const message =
    status === "requesting"
      ? "Finding your location…"
      : status === "low-accuracy"
        ? "Improving location accuracy…"
        : status === "permission-denied"
          ? "Location access is turned off. Enable it in browser or system settings for live progress."
          : status === "outside-supported-area"
            ? "Live walking progress is currently available within Paris."
            : "Your location is temporarily unavailable. You can still view the route.";
  const retryable = status === "permission-denied" || status === "unavailable";
  return (
    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>{message}</span>
      {retryable && (
        <button type="button" onClick={onRetry} className="shrink-0 font-medium text-foreground">
          Try location again
        </button>
      )}
    </div>
  );
}
