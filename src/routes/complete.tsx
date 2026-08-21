import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ParisMap } from "@/components/scenic/ParisMap";
import { SplitShell } from "@/components/scenic/SplitShell";
import { CURRENT_LOCATION_ID } from "@/lib/scenic/places";
import { services } from "@/lib/scenic/services";
import { useTripRoute } from "@/lib/scenic/use-services";
import { ScenicLoader } from "@/components/scenic/ScenicLoader";
import { usePreferences, useSavedRoutes, useTrip } from "@/lib/scenic/store";
import { interestLabel } from "@/lib/scenic/interests";
import type { RouteProfile } from "@/lib/scenic/types";
import { cn } from "@/lib/utils";
import { LocationRecovery } from "@/components/scenic/LocationRecovery";
import { resolveTripEndpoint, resolvedPlace } from "@/lib/scenic/trip-endpoints";

export const Route = createFileRoute("/complete")({
  validateSearch: (s: Record<string, unknown>) => ({
    profile: (["fastest", "scenic", "explorer"].includes(String(s["profile"]))
      ? String(s["profile"])
      : "scenic") as RouteProfile,
  }),
  head: () => ({
    meta: [
      { title: "You took the Scenic Route — Paris" },
      {
        name: "description",
        content: "Your route preview, summarised with estimated distance and known discoveries.",
      },
      { property: "og:title", content: "You took the Scenic Route" },
      { property: "og:description", content: "Paris explored, one detour at a time." },
    ],
  }),
  component: CompletePage,
});

const LIKES = [
  "Beautiful streets",
  "Hidden places",
  "History",
  "Architecture",
  "Courtyards & passages",
  "Food & cafés",
];

function CompletePage() {
  const navigate = useNavigate();
  const [trip] = useTrip();
  const [prefs] = usePreferences();
  const { profile } = Route.useSearch();
  const { saveRoute } = useSavedRoutes();
  const [rating, setRating] = useState<string | null>(null);
  const [likes, setLikes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

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

  if (missingEndpoint) {
    const missingLocation =
      fromResolution?.status === "missing-current-location" ||
      toResolution?.status === "missing-current-location";
    return <LocationRecovery reason={missingLocation ? "location" : "route-details"} />;
  }

  if (!route) {
    return (
      <SplitShell
        map={<ParisMap start={from} end={to} padding={7} />}
        panel={
          error ? (
            <div className="p-6 text-sm text-muted-foreground">
              We couldn't load your completed route right now. Please try again.
            </div>
          ) : (
            <ScenicLoader />
          )
        }
      />
    );
  }

  const neighborhoods = new Set(route.discoveries.map((d) => d.neighborhood)).size;
  const estimated = route.routingSource === "mock";
  const discoveryInterests = [
    ...new Set(route.discoveries.flatMap((discovery) => discovery.interests)),
  ];

  const onSave = () => {
    saveRoute({
      id: `${from.id}-${to.id}-${route.profile}`,
      fromName: from.name,
      toName: to.name,
      profile: route.profile,
      minutes: route.minutes,
      km: route.km,
      discoveries: route.discoveries.length,
      tags: (route.matchedInterests.length ? route.matchedInterests : discoveryInterests)
        .slice(0, 2)
        .map(interestLabel),
      savedAt: Date.now(),
    });
    setSaved(true);
    toast.success("Route saved", { description: `${from.name} → ${to.name}` });
  };

  return (
    <SplitShell
      map={
        <ParisMap
          routes={[{ route, active: true }]}
          start={from}
          end={to}
          discoveries={route.discoveries}
          padding={7}
        />
      }
      panel={
        <div className="space-y-5 px-5 pt-5 pb-6">
          <div>
            <p className="text-eyebrow text-muted-foreground">Preview complete · {to.name}</p>
            <h1 className="text-display mt-1 text-2xl">Your route preview is ready.</h1>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            {[
              {
                k: `${estimated ? "≈" : ""}${route.km} km`,
                v: estimated ? "route estimate" : "route distance",
              },
              { k: `${route.discoveries.length}`, v: "discoveries" },
              { k: `${estimated ? "≈" : ""}+${route.extraMinutes} min`, v: "extra time" },
              { k: `${neighborhoods}`, v: "neighborhoods represented" },
            ].map((s) => (
              <div key={s.v} className="rounded-2xl border border-border bg-secondary/50 p-3.5">
                <dt className="text-xl font-semibold tabular-nums">{s.k}</dt>
                <dd className="text-xs text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <h2 className="text-sm font-medium">How was this route?</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Loved it", "It was okay", "Not for me"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRating(r)}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                    rating === r
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {rating && (
            <div className="animate-sheet-up">
              <h2 className="text-sm font-medium">What did you like?</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {LIKES.map((l) => {
                  const on = likes.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLikes((s) => (on ? s.filter((x) => x !== l) : [...s, l]))}
                      className={cn(
                        "min-h-10 rounded-full border px-3.5 text-sm transition-colors",
                        on
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Kept on this device and used to weight your next routes.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saved}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-medium text-primary-foreground shadow-lift disabled:opacity-70"
            >
              {saved ? (
                <Check className="size-4" strokeWidth={2} />
              ) : (
                <Bookmark className="size-4" strokeWidth={2} />
              )}
              {saved ? "Route saved" : "Save route"}
            </button>
            <button
              type="button"
              onClick={() =>
                toast("Link copied", {
                  description: `${from.name} → ${to.name} · ${route.title}`,
                })
              }
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-medium hover:bg-secondary"
            >
              <Share2 className="size-4" strokeWidth={1.75} />
              Share route
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/explore" })}
              className="min-h-11 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Plan another walk
            </button>
          </div>
        </div>
      }
    />
  );
}
