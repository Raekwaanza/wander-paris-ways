import { describe, expect, it } from "vitest";
import { placeDiscoveriesAlongRoute, selectNavigationDiscovery } from "./navigation-discoveries";
import { makePoi } from "./test-fixtures";

const route = [
  { lat: 48.85, lng: 2.34 },
  { lat: 48.85, lng: 2.354 },
];
const discoveries = [
  makePoi("c", { lat: 48.85, lng: 2.3512 }),
  makePoi("a", { lat: 48.85, lng: 2.3428 }),
  makePoi("b", { lat: 48.85, lng: 2.347 }),
];

describe("navigation discovery sequencing", () => {
  const placements = placeDiscoveriesAlongRoute(discoveries, route);
  const select = (at: number | null, skipped: string[] = []) =>
    selectNavigationDiscovery(placements, at, new Set(skipped))?.poi.id ?? null;

  it("sorts source discoveries by projected route distance", () => {
    expect(placements.map(({ poi }) => poi.id)).toEqual(["a", "b", "c"]);
  });

  it("selects the first discovery before GPS and at route start", () => {
    expect(select(null)).toBe("a");
    expect(select(0)).toBe("a");
  });

  it("retains a recently passed discovery within the buffer", () => {
    const a = placements[0]!.distanceAlongRouteMeters;
    expect(select(a + 50)).toBe("a");
    expect(select(a + 70)).toBe("b");
  });

  it("supports skipping and exhaustion", () => {
    expect(select(0, ["a"])).toBe("b");
    expect(select(0, ["a", "b"])).toBe("c");
    expect(select(0, ["a", "b", "c"])).toBeNull();
    expect(select(2_000)).toBeNull();
  });

  it("allows backtracking to make a prior unskipped discovery relevant again", () => {
    expect(select(placements[1]!.distanceAlongRouteMeters + 70)).toBe("c");
    expect(select(placements[0]!.distanceAlongRouteMeters)).toBe("a");
  });

  it("breaks same-position ties by POI ID", () => {
    const samePoint = { lat: discoveries[1]!.lat, lng: discoveries[1]!.lng };
    const ties = placeDiscoveriesAlongRoute(
      [makePoi("z", samePoint), makePoi("aa", samePoint)],
      route,
    );
    expect(ties.map(({ poi }) => poi.id)).toEqual(["aa", "z"]);
  });
});
