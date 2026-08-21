import { afterEach, describe, expect, it } from "vitest";
import {
  fixturePedestrianCandidates,
  fixtureViaCandidate,
  fixtureWalkingDurations,
  isScenicE2EFixtureMode,
} from "./e2e-provider-fixtures.server";

const FROM = { lat: 48.8719, lng: 2.3316 };
const TO = { lat: 48.8555, lng: 2.3655 };
const originalFixtureFlag = process.env["SCENIC_E2E_FIXTURES"];
const originalNodeEnv = process.env["NODE_ENV"];

afterEach(() => {
  process.env["SCENIC_E2E_FIXTURES"] = originalFixtureFlag;
  process.env["NODE_ENV"] = originalNodeEnv;
});

describe("server-only E2E provider fixtures", () => {
  it("cannot activate in production", () => {
    process.env["SCENIC_E2E_FIXTURES"] = "1";
    process.env["NODE_ENV"] = "production";
    expect(isScenicE2EFixtureMode()).toBe(false);
    process.env["NODE_ENV"] = "test";
    expect(isScenicE2EFixtureMode()).toBe(true);
  });

  it("returns three stable endpoint-exact alternatives", () => {
    const routes = fixturePedestrianCandidates(FROM, TO);
    expect(routes).toHaveLength(3);
    expect(routes.map((route) => route.providerRank)).toEqual([0, 1, 2]);
    for (const route of routes) {
      expect(route.path[0]).toEqual(FROM);
      expect(route.path.at(-1)).toEqual(TO);
      expect(route.distanceMeters).toBeGreaterThan(2_000);
      expect(route.durationSeconds).toBeGreaterThan(0);
    }
  });

  it("routes via every requested waypoint and creates a full matrix", () => {
    const points = [FROM, { lat: 48.8607, lng: 2.3522 }, TO];
    expect(fixtureViaCandidate(points).path).toEqual(points);
    const matrix = fixtureWalkingDurations(points);
    expect(matrix).toHaveLength(points.length);
    expect(matrix.every((row) => row.length === points.length)).toBe(true);
    expect(matrix.map((row, index) => row[index])).toEqual([0, 0, 0]);
    expect(matrix[0]![1]).toBe(matrix[1]![0]);
  });
});
