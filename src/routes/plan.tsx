import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ParisMap } from "@/components/scenic/ParisMap";
import { SplitShell } from "@/components/scenic/SplitShell";
import { RouteCard } from "@/components/scenic/RouteCard";
import { WhyThisRoute } from "@/components/scenic/WhyThisRoute";
import { DiscoveryDetail } from "@/components/scenic/DiscoveryDetail";
import { ScenicLoader } from "@/components/scenic/ScenicLoader";
import { CURRENT_LOCATION_ID, placeById } from "@/lib/scenic/places";
import { buildRoutes } from "@/lib/scenic/routing";
import { usePreferences, useTrip } from "@/lib/scenic/store";
import type { Poi, RouteProfile } from "@/lib/scenic/types";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Compare routes — Scenic Route Paris" },
      {
        name: "description",
        content:
          "Fastest, Scenic or Explorer: see exactly what each extra minute of your Paris walk buys you.",
      },
      { property: "og:title", content: "Fastest, Scenic or Explorer" },
      {
        property: "og:description",
        content: "See what the detour is actually worth before you take it.",
      },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const navigate = useNavigate();
  const [trip] = useTrip();
  const [prefs] = usePreferences();
  const [selected, setSelected] = useState<RouteProfile>("scenic");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Poi | null>(null);

  const from = placeById(trip?.fromId ?? CURRENT_LOCATION_ID) ?? placeById(CURRENT_LOCATION_ID)!;
  const to = placeById(trip?.toId ?? "place-des-vosges") ?? placeById("place-des-vosges")!;

  const routes = useMemo(
    () =>
      buildRoutes(from, to, {
        interests: trip?.interests ?? prefs.interests,
        detourCap: trip?.detourCap ?? prefs.detourCap,
        pace: prefs.pace,
      }),
    [from, to, trip, prefs.interests, prefs.detourCap, prefs.pace],
  );

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
  }, [from.id, to.id]);

  const active = routes.find((r) => r.profile === selected) ?? routes[1]!;
  const noWorthwhileDetour = active.discoveries.length === 0 && selected !== "fastest";

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
          loading ? (
            <ScenicLoader />
          ) : (
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
                    recommended={r.profile === "scenic"}
                    onSelect={() => setSelected(r.profile)}
                  />
                ))}
              </div>

              {noWorthwhileDetour ? (
                <div className="rounded-2xl border border-border bg-secondary/60 p-4">
                  <p className="text-sm font-medium">
                    We couldn't find a route worth the detour.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The fastest route may actually be your best option this time.
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

              <button
                type="button"
                onClick={() => navigate({ to: "/navigate", search: { profile: selected } })}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-medium text-primary-foreground shadow-lift transition-opacity hover:opacity-90"
              >
                Take {active.title} Route
                <ArrowRight className="size-4" strokeWidth={2} />
              </button>
            </div>
          )
        }
      />
      <DiscoveryDetail poi={detail} onOpenChange={() => setDetail(null)} />
    </>
  );
}
