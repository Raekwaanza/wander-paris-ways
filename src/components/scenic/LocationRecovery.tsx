import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface Props {
  reason?: "location" | "route-details";
}

export function LocationRecovery({ reason = "location" }: Props) {
  const routeDetails = reason === "route-details";
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="surface-card max-w-md p-6 text-center">
        <h1 className="text-display text-2xl">
          {routeDetails ? "We need your route details again" : "We need your location again"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {routeDetails
            ? "This destination was selected from live search and isn't stored between sessions yet. Return to the planner to choose it again."
            : "Your precise location isn't stored between sessions. Return to the planner to use your location again."}
        </p>
        <Button asChild size="lg" className="mt-5">
          <Link to="/explore">Back to planner</Link>
        </Button>
      </div>
    </main>
  );
}
