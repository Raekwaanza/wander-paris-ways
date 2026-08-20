import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { ParisMap } from "@/components/scenic/ParisMap";
import { SplitShell } from "@/components/scenic/SplitShell";
import { InterestChips } from "@/components/scenic/InterestChips";
import { usePreferences } from "@/lib/scenic/store";
import { cn } from "@/lib/utils";
import type { Preferences } from "@/lib/scenic/types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Preferences — Scenic Route Paris" },
      {
        name: "description",
        content:
          "Set your interests, walking pace and how far Scenic Route may detour on your Paris walks.",
      },
      { property: "og:title", content: "Preferences — Scenic Route" },
      {
        property: "og:description",
        content: "How scenic should your walks be? Up to +10, +20 or +30 minutes.",
      },
    ],
  }),
  component: ProfilePage,
});

const DETOURS = [
  { cap: 10, label: "Efficient", sub: "Up to +10 minutes" },
  { cap: 20, label: "Balanced", sub: "Up to +20 minutes" },
  { cap: 30, label: "Explorer", sub: "Up to +30 minutes" },
];

const PACES: { id: Preferences["pace"]; label: string; sub: string }[] = [
  { id: "strolling", label: "Strolling", sub: "~4 km/h" },
  { id: "steady", label: "Steady", sub: "~4.6 km/h" },
  { id: "brisk", label: "Brisk", sub: "~5.2 km/h" },
];

function ProfilePage() {
  const [prefs, setPrefs] = usePreferences();

  return (
    <SplitShell
      map={<ParisMap padding={12} />}
      panel={
        <div className="space-y-6 px-5 pt-5 pb-6">
          <div>
            <h1 className="text-display text-2xl">Preferences</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything here stays on this device.
            </p>
          </div>

          <section>
            <h2 className="text-sm font-medium">How scenic should your walks be?</h2>
            <div className="mt-3 grid gap-2">
              {DETOURS.map((d) => (
                <button
                  key={d.cap}
                  type="button"
                  onClick={() => setPrefs({ detourCap: d.cap })}
                  className={cn(
                    "flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left transition-colors",
                    prefs.detourCap === d.cap
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  <span className="text-sm font-medium">{d.label}</span>
                  <span className="text-xs text-muted-foreground">{d.sub}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium">Preferred interests</h2>
            <InterestChips
              className="mt-3"
              value={prefs.interests}
              onChange={(interests) => setPrefs({ interests })}
            />
          </section>

          <section>
            <h2 className="text-sm font-medium">Walking pace</h2>
            <div className="mt-3 flex gap-2">
              {PACES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPrefs({ pace: p.id })}
                  className={cn(
                    "min-h-12 flex-1 rounded-xl border px-2 text-center transition-colors",
                    prefs.pace === p.id
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  <span className="block text-sm font-medium">{p.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{p.sub}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium">Distance units</h2>
            <div className="mt-3 flex gap-2">
              {(["km", "mi"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setPrefs({ units: u })}
                  className={cn(
                    "min-h-11 flex-1 rounded-xl border text-sm font-medium transition-colors",
                    prefs.units === u
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  {u === "km" ? "Kilometres" : "Miles"}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-secondary/60 p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
              <div>
                <h2 className="text-sm font-medium">Privacy</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  No account. No route history. Your location is used only to build the walk in
                  front of you, and preferences are stored locally in this browser.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium">About Scenic Route</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              A prototype for central Paris, arrondissements 1–8. Routes and discoveries come from a
              curated dataset with a transparent scoring model — scenic value, interest match,
              landmark quality and street appeal, minus detour and inconvenience cost.
            </p>
          </section>
        </div>
      }
    />
  );
}
