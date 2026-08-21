/* eslint-disable @typescript-eslint/no-explicit-any -- malformed public-token fixtures intentionally escape the trusted payload type */
import { describe, expect, it } from "vitest";
import {
  MAX_SHARED_ROUTE_TOKEN_LENGTH,
  buildSharedRouteUrl,
  createSharedRoutePayload,
  decodeSharedRoutePayload,
  encodeSharedRoutePayload,
  type SharedRoutePayloadV1,
  validateSharedRoutePayload,
} from "./shared-route";
import { makePoi } from "./test-fixtures";
import type { ScenicRoute, TripPlan } from "./types";

const payload = (): SharedRoutePayloadV1 => ({
  v: 1,
  from: { name: "Musée d'Orsay", lat: 48.86, lng: 2.3266 },
  to: { name: "Église Saint-Sulpice — Café de Flore", lat: 48.8511, lng: 2.3348 },
  mode: "route",
  profile: "scenic",
  routeId: "ors-scenic-fixture",
  interests: ["historic"],
  detourCap: 20,
  pace: "steady",
  discoveryPoiIds: ["poi-a"],
  expected: { minutes: 30, km: 2.5, extraMinutes: 5 },
});

describe("shared-route codec and validation", () => {
  it("round-trips valid UTF-8 payloads", () => {
    const original = payload();
    expect(decodeSharedRoutePayload(encodeSharedRoutePayload(original))).toEqual(original);
  });

  it("rejects garbage, oversized tokens, and unsupported versions", () => {
    expect(decodeSharedRoutePayload("not!base64")).toBeNull();
    expect(decodeSharedRoutePayload("a".repeat(MAX_SHARED_ROUTE_TOKEN_LENGTH + 1))).toBeNull();
    expect(validateSharedRoutePayload({ ...payload(), v: 2 })).toBeNull();
  });

  it.each([
    ["invalid latitude", (p: any) => (p.from.lat = 91)],
    ["invalid longitude", (p: any) => (p.from.lng = 181)],
    ["outside Paris", (p: any) => ((p.from.lat = 40), (p.from.lng = 2.3))],
    ["empty endpoint name", (p: any) => (p.from.name = " ")],
    ["long endpoint name", (p: any) => (p.from.name = "x".repeat(121))],
    ["invalid profile", (p: any) => (p.profile = "pretty")],
    ["invalid pace", (p: any) => (p.pace = "running")],
    ["invalid detour cap", (p: any) => (p.detourCap = 121)],
    ["unknown interest", (p: any) => (p.interests = ["unknown"])],
    ["duplicate interests", (p: any) => (p.interests = ["historic", "historic"])],
    [
      "too many discoveries",
      (p: any) =>
        (p.discoveryPoiIds = Array.from({ length: 9 }, (_: unknown, i: number) => String(i))),
    ],
    ["duplicate discoveries", (p: any) => (p.discoveryPoiIds = ["a", "a"])],
    ["route prefix mismatch", (p: any) => (p.routeId = "ors-fastest-x")],
  ])("rejects %s", (_name, mutate) => {
    const candidate: any = structuredClone(payload());
    mutate(candidate);
    expect(validateSharedRoutePayload(candidate)).toBeNull();
  });

  it("enforces Wander metadata and fit rules", () => {
    const wander: any = {
      ...payload(),
      mode: "wander",
      profile: "explorer",
      routeId: "ors-wander-x",
      wander: { requestedMinutes: 45, fit: "targeted", waypointPoiIds: ["a"] },
    };
    expect(validateSharedRoutePayload(wander)).not.toBeNull();
    expect(validateSharedRoutePayload({ ...wander, wander: undefined })).toBeNull();
    expect(
      validateSharedRoutePayload({ ...wander, wander: { ...wander.wander, waypointPoiIds: [] } }),
    ).toBeNull();
    expect(
      validateSharedRoutePayload({
        ...wander,
        wander: { ...wander.wander, waypointPoiIds: ["a", "b", "c"] },
      }),
    ).toBeNull();
    expect(
      validateSharedRoutePayload({
        ...wander,
        wander: { ...wander.wander, fit: "direct-only", waypointPoiIds: ["a"] },
      }),
    ).toBeNull();
    expect(
      validateSharedRoutePayload({ ...wander, wander: { ...wander.wander, fit: "preview" } }),
    ).toBeNull();
    expect(validateSharedRoutePayload({ ...payload(), wander: wander.wander })).toBeNull();
  });

  it("creates a privacy-minimal payload and normalizes current-location names", () => {
    const route: ScenicRoute = {
      id: "ors-scenic-private",
      profile: "scenic",
      title: "Route",
      blurb: "Route",
      minutes: 20,
      km: 2,
      extraMinutes: 3,
      discoveries: [makePoi("poi-a")],
      path: [
        { lat: 48.85, lng: 2.34 },
        { lat: 48.86, lng: 2.35 },
      ],
      matchedInterests: ["historic"],
      reasons: [],
      routingSource: "openrouteservice",
    };
    const trip: TripPlan = {
      from: { type: "current-location", id: "live-current-location" },
      to: { type: "seeded", id: "louvre" },
      interests: ["historic"],
      detourCap: 20,
      mode: "route",
      learnedPreferences: {
        version: 1,
        interestAffinities: { historic: 1 },
        sourceFeedbackCount: 4,
      },
      createdAt: 1,
    };
    const shared = createSharedRoutePayload({
      route,
      trip,
      from: {
        id: "live-current-location",
        name: "Current location",
        kind: "Position",
        area: "Paris",
        lat: 48.85,
        lng: 2.34,
      },
      to: {
        id: "louvre",
        name: "Current location",
        kind: "Museum",
        area: "Paris",
        lat: 48.86,
        lng: 2.35,
      },
      pace: "steady",
    })!;
    expect(shared.from.name).toBe("Route start");
    expect(shared.to.name).toBe("Route end");
    const serialized = JSON.stringify(shared);
    for (const secret of [
      "learnedPreferences",
      "interestAffinities",
      "sourceFeedbackCount",
      "feedback",
      "GPS",
      "path",
    ])
      expect(serialized).not.toContain(secret);
  });

  it.each([
    ["/complete", "/shared#r="],
    ["/app/complete", "/app/shared#r="],
  ])("builds a share URL from %s", (pathname, expectedPath) => {
    const url = buildSharedRouteUrl(payload(), {
      origin: "https://example.com",
      pathname,
    } as Location);
    expect(url).toContain(`https://example.com${expectedPath}`);
    expect(decodeSharedRoutePayload(url.split("#r=")[1]!)).toEqual(payload());
  });
});
