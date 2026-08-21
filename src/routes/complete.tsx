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
import { usePreferences, useRouteFeedback, useSavedRoutes, useTrip } from "@/lib/scenic/store";
import { interestLabel } from "@/lib/scenic/interests";
import type { RouteFeedbackAspectId, RouteFeedbackRating, RouteProfile } from "@/lib/scenic/types";
import { cn } from "@/lib/utils";
import { LocationRecovery } from "@/components/scenic/LocationRecovery";
import { resolveTripEndpoint, resolvedPlace } from "@/lib/scenic/trip-endpoints";
import {
  ROUTE_FEEDBACK_ASPECTS,
  ROUTE_FEEDBACK_RATINGS,
  routeFeedbackId,
} from "@/lib/scenic/route-feedback";

export const Route = createFileRoute("/complete")({
  validateSearch: (s: Record<string, unknown>) => ({
    profile: (["fastest", "scenic", "explorer"].includes(String(s["profile"]))
      ? String(s["profile"])
      : "scenic") as RouteProfile,
    routeId: typeof s["routeId"] === "string" && s["routeId"].trim() ? s["routeId"] : undefined,
    completion:
      s["completion"] === "arrival" || s["completion"] === "manual" ? s["completion"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Route complete — Scenic Route Paris" },
      {
        name: "description",
        content: "Review your walking route and curated discoveries.",
      },
      { property: "og:title", content: "You took the Scenic Route" },
      { property: "og:description", content: "Paris explored, one detour at a time." },
    ],
  }),
  component: CompletePage,
});

function CompletePage() {
  const navigate = useNavigate();
  const [trip] = useTrip();
  const [prefs] = usePreferences();
  const { profile, routeId: completedRouteId, completion } = Route.useSearch();
  const { saveRoute } = useSavedRoutes();
  const { feedback, upsertFeedback, removeFeedback } = useRouteFeedback();
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
      ...(trip?.learnedPreferences ? { learnedPreferences: trip.learnedPreferences } : {}),
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
  const feedbackEligible =
    route.routingSource === "openrouteservice" &&
    completedRouteId !== undefined &&
    completedRouteId === route.id &&
    completion !== undefined &&
    trip !== null;
  const feedbackId = trip ? routeFeedbackId(trip.createdAt, route.id) : null;
  const currentFeedback = feedbackEligible
    ? feedback.find((item) => item.id === feedbackId)
    : undefined;
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

  const persistFeedback = (rating: RouteFeedbackRating, aspects: RouteFeedbackAspectId[]) => {
    if (!feedbackEligible || !trip || !feedbackId || !completion) return;
    upsertFeedback({
      id: feedbackId,
      routeId: route.id,
      tripCreatedAt: trip.createdAt,
      mode: trip.mode,
      profile: route.profile,
      routingSource: "openrouteservice",
      rating,
      aspects,
      selectedInterests: [...new Set(trip.interests)],
      matchedInterests: [...new Set(route.matchedInterests)],
      discoveryPoiIds: [...new Set(route.discoveries.map(({ id }) => id))],
      extraMinutes: route.extraMinutes,
      completionKind: completion === "arrival" ? "automatic-arrival" : "manual-end",
    });
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
            <p className="text-eyebrow text-muted-foreground">
              {estimated ? "Preview summary" : "Route complete"} · {to.name}
            </p>
            <h1 className="text-display mt-1 text-2xl">
              {estimated ? "Your route preview is ready." : "Your walk is complete."}
            </h1>
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

          {feedbackEligible ? (
            <div>
              <h2 className="text-sm font-medium">How was this route?</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROUTE_FEEDBACK_RATINGS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => persistFeedback(id, currentFeedback?.aspects ?? [])}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                      currentFeedback?.rating === id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : !estimated ? (
            <p className="text-sm text-muted-foreground">
              Feedback isn't available for this route summary.
            </p>
          ) : null}

          {currentFeedback && (
            <div className="animate-sheet-up">
              <h2 className="text-sm font-medium">What did you like?</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROUTE_FEEDBACK_ASPECTS.map(({ id, label }) => {
                  const on = currentFeedback.aspects.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        persistFeedback(
                          currentFeedback.rating,
                          on
                            ? currentFeedback.aspects.filter((aspect) => aspect !== id)
                            : [...currentFeedback.aspects, id],
                        )
                      }
                      className={cn(
                        "min-h-10 rounded-full border px-3.5 text-sm transition-colors",
                        on
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Saved on this device. Future discovery routes may gently reflect what you like.
              </p>
              <button
                type="button"
                onClick={() => removeFeedback(currentFeedback.id)}
                className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Clear feedback
              </button>
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
