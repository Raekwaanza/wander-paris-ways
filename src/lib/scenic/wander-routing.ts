import { distanceKm, detourKm, routeGeometrySignature } from "./geo";
import { matchedInterestsForPois, routeReasonsForPois } from "./route-discoveries";
import { applyPaceMultiplier, type BuildOptions } from "./routing";
import { learnedAffinityForPoi } from "./preference-learning";
import type {
  InterestId,
  LatLng,
  Poi,
  RouteCorridorAnalysis,
  WalkingRouteCandidate,
  WanderFit,
  WanderRoute,
} from "./types";

/** Centralized, tunable Wander v1 limits and internal heuristic weights. */
export const WANDER_V1 = {
  shortlistTarget: 16,
  shortlistHardCap: 18,
  endpointExclusionKm: 0.15,
  waypointSeparationKm: 0.25,
  budgetToleranceMinutes: 0.5,
  minimumExtraRoomMinutes: 3,
  maxViaDirectionsAttempts: 3,
  maxDisplayedDiscoveries: 6,
  unusedMinutePenalty: 0.12,
} as const;

export interface WanderSequence {
  poiIndexes: number[];
  poiIds: string[];
  durationSeconds: number;
  pacedMinutes: number;
  anchorQuality: number;
}

/** Keep provider payloads on the LatLng contract instead of serializing full POI records. */
export function wanderProviderPoints(from: LatLng, anchors: Poi[], to: LatLng): LatLng[] {
  return [from, ...anchors.map(({ lat, lng }) => ({ lat, lng })), to];
}

function preferenceStrength(
  poi: Poi,
  options: {
    interests: InterestId[];
    learnedPreferences: BuildOptions["learnedPreferences"];
  },
) {
  const explicit = poi.interests.filter((interest) => options.interests.includes(interest)).length;
  return explicit + learnedAffinityForPoi(poi, options.learnedPreferences) * 0.5;
}

function editorialQuality(poi: Poi) {
  const scores = poi.scores;
  return (
    scores.scenic * 0.3 +
    scores.historic * 0.2 +
    scores.architecture * 0.2 +
    scores.hidden * 0.15 +
    scores.nature * 0.1 +
    scores.food * 0.05
  );
}

/** Geometry is only a cheap quota-saving prefilter; Matrix decides feasibility. */
export function shortlistWanderAnchors(
  from: LatLng,
  to: LatLng,
  pois: Poi[],
  requestedMinutes: number,
  interests: InterestId[],
  learnedPreferences?: BuildOptions["learnedPreferences"],
): Poi[] {
  const approximateDetourLimitKm = Math.max(0.8, requestedMinutes * 0.11);
  return pois
    .filter(
      (poi) =>
        distanceKm(from, poi) >= WANDER_V1.endpointExclusionKm &&
        distanceKm(to, poi) >= WANDER_V1.endpointExclusionKm &&
        detourKm(from, poi, to) <= approximateDetourLimitKm,
    )
    .map((poi) => ({
      poi,
      rank:
        preferenceStrength(poi, { interests, learnedPreferences }) * 3 +
        editorialQuality(poi) -
        detourKm(from, poi, to) * 0.8,
    }))
    .sort((a, b) => b.rank - a.rank || a.poi.id.localeCompare(b.poi.id))
    .slice(0, Math.min(WANDER_V1.shortlistTarget, WANDER_V1.shortlistHardCap))
    .map(({ poi }) => poi);
}

function sumLegs(matrix: Array<Array<number | null>>, indexes: number[]): number | null {
  let seconds = 0;
  for (let index = 1; index < indexes.length; index += 1) {
    const leg = matrix[indexes[index - 1]!]?.[indexes[index]!];
    if (leg === null || leg === undefined) return null;
    seconds += leg;
  }
  return seconds;
}

/** Produces deterministic one/two-anchor choices using network durations only. */
export function feasibleWanderSequences(
  matrix: Array<Array<number | null>>,
  anchors: Poi[],
  requestedMinutes: number,
  pace: BuildOptions["pace"] = "steady",
  interests: InterestId[] = [],
  learnedPreferences?: BuildOptions["learnedPreferences"],
): WanderSequence[] {
  const destinationIndex = anchors.length + 1;
  const sequences: WanderSequence[] = [];
  const add = (poiIndexes: number[]) => {
    const durationSeconds = sumLegs(matrix, [0, ...poiIndexes, destinationIndex]);
    if (durationSeconds === null) return;
    const pacedMinutes = applyPaceMultiplier(durationSeconds / 60, pace);
    if (pacedMinutes > requestedMinutes + WANDER_V1.budgetToleranceMinutes) return;
    const selected = poiIndexes.map((index) => anchors[index - 1]!);
    const anchorQuality = selected.reduce(
      (total, poi) =>
        total +
        editorialQuality(poi) +
        preferenceStrength(poi, { interests, learnedPreferences }) * 3,
      0,
    );
    sequences.push({
      poiIndexes,
      poiIds: selected.map(({ id }) => id),
      durationSeconds,
      pacedMinutes,
      anchorQuality,
    });
  };
  for (let a = 1; a <= anchors.length; a += 1) add([a]);
  if (requestedMinutes >= 45) {
    for (let a = 1; a <= anchors.length; a += 1) {
      for (let b = 1; b <= anchors.length; b += 1) {
        if (
          a === b ||
          distanceKm(anchors[a - 1]!, anchors[b - 1]!) < WANDER_V1.waypointSeparationKm
        )
          continue;
        add([a, b]);
      }
    }
  }
  return sequences.sort(
    (a, b) =>
      b.anchorQuality - a.anchorQuality ||
      b.pacedMinutes - a.pacedMinutes ||
      a.poiIds.join(":").localeCompare(b.poiIds.join(":")),
  );
}

function displayedDiscoveries(
  analysis: RouteCorridorAnalysis,
  interests: InterestId[],
  learnedPreferences?: BuildOptions["learnedPreferences"],
) {
  const selectedIds = new Set(
    analysis.pois
      .map((corridorPoi) => ({
        corridorPoi,
        value:
          editorialQuality(corridorPoi.poi) +
          preferenceStrength(corridorPoi.poi, { interests, learnedPreferences }) * 3,
      }))
      .sort(
        (a, b) =>
          b.value - a.value ||
          a.corridorPoi.distanceAlongRouteMeters - b.corridorPoi.distanceAlongRouteMeters ||
          a.corridorPoi.poi.id.localeCompare(b.corridorPoi.poi.id),
      )
      .slice(0, WANDER_V1.maxDisplayedDiscoveries)
      .map(({ corridorPoi }) => corridorPoi.poi.id),
  );
  return analysis.pois
    .filter(({ poi }) => selectedIds.has(poi.id))
    .sort(
      (a, b) =>
        a.distanceAlongRouteMeters - b.distanceAlongRouteMeters || a.poi.id.localeCompare(b.poi.id),
    );
}

export function wanderCandidateScore(
  analysis: RouteCorridorAnalysis,
  requestedMinutes: number,
  pace: BuildOptions["pace"],
  interests: InterestId[],
  learnedPreferences?: BuildOptions["learnedPreferences"],
) {
  const discoveries = displayedDiscoveries(analysis, interests, learnedPreferences);
  const discoveryQuality = discoveries.reduce(
    (total, { poi }, index) => total + editorialQuality(poi) * (1 - index * 0.08),
    0,
  );
  const interestAlignment = discoveries.reduce(
    (total, { poi }) => total + preferenceStrength(poi, { interests, learnedPreferences }) * 2,
    0,
  );
  const spread = new Set(discoveries.map(({ progress }) => Math.min(3, Math.floor(progress * 4))))
    .size;
  const minutes = applyPaceMultiplier(analysis.candidate.durationSeconds / 60, pace ?? "steady");
  const unusedMinutes = Math.max(0, requestedMinutes - minutes);
  return (
    discoveryQuality +
    interestAlignment +
    spread * 0.5 -
    unusedMinutes * WANDER_V1.unusedMinutePenalty
  );
}

export function stableWanderId(
  from: LatLng,
  to: LatLng,
  requestedMinutes: number,
  waypointPoiIds: string[],
  path: LatLng[],
) {
  const value = `${from.lat.toFixed(6)},${from.lng.toFixed(6)}:${to.lat.toFixed(6)},${to.lng.toFixed(6)}:${requestedMinutes}:${waypointPoiIds.join(",")}:${routeGeometrySignature(path)}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ors-wander-${(hash >>> 0).toString(36)}`;
}

export function materializeWanderRoute(args: {
  from: LatLng;
  to: LatLng;
  analysis: RouteCorridorAnalysis;
  direct: WalkingRouteCandidate;
  requestedMinutes: number;
  fit: Exclude<WanderFit, "preview">;
  waypointPoiIds: string[];
  opts: BuildOptions;
}): WanderRoute {
  const { analysis, direct, requestedMinutes, fit, waypointPoiIds, opts, from, to } = args;
  const candidate = analysis.candidate;
  const corridorDiscoveries = displayedDiscoveries(
    analysis,
    opts.interests,
    opts.learnedPreferences,
  );
  const discoveries = corridorDiscoveries.map(({ poi }) => poi);
  const pacedMinutes = applyPaceMultiplier(candidate.durationSeconds / 60, opts.pace ?? "steady");
  const directMinutes = applyPaceMultiplier(direct.durationSeconds / 60, opts.pace ?? "steady");
  return {
    id: stableWanderId(from, to, requestedMinutes, waypointPoiIds, candidate.path),
    profile: "explorer",
    title: fit === "targeted" ? `${requestedMinutes}-Minute Wander` : "Direct route",
    blurb:
      fit === "targeted"
        ? "A real walking route chosen to make use of your available time with curated discoveries nearby."
        : fit === "insufficient-time"
          ? "The real direct walking route to your destination."
          : "The direct walking route, with curated discoveries nearby where available.",
    minutes: candidate.durationSeconds > 0 ? Math.max(1, Math.round(pacedMinutes)) : 0,
    km: Math.round((candidate.distanceMeters / 1_000) * 10) / 10,
    extraMinutes: Math.max(0, Math.round(pacedMinutes - directMinutes)),
    discoveries,
    path: candidate.path,
    ...(candidate.instructions?.length ? { instructions: candidate.instructions } : {}),
    matchedInterests: matchedInterestsForPois(discoveries, opts.interests),
    reasons: routeReasonsForPois(discoveries),
    routingSource: "openrouteservice",
    ...(candidate.attribution ? { attribution: candidate.attribution } : {}),
    wander: { requestedMinutes, fit, waypointPoiIds },
  };
}
