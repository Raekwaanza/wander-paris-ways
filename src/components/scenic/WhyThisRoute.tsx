import type { ScenicRoute } from "@/lib/scenic/types";
import { interestLabel } from "@/lib/scenic/interests";

export function WhyThisRoute({ route }: { route: ScenicRoute }) {
  if (route.discoveries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        <p>
          {route.routingSource === "openrouteservice"
            ? "This is the most direct pedestrian route we found."
            : "This is an estimated direct route while pedestrian routing is unavailable."}
        </p>
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
            This preview is estimated to add about{" "}
            <span className="font-semibold">{route.extraMinutes} minutes</span>.
          </>
        ) : (
          <>This preview is built around:</>
        )}
      </p>
      <ul className="mt-2 space-y-1.5">
        {route.reasons.map((r) => (
          <li key={r.label} className="flex gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{r.count}</span>
            {r.label}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        {route.matchedInterests.length > 0 ? (
          <>
            Matches your interests:{" "}
            <span className="text-foreground">
              {route.matchedInterests.map(interestLabel).join(" · ")}
            </span>
          </>
        ) : (
          <>This preview uses Scenic Route's curated discovery data.</>
        )}
      </p>
    </div>
  );
}
