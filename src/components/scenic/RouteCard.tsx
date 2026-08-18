import { Check, Clock, Footprints, MapPin } from "lucide-react";
import type { ScenicRoute } from "@/lib/scenic/types";
import { interestLabel } from "@/lib/scenic/interests";
import { cn } from "@/lib/utils";

interface Props {
  route: ScenicRoute;
  selected: boolean;
  recommended?: boolean;
  onSelect: () => void;
}

export function RouteCard({ route, selected, recommended, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-primary bg-card shadow-lift"
          : "border-border bg-card/70 hover:border-muted-foreground/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-display text-lg leading-none">{route.title}</h3>
          {recommended && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-foreground uppercase">
              Recommended
            </span>
          )}
        </div>
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
        >
          {selected && <Check className="size-3" strokeWidth={3} />}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {route.minutes} min
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">{route.km} km</span>
        {route.extraMinutes > 0 && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-terracotta tabular-nums">
            +{route.extraMinutes} min
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{route.blurb}</p>

      {route.discoveries.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" strokeWidth={1.75} />
            {route.discoveries.length} discoveries
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Footprints className="size-3.5" strokeWidth={1.75} />
            {route.majorRoadReduction}% less major road
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-primary">
            <Clock className="size-3.5" strokeWidth={1.75} />
            {route.matchPercent}% match
            {route.matchedInterests.length > 0 && (
              <> for {route.matchedInterests.slice(0, 2).map(interestLabel).join(" + ")}</>
            )}
          </span>
        </div>
      )}
    </button>
  );
}
