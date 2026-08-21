import { describe, expect, it } from "vitest";
import { nearestPointOnPath, routeGeometrySignature } from "./geo";

const path = [
  { lat: 48.85, lng: 2.34 },
  { lat: 48.85, lng: 2.36 },
];

describe("nearestPointOnPath", () => {
  it("projects the midpoint of a straight route using cumulative distance", () => {
    const match = nearestPointOnPath({ lat: 48.85, lng: 2.35 }, path)!;
    expect(match.progress).toBeCloseTo(0.5, 6);
    expect(match.distanceKm).toBeCloseTo(0, 6);
    expect(match.pathDistanceKm).toBeCloseTo(0.734, 3);
  });

  it("preserves along-route progress for a perpendicular offset", () => {
    const match = nearestPointOnPath({ lat: 48.8505, lng: 2.35 }, path)!;
    expect(match.progress).toBeCloseTo(0.5, 5);
    expect(match.nearestPoint.lat).toBeCloseTo(48.85, 6);
    expect(match.distanceKm * 1_000).toBeCloseTo(55.6, 1);
  });

  it("reports route endpoints as zero and complete progress", () => {
    expect(nearestPointOnPath(path[0]!, path)!.progress).toBeCloseTo(0);
    expect(nearestPointOnPath(path[1]!, path)!.progress).toBeCloseTo(1);
  });

  it("weights unequal segments by distance rather than segment count", () => {
    const unequal = [path[0]!, { lat: 48.85, lng: 2.342 }, path[1]!];
    expect(nearestPointOnPath(unequal[1]!, unequal)!.progress).toBeCloseTo(0.1, 5);
  });

  it("defensively handles empty and one-point paths", () => {
    expect(nearestPointOnPath(path[0]!, [])).toBeNull();
    const match = nearestPointOnPath(path[1]!, [path[0]!])!;
    expect(match.progress).toBe(0);
    expect(match.nearestPoint).toEqual(path[0]);
  });
});

describe("routeGeometrySignature", () => {
  it("is deterministic at its documented six-decimal precision", () => {
    expect(routeGeometrySignature(path)).toBe(routeGeometrySignature(path.map((p) => ({ ...p }))));
    expect(routeGeometrySignature(path)).toBe(
      routeGeometrySignature([{ lat: 48.8500001, lng: 2.3400001 }, path[1]!]),
    );
    expect(routeGeometrySignature(path)).not.toBe(
      routeGeometrySignature([path[0]!, { lat: 48.85, lng: 2.36001 }]),
    );
  });
});
