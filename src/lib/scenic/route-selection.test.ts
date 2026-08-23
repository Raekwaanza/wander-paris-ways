import { describe, expect, it } from "vitest";
import { selectExplorerCandidate, selectScenicCandidate } from "./route-selection";
import {
  BRIDGE_LIKE_ROUTE,
  L_SHAPED_ROUTE,
  makeAnalysis,
  makeCandidate,
  makeScored,
} from "./test-fixtures";

describe("route selection", () => {
  it("selects the highest ranked within-cap Scenic candidate", () => {
    const outside = makeScored("outside", { score: 100, withinDetourCap: false });
    const inside = makeScored("inside", { score: 10 });
    expect(selectScenicCandidate([outside, inside], "fast")?.analysis.candidate.id).toBe("inside");
  });

  it("falls back to Fastest and preserves scored input tie order", () => {
    const fast = makeScored("fast", { withinDetourCap: false });
    expect(selectScenicCandidate([makeScored("x", { withinDetourCap: false }), fast], "fast")).toBe(
      fast,
    );
    expect(
      selectScenicCandidate([makeScored("first"), makeScored("second")], "fast")?.analysis.candidate
        .id,
    ).toBe("first");
  });

  it("keeps Explorer distinct from Scenic and applies comparator priorities", () => {
    const scenic = makeScored("scenic", { contributingPoiIds: ["a", "b", "c"] });
    const spread = makeScored("spread", {
      contributingPoiIds: ["a", "b"],
      breakdown: { ...makeScored("x").breakdown, discoverySpread: 2 },
    });
    const count = makeScored("count", { contributingPoiIds: ["a", "b", "c"] });
    expect(
      selectExplorerCandidate([scenic, spread, count], "fast", "scenic")?.analysis.candidate.id,
    ).toBe("count");
  });

  it("resolves remaining Explorer comparator fields deterministically", () => {
    const candidate = (id: string, score: number, extraMinutes: number, providerRank: number) =>
      makeScored(id, {
        analysis: makeAnalysis(id, { candidate: makeCandidate(id, { providerRank }) }),
        contributingPoiIds: ["a"],
        score,
        extraMinutes,
      });
    expect(
      selectExplorerCandidate(
        [candidate("low", 1, 9, 0), candidate("high", 2, 1, 5)],
        "fast",
        "scenic",
      )?.analysis.candidate.id,
    ).toBe("high");
    expect(
      selectExplorerCandidate(
        [candidate("less", 2, 1, 0), candidate("more", 2, 2, 5)],
        "fast",
        "scenic",
      )?.analysis.candidate.id,
    ).toBe("more");
    expect(
      selectExplorerCandidate([candidate("z", 2, 2, 0), candidate("a", 2, 2, 0)], "fast", "scenic")
        ?.analysis.candidate.id,
    ).toBe("a");
  });

  it("returns no Explorer without a qualifying distinct route", () => {
    expect(
      selectExplorerCandidate(
        [makeScored("scenic", { contributingPoiIds: ["a"] })],
        "fast",
        "scenic",
      ),
    ).toBeUndefined();
  });

  it("preserves the selected Scenic and Explorer candidate geometry", () => {
    const scenic = makeScored("scenic", {
      analysis: makeAnalysis("scenic", {
        candidate: makeCandidate("scenic", { path: L_SHAPED_ROUTE }),
      }),
      contributingPoiIds: ["a"],
    });
    const explorer = makeScored("explorer", {
      analysis: makeAnalysis("explorer", {
        candidate: makeCandidate("explorer", { providerRank: 1, path: BRIDGE_LIKE_ROUTE }),
      }),
      contributingPoiIds: ["a", "b"],
    });
    expect(selectScenicCandidate([scenic, explorer], "fast")!.analysis.candidate.path).toBe(
      L_SHAPED_ROUTE,
    );
    expect(
      selectExplorerCandidate([scenic, explorer], "fast", "scenic")!.analysis.candidate.path,
    ).toBe(BRIDGE_LIKE_ROUTE);
  });
});
