import { describe, expect, it } from "vitest";
import { matchNavigationPosition, stabilizeNavigationMatch } from "./navigation-progress";

const route = [
  { lat: 48.85, lng: 2.34 },
  { lat: 48.85, lng: 2.36 },
];

describe("navigation progress", () => {
  it.each([
    [2.34, 0],
    [2.35, 0.5],
    [2.36, 1],
  ])("matches longitude %s at progress %s", (lng, progress) => {
    expect(matchNavigationPosition({ lat: 48.85, lng }, route)!.progress).toBeCloseTo(progress);
  });

  it("reports perpendicular distance without changing along-route progress", () => {
    const result = matchNavigationPosition({ lat: 48.8505, lng: 2.35 }, route)!;
    expect(result.progress).toBeCloseTo(0.5);
    expect(result.distanceToRouteMeters).toBeCloseTo(55.6, 1);
  });

  it("suppresses small backward jitter but permits genuine backtracking", () => {
    const point = {
      progress: 0.5,
      distanceAlongRouteMeters: 1_000,
      distanceToRouteMeters: 0,
      projectedPoint: route[0]!,
    };
    const jitter = { ...point, progress: 0.49, distanceAlongRouteMeters: 985 };
    const backtrack = { ...point, progress: 0.46, distanceAlongRouteMeters: 920 };
    expect(stabilizeNavigationMatch(point, jitter).distanceAlongRouteMeters).toBe(1_000);
    expect(stabilizeNavigationMatch(point, backtrack).distanceAlongRouteMeters).toBe(920);
  });
});
