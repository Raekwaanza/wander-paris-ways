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
import type {
  NavigationFeedbackRating,
  RouteFeedback,
  RouteFeedbackAspectId,
  RouteFeedbackRating,
  RouteProfile,
} from "@/lib/scenic/types";
import { cn } from "@/lib/utils";
import { LocationRecovery } from "@/components/scenic/LocationRecovery";
import { resolveTripEndpoint, resolvedPlace } from "@/lib/scenic/trip-endpoints";
import {
  ROUTE_FEEDBACK_ASPECTS,
  ROUTE_FEEDBACK_RATINGS,
  NAVIGATION_FEEDBACK_RATINGS,
  MAX_ROUTE_FEEDBACK_COMMENT_LENGTH,
  normalizeRouteFeedbackComment,
  routeFeedbackId,
} from "@/lib/scenic/route-feedback";
import { createSharedRoutePayload } from "@/lib/scenic/shared-route";
import {
  buildCurrentCanonicalSharedRouteUrl,
  scenicShareProvider,
} from "@/lib/scenic/share-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const { feedback, upsertFeedback } = useRouteFeedback();
  const [saved, setSaved] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [confirmLocationShare, setConfirmLocationShare] = useState(false);
  const [manualShareUrl, setManualShareUrl] = useState<string | null>(null);

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
  const shareEligible =
    route.routingSource === "openrouteservice" &&
    completedRouteId !== undefined &&
    completedRouteId === route.id &&
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

  const persistFeedback = (
    rating: RouteFeedbackRating,
    navigationRating: NavigationFeedbackRating,
    aspects: RouteFeedbackAspectId[],
    comment: string,
  ) => {
    if (!feedbackEligible || !trip || !feedbackId || !completion) return;
    const normalizedComment = normalizeRouteFeedbackComment(comment);
    upsertFeedback({
      id: feedbackId,
      routeId: route.id,
      tripCreatedAt: trip.createdAt,
      mode: trip.mode,
      profile: route.profile,
      routingSource: "openrouteservice",
      rating,
      navigationRating,
      aspects,
      ...(normalizedComment ? { comment: normalizedComment } : {}),
      selectedInterests: [...new Set(trip.interests)],
      matchedInterests: [...new Set(route.matchedInterests)],
      discoveryPoiIds: [...new Set(route.discoveries.map(({ id }) => id))],
      extraMinutes: route.extraMinutes,
      completionKind: completion === "arrival" ? "automatic-arrival" : "manual-end",
    });
  };

  const performShare = async () => {
    if (!shareEligible || !trip || sharing) return;
    const payload = createSharedRoutePayload({ route, trip, from, to, pace: prefs.pace });
    if (!payload) {
      toast.error("Sharing is available for real walking routes.");
      return;
    }
    const url = buildCurrentCanonicalSharedRouteUrl(payload);
    setSharing(true);
    try {
      const result = await scenicShareProvider.share({
        title: `${route.title} Route: ${payload.from.name} → ${payload.to.name}`,
        text: "A walking route through Paris with curated discoveries nearby.",
        url,
      });
      if (result.status === "shared") {
        toast.success("Route shared");
      } else if (result.status === "copied") {
        toast.success("Link copied");
      } else if (result.status === "manual") {
        setManualShareUrl(result.url);
      }
    } finally {
      setSharing(false);
    }
  };

  const onShare = () => {
    if (!shareEligible) {
      toast.error("Sharing is available for real walking routes.");
      return;
    }
    if (trip?.from.type === "current-location" || trip?.to.type === "current-location") {
      setConfirmLocationShare(true);
      return;
    }
    void performShare();
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
              {estimated
                ? "Your route preview is ready."
                : completion === "arrival"
                  ? `You've arrived at ${to.name}.`
                  : "Your walk is complete."}
            </h1>
          </div>

          <dl className="grid grid-cols-2 divide-x divide-y divide-border border-y border-border">
            {[
              {
                k: `${estimated ? "≈" : ""}${route.km} km`,
                v: estimated ? "route estimate" : "route distance",
              },
              { k: `${route.discoveries.length}`, v: "discoveries" },
              { k: `${estimated ? "≈" : ""}+${route.extraMinutes} min`, v: "extra time" },
              { k: `${neighborhoods}`, v: "neighborhoods represented" },
            ].map((s) => (
              <div key={s.v} className="px-3 py-4 odd:pl-0 even:pr-0">
                <dt className="text-xl font-semibold tabular-nums">{s.k}</dt>
                <dd className="text-xs text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>

          {feedbackEligible ? (
            <FeedbackQuestionnaire
              key={feedbackId ?? "new"}
              {...(currentFeedback ? { initialFeedback: currentFeedback } : {})}
              onSubmit={persistFeedback}
            />
          ) : !estimated ? (
            <p className="text-sm text-muted-foreground">
              Feedback isn't available for this route summary.
            </p>
          ) : null}

          <div className="space-y-2">
            <Button
              type="button"
              size="lg"
              onClick={onSave}
              disabled={saved}
              className="h-14 w-full text-base shadow-lift"
            >
              {saved ? (
                <Check className="size-4" strokeWidth={2} />
              ) : (
                <Bookmark className="size-4" strokeWidth={2} />
              )}
              {saved ? "Route saved" : "Save route"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={onShare}
              disabled={sharing}
              className="w-full"
            >
              <Share2 className="size-4" strokeWidth={1.75} />
              {sharing ? "Sharing…" : "Share route"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/explore" })}
              className="w-full text-muted-foreground"
            >
              Plan another walk
            </Button>
          </div>
          <AlertDialog open={confirmLocationShare} onOpenChange={setConfirmLocationShare}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Share this starting point?</AlertDialogTitle>
                <AlertDialogDescription>
                  {trip?.from.type === "current-location" && trip?.to.type !== "current-location"
                    ? "This route began from Current location. The share link will include the start and end points of this walk so the route can be opened on another device."
                    : "This share link will include the route's start and end points so the walk can be opened on another device."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void performShare()}>
                  Share route
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog
            open={manualShareUrl !== null}
            onOpenChange={(open) => !open && setManualShareUrl(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Copy this link</AlertDialogTitle>
                <AlertDialogDescription>
                  Automatic copying isn't available. Select and copy this route link manually.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                readOnly
                value={manualShareUrl ?? ""}
                onFocus={(event) => event.currentTarget.select()}
                aria-label="Share route link"
                className="w-full"
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Done</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      }
    />
  );
}

function FeedbackQuestionnaire({
  initialFeedback,
  onSubmit,
}: {
  initialFeedback?: RouteFeedback;
  onSubmit: (
    rating: RouteFeedbackRating,
    navigationRating: NavigationFeedbackRating,
    aspects: RouteFeedbackAspectId[],
    comment: string,
  ) => void;
}) {
  const [rating, setRating] = useState<RouteFeedbackRating | null>(initialFeedback?.rating ?? null);
  const [navigationRating, setNavigationRating] = useState<NavigationFeedbackRating | null>(
    initialFeedback?.navigationRating ?? null,
  );
  const [aspects, setAspects] = useState<RouteFeedbackAspectId[]>(initialFeedback?.aspects ?? []);
  const [comment, setComment] = useState(initialFeedback?.comment ?? "");
  const [saved, setSaved] = useState(false);
  const [skipped, setSkipped] = useState(false);

  if (skipped) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Feedback skipped. You can still save, share, or plan another walk.
      </p>
    );
  }

  if (saved) {
    return (
      <div className="surface-card p-4" role="status" aria-live="polite">
        <p className="text-sm font-semibold">Thanks — feedback saved.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Saved on this device. Route highlights may gently inform future discovery routes.
        </p>
      </div>
    );
  }

  const choiceClass = (selected: boolean) =>
    cn(
      "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
      selected
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card hover:bg-secondary",
    );

  return (
    <section className="surface-card space-y-5 p-4" aria-labelledby="feedback-heading">
      <div>
        <h2 id="feedback-heading" className="text-base font-semibold">
          Quick route feedback
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Three quick questions, stored only on this device.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">How was the route?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROUTE_FEEDBACK_RATINGS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={rating === id}
              onClick={() => setRating(id)}
              className={choiceClass(rating === id)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Were the directions easy to follow?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {NAVIGATION_FEEDBACK_RATINGS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={navigationRating === id}
              onClick={() => setNavigationRating(id)}
              className={choiceClass(navigationRating === id)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">What did you enjoy?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROUTE_FEEDBACK_ASPECTS.map(({ id, label }) => {
            const selected = aspects.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setAspects((current) =>
                    selected ? current.filter((aspect) => aspect !== id) : [...current, id],
                  )
                }
                className={choiceClass(selected)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="route-feedback-comment" className="text-sm font-medium">
          Anything else?
        </label>
        <textarea
          id="route-feedback-comment"
          value={comment}
          maxLength={MAX_ROUTE_FEEDBACK_COMMENT_LENGTH}
          onChange={(event) => setComment(event.currentTarget.value)}
          rows={4}
          className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground" aria-live="off">
          {comment.length} / {MAX_ROUTE_FEEDBACK_COMMENT_LENGTH}
        </p>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          className="min-h-12 w-full"
          disabled={!rating || !navigationRating}
          onClick={() => {
            if (!rating || !navigationRating) return;
            onSubmit(rating, navigationRating, aspects, comment);
            setSaved(true);
          }}
        >
          Save feedback
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 w-full text-muted-foreground"
          onClick={() => setSkipped(true)}
        >
          Skip feedback
        </Button>
      </div>
    </section>
  );
}
