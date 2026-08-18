import { Bookmark, BookmarkCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Poi } from "@/lib/scenic/types";
import { useSavedDiscoveries } from "@/lib/scenic/store";
import { interestLabel } from "@/lib/scenic/interests";

interface Props {
  poi: Poi | null;
  onOpenChange: (open: boolean) => void;
}

const bars: { key: keyof Poi["scores"]; label: string }[] = [
  { key: "scenic", label: "Scenic" },
  { key: "hidden", label: "Hidden gem" },
  { key: "historic", label: "Historic" },
  { key: "architecture", label: "Architecture" },
  { key: "nature", label: "Green" },
  { key: "food", label: "Food & cafés" },
];

export function DiscoveryDetail({ poi, onOpenChange }: Props) {
  const { saved, toggle } = useSavedDiscoveries();
  if (!poi) return null;
  const isSaved = saved.includes(poi.id);

  return (
    <Dialog open={!!poi} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-3xl">
        <DialogHeader>
          <p className="text-eyebrow text-muted-foreground">
            {poi.category} · {poi.arrondissement}
            {poi.arrondissement === 1 ? "st" : poi.arrondissement === 2 ? "nd" : poi.arrondissement === 3 ? "rd" : "th"}{" "}
            arrondissement
          </p>
          <DialogTitle className="text-display text-2xl">{poi.name}</DialogTitle>
        </DialogHeader>

        <p className="text-sm leading-relaxed text-muted-foreground">{poi.detail}</p>

        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2">
          {bars.map((b) => (
            <div key={b.key}>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{b.label}</span>
                <span className="tabular-nums">{poi.scores[b.key]}/10</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${poi.scores[b.key] * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {poi.interests.map((i) => (
            <span
              key={i}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              {interestLabel(i)}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Suggested stop · {poi.visitMinutes} min
          </span>
          <button
            type="button"
            onClick={() => toggle(poi)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium hover:bg-secondary"
          >
            {isSaved ? (
              <BookmarkCheck className="size-4 text-primary" strokeWidth={1.75} />
            ) : (
              <Bookmark className="size-4" strokeWidth={1.75} />
            )}
            {isSaved ? "Saved" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
