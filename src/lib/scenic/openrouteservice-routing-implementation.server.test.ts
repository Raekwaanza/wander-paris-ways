import { describe, expect, it } from "vitest";
import {
  buildOpenRouteServiceRouteBody,
  normalizeOpenRouteServiceResponse,
} from "./openrouteservice-routing-implementation.server";

const coordinates = [
  [2.34, 48.85],
  [2.341, 48.85],
  [2.341, 48.851],
  [2.342, 48.851],
];

function response(segments: unknown) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: { summary: { distance: 300, duration: 240 }, segments },
      },
    ],
  };
}

describe("OpenRouteService walking instructions", () => {
  it("requests text instructions for ordinary and via routes", () => {
    const ordinary = buildOpenRouteServiceRouteBody(coordinates, true);
    const via = buildOpenRouteServiceRouteBody(coordinates, false);
    expect(ordinary).toMatchObject({ instructions: true, instructions_format: "text" });
    expect(ordinary).toHaveProperty("alternative_routes");
    expect(via).toMatchObject({ instructions: true, instructions_format: "text" });
    expect(via).not.toHaveProperty("alternative_routes");
  });

  it("flattens valid steps across segments and preserves provider text and type", () => {
    const [route] = normalizeOpenRouteServiceResponse(
      response([
        {
          steps: [
            {
              distance: 70,
              duration: 50,
              type: 11,
              instruction: "Head east",
              name: "Test path",
              way_points: [0, 1],
            },
          ],
        },
        {
          steps: [
            {
              distance: 120,
              duration: 90,
              type: 1,
              instruction: "Turn right onto Fixture Street",
              name: "Fixture Street",
              way_points: [1, 2],
            },
            {
              distance: 0,
              duration: 0,
              type: 10,
              instruction: "You have arrived",
              way_points: [3, 3],
            },
          ],
        },
      ]),
    );
    expect(route?.instructions?.map(({ instruction }) => instruction)).toEqual([
      "Head east",
      "Turn right onto Fixture Street",
      "You have arrived",
    ]);
    expect(route?.instructions?.map(({ providerType }) => providerType)).toEqual([11, 1, 10]);
    expect(route?.instructions?.[1]).toMatchObject({
      fromPathIndex: 1,
      toPathIndex: 2,
      maneuver: "right",
      position: { lat: 48.85, lng: 2.341 },
    });
    expect(route?.instructions?.[1]!.distanceAlongRouteMeters).toBeGreaterThan(70);
  });

  it("discards malformed steps without destroying the route or valid instructions", () => {
    const [route] = normalizeOpenRouteServiceResponse(
      response([
        {
          steps: [
            { instruction: "Missing anchors", distance: 10, duration: 8, type: 6 },
            {
              instruction: "<b>Continue straight</b>",
              distance: 100,
              duration: 80,
              type: 6,
              way_points: [0, 1],
            },
          ],
        },
      ]),
    );
    expect(route?.path).toHaveLength(4);
    expect(route?.instructions).toHaveLength(1);
    expect(route?.instructions?.[0]!.instruction).toBe("Continue straight");
  });

  it("keeps a route without instructions structurally usable", () => {
    const [route] = normalizeOpenRouteServiceResponse(response(undefined));
    expect(route?.path).toHaveLength(4);
    expect(route?.instructions).toBeUndefined();
  });

  it("falls back to the unknown maneuver category for new provider types", () => {
    const [route] = normalizeOpenRouteServiceResponse(
      response([
        {
          steps: [
            {
              instruction: "Use the pedestrian crossing",
              distance: 10,
              duration: 8,
              type: 99,
              way_points: [1, 2],
            },
          ],
        },
      ]),
    );
    expect(route?.instructions?.[0]).toMatchObject({
      providerType: 99,
      maneuver: "unknown",
      instruction: "Use the pedestrian crossing",
    });
  });
});
