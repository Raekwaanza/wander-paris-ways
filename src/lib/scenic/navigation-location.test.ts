import { describe, expect, it } from "vitest";
import { navigationFixFromMeasurement, navigationFixStatus } from "./navigation-location";

describe("navigation location filtering", () => {
  it("keeps the existing poor-accuracy threshold authoritative", () => {
    const fix = navigationFixFromMeasurement({
      latitude: 48.8566,
      longitude: 2.3522,
      accuracyMeters: 101,
      timestamp: 1,
    });
    expect(navigationFixStatus(fix)).toBe("low-accuracy");
  });

  it("keeps unsupported out-of-Paris measurements unusable", () => {
    const fix = navigationFixFromMeasurement({
      latitude: 51.5074,
      longitude: -0.1278,
      accuracyMeters: 10,
      timestamp: 1,
    });
    expect(navigationFixStatus(fix)).toBe("outside-supported-area");
  });
});
