import { describe, expect, it } from "vitest";
import {
  feasibleWanderSequences,
  shortlistWanderAnchors,
  stableWanderId,
  wanderCandidateScore,
  wanderProviderPoints,
} from "./wander-routing";
import { makeAnalysis, makeCandidate, makePoi } from "./test-fixtures";

const from = { lat: 48.85, lng: 2.34 };
const to = { lat: 48.85, lng: 2.36 };
const anchors = [
  makePoi("historic", { lat: 48.852, lng: 2.347, interests: ["historic"] }),
  makePoi("parks", { lat: 48.852, lng: 2.353, interests: ["parks"] }),
];

describe("Wander pure routing", () => {
  it("excludes endpoints and implausible detours from the shortlist", () => {
    const result = shortlistWanderAnchors(
      from,
      to,
      [makePoi("endpoint", from), makePoi("far", { lat: 48.9, lng: 2.4 }), ...anchors],
      30,
      [],
    );
    expect(result.map(({ id }) => id)).toEqual(expect.arrayContaining(["historic", "parks"]));
    expect(result.map(({ id }) => id)).not.toEqual(expect.arrayContaining(["endpoint", "far"]));
  });

  it("ranks explicit interest above learned affinity and breaks ties by ID", () => {
    const explicit = shortlistWanderAnchors(from, to, anchors, 30, ["parks"], {
      version: 1,
      interestAffinities: { historic: 1 },
      sourceFeedbackCount: 3,
    });
    expect(explicit[0]!.id).toBe("parks");
    const ties = [
      makePoi("z", { ...anchors[0], id: "z", interests: [] }),
      makePoi("a", { ...anchors[0], id: "a", interests: [] }),
    ];
    expect(shortlistWanderAnchors(from, to, ties, 30, []).map(({ id }) => id)).toEqual(["a", "z"]);
  });

  it("respects the shortlist hard cap", () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      makePoi(String(index).padStart(2, "0"), { lat: 48.851, lng: 2.35 }),
    );
    expect(shortlistWanderAnchors(from, to, many, 30, [])).toHaveLength(16);
  });

  it("serializes Wander provider points as coordinate-only inputs", () => {
    expect(wanderProviderPoints(from, anchors, to)).toEqual([
      from,
      { lat: anchors[0]!.lat, lng: anchors[0]!.lng },
      { lat: anchors[1]!.lat, lng: anchors[1]!.lng },
      to,
    ]);
    expect(Object.keys(wanderProviderPoints(from, anchors, to)[1]!)).toEqual(["lat", "lng"]);
  });

  it("accepts one-anchor routes within budget and rejects over-budget routes despite learning", () => {
    const matrix = [
      [0, 600, 600, 0],
      [0, 0, 0, 600],
      [0, 0, 0, 3_000],
      [0, 0, 0, 0],
    ];
    const sequences = feasibleWanderSequences(matrix, anchors, 30, "steady", [], {
      version: 1,
      interestAffinities: { parks: 1 },
      sourceFeedbackCount: 3,
    });
    expect(sequences.map(({ poiIds }) => poiIds)).toContainEqual(["historic"]);
    expect(sequences.map(({ poiIds }) => poiIds)).not.toContainEqual(["parks"]);
  });

  it("considers separated two-anchor sequences only for qualifying time windows", () => {
    const matrix = Array.from({ length: 4 }, () => Array<number | null>(4).fill(600));
    expect(
      feasibleWanderSequences(matrix, anchors, 44).every(({ poiIds }) => poiIds.length === 1),
    ).toBe(true);
    expect(
      feasibleWanderSequences(matrix, anchors, 45).some(({ poiIds }) => poiIds.length === 2),
    ).toBe(true);
    const close = [
      anchors[0]!,
      makePoi("close", { lat: anchors[0]!.lat, lng: anchors[0]!.lng + 0.001 }),
    ];
    expect(
      feasibleWanderSequences(matrix, close, 45).every(({ poiIds }) => poiIds.length === 1),
    ).toBe(true);
  });

  it("creates stable IDs sensitive to geometry and waypoint order", () => {
    const path = [from, to];
    const id = stableWanderId(from, to, 45, ["historic", "parks"], path);
    expect(stableWanderId(from, to, 45, ["historic", "parks"], path)).toBe(id);
    expect(
      stableWanderId(from, to, 45, ["historic", "parks"], [from, { ...to, lng: 2.36001 }]),
    ).not.toBe(id);
    expect(stableWanderId(from, to, 45, ["parks", "historic"], path)).not.toBe(id);
  });

  it("scores relevant discoveries and gently incorporates learning", () => {
    const analysis = makeAnalysis("route", {
      candidate: makeCandidate("route", { durationSeconds: 1_500 }),
      pois: anchors.map((poi, index) => ({
        poi,
        distanceFromRouteMeters: 0,
        distanceAlongRouteMeters: 300 + index * 300,
        progress: 0.3 + index * 0.3,
      })),
    });
    const base = wanderCandidateScore(analysis, 30, "steady", []);
    expect(
      wanderCandidateScore(analysis, 30, "steady", [], {
        version: 1,
        interestAffinities: {},
        sourceFeedbackCount: 0,
      }),
    ).toBe(base);
    expect(
      wanderCandidateScore(analysis, 30, "steady", [], {
        version: 1,
        interestAffinities: { parks: 1 },
        sourceFeedbackCount: 3,
      }),
    ).toBeGreaterThan(base);
  });
});
