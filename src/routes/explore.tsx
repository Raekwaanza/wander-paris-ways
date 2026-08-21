import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Clock3, Info, LocateFixed, MapPin, Shuffle } from "lucide-react";
import { ParisMap } from "@/components/scenic/ParisMap";
import { PlacePicker } from "@/components/scenic/PlacePicker";
import { SplitShell } from "@/components/scenic/SplitShell";
import { InterestChips } from "@/components/scenic/InterestChips";
import { CURRENT_LOCATION_ID } from "@/lib/scenic/places";
import { services } from "@/lib/scenic/services";
import { usePreferences, useRouteFeedback, useTrip } from "@/lib/scenic/store";
import { deriveLearnedPreferenceSnapshot } from "@/lib/scenic/preference-learning";
import type { Place } from "@/lib/scenic/types";
import {
  currentLocationErrorMessage,
  getCurrentLocationFix,
  isLiveCurrentLocationId,
  requestCurrentLocation,
} from "@/lib/scenic/current-location";
import {
  resolveTripEndpoint,
  resolvedPlace,
  tripEndpointFromPlace,
} from "@/lib/scenic/trip-endpoints";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Plan a walk — Scenic Route Paris" },
      {
        name: "description",
        content:
          "Set a start and destination in central Paris and choose the interests that shape your walk.",
      },
      { property: "og:title", content: "Plan a walk — Scenic Route Paris" },
      {
        property: "og:description",
        content: "Pick where you're going. We'll find the more interesting way there.",
      },
    ],
  }),
  component: Explore,
});

function Explore() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = usePreferences();
  const [trip, setTrip] = useTrip();
  const { feedback } = useRouteFeedback();
  const [from, setFrom] = useState<Place>(
    () =>
      (trip ? resolvedPlace(resolveTripEndpoint(trip.from)) : undefined) ??
      services.geocoding.byId(CURRENT_LOCATION_ID)!,
  );
  const [to, setTo] = useState<Place | null>(
    () => (trip ? resolvedPlace(resolveTripEndpoint(trip.to)) : undefined) ?? null,
  );
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(true);
  const [locationPending, setLocationPending] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const preview = useMemo(() => ({ start: from, end: to ?? undefined }), [from, to]);

  const find = () => {
    if (!to) {
      setPicker("to");
      return;
    }
    setTrip({
      from: tripEndpointFromPlace(from),
      to: tripEndpointFromPlace(to),
      interests: prefs.interests,
      detourCap: prefs.detourCap,
      mode: "route",
      learnedPreferences: deriveLearnedPreferenceSnapshot(feedback),
      createdAt: Date.now(),
    });
    navigate({ to: "/plan" });
  };

  const useCurrentLocation = async () => {
    if (locationPending) return;
    setLocationPending(true);
    setLocationError(null);
    try {
      const fix = await requestCurrentLocation();
      setFrom(fix.place);
      setShowPrivacy(false);
    } catch (error) {
      setLocationError(currentLocationErrorMessage(error));
    } finally {
      setLocationPending(false);
    }
  };

  const fromIsLive = isLiveCurrentLocationId(from.id);

  return (
    <>
      <SplitShell
        map={
          <ParisMap
            start={fromIsLive ? undefined : preview.start}
            end={preview.end}
            user={fromIsLive ? from : undefined}
            discoveries={[]}
            padding={8}
          />
        }
        header={
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 shadow-card backdrop-blur">
            <MapPin className="size-3.5 text-primary" strokeWidth={2} />
            <span className="text-display text-sm">Scenic Route</span>
            <span className="text-xs text-muted-foreground">· Central Paris</span>
          </div>
        }
        panel={
          <div className="space-y-5 px-5 pt-5 pb-6">
            <div>
              <h1 className="text-display text-2xl">Where are you going?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                There's usually a more interesting way there.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border">
              <button
                type="button"
                onClick={() => setPicker("from")}
                className="flex min-h-14 w-full items-center gap-3 border-b border-border bg-card px-4 text-left hover:bg-secondary"
              >
                <LocateFixed className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span>
                  <span className="block text-[11px] tracking-wide text-muted-foreground uppercase">
                    From
                  </span>
                  <span className="block text-sm font-medium">
                    {fromIsLive
                      ? from.area === "GPS position"
                        ? "Current location"
                        : `Current location — ${from.area}`
                      : from.id === CURRENT_LOCATION_ID
                        ? `Current location — ${from.name}`
                        : from.name}
                  </span>
                  {fromIsLive && getCurrentLocationFix()?.reverseGeocode?.attribution ? (
                    <span className="block text-[10px] text-muted-foreground">
                      Location label: MapTiler / OpenStreetMap contributors
                    </span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPicker("to")}
                className="flex min-h-14 w-full items-center gap-3 bg-card px-4 text-left hover:bg-secondary"
              >
                <MapPin className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
                <span>
                  <span className="block text-[11px] tracking-wide text-muted-foreground uppercase">
                    To
                  </span>
                  <span className="block text-sm font-medium">
                    {to ? to.name : "Address, landmark, café, museum…"}
                  </span>
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={find}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-medium text-primary-foreground shadow-lift transition-opacity hover:opacity-90"
            >
              Find my route
              <ArrowRight className="size-4" strokeWidth={2} />
            </button>

            <Link
              to="/wander"
              className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <Clock3 className="size-4" strokeWidth={1.75} />I have time to explore
            </Link>

            <div>
              <div className="flex items-baseline justify-between">
                <h2 className="text-eyebrow text-muted-foreground">What are you drawn to?</h2>
                <button
                  type="button"
                  onClick={() => setPrefs({ interests: [] })}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Shuffle className="size-3" strokeWidth={1.75} />
                  Reset
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional. Scenic Route works without it.
              </p>
              <InterestChips
                className="mt-3"
                value={prefs.interests}
                onChange={(interests) => setPrefs({ interests })}
              />
            </div>

            {showPrivacy && (
              <div className="rounded-2xl border border-border bg-secondary/60 p-4">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
                  <div>
                    <p className="text-sm font-medium">Explore from where you are</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Scenic Route uses your location to build walks around you. Your route history
                      isn't saved unless you choose to save a route.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={useCurrentLocation}
                        disabled={locationPending}
                        aria-busy={locationPending}
                        className="min-h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-wait disabled:opacity-70"
                      >
                        {locationPending ? "Finding your location…" : "Use my location"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPrivacy(false);
                          setPicker("from");
                        }}
                        className="min-h-10 rounded-full border border-border bg-card px-4 text-sm font-medium"
                      >
                        Enter location manually
                      </button>
                    </div>
                    {locationError && (
                      <p role="alert" className="mt-2 text-xs leading-relaxed text-destructive">
                        {locationError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        }
      />

      <PlacePicker
        open={picker === "from"}
        onOpenChange={(o) => setPicker(o ? "from" : null)}
        title="Starting point"
        showCurrentLocation
        onPick={setFrom}
      />
      <PlacePicker
        open={picker === "to"}
        onOpenChange={(o) => setPicker(o ? "to" : null)}
        title="Destination"
        onPick={setTo}
      />
    </>
  );
}
