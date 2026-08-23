import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ParisMap } from "@/components/scenic/ParisMap";
import { ScenicLoader } from "@/components/scenic/ScenicLoader";
import { SplitShell } from "@/components/scenic/SplitShell";
import { services } from "@/lib/scenic/services";
import {
  decodeSharedRoutePayload,
  type SharedRoutePayloadV1,
  type SharedRouteResolution,
} from "@/lib/scenic/shared-route";
import type { Place } from "@/lib/scenic/types";

export const Route = createFileRoute("/shared")({
  head: () => ({
    meta: [
      { title: "Shared walking route — Scenic Route Paris" },
      { name: "description", content: "Open a shared walking route through Paris." },
      { property: "og:title", content: "Shared walking route — Scenic Route Paris" },
      { property: "og:description", content: "Open a shared walking route through Paris." },
    ],
  }),
  component: SharedRoutePage,
});

type ViewState =
  | { status: "loading-token" | "invalid" }
  | { status: "loading-route"; payload: SharedRoutePayloadV1 }
  | ({ payload: SharedRoutePayloadV1 } & SharedRouteResolution);

const asPlace = (endpoint: SharedRoutePayloadV1["from"], id: string): Place => ({
  ...endpoint,
  id,
  kind: "Shared endpoint",
  area: "Paris",
});

function SharedRoutePage() {
  const hash = useLocation({ select: (location) => location.hash });
  const [state, setState] = useState<ViewState>({ status: "loading-token" });

  useEffect(() => {
    const token = new URLSearchParams(hash.replace(/^#/, "")).get("r");
    const payload = token ? decodeSharedRoutePayload(token) : null;
    if (!payload) {
      setState({ status: "invalid" });
      return;
    }
    setState({ status: "loading-route", payload });
    let active = true;
    void services.routing.resolveShared(payload).then((resolution) => {
      if (active) setState({ payload, ...resolution });
    });
    return () => {
      active = false;
    };
  }, [hash]);

  if (state.status === "loading-token" || state.status === "loading-route") {
    return <SplitShell map={<div />} panel={<ScenicLoader />} />;
  }
  if (state.status === "invalid") {
    return <Message title="This shared route link isn't valid." />;
  }

  if (!("payload" in state)) return null;
  const from = asPlace(state.payload.from, "shared-from");
  const to = asPlace(state.payload.to, "shared-to");
  if (state.status !== "exact") {
    return (
      <SplitShell
        map={<ParisMap start={from} end={to} padding={7} />}
        panel={
          <Summary
            payload={state.payload}
            title={
              state.status === "changed"
                ? "This route has changed"
                : "The shared route can't be loaded right now."
            }
            body={
              state.status === "changed"
                ? "The pedestrian network no longer reproduces this exact shared route. You can still see the original route summary below."
                : "The pedestrian routing provider is unavailable. You can still see the original shared estimate."
            }
          />
        }
      />
    );
  }

  const route = state.route;
  return (
    <SplitShell
      map={
        <ParisMap
          routes={[{ route, active: true }]}
          start={from}
          end={to}
          discoveries={route.discoveries}
          padding={7}
        />
      }
      panel={
        <div className="space-y-5 px-5 pt-5 pb-6">
          <div>
            <p className="text-eyebrow text-muted-foreground">Shared walking route</p>
            <h1 className="text-display mt-1 text-2xl">{route.title} route</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {from.name} → {to.name}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Reconstructed from the pedestrian network.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-2">
            <Metric value={`${route.minutes} min`} label="current time" />
            <Metric value={`${route.km} km`} label="current distance" />
            <Metric value={`+${route.extraMinutes} min`} label="extra time" />
          </dl>
          {route.discoveries.length > 0 && (
            <div>
              <h2 className="text-sm font-medium">Curated discoveries</h2>
              <ul className="mt-2 space-y-2">
                {route.discoveries.map((poi) => (
                  <li key={poi.id} className="rounded-xl border border-border bg-card p-3">
                    <p className="text-sm font-medium">{poi.name}</p>
                    <p className="text-xs text-muted-foreground">{poi.kicker}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <PlanLink />
        </div>
      }
    />
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-3">
      <dt className="font-semibold tabular-nums">{value}</dt>
      <dd className="text-xs text-muted-foreground">{label}</dd>
    </div>
  );
}

function Summary({
  payload,
  title,
  body,
}: {
  payload: SharedRoutePayloadV1;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-5 px-5 pt-5 pb-6">
      <div>
        <p className="text-eyebrow text-muted-foreground">Shared route summary</p>
        <h1 className="text-display mt-1 text-2xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
      <p className="text-sm font-medium">
        {payload.from.name} → {payload.to.name}
      </p>
      <dl className="grid grid-cols-2 gap-2">
        <Metric value={`${payload.expected.minutes} min`} label="original estimate" />
        <Metric value={`${payload.expected.km} km`} label="original distance" />
      </dl>
      <PlanLink />
    </div>
  );
}

function PlanLink() {
  return (
    <Link
      to="/explore"
      className="flex min-h-12 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground"
    >
      Plan your own walk
    </Link>
  );
}

function Message({ title }: { title: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-display text-2xl">{title}</h1>
        <div className="mt-6">
          <PlanLink />
        </div>
      </div>
    </div>
  );
}
