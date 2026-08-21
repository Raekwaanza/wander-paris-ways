import { describe, expect, it } from "vitest";
import { initialRouteAdherenceState, updateRouteAdherence } from "./navigation-adherence";

const observe = (
  state: ReturnType<typeof initialRouteAdherenceState>,
  distance: number,
  timestamp: number,
  accuracy = 10,
) =>
  updateRouteAdherence(state, {
    distanceToRouteMeters: distance,
    accuracyMeters: accuracy,
    timestamp,
  });
const run = (distances: number[], accuracy = 10) =>
  distances.reduce(
    (state, distance, index) => observe(state, distance, index + 1, accuracy),
    initialRouteAdherenceState(),
  );

describe("route adherence", () => {
  it("treats a reliable near fix as on-route", () => expect(run([12]).status).toBe("on-route"));

  it("does not confirm a single far spike", () => {
    expect(run([120, 15]).status).toBe("on-route");
  });

  it("requires three consecutive reliable far fixes", () => {
    let state = initialRouteAdherenceState();
    state = observe(state, 85, 1);
    expect(state.status).toBe("suspected-off-route");
    state = observe(state, 92, 2);
    expect(state.status).toBe("suspected-off-route");
    expect(observe(state, 88, 3).status).toBe("off-route");
  });

  it("raises the entry threshold for weaker usable GPS", () => {
    expect(run([90, 90, 90], 70).status).toBe("on-route");
    expect(run([180, 180, 180], 70).status).toBe("off-route");
  });

  it("uses hysteresis and requires consecutive recovery fixes", () => {
    let state = run([100, 100, 100]);
    state = observe(state, 55, 4);
    expect(state.status).toBe("off-route");
    state = observe(state, 35, 5);
    expect(state.status).toBe("off-route");
    expect(observe(state, 32, 6).status).toBe("on-route");
  });

  it("resets interrupted recovery and ignores duplicate timestamps", () => {
    let state = run([100, 100, 100]);
    state = observe(state, 35, 4);
    const duplicate = observe(state, 35, 4);
    expect(duplicate).toBe(state);
    state = observe(state, 60, 5);
    state = observe(state, 34, 6);
    expect(state.status).toBe("off-route");
  });
});
