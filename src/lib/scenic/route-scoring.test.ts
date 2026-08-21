import { describe, expect, it } from "vitest";
import { scoreCandidateCorridors } from "./route-scoring";
import { makeAnalysis, makeCandidate, makePoi } from "./test-fixtures";

const corridorPoi = (id: string, interests: ("historic" | "parks")[], progress = 0.5) => ({
  poi: makePoi(id, { interests }),
  distanceFromRouteMeters: 0,
  distanceAlongRouteMeters: progress * 1_000,
  progress,
});
const analyses = [
  makeAnalysis("base", { pois: [corridorPoi("historic", ["historic"])] }),
  makeAnalysis("long", {
    candidate: makeCandidate("long", { providerRank: 1, durationSeconds: 1_800 }),
    pois: [corridorPoi("parks", ["parks"]), corridorPoi("historic-2", ["historic"], 0.8)],
  }),
];

describe("Scenic candidate scoring", () => {
  it("keeps empty learned preferences identical to no learning", () => {
    const options = { interests: ["parks"] as const, detourCap: 20 };
    const without = scoreCandidateCorridors(analyses, {
      ...options,
      interests: [...options.interests],
    });
    const empty = scoreCandidateCorridors(analyses, {
      ...options,
      interests: [...options.interests],
      learnedPreferences: { version: 1, interestAffinities: {}, sourceFeedbackCount: 0 },
    });
    expect(empty).toEqual(without);
  });

  it("rewards explicit interests more than maximum learned-only affinity", () => {
    const explicit = scoreCandidateCorridors([analyses[0]!], {
      interests: ["historic"],
      detourCap: 20,
    })[0]!;
    const learned = scoreCandidateCorridors([analyses[0]!], {
      interests: [],
      detourCap: 20,
      learnedPreferences: {
        version: 1,
        interestAffinities: { historic: 1 },
        sourceFeedbackCount: 3,
      },
    })[0]!;
    expect(explicit.breakdown.interestMatch).toBeGreaterThan(learned.breakdown.interestMatch);
    expect(learned.breakdown.interestMatch).toBeGreaterThan(0);
  });

  it("never exposes learned-only interests as matched interests", () => {
    const scored = scoreCandidateCorridors(analyses, {
      interests: ["parks"],
      detourCap: 20,
      learnedPreferences: {
        version: 1,
        interestAffinities: { historic: 1 },
        sourceFeedbackCount: 3,
      },
    });
    expect(scored.flatMap(({ matchedInterests }) => matchedInterests)).not.toContain("historic");
  });

  it("enforces the detour cap and penalizes longer otherwise similar routes", () => {
    const scored = scoreCandidateCorridors(analyses, { interests: [], detourCap: 9.9 });
    expect(scored.find((item) => item.analysis.candidate.id === "base")!.withinDetourCap).toBe(
      true,
    );
    const long = scored.find((item) => item.analysis.candidate.id === "long")!;
    expect(long.withinDetourCap).toBe(false);
    expect(long.breakdown.detourPenalty).toBeGreaterThan(0);
  });

  it("orders bounded contributing POIs deterministically by value, position, then ID", () => {
    const pois = Array.from({ length: 8 }, (_, index) =>
      corridorPoi(`poi-${index}`, [], (index + 1) / 10),
    );
    const result = scoreCandidateCorridors([makeAnalysis("many", { pois: pois.reverse() })], {
      interests: [],
      detourCap: 20,
    })[0]!;
    expect(result.contributingPoiIds).toHaveLength(6);
    expect(result.contributingPoiIds).toEqual([
      "poi-0",
      "poi-1",
      "poi-2",
      "poi-3",
      "poi-4",
      "poi-5",
    ]);
  });
});
