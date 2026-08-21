import type { PoiCategory } from "./poi-categories";

export type InterestId =
  | "architecture"
  | "historic"
  | "hidden"
  | "parks"
  | "cafes"
  | "bookshops"
  | "art"
  | "food"
  | "romantic"
  | "quiet"
  | "local"
  | "iconic";

export type Pace = "strolling" | "steady" | "brisk";

export interface Interest {
  id: InterestId;
  label: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Internal curated ranking inputs on a 0–10 editorial scale. These are not
 * objective metrics, reviews, probabilities, or user-facing ratings.
 * `popularity` remains an editorial input to Preview routing.
 */
export interface PoiEditorialScores {
  scenic: number;
  hidden: number;
  historic: number;
  architecture: number;
  nature: number;
  food: number;
  popularity: number;
}

/** A real, unclassified pedestrian path returned by a routing provider. */
export interface WalkingRouteCandidate {
  id: string;
  provider: "openrouteservice";
  providerRank: number;
  path: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  /** Geometric route-end offset; distinct from an ORS Snap API distance. */
  startOffsetMeters?: number;
  /** Geometric route-end offset; distinct from an ORS Snap API distance. */
  endOffsetMeters?: number;
  attribution?: string;
}

export interface Poi extends LatLng {
  id: string;
  name: string;
  category: PoiCategory;
  kicker: string;
  description: string;
  detail: string;
  scores: PoiEditorialScores;
  interests: InterestId[];
  /** Editorial guidance for an approximate stop; never walking time or ETA. */
  visitMinutes: number;
  arrondissement: number;
  neighborhood: string;
}

/** A curated discovery's geometric relationship to a walking route. */
export interface RouteCorridorPoi {
  poi: Poi;
  distanceFromRouteMeters: number;
  distanceAlongRouteMeters: number;
  progress: number;
}

/** Corridor facts for a candidate, kept separate from the raw provider route. */
export interface RouteCorridorAnalysis {
  candidate: WalkingRouteCandidate;
  corridorRadiusMeters: number;
  pois: RouteCorridorPoi[];
}

/** Inputs for ranking already-analyzed real pedestrian route candidates. */
export interface CandidateScoringOptions {
  interests: InterestId[];
  detourCap: number;
  pace?: Pace;
  learnedPreferences?: LearnedPreferenceSnapshot;
}

/** Inspectable, unitless contributions to the internal candidate heuristic. */
export interface CandidateScoreBreakdown {
  scenicValue: number;
  landmarkQuality: number;
  interestMatch: number;
  discoverySpread: number;
  detourPenalty: number;
}

/** An evaluation of a real route; `analysis.candidate.path` remains unchanged. */
export interface ScoredRouteCandidate {
  analysis: RouteCorridorAnalysis;
  score: number;
  breakdown: CandidateScoreBreakdown;
  /** POIs used by the bounded scoring heuristic, in contribution order. */
  contributingPoiIds: string[];
  matchedInterests: InterestId[];
  extraDurationSeconds: number;
  extraDistanceMeters: number;
  extraMinutes: number;
  withinDetourCap: boolean;
}

export interface Place extends LatLng {
  id: string;
  name: string;
  kind: string;
  area: string;
}

export type RouteProfile = "fastest" | "scenic" | "explorer";

export type RouteFeedbackRating = "loved" | "okay" | "not-for-me";

export type RouteFeedbackAspectId =
  | "beautiful-streets"
  | "hidden-places"
  | "history"
  | "architecture"
  | "courtyards-passages"
  | "food-cafes";

/** Explicit, device-local feedback context. It intentionally contains no route geometry or location. */
export interface RouteFeedback {
  id: string;
  routeId: string;
  tripCreatedAt: number;
  mode: "route" | "wander";
  profile: RouteProfile;
  routingSource: "openrouteservice";
  rating: RouteFeedbackRating;
  aspects: RouteFeedbackAspectId[];
  selectedInterests: InterestId[];
  matchedInterests: InterestId[];
  discoveryPoiIds: string[];
  extraMinutes: number;
  completionKind: "automatic-arrival" | "manual-end";
  createdAt: number;
  updatedAt: number;
}

/** Frozen, abstract device-local preference context for one trip. */
export interface LearnedPreferenceSnapshot {
  version: 1;
  interestAffinities: Partial<Record<InterestId, number>>;
  sourceFeedbackCount: number;
}

export interface RouteReasonLine {
  count: number;
  label: string;
}

export interface ScenicRoute {
  id: string;
  profile: RouteProfile;
  title: string;
  blurb: string;
  minutes: number;
  km: number;
  extraMinutes: number;
  discoveries: Poi[];
  path: LatLng[];
  matchedInterests: InterestId[];
  reasons: RouteReasonLine[];
  routingSource: "openrouteservice" | "mock";
  attribution?: string;
}

export type WanderFit = "targeted" | "direct-only" | "insufficient-time" | "preview";

/** Truthful, product-specific status carried alongside the ordinary route contract. */
export interface WanderRoute extends ScenicRoute {
  wander: {
    requestedMinutes: number;
    fit: WanderFit;
    /** Curated anchors requested from ORS; not a claim that they are discoveries. */
    waypointPoiIds: string[];
  };
}

export type TripEndpoint =
  | { type: "seeded"; id: string }
  | {
      type: "geocoded";
      id: string;
      provider: "maptiler";
      name: string;
      kind: string;
      area: string;
      lat: number;
      lng: number;
    }
  | { type: "current-location"; id: "live-current-location" };

export interface TripPlan {
  from: TripEndpoint;
  to: TripEndpoint;
  interests: InterestId[];
  detourCap: number;
  mode: "route" | "wander";
  wanderMinutes?: number;
  learnedPreferences?: LearnedPreferenceSnapshot;
  createdAt: number;
}

export interface SavedRoute {
  id: string;
  fromName: string;
  toName: string;
  profile: RouteProfile;
  minutes: number;
  km: number;
  discoveries: number;
  tags: string[];
  savedAt: number;
}

export interface Preferences {
  interests: InterestId[];
  detourCap: number;
  pace: Pace;
  units: "km" | "mi";
  seenIntro: boolean;
}
