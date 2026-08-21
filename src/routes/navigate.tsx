import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Flag, Pause, Play } from "lucide-react";
import { ParisMap } from "@/components/scenic/ParisMap";
import { SplitShell } from "@/components/scenic/SplitShell";
import { DiscoveryCard } from "@/components/scenic/DiscoveryCard";
import { DiscoveryDetail } from "@/components/scenic/DiscoveryDetail";
import { WhyThisRoute } from "@/components/scenic/WhyThisRoute";
import { CURRENT_LOCATION_ID } from "@/lib/scenic/places";
import { services } from "@/lib/scenic/services";
import { useTripRoute } from "@/lib/scenic/use-services";
import { ScenicLoader } from "@/components/scenic/ScenicLoader";
import { pointAlong } from "@/lib/scenic/geo";
import { usePreferences, useTrip } from "@/lib/scenic/store";
import type { Poi, RouteProfile } from "@/lib/scenic/types";
import { LocationRecovery } from "@/components/scenic/LocationRecovery";
import { resolveTripEndpoint, resolvedPlace } from "@/lib/scenic/trip-endpoints";

export const Route = createFileRoute("/navigate")({
  validateSearch: (s: Record<string, unknown>) => ({
    profile: (["fastest", "scenic", "explorer"].includes(String(s["profile"]))
      ? String(s["profile"])
      : "scenic") as RouteProfile,
  }),
  head: () => ({
    meta: [
      { title: "Walking now — Scenic Route Paris" },
      {
        name: "description",
        content:
          "Follow your selected Scenic Route walking preview with discovery cards along the way.",
      },
      { property: "og:title", content: "Walking now — Scenic Route" },
      { property: "og:description", content: "Discoveries as you go, not a tour." },
    ],
  }),
  component: NavigatePage,
});

function NavigatePage() {
  const navigate = useNavigate();
  const { profile } = Route.useSearch();
  const [trip] = useTrip();
  const [prefs] = usePreferences();
  const [progress, setProgress] = useState(0.04);
  const [running, setRunning] = useState(true);
  const [detail, setDetail] = useState<Poi | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);

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
    },
    trip?.mode ?? "route",
    profile,
    trip?.wanderMinutes,
    Boolean(trip && !missingEndpoint),
  );

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setProgress((p) => Math.min(1, p + 0.012));
    }, 420);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (progress >= 1) navigate({ to: "/complete", search: { profile } });
  }, [progress, navigate, profile]);

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

  const user = pointAlong(route.path, progress);
  const remainingMin = Math.max(0, Math.round(route.minutes * (1 - progress)));
  const remainingKm = Math.round(route.km * (1 - progress) * 10) / 10;

  const visible = route.discoveries.filter((d) => !skipped.includes(d.id));
  const upcomingIndex = Math.min(visible.length - 1, Math.floor(progress * (visible.length + 0.4)));
  const upcoming = visible[Math.max(0, upcomingIndex)] ?? null;
  const minutesAway = upcoming
    ? Math.max(0, Math.round(route.minutes * (1 - progress) * 0.24))
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
            user={user}
            discoveries={route.discoveries}
            activeDiscoveryId={upcoming?.id ?? null}
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
              <span className="font-semibold tabular-nums">≈{remainingMin} min</span>
              <span className="text-muted-foreground"> · ≈{remainingKm} km left</span>
            </div>
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/90 shadow-card backdrop-blur"
              aria-label={running ? "Pause walk" : "Resume walk"}
            >
              {running ? (
                <Pause className="size-4" strokeWidth={1.75} />
              ) : (
                <Play className="size-4" strokeWidth={1.75} />
              )}
            </button>
          </div>
        }
        panel={
          <div className="space-y-4 px-5 pt-4 pb-6">
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-eyebrow text-muted-foreground">
                  Route preview · {route.title} · {to.name}
                </p>
                <span className="text-xs text-muted-foreground tabular-nums">
                  Preview {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>

            {upcoming ? (
              <DiscoveryCard
                key={upcoming.id}
                poi={upcoming}
                minutesAway={minutesAway}
                onLearnMore={() => setDetail(upcoming)}
                onSkip={() => setSkipped((s) => [...s, upcoming.id])}
              />
            ) : (
              <div className="surface-card p-4">
                <p className="text-sm font-medium">Straight on to {to.name}.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nothing else worth stopping for on this stretch.
                </p>
              </div>
            )}

            <WhyThisRoute route={route} />

            <button
              type="button"
              onClick={() => navigate({ to: "/complete", search: { profile } })}
              className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-medium hover:bg-secondary"
            >
              <Flag className="size-4" strokeWidth={1.75} />
              Finish preview
            </button>
          </div>
        }
      />
      <DiscoveryDetail poi={detail} onOpenChange={() => setDetail(null)} />
    </>
  );
}
