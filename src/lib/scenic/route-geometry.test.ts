import { describe, expect, it } from "vitest";
import { isNetworkNavigableRoute } from "./navigation";
import {
  buildRouteFeatureCollection,
  getRenderableRouteGeometry,
  routeGeometryToMapLibreCoordinates,
} from "./route-geometry";
import { createSharedRoutePayload } from "./shared-route";
import { BRIDGE_LIKE_ROUTE, L_SHAPED_ROUTE, MULTI_TURN_ROUTE } from "./test-fixtures";
import type { LatLng, ScenicRoute, TripPlan } from "./types";

function route(
  id: string,
  path: LatLng[],
  source: ScenicRoute["routingSource"] = "openrouteservice",
): ScenicRoute {
  return {
    id,
    profile: "scenic",
    title: "Fixture",
    blurb: "Fixture",
    minutes: 10,
    km: 1,
    extraMinutes: 1,
    discoveries: [],
    path,
    matchedInterests: [],
    reasons: [],
    routingSource: source,
  };
}

describe("canonical route geometry", () => {
  it.each([
    ["L-shaped", L_SHAPED_ROUTE],
    ["bridge-like", BRIDGE_LIKE_ROUTE],
    ["multi-turn", MULTI_TURN_ROUTE],
  ])("renders every %s provider vertex without endpoint interpolation", (name, path) => {
    const providerRoute = route(`ors-${name}`, path);
    expect(getRenderableRouteGeometry(providerRoute)).toBe(path);
    expect(
      buildRouteFeatureCollection([{ route: providerRoute, active: true }]).features[0]!.geometry
        .coordinates,
    ).toEqual(path.map(({ lat, lng }) => [lng, lat]));
  });

  it("converts LatLng to MapLibre longitude-latitude ordering", () => {
    expect(routeGeometryToMapLibreCoordinates([{ lat: 48.8566, lng: 2.3522 }])).toEqual([
      [2.3522, 48.8566],
    ]);
  });

  it("keeps each comparison route's own provider coordinates", () => {
    const fastest = route("ors-fastest", L_SHAPED_ROUTE);
    const scenic = route("ors-scenic", BRIDGE_LIKE_ROUTE);
    const explorer = route("ors-explorer", MULTI_TURN_ROUTE);
    const features = buildRouteFeatureCollection([
      { route: fastest, active: false },
      { route: scenic, active: true },
      { route: explorer, active: false },
    ]).features;
    expect(features.map(({ geometry }) => geometry.coordinates)).toEqual(
      [L_SHAPED_ROUTE, BRIDGE_LIKE_ROUTE, MULTI_TURN_ROUTE].map((path) =>
        path.map(({ lat, lng }) => [lng, lat]),
      ),
    );
  });

  it("allows explicit Preview geometry", () => {
    const preview = route("preview", L_SHAPED_ROUTE, "mock");
    expect(buildRouteFeatureCollection([{ route: preview, active: true }]).features).toHaveLength(
      1,
    );
    expect(isNetworkNavigableRoute(preview)).toBe(false);
  });

  it.each([
    ["empty", []],
    ["single point", L_SHAPED_ROUTE.slice(0, 1)],
    ["non-finite", [{ lat: Number.NaN, lng: 2.34 }, L_SHAPED_ROUTE[1]!]],
    ["out of range", [{ lat: 48.85, lng: 181 }, L_SHAPED_ROUTE[1]!]],
  ])("suppresses provider routes with %s geometry instead of fabricating a line", (name, path) => {
    const invalid = route(`ors-invalid-${name}`, path);
    expect(getRenderableRouteGeometry(invalid)).toBeNull();
    expect(buildRouteFeatureCollection([{ route: invalid, active: true }]).features).toEqual([]);
    expect(isNetworkNavigableRoute(invalid)).toBe(false);
  });

  it("refuses to share a provider-labelled route without real geometry", () => {
    const invalid = route("ors-scenic-invalid", []);
    const trip: TripPlan = {
      from: { type: "seeded", id: "opera" },
      to: { type: "seeded", id: "louvre" },
      interests: [],
      detourCap: 20,
      mode: "route",
      createdAt: 1,
    };
    const place = (id: string, lat: number, lng: number) => ({
      id,
      name: id,
      kind: "Fixture",
      area: "Paris",
      lat,
      lng,
    });
    expect(
      createSharedRoutePayload({
        route: invalid,
        trip,
        from: place("opera", 48.8708, 2.3323),
        to: place("louvre", 48.8606, 2.3376),
        pace: "steady",
      }),
    ).toBeNull();
  });
});
