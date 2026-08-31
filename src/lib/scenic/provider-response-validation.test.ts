import { describe, expect, it } from "vitest";
import { parsePedestrianRouteResponse } from "./provider-response-validation";

const base = {
  providerRank: 0,
  path: [
    { lat: 48.85, lng: 2.34 },
    { lat: 48.85, lng: 2.341 },
  ],
  distanceMeters: 80,
  durationSeconds: 60,
};

const instruction = {
  providerType: 1,
  maneuver: "right",
  instruction: "Turn right",
  streetName: "Fixture Street",
  distanceMeters: 80,
  durationSeconds: 60,
  fromPathIndex: 0,
  toPathIndex: 1,
  position: { lat: 0, lng: 0 },
  distanceAlongRouteMeters: 0,
};

describe("pedestrian provider response validation", () => {
  it("allows an otherwise valid route without instructions", () => {
    expect(parsePedestrianRouteResponse({ status: "success", candidates: [base] })).toMatchObject({
      status: "success",
      candidates: [{ path: base.path }],
    });
  });

  it("validates instructions and anchors their position to trusted route geometry", () => {
    const parsed = parsePedestrianRouteResponse({
      status: "success",
      candidates: [{ ...base, instructions: [instruction] }],
    });
    expect(parsed).toMatchObject({
      status: "success",
      candidates: [
        {
          instructions: [
            {
              instruction: "Turn right",
              providerType: 1,
              position: base.path[0],
            },
          ],
        },
      ],
    });
  });

  it("sanitizes provider text and discards malformed instructions only", () => {
    const parsed = parsePedestrianRouteResponse({
      status: "success",
      candidates: [
        {
          ...base,
          instructions: [
            { ...instruction, instruction: "<strong>Turn right</strong>" },
            { ...instruction, fromPathIndex: 9, toPathIndex: 10 },
            { arbitrary: "provider object" },
          ],
        },
      ],
    });
    expect(parsed?.status).toBe("success");
    if (parsed?.status === "success") {
      expect(parsed.candidates[0]!.instructions).toHaveLength(1);
      expect(parsed.candidates[0]!.instructions?.[0]!.instruction).toBe("Turn right");
    }
  });
});
