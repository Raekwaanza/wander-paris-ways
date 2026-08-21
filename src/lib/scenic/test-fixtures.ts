import type {
  Poi,
  RouteCorridorAnalysis,
  RouteFeedback,
  ScoredRouteCandidate,
  WalkingRouteCandidate,
} from "./types";

export function makePoi(id: string, overrides: Partial<Poi> = {}): Poi {
  return {
    id,
    name: id,
    category: "Garden",
    kicker: "Fixture",
    description: "Fixture discovery",
    detail: "Fixture detail",
    lat: 48.85,
    lng: 2.35,
    scores: {
      scenic: 5,
      hidden: 5,
      historic: 5,
      architecture: 5,
      nature: 5,
      food: 5,
      popularity: 5,
    },
    interests: [],
    visitMinutes: 5,
    arrondissement: 1,
    neighborhood: "Test",
    ...overrides,
  };
}

export function makeCandidate(
  id: string,
  overrides: Partial<WalkingRouteCandidate> = {},
): WalkingRouteCandidate {
  return {
    id,
    provider: "openrouteservice",
    providerRank: 0,
    path: [
      { lat: 48.85, lng: 2.34 },
      { lat: 48.85, lng: 2.36 },
    ],
    distanceMeters: 1_500,
    durationSeconds: 1_200,
    ...overrides,
  };
}

export function makeAnalysis(
  id: string,
  overrides: Partial<RouteCorridorAnalysis> = {},
): RouteCorridorAnalysis {
  return { candidate: makeCandidate(id), corridorRadiusMeters: 120, pois: [], ...overrides };
}

export function makeScored(
  id: string,
  overrides: Partial<ScoredRouteCandidate> = {},
): ScoredRouteCandidate {
  return {
    analysis: makeAnalysis(id),
    score: 0,
    breakdown: {
      scenicValue: 0,
      landmarkQuality: 0,
      interestMatch: 0,
      discoverySpread: 0,
      detourPenalty: 0,
    },
    contributingPoiIds: [],
    matchedInterests: [],
    extraDurationSeconds: 0,
    extraDistanceMeters: 0,
    extraMinutes: 0,
    withinDetourCap: true,
    ...overrides,
  };
}

export function makeFeedback(overrides: Partial<RouteFeedback> = {}): RouteFeedback {
  return {
    id: "1000:ors-scenic-a",
    routeId: "ors-scenic-a",
    tripCreatedAt: 1_000,
    mode: "route",
    profile: "scenic",
    routingSource: "openrouteservice",
    rating: "loved",
    aspects: [],
    selectedInterests: [],
    matchedInterests: [],
    discoveryPoiIds: [],
    extraMinutes: 2,
    completionKind: "automatic-arrival",
    createdAt: 2_000,
    updatedAt: 2_000,
    ...overrides,
  };
}
