import type { ScenicRoute } from "@/lib/scenic/types";
import { interestLabel } from "@/lib/scenic/interests";

export function WhyThisRoute({ route }: { route: ScenicRoute }) {
  if (route.discoveries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        <p>No detour here — this is simply the most direct way there.</p>
        {route.attribution && <p className="mt-1 text-xs">{route.attribution}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-secondary/60 p-4">
      <p className="text-eyebrow text-muted-foreground">Why this route?</p>
      <p className="mt-2 text-sm">
        {route.extraMinutes > 0 ? (
          <>
            This walk adds <span className="font-semibold">{route.extraMinutes} minutes</span> and
            takes you through:
          </>
        ) : (
          <>This walk takes you through:</>
        )}
      </p>
      <ul className="mt-2 space-y-1.5">
        {route.reasons.map((r) => (
          <li key={r.label} className="flex gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{r.count}</span>
            {r.label}
          </li>
        ))}
        <li className="flex gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">
            {route.majorRoadReduction}%
          </span>
          less time on major roads
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        {route.matchedInterests.length > 0 ? (
          <>
            Based on your interests:{" "}
            <span className="text-foreground">
              {route.matchedInterests.map(interestLabel).join(" · ")}
            </span>
          </>
        ) : (
          <>No interests set — scored on scenic value, quiet streets and discovery density.</>
        )}
      </p>
    </div>
  );
}
