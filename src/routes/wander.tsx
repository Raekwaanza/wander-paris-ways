import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { ParisMap } from "@/components/scenic/ParisMap";
import { SplitShell } from "@/components/scenic/SplitShell";
import { PlacePicker } from "@/components/scenic/PlacePicker";
import { InterestChips } from "@/components/scenic/InterestChips";
import { CURRENT_LOCATION_ID } from "@/lib/scenic/places";
import { services } from "@/lib/scenic/services";
import { useWanderRoute } from "@/lib/scenic/use-services";
import { ScenicLoader } from "@/components/scenic/ScenicLoader";
import { usePreferences, useTrip } from "@/lib/scenic/store";
import type { Place } from "@/lib/scenic/types";
import { cn } from "@/lib/utils";
import { getCurrentLocationFix } from "@/lib/scenic/current-location";
import { tripEndpointFromPlace } from "@/lib/scenic/trip-endpoints";
import { isNetworkNavigableRoute } from "@/lib/scenic/navigation";

export const Route = createFileRoute("/wander")({
  head: () => ({
    meta: [
      { title: "I have time — Scenic Route Paris" },
      {
        name: "description",
        content:
          "Tell Scenic Route where you need to be and how long you have. It builds a real pedestrian Wander when routing is available.",
      },
      { property: "og:title", content: "I have 45 minutes before dinner" },
      {
        property: "og:description",
        content: "A time-aware pedestrian wandering route through Paris.",
      },
    ],
  }),
  component: WanderPage,
});

const OPTIONS = [15, 30, 45, 60];

function WanderPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = usePreferences();
  const [, setTrip] = useTrip();
  const [minutes, setMinutes] = useState(45);
  const [custom, setCustom] = useState(false);
  const [to, setTo] = useState<Place>(() => services.geocoding.byId("place-des-vosges")!);
  const [picker, setPicker] = useState(false);
  const from = getCurrentLocationFix()?.place ?? services.geocoding.byId(CURRENT_LOCATION_ID)!;

  const { data: route, error } = useWanderRoute(from, to, minutes, {
    interests: prefs.interests,
    detourCap: prefs.detourCap,
    pace: prefs.pace,
  });

  if (!route) {
    return (
      <SplitShell
        map={<ParisMap start={from} end={to} padding={7} />}
        panel={
          error ? (
            <div className="p-6 text-sm text-muted-foreground">
              We couldn't build that wander right now. Please try again.
            </div>
          ) : (
            <ScenicLoader />
          )
        }
      />
    );
  }

  const arrival = new Date(Date.now() + route.minutes * 60000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const navigationReady = isNetworkNavigableRoute(route);
  const fit = route.wander.fit;
  const isPreview = fit === "preview";
  const takesDirectRoute = fit === "direct-only" || fit === "insufficient-time";

  const start = () => {
    setTrip({
      from: tripEndpointFromPlace(from),
      to: tripEndpointFromPlace(to),
      interests: prefs.interests,
      detourCap: prefs.detourCap,
      mode: "wander",
      wanderMinutes: minutes,
      createdAt: Date.now(),
    });
    navigate({ to: "/navigate", search: { profile: "explorer" } });
  };

  return (
    <>
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
        header={
          <Link
            to="/explore"
            className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/90 shadow-card backdrop-blur"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} />
          </Link>
        }
        panel={
          <div className="space-y-5 px-5 pt-5 pb-6">
            <div>
              <p className="text-eyebrow text-muted-foreground">I have time to explore</p>
              <h1 className="text-display mt-1 text-2xl">Where do you eventually need to be?</h1>
            </div>

            <button
              type="button"
              onClick={() => setPicker(true)}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 text-left hover:bg-secondary"
            >
              <span>
                <span className="block text-[11px] tracking-wide text-muted-foreground uppercase">
                  Ending at
                </span>
                <span className="block text-sm font-medium">{to.name}</span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </button>

            <div>
              <h2 className="text-eyebrow text-muted-foreground">How much time do you have?</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMinutes(m);
                      setCustom(false);
                    }}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                      minutes === m && !custom
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    {m} min
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustom(true)}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                    custom
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card",
                  )}
                >
                  Custom
                </button>
              </div>
              {custom && (
                <div className="mt-3">
                  <input
                    type="range"
                    min={10}
                    max={120}
                    step={5}
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                    className="w-full accent-[var(--primary)]"
                  />
                  <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                    {minutes} minutes
                  </p>
                </div>
              )}
            </div>

            <div className="surface-card p-4">
              <div className="flex items-center gap-2">
                <Clock3 className="size-4 text-primary" strokeWidth={1.75} />
                <h3 className="text-display text-lg">{route.title}</h3>
                {isPreview && (
                  <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Preview
                  </span>
                )}
              </div>
              {fit === "targeted" && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Uses about {route.minutes} of your {route.wander.requestedMinutes} minutes.
                </p>
              )}
              {fit === "direct-only" && (
                <p className="mt-2 text-sm text-muted-foreground">
                  No worthwhile longer Wander fit this window. The direct walking route takes about
                  {` ${route.minutes} minutes`} and has {route.discoveries.length} curated
                  discoveries nearby.
                </p>
              )}
              {fit === "insufficient-time" && (
                <p className="mt-2 text-sm font-medium">
                  You'll need about {route.minutes} minutes just to reach the destination. You
                  requested
                  {` ${route.wander.requestedMinutes} minutes`}.
                </p>
              )}
              {isPreview && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Real pedestrian routing isn't available for this Wander right now.
                </p>
              )}
              <p className="mt-2 text-xs tracking-wide text-muted-foreground uppercase">
                Discoveries near this route
              </p>
              <ul className="mt-1.5 space-y-1">
                {route.discoveries.map((d) => (
                  <li key={d.id} className="text-sm">
                    {d.name}
                    <span className="text-muted-foreground"> · {d.category}</span>
                  </li>
                ))}
                {route.discoveries.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Not much to see in that window — try a little more time.
                  </li>
                )}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                {isPreview ? "≈" : "About "}
                {route.minutes} min · {isPreview ? "≈" : ""}
                {route.km} km · Estimated arrival around {arrival}
              </p>
            </div>

            <div>
              <h2 className="text-eyebrow text-muted-foreground">In the mood for</h2>
              <InterestChips
                className="mt-3"
                value={prefs.interests}
                onChange={(interests) => setPrefs({ interests })}
              />
            </div>

            <button
              type="button"
              disabled={!navigationReady}
              onClick={start}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-medium text-primary-foreground shadow-lift enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {navigationReady
                ? takesDirectRoute
                  ? "Take direct route"
                  : "Start wandering"
                : "Preview only"}
              {navigationReady && <ArrowRight className="size-4" strokeWidth={2} />}
            </button>
            {!navigationReady && (
              <p className="-mt-3 text-center text-sm text-muted-foreground">
                Real pedestrian routing isn't available for this Wander right now.
              </p>
            )}
          </div>
        }
      />
      <PlacePicker open={picker} onOpenChange={setPicker} title="Ending at" onPick={setTo} />
    </>
  );
}
