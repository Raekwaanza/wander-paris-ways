import { Bookmark, BookmarkCheck, ChevronRight, X } from "lucide-react";
import type { Poi } from "@/lib/scenic/types";
import { useSavedDiscoveries } from "@/lib/scenic/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  poi: Poi;
  onLearnMore: () => void;
  onSkip?: (() => void) | undefined;
  contextLabel?: string | undefined;
  className?: string | undefined;
}

export function DiscoveryCard({ poi, onLearnMore, onSkip, contextLabel, className }: Props) {
  const { saved, toggle } = useSavedDiscoveries();
  const isSaved = saved.includes(poi.id);

  return (
    <article className={cn("surface-card animate-sheet-up p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {contextLabel && (
            <p className="text-eyebrow mb-1 text-muted-foreground">{contextLabel}</p>
          )}
          <h3 className="text-display text-lg leading-tight">{poi.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{poi.kicker}</p>
        </div>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{poi.description}</p>
      <div className="mt-3.5 flex items-center gap-2">
        <Button type="button" onClick={onLearnMore}>
          Learn more
          <ChevronRight className="size-4" strokeWidth={2} />
        </Button>
        <Button type="button" variant="outline" onClick={() => toggle(poi)} aria-pressed={isSaved}>
          {isSaved ? (
            <BookmarkCheck className="size-4 text-primary" strokeWidth={1.75} />
          ) : (
            <Bookmark className="size-4" strokeWidth={1.75} />
          )}
          {isSaved ? "Saved" : "Save"}
        </Button>
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
