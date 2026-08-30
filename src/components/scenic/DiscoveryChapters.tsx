import { ChevronRight } from "lucide-react";
import type { Poi } from "@/lib/scenic/types";
import { cn } from "@/lib/utils";

interface Props {
  discoveries: Poi[];
  onSelect?: ((poi: Poi) => void) | undefined;
  className?: string | undefined;
}

export function DiscoveryChapters({ discoveries, onSelect, className }: Props) {
  return (
    <ol className={cn("divide-y divide-border border-y border-border", className)}>
      {discoveries.map((discovery, index) => {
        const content = (
          <>
            <span className="w-7 shrink-0 pt-0.5 text-xs font-semibold text-primary tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-display block text-base leading-tight">{discovery.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{discovery.kicker}</span>
            </span>
            {onSelect && (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            )}
          </>
        );

        return (
          <li key={discovery.id}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(discovery)}
                aria-label={`View details for ${discovery.name}`}
                className="flex min-h-16 w-full items-start gap-3 px-1 py-3.5 text-left transition-colors hover:bg-secondary/55"
              >
                {content}
              </button>
            ) : (
              <div className="flex min-h-16 items-start gap-3 px-1 py-3.5">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
