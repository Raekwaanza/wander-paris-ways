import { distanceKm, pathLengthKm } from "./geo";
import type { LatLng } from "./types";

export interface E2EPedestrianCandidate {
  providerRank: number;
  path: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  startOffsetMeters: number;
  endOffsetMeters: number;
  attribution: string;
}

const WALKING_METERS_PER_SECOND = 1.35;
const ATTRIBUTION = "Deterministic Scenic Route E2E fixture";

/** Server-only switch. Production can never serve test geometry, even if misconfigured. */
export function isScenicE2EFixtureMode(): boolean {
  return process.env["SCENIC_E2E_FIXTURES"] === "1" && process.env["NODE_ENV"] !== "production";
}

function candidate(points: LatLng[], providerRank: number): E2EPedestrianCandidate {
  const distanceMeters = Math.round(pathLengthKm(points) * 1_000);
  return {
    providerRank,
    path: points,
    distanceMeters,
    durationSeconds: Math.round(distanceMeters / WALKING_METERS_PER_SECOND),
    startOffsetMeters: 0,
    endOffsetMeters: 0,
    attribution: ATTRIBUTION,
  };
}

/**
 * This is an ORS test double, not an application-route mock. Its alternatives
 * pass through the normal normalisation, corridor, scoring and selection code.
 * Anchors are existing curated POIs: Palais Royal, Passage du Grand Cerf,
 * Centre Pompidou and the Marais corridor.
 */
export function fixturePedestrianCandidates(from: LatLng, to: LatLng): E2EPedestrianCandidate[] {
  return [
    candidate([from, { lat: 48.865, lng: 2.3468 }, { lat: 48.86, lng: 2.357 }, to], 0),
    candidate(
      [
        from,
        { lat: 48.8664, lng: 2.3402 },
        { lat: 48.8646, lng: 2.3496 },
        { lat: 48.8607, lng: 2.3522 },
        { lat: 48.857, lng: 2.3605 },
        to,
      ],
      1,
    ),
    candidate(
      [
        from,
        { lat: 48.8637, lng: 2.3372 },
        { lat: 48.8583, lng: 2.3471 },
        { lat: 48.8565, lng: 2.3524 },
        { lat: 48.852, lng: 2.357 },
        { lat: 48.8532, lng: 2.3692 },
        to,
      ],
      2,
    ),
  ];
}

export function fixtureViaCandidate(points: LatLng[]): E2EPedestrianCandidate {
  return candidate(points, 0);
}

/** Deterministic distance-derived matrix; the diagonal remains exactly zero. */
export function fixtureWalkingDurations(locations: LatLng[]): Array<Array<number | null>> {
  return locations.map((from, fromIndex) =>
    locations.map((to, toIndex) =>
      fromIndex === toIndex
        ? 0
        : Math.round((distanceKm(from, to) * 1_000 * 1.18) / WALKING_METERS_PER_SECOND),
    ),
  );
}
