import { describe, expect, it } from "vitest";
import { initialPoiArrivalState, updatePoiArrivals } from "./navigation-poi-arrival";
import { makePoi } from "./test-fixtures";

const first = makePoi("first", { lat: 48.85, lng: 2.35 });
const second = makePoi("second", { lat: 48.851, lng: 2.35 });
const fix = (lat: number, lng: number, timestamp: number, accuracyMeters = 10) => ({
  point: { lat, lng },
  timestamp,
  accuracyMeters,
});

describe("physical POI arrival", () => {
  it("does not arrive while only approaching along the route", () => {
    const result = updatePoiArrivals(initialPoiArrivalState(), fix(48.85, 2.349, 1), [first]);
    expect(result.newlyArrived).toEqual([]);
  });

  it("requires two credible fixes within physical proximity", () => {
    const one = updatePoiArrivals(initialPoiArrivalState(), fix(48.85, 2.35, 1), [first]);
    expect(one.newlyArrived).toEqual([]);
    const two = updatePoiArrivals(one.state, fix(48.85001, 2.35, 2), [first]);
    expect(two.newlyArrived.map(({ id }) => id)).toEqual(["first"]);
  });

  it("rejects inadequate accuracy and resets stabilization", () => {
    const poor = updatePoiArrivals(initialPoiArrivalState(), fix(48.85, 2.35, 1, 80), [first]);
    expect(poor.newlyArrived).toEqual([]);
    expect(poor.state.consecutiveFixesByPoiId).toEqual({});
  });

  it("fires each POI once while allowing a later POI to arrive", () => {
    let state = initialPoiArrivalState();
    state = updatePoiArrivals(state, fix(48.85, 2.35, 1), [first, second]).state;
    const firstArrival = updatePoiArrivals(state, fix(48.85, 2.35, 2), [first, second]);
    expect(firstArrival.newlyArrived.map(({ id }) => id)).toEqual(["first"]);
    const repeated = updatePoiArrivals(firstArrival.state, fix(48.85, 2.35, 3), [first, second]);
    expect(repeated.newlyArrived).toEqual([]);
    const nearSecond = updatePoiArrivals(repeated.state, fix(48.851, 2.35, 4), [first, second]);
    const secondArrival = updatePoiArrivals(nearSecond.state, fix(48.851, 2.35, 5), [
      first,
      second,
    ]);
    expect(secondArrival.newlyArrived.map(({ id }) => id)).toEqual(["second"]);
  });
});
