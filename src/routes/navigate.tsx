import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Navigation,
  RotateCcw,
  X,
} from "lucide-react";
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
import type { Poi, RouteInstructionManeuver, RouteProfile } from "@/lib/scenic/types";
import { LocationRecovery } from "@/components/scenic/LocationRecovery";
import { resolveTripEndpoint, resolvedPlace } from "@/lib/scenic/trip-endpoints";
import { isNetworkNavigableRoute } from "@/lib/scenic/navigation";
import { useNavigationLocation } from "@/lib/scenic/use-navigation-location";
import {
  matchNavigationPosition,
  initialDestinationArrivalState,
  stabilizeNavigationMatch,
  updateDestinationArrival,
  type DestinationArrivalState,
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
import {
  formatManeuverDistance,
  selectNavigationInstruction,
} from "@/lib/scenic/navigation-instructions";
import {
  initialPoiArrivalState,
  updatePoiArrivals,
  type PoiArrivalState,
} from "@/lib/scenic/navigation-poi-arrival";

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
  const destinationArrivalRef = useRef<DestinationArrivalState>(initialDestinationArrivalState());
  const [instructionIndex, setInstructionIndex] = useState(0);
  const poiArrivalRef = useRef<PoiArrivalState>(initialPoiArrivalState());
  const [poiArrivalQueue, setPoiArrivalQueue] = useState<Poi[]>([]);

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
    setInstructionIndex(0);
    setPoiArrivalQueue([]);
    poiArrivalRef.current = initialPoiArrivalState();
    const resetAdherence = initialRouteAdherenceState();
    routeAdherenceRef.current = resetAdherence;
    setRouteAdherence(resetAdherence);
    destinationArrivalRef.current = initialDestinationArrivalState();
  }, [route?.id]);

  useEffect(() => {
    if (navigationLocation.status !== "tracking") {
      const resetAdherence = initialRouteAdherenceState();
      routeAdherenceRef.current = resetAdherence;
      setRouteAdherence(resetAdherence);
      destinationArrivalRef.current = initialDestinationArrivalState();
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

    const poiArrival = updatePoiArrivals(poiArrivalRef.current, fix, route.discoveries);
    poiArrivalRef.current = poiArrival.state;
    if (poiArrival.newlyArrived.length > 0) {
      setPoiArrivalQueue((current) => [...current, ...poiArrival.newlyArrived]);
    }

    if (nextAdherence.status === "off-route") {
      destinationArrivalRef.current = initialDestinationArrivalState();
      return;
    }

    setRouteMatch((previous) => stabilizeNavigationMatch(previous, next));

    if (nextAdherence.status !== "on-route") {
      destinationArrivalRef.current = initialDestinationArrivalState();
      return;
    }

    const destination = route.path.at(-1);
    if (!destination) return;
    const arrival = updateDestinationArrival(destinationArrivalRef.current, {
      progress: next.progress,
      distanceToDestinationMeters: distanceKm(fix.point, destination) * 1_000,
      onRoute: true,
      timestamp: fix.timestamp,
    });
    destinationArrivalRef.current = arrival.state;
    if (arrival.arrived) {
      navigate({
        to: "/complete",
        search: { profile, routeId: route.id, completion: "arrival" },
      });
    }
  }, [navigate, navigationLocation.fix, navigationLocation.status, profile, route]);

  useEffect(() => {
    if (!route?.instructions?.length || routeAdherence.status === "off-route") return;
    const selected = selectNavigationInstruction(
      route.instructions,
      routeMatch?.distanceAlongRouteMeters ?? null,
      instructionIndex,
    );
    if (selected && selected.index !== instructionIndex) setInstructionIndex(selected.index);
  }, [instructionIndex, route?.instructions, routeAdherence.status, routeMatch]);

  if (!trip) {
    return <LocationRecovery reason="route-details" />;
  }

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
  const displayedInstruction = selectNavigationInstruction(
    route.instructions ?? [],
    routeMatch?.distanceAlongRouteMeters ?? null,
    instructionIndex,
  );
  const activePoiArrival = poiArrivalQueue[0] ?? null;

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
            {displayedInstruction && (
              <NavigationInstructionCard
                maneuver={displayedInstruction.instruction.maneuver}
                instruction={displayedInstruction.instruction.instruction}
                {...(displayedInstruction.instruction.streetName
                  ? { streetName: displayedInstruction.instruction.streetName }
                  : {})}
                distanceMeters={displayedInstruction.distanceToManeuverMeters}
                paused={routeAdherence.status === "off-route"}
              />
            )}

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

            {activePoiArrival && (
              <div
                className="surface-card border border-primary/30 bg-accent/60 p-4"
                aria-live="polite"
                role="status"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">You've reached {activePoiArrival.name}</p>
                    <button
                      type="button"
                      onClick={() => setDetail(activePoiArrival)}
                      className="mt-2 min-h-10 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View discovery
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPoiArrivalQueue((current) => current.slice(1))}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-background/70"
                    aria-label={`Dismiss arrival message for ${activePoiArrival.name}`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
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

function NavigationInstructionCard({
  maneuver,
  instruction,
  streetName,
  distanceMeters,
  paused,
}: {
  maneuver: RouteInstructionManeuver;
  instruction: string;
  streetName?: string;
  distanceMeters: number | null;
  paused: boolean;
}) {
  const ManeuverIcon =
    maneuver === "left" || maneuver === "sharp-left" || maneuver === "slight-left"
      ? CornerUpLeft
      : maneuver === "right" || maneuver === "sharp-right" || maneuver === "slight-right"
        ? CornerUpRight
        : maneuver === "u-turn"
          ? RotateCcw
          : maneuver === "arrive"
            ? Flag
            : maneuver === "unknown" || maneuver === "roundabout" || maneuver === "roundabout-exit"
              ? Navigation
              : ArrowUp;
  const usefulStreetName =
    streetName && !instruction.toLocaleLowerCase().includes(streetName.toLocaleLowerCase())
      ? streetName
      : undefined;
  return (
    <section
      className="surface-card border border-primary/30 p-4 shadow-card"
      aria-label="Walking direction"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ManeuverIcon className="size-6" strokeWidth={2} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          {paused ? (
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Guidance paused while off route
            </p>
          ) : distanceMeters !== null ? (
            <p className="text-sm font-semibold text-primary tabular-nums">
              {formatManeuverDistance(distanceMeters)}
            </p>
          ) : (
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Start of route
            </p>
          )}
          <p className="mt-0.5 text-lg leading-snug font-semibold">{instruction}</p>
          {usefulStreetName && (
            <p className="mt-1 text-sm text-muted-foreground">{usefulStreetName}</p>
          )}
        </div>
      </div>
    </section>
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
