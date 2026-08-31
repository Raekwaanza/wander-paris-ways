import { describe, expect, it } from "vitest";
import { formatManeuverDistance, selectNavigationInstruction } from "./navigation-instructions";
import type { RouteInstruction } from "./types";

const instructions: RouteInstruction[] = [
  {
    providerType: 11,
    maneuver: "depart",
    instruction: "Head east",
    distanceMeters: 100,
    durationSeconds: 80,
    fromPathIndex: 0,
    toPathIndex: 1,
    position: { lat: 48.85, lng: 2.34 },
    distanceAlongRouteMeters: 0,
  },
  {
    providerType: 1,
    maneuver: "right",
    instruction: "Turn right",
    distanceMeters: 200,
    durationSeconds: 160,
    fromPathIndex: 1,
    toPathIndex: 2,
    position: { lat: 48.85, lng: 2.341 },
    distanceAlongRouteMeters: 100,
  },
  {
    providerType: 99,
    maneuver: "unknown",
    instruction: "Use the crossing",
    distanceMeters: 200,
    durationSeconds: 160,
    fromPathIndex: 2,
    toPathIndex: 3,
    position: { lat: 48.851, lng: 2.341 },
    distanceAlongRouteMeters: 300,
  },
  {
    providerType: 10,
    maneuver: "arrive",
    instruction: "You have arrived",
    distanceMeters: 0,
    durationSeconds: 0,
    fromPathIndex: 3,
    toPathIndex: 3,
    position: { lat: 48.851, lng: 2.342 },
    distanceAlongRouteMeters: 500,
  },
];

describe("navigation instruction selection", () => {
  it("shows the first instruction before live progress is established", () => {
    expect(selectNavigationInstruction(instructions, null)?.instruction.instruction).toBe(
      "Head east",
    );
  });

  it("selects the upcoming turn and route distance to it", () => {
    expect(selectNavigationInstruction(instructions, 40)).toMatchObject({
      index: 1,
      distanceToManeuverMeters: 60,
    });
  });

  it("advances after passing a maneuver", () => {
    expect(selectNavigationInstruction(instructions, 115, 1)?.index).toBe(2);
  });

  it("does not oscillate backward after advancement", () => {
    expect(selectNavigationInstruction(instructions, 95, 2)?.index).toBe(2);
  });

  it("preserves unknown provider wording and reaches the goal instruction", () => {
    expect(selectNavigationInstruction(instructions, 120, 2)?.instruction).toMatchObject({
      maneuver: "unknown",
      instruction: "Use the crossing",
    });
    expect(selectNavigationInstruction(instructions, 450, 2)?.instruction.maneuver).toBe("arrive");
  });

  it("formats maneuver distance without fake precision", () => {
    expect(formatManeuverDistance(7)).toBe("Now");
    expect(formatManeuverDistance(84)).toBe("80 m");
    expect(formatManeuverDistance(148)).toBe("150 m");
    expect(formatManeuverDistance(412)).toBe("400 m");
  });
});
