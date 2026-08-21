import { describe, expect, it } from "vitest";
import { analyzeRouteCorridor } from "./route-analysis";
import { makeCandidate, makePoi } from "./test-fixtures";

describe("analyzeRouteCorridor", () => {
  const candidate = makeCandidate("route");
  const pois = [
    makePoi("end", { lat: 48.85, lng: 2.359 }),
    makePoi("outside", { lat: 48.852, lng: 2.35 }),
    makePoi("start", { lat: 48.85, lng: 2.341 }),
    makePoi("near", { lat: 48.8505, lng: 2.35 }),
  ];

  it("includes corridor POIs and orders them by true route distance", () => {
    const result = analyzeRouteCorridor(candidate, pois, 100);
    expect(result.pois.map(({ poi }) => poi.id)).toEqual(["start", "near", "end"]);
    expect(result.pois[1]!.distanceFromRouteMeters).toBeCloseTo(55.6, 1);
    expect(result.pois.map(({ progress }) => progress)).toEqual(
      [...result.pois].map((p) => p.progress).sort((a, b) => a - b),
    );
    expect(analyzeRouteCorridor(candidate, pois, 100)).toEqual(result);
  });

  it("honors the supplied corridor radius", () => {
    expect(analyzeRouteCorridor(candidate, pois, 50).pois.map(({ poi }) => poi.id)).not.toContain(
      "near",
    );
    expect(analyzeRouteCorridor(candidate, pois, 60).pois.map(({ poi }) => poi.id)).toContain(
      "near",
    );
  });
});
