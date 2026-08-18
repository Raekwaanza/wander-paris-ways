import { Bookmark, BookmarkCheck, ChevronRight, X } from "lucide-react";
import type { Poi } from "@/lib/scenic/types";
import { useSavedDiscoveries } from "@/lib/scenic/store";
import { cn } from "@/lib/utils";

interface Props {
  poi: Poi;
  minutesAway?: number;
  onLearnMore: () => void;
  onSkip?: () => void;
  className?: string;
}

export function DiscoveryCard({ poi, minutesAway, onLearnMore, onSkip, className }: Props) {
  const { saved, toggle } = useSavedDiscoveries();
  const isSaved = saved.includes(poi.id);

  return (
    <article className={cn("surface-card animate-sheet-up p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-display text-lg leading-tight">{poi.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{poi.kicker}</p>
        </div>
        {typeof minutesAway === "number" && (
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium tabular-nums">
            {minutesAway <= 0 ? "You're here" : `${minutesAway} min away`}
          </span>
        )}
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{poi.description}</p>
      <div className="mt-3.5 flex items-center gap-2">
        <button
          type="button"
          onClick={onLearnMore}
          className="inline-flex min-h-10 items-center gap-1 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Learn more
          <ChevronRight className="size-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => toggle(poi)}
          aria-pressed={isSaved}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium transition-colors hover:bg-secondary"
        >
          {isSaved ? (
            <BookmarkCheck className="size-4 text-primary" strokeWidth={1.75} />
          ) : (
            <Bookmark className="size-4" strokeWidth={1.75} />
          )}
          {isSaved ? "Saved" : "Save"}
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip this discovery"
            className="ml-auto inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </article>
  );
}
