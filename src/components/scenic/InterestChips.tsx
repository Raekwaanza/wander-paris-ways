import { Sparkles } from "lucide-react";
import { INTERESTS } from "@/lib/scenic/interests";
import type { InterestId } from "@/lib/scenic/types";
import { cn } from "@/lib/utils";

interface Props {
  value: InterestId[];
  onChange: (next: InterestId[]) => void;
  showSurprise?: boolean;
  className?: string;
}

export function InterestChips({ value, onChange, showSurprise = true, className }: Props) {
  const toggle = (id: InterestId) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {showSurprise && (
        <button
          type="button"
          onClick={() => onChange([])}
          className={cn(
            "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
            value.length === 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-secondary",
          )}
        >
          <Sparkles className="size-4" strokeWidth={1.75} />
          Surprise me
        </button>
      )}
      {INTERESTS.map((i) => {
        const on = value.includes(i.id);
        return (
          <button
            key={i.id}
            type="button"
            onClick={() => toggle(i.id)}
            aria-pressed={on}
            className={cn(
              "min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors",
              on
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {i.label}
          </button>
        );
      })}
    </div>
  );
}
