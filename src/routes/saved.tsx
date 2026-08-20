import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { ParisMap } from "@/components/scenic/ParisMap";
import { SplitShell } from "@/components/scenic/SplitShell";
import { DiscoveryDetail } from "@/components/scenic/DiscoveryDetail";
import { useSavedDiscoveries, useSavedRoutes } from "@/lib/scenic/store";
import { poiById } from "@/lib/scenic/pois";
import type { Poi } from "@/lib/scenic/types";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved walks — Scenic Route Paris" },
      {
        name: "description",
        content: "The Paris routes and discoveries you kept, stored on this device only.",
      },
      { property: "og:title", content: "Saved walks — Scenic Route" },
      { property: "og:description", content: "Your routes, kept locally. No account needed." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { savedRoutes, removeRoute } = useSavedRoutes();
  const { saved } = useSavedDiscoveries();
  const [detail, setDetail] = useState<Poi | null>(null);
  const pois = saved.map(poiById).filter((p): p is Poi => !!p);

  return (
    <>
      <SplitShell
        map={<ParisMap discoveries={pois} onSelectDiscovery={setDetail} padding={10} />}
        panel={
          <div className="space-y-6 px-5 pt-5 pb-6">
            <div>
              <h1 className="text-display text-2xl">Saved</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Kept on this device. Nothing leaves your phone.
              </p>
            </div>

            <section>
              <h2 className="text-eyebrow text-muted-foreground">Routes</h2>
              <div className="mt-2 space-y-2">
                {savedRoutes.map((r) => (
                  <div key={r.id} className="surface-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-display text-base">
                          {r.fromName} → {r.toName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                          {r.profile} route
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRoute(r.id)}
                        aria-label="Remove saved route"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    </div>
                    <p className="mt-2 text-sm tabular-nums">
                      {r.minutes} min · {r.km} km · {r.discoveries} discoveries
                    </p>
                    {r.tags.length > 0 && (
                      <p className="mt-1.5 text-xs text-muted-foreground">{r.tags.join(" · ")}</p>
                    )}
                  </div>
                ))}
                {savedRoutes.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                    <Bookmark className="mx-auto size-5 text-muted-foreground" strokeWidth={1.5} />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No saved walks yet. Save one at the end of a route.
                    </p>
                    <Link
                      to="/explore"
                      className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Plan a walk
                    </Link>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-eyebrow text-muted-foreground">Discoveries</h2>
              <div className="mt-2 space-y-2">
                {pois.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDetail(p)}
                    className="flex w-full flex-col rounded-xl border border-border bg-card px-3.5 py-3 text-left hover:bg-secondary"
                  >
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.kicker}</span>
                  </button>
                ))}
                {pois.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Save a place from any discovery card and it lands here.
                  </p>
                )}
              </div>
            </section>
          </div>
        }
      />
      <DiscoveryDetail poi={detail} onOpenChange={() => setDetail(null)} />
    </>
  );
}
