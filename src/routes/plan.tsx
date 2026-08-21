import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ParisMap } from "@/components/scenic/ParisMap";
import { SplitShell } from "@/components/scenic/SplitShell";
import { RouteCard } from "@/components/scenic/RouteCard";
import { WhyThisRoute } from "@/components/scenic/WhyThisRoute";
import { DiscoveryDetail } from "@/components/scenic/DiscoveryDetail";
import { ScenicLoader } from "@/components/scenic/ScenicLoader";
import { CURRENT_LOCATION_ID } from "@/lib/scenic/places";
import { services } from "@/lib/scenic/services";
import { useRoutes } from "@/lib/scenic/use-services";
import { usePreferences, useTrip } from "@/lib/scenic/store";
import type { Poi, RouteProfile } from "@/lib/scenic/types";
import { LocationRecovery } from "@/components/scenic/LocationRecovery";
import { resolveTripEndpoint, resolvedPlace } from "@/lib/scenic/trip-endpoints";
import { isNetworkNavigableRoute } from "@/lib/scenic/navigation";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Compare routes — Scenic Route Paris" },
      {
        name: "description",
        content: "Compare direct and discovery-oriented walking routes through Paris.",
      },
      { property: "og:title", content: "Fastest, Scenic or Explorer" },
      {
        property: "og:description",
        content: "Compare walking options and curated discoveries before you set out.",
      },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const navigate = useNavigate();
  const [trip] = useTrip();
  const [prefs] = usePreferences();
  const [selected, setSelected] = useState<RouteProfile>("fastest");
  const [showLoader, setShowLoader] = useState(true);
  const [detail, setDetail] = useState<Poi | null>(null);

  const fromResolution = trip ? resolveTripEndpoint(trip.from) : null;
  const toResolution = trip ? resolveTripEndpoint(trip.to) : null;
  const resolvedFrom = fromResolution ? resolvedPlace(fromResolution) : undefined;
  const resolvedTo = toResolution ? resolvedPlace(toResolution) : undefined;
  const missingEndpoint =
    (fromResolution && fromResolution.status !== "resolved") ||
    (toResolution && toResolution.status !== "resolved");
  const from = resolvedFrom ?? services.geocoding.byId(CURRENT_LOCATION_ID)!;
  const to = resolvedTo ?? services.geocoding.byId("place-des-vosges")!;

  const { data: routes, error } = useRoutes(
    from,
    to,
    {
      interests: trip?.interests ?? prefs.interests,
      detourCap: trip?.detourCap ?? prefs.detourCap,
      pace: prefs.pace,
    },
    Boolean(trip && !missingEndpoint),
  );

  useEffect(() => {
    setShowLoader(true);
    const timer = setTimeout(() => setShowLoader(false), 1500);
    return () => clearTimeout(timer);
  }, [from.id, to.id]);

  if (missingEndpoint) {
    const missingLocation =
      fromResolution?.status === "missing-current-location" ||
      toResolution?.status === "missing-current-location";
    return <LocationRecovery reason={missingLocation ? "location" : "route-details"} />;
  }

  if (!routes || showLoader) {
    return (
      <SplitShell
        map={<ParisMap start={from} end={to} padding={7} />}
        panel={
          error ? (
            <div className="p-6 text-sm text-muted-foreground">
              We couldn't build your routes right now. Please go back and try again.
            </div>
          ) : (
            <ScenicLoader />
          )
        }
      />
    );
  }

  const active = routes.find((r) => r.profile === selected) ?? routes[1]!;
  const navigationReady = isNetworkNavigableRoute(active);
  const noWorthwhileDetour = active.discoveries.length === 0 && selected !== "fastest";
  const emptyDiscoveryRouteIsReal = noWorthwhileDetour && navigationReady;

  return (
    <>
      <SplitShell
        map={
          <ParisMap
            routes={routes.map((r) => ({ route: r, active: r.profile === selected }))}
            start={from}
            end={to}
            discoveries={active.discoveries}
            onSelectDiscovery={setDetail}
            padding={7}
          />
        }
        header={
          <Link
            to="/explore"
            className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/90 shadow-card backdrop-blur"
            aria-label="Back to search"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} />
          </Link>
        }
        panel={
          <div className="space-y-4 px-5 pt-4 pb-6">
            <div>
              <p className="text-eyebrow text-muted-foreground">Walking</p>
              <h1 className="text-display text-xl">
                {from.name} → {to.name}
              </h1>
            </div>

            <div className="space-y-2.5">
              {routes.map((r) => (
                <RouteCard
                  key={r.profile}
                  route={r}
                  selected={r.profile === selected}
                  recommended={r.profile === "scenic" && isNetworkNavigableRoute(r)}
                  onSelect={() => setSelected(r.profile)}
                />
              ))}
            </div>

            {noWorthwhileDetour ? (
              <div className="rounded-2xl border border-border bg-secondary/60 p-4">
                <p className="text-sm font-medium">
                  {emptyDiscoveryRouteIsReal
                    ? "No curated discoveries were identified along this route."
                    : "No curated discoveries fit this preview."}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {emptyDiscoveryRouteIsReal
                    ? "You can still take the walking route, or adjust your interests and available extra time."
                    : "Try the direct route or adjust your interests and available extra time."}
                </p>
              </div>
            ) : (
              <WhyThisRoute route={active} />
            )}

            {active.discoveries.length > 0 && (
              <div>
                <h2 className="text-eyebrow text-muted-foreground">You'll pass</h2>
                <ul className="mt-2 space-y-1.5">
                  {active.discoveries.map((d, i) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setDetail(d)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left hover:bg-secondary"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold tabular-nums">
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{d.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {d.kicker}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <button
                type="button"
                disabled={!navigationReady}
                onClick={() => navigate({ to: "/navigate", search: { profile: selected } })}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-medium text-primary-foreground shadow-lift transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {navigationReady ? `Take ${active.title} Route` : "Preview only"}
                {navigationReady && <ArrowRight className="size-4" strokeWidth={2} />}
              </button>
              {!navigationReady && (
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  This route concept isn't ready for walking directions yet.
                </p>
              )}
            </div>
          </div>
        }
      />
      <DiscoveryDetail poi={detail} onOpenChange={() => setDetail(null)} />
    </>
  );
}
