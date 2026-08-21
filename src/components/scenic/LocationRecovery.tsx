import { Link } from "@tanstack/react-router";

export function LocationRecovery() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="surface-card max-w-md p-6 text-center">
        <h1 className="text-display text-2xl">We need your location again</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your precise location isn't stored between sessions. Return to the planner to use your
          location again.
        </p>
        <Link
          to="/explore"
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Back to planner
        </Link>
      </div>
    </main>
  );
}
