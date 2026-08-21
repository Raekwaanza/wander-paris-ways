import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { ParisMap } from "@/components/scenic/ParisMap";
import { PlacePicker } from "@/components/scenic/PlacePicker";
import { CURRENT_LOCATION_ID } from "@/lib/scenic/places";
import { services } from "@/lib/scenic/services";
import { useRoutes } from "@/lib/scenic/use-services";
import { usePreferences, useTrip } from "@/lib/scenic/store";
import type { Place } from "@/lib/scenic/types";
import { tripEndpointFromPlace } from "@/lib/scenic/trip-endpoints";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scenic Route — Take the interesting way there, in Paris" },
      {
        name: "description",
        content:
          "Walking directions across central Paris that trade a few extra minutes for passages, gardens, quiet streets and hidden discoveries.",
      },
      { property: "og:title", content: "Scenic Route — Take the interesting way there" },
      {
        property: "og:description",
        content:
          "Add 12 minutes. See a different side of Paris. Scenic walking routes through passages, gardens and hidden streets.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [destination, setDestination] = useState<Place | null>(null);
  const [prefs, setPrefs] = usePreferences();
  const [, setTrip] = useTrip();
  const demoFrom = services.geocoding.byId("opera")!;
  const demoTo = services.geocoding.byId("place-des-vosges")!;
  const { data: demoRoutes } = useRoutes(demoFrom, demoTo, {
    interests: ["architecture", "hidden"],
    detourCap: 20,
  });

  const go = (dest: Place | null) => {
    const to = dest ?? services.geocoding.byId("place-des-vosges")!;
    setPrefs({ seenIntro: true });
    setTrip({
      from: { type: "seeded", id: CURRENT_LOCATION_ID },
      to: tripEndpointFromPlace(to),
      interests: prefs.interests,
      detourCap: prefs.detourCap,
      mode: "route",
      createdAt: Date.now(),
    });
    navigate({ to: "/plan" });
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      <div className="absolute inset-0 opacity-[0.55]">
        <ParisMap
          routes={demoRoutes ? [{ route: demoRoutes[1]!, active: true }] : []}
          discoveries={demoRoutes?.[1]?.discoveries ?? []}
          interactive={false}
          padding={10}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-6 pt-14 pb-10">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <MapPin className="size-4" strokeWidth={2} />
          </span>
          <span className="text-display text-base tracking-tight">Scenic Route</span>
        </div>

        <div className="mt-auto pt-16">
          <h1 className="text-display text-[2.6rem] leading-[1.05] text-balance sm:text-6xl">
            Take the interesting way there.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            Scenic Route turns everyday walks across Paris into personalised city discovery.
          </p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 text-left shadow-card"
            >
              <span>
                <span className="block text-[11px] tracking-wide text-muted-foreground uppercase">
                  Where are you going?
                </span>
                <span className="block text-sm font-medium">
                  {destination ? destination.name : "Search a place in central Paris"}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            </button>

            <button
              type="button"
              onClick={() => go(destination)}
              className="min-h-14 w-full rounded-2xl bg-primary px-4 text-base font-medium text-primary-foreground shadow-lift transition-opacity hover:opacity-90"
            >
              Find a scenic route
            </button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Choose how much extra time you're willing to spend. We'll find something worth walking
            through.
          </p>

          <div className="mt-8 flex items-center gap-4 text-sm">
            <Link
              to="/explore"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Open the map
            </Link>
            <Link
              to="/wander"
              className="font-medium text-muted-foreground underline-offset-4 hover:underline"
            >
              I have time to explore
            </Link>
          </div>
        </div>
      </div>

      <PlacePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Where are you going?"
        onPick={(p) => setDestination(p)}
      />
    </main>
  );
}
