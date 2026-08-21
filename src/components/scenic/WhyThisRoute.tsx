import type { ScenicRoute } from "@/lib/scenic/types";
import { interestLabel } from "@/lib/scenic/interests";

export function WhyThisRoute({ route }: { route: ScenicRoute }) {
  const isReal = route.routingSource === "openrouteservice";

  if (route.discoveries.length === 0) {
    let description =
      "This is a concept preview using estimated route geometry and curated discovery data.";
    if (isReal) {
      if (route.profile === "fastest") {
        description = "This is the direct pedestrian route used as the baseline for comparison.";
      } else if (route.profile === "scenic") {
        description =
          route.extraMinutes > 0
            ? `This pedestrian-network route adds about ${route.extraMinutes} minutes compared with the direct route, but no curated discoveries are displayed nearby.`
            : "This pedestrian-network route adds no meaningful extra walking time in the current comparison, but no curated discoveries are displayed nearby.";
      } else {
        description =
          route.extraMinutes > 0
            ? `This walking alternative adds about ${route.extraMinutes} minutes compared with the direct route, but no curated discoveries are displayed nearby.`
            : "This walking alternative adds no meaningful extra walking time in the current comparison, but no curated discoveries are displayed nearby.";
      }
    }
    return (
      <div className="text-sm text-muted-foreground">
        <p>{description}</p>
        {route.attribution && <p className="mt-1 text-xs">{route.attribution}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-secondary/60 p-4">
      <p className="text-eyebrow text-muted-foreground">Why this route?</p>
      <p className="mt-2 text-sm">
        {!isReal ? (
          <>This is a concept preview using estimated route geometry and curated discovery data.</>
        ) : route.profile === "fastest" ? (
          <>This is the direct pedestrian route used as the baseline for comparison.</>
        ) : route.profile === "scenic" ? (
          <>
            Chosen from real walking alternatives for the {route.discoveries.length} curated
            {route.discoveries.length === 1 ? " discovery" : " discoveries"} near the route while
            staying within your extra-time setting.{" "}
            {route.extraMinutes > 0 ? "It adds about " : "It adds "}
            {route.extraMinutes > 0 && (
              <span className="font-semibold">{route.extraMinutes} minutes</span>
            )}
            {route.extraMinutes > 0
              ? " compared with the direct route."
              : "no meaningful extra walking time in the current comparison."}
          </>
        ) : (
          <>
            A discovery-focused walking alternative selected from the available pedestrian routes,
            with {route.discoveries.length} curated
            {route.discoveries.length === 1 ? " discovery" : " discoveries"} near the walk.{" "}
            {route.extraMinutes > 0 ? "It adds about " : "It adds "}
            {route.extraMinutes > 0 && (
              <span className="font-semibold">{route.extraMinutes} minutes</span>
            )}
            {route.extraMinutes > 0
              ? " compared with the direct route and fits your extra-time setting."
              : "no meaningful extra walking time in the current comparison and fits your extra-time setting."}
          </>
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
          <>
            {isReal
              ? "This route uses Scenic Route's curated discovery data."
              : "This preview uses Scenic Route's curated discovery data."}
          </>
        )}
      </p>
    </div>
  );
}
