import { describe, expect, it } from "vitest";
import {
  migrateLegacyTripEndpoint,
  tripEndpointFromPlace,
  validateTripEndpoint,
} from "./trip-endpoints";

describe("TripEndpoint validation and privacy", () => {
  it("validates seeded endpoints and migrates legacy IDs", () => {
    expect(validateTripEndpoint({ type: "seeded", id: "louvre" })).toEqual({
      type: "seeded",
      id: "louvre",
    });
    expect(migrateLegacyTripEndpoint("louvre")).toEqual({ type: "seeded", id: "louvre" });
    expect(validateTripEndpoint({ type: "seeded", id: "missing" })).toBeNull();
  });

  it("validates complete geocoded endpoints and rejects malformed coordinates", () => {
    const endpoint = {
      type: "geocoded",
      id: "maptiler:place.1",
      provider: "maptiler",
      name: "Café",
      kind: "Cafe",
      area: "Paris",
      lat: 48.85,
      lng: 2.35,
    };
    expect(validateTripEndpoint(endpoint)).toEqual(endpoint);
    expect(validateTripEndpoint({ ...endpoint, lat: 91 })).toBeNull();
    expect(validateTripEndpoint({ ...endpoint, name: "" })).toBeNull();
  });

  it("persists current location only as a coordinate-free sentinel", () => {
    const place = {
      id: "live-current-location",
      name: "Current location",
      kind: "Position",
      area: "Paris",
      lat: 48.85123,
      lng: 2.35123,
    };
    const endpoint = tripEndpointFromPlace(place);
    expect(endpoint).toEqual({ type: "current-location", id: "live-current-location" });
    expect(JSON.stringify(endpoint)).not.toContain("48.85123");
    expect(validateTripEndpoint({ ...endpoint, lat: 48.85123, lng: 2.35123 })).toEqual(endpoint);
    expect(validateTripEndpoint({ type: "current-location", id: "wrong" })).toBeNull();
  });
});
