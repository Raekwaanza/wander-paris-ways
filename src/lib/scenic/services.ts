/**
 * Service boundary.
 *
 * Every external dependency the production app will need is declared here as an
 * interface and implemented by the current hybrid provider stack.
 * To go live, write an adapter (Overpass / Wikidata / OpenTripMap / Foursquare /
 * a future provider) that satisfies the same interface and add its provider set
 * to `createScenicServices` below. No UI or routing-engine code needs to change.
 */
import { applyPaceMultiplier, buildRoutes, buildWander, type BuildOptions } from "./routing";
import type {
  ForwardGeocodeResult,
  PedestrianRouteResponse,
  ReverseGeocodeResult,
} from "./provider-contracts";
import { scenicProviderTransport } from "./provider-transport";
import { PLACES, placeById, searchPlaces } from "./places";
import { POIS, poiById } from "./pois";
import { scenicConfig, type ScenicProviderMode } from "./config";
import { livePlaceById, registerLivePlaces } from "./live-places";
import { analyzeRouteCorridor } from "./route-analysis";
import { scoreCandidateCorridors } from "./route-scoring";
import { matchedInterestsForPois, routeReasonsForPois } from "./route-discoveries";
import { selectExplorerCandidate, selectScenicCandidate } from "./route-selection";
import { routeGeometrySignature } from "./geo";
import {
  feasibleWanderSequences,
  materializeWanderRoute,
  shortlistWanderAnchors,
  WANDER_V1,
  wanderCandidateScore,
  wanderProviderPoints,
  stableWanderId,
} from "./wander-routing";
import type { SharedRoutePayloadV1, SharedRouteResolution } from "./shared-route";
import type {
  CandidateScoringOptions,
  LatLng,
  Place,
  Poi,
  RouteCorridorAnalysis,
  ScenicRoute,
  ScoredRouteCandidate,
  WalkingRouteCandidate,
  WanderRoute,
} from "./types";

export interface GeocodingService {
  search(query: string, proximity?: LatLng): Promise<GeocodingSearchResult>;
  byId(id: string): Place | undefined;
  all(): Place[];
}

export interface GeocodingSearchResult {
  places: Place[];
  source: "maptiler" | "seeded";
  fallback: boolean;
  attribution?: string;
}

export interface ReverseGeocodingService {
  reverse(point: LatLng): Promise<ReverseGeocodeResult | null>;
}

export interface PoiService {
  near(point: LatLng, radiusKm: number): Promise<Poi[]>;
  byId(id: string): Poi | undefined;
  all(): Poi[];
}

export interface RoutingService {
  routes(from: LatLng, to: LatLng, opts: BuildOptions): Promise<ScenicRoute[]>;
  candidates(from: LatLng, to: LatLng): Promise<WalkingRouteCandidate[]>;
  wander(from: LatLng, to: LatLng, minutes: number, opts: BuildOptions): Promise<WanderRoute>;
  resolveShared(payload: SharedRoutePayloadV1): Promise<SharedRouteResolution>;
}

export interface RouteAnalysisService {
  corridor(candidate: WalkingRouteCandidate, radiusMeters?: number): Promise<RouteCorridorAnalysis>;
  corridors(
    candidates: WalkingRouteCandidate[],
    radiusMeters?: number,
  ): Promise<RouteCorridorAnalysis[]>;
  scoreCorridors(
    analyses: RouteCorridorAnalysis[],
    options: CandidateScoringOptions,
  ): Promise<ScoredRouteCandidate[]>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const seededSearch = async (query: string): Promise<GeocodingSearchResult> => {
  await delay(90);
  return { places: searchPlaces(query), source: "seeded", fallback: false };
};

const hybridGeocoding: GeocodingService = {
  async search(query, proximity) {
    const trimmed = query.trim();
    if (trimmed.length < 2) return seededSearch(trimmed);
    let result: ForwardGeocodeResult;
    try {
      result = await scenicProviderTransport.forwardGeocode({
        query: trimmed,
        ...(proximity ? { proximity } : {}),
      });
    } catch {
      result = { status: "unavailable", places: [] };
    }
    if (result.status === "unavailable") {
      const seeded = await seededSearch(trimmed);
      return { ...seeded, fallback: true };
    }
    registerLivePlaces(result.places);
    return {
      places: result.places,
      source: "maptiler",
      fallback: false,
      ...(result.attribution ? { attribution: result.attribution } : {}),
    };
  },
  byId: (id) => livePlaceById(id) ?? placeById(id),
  all: () => PLACES,
};

const mockPois: PoiService = {
  async near(point, radiusKm) {
    await delay(60);
    return POIS.filter(
      (p) => Math.hypot((p.lng - point.lng) * 73.4, (p.lat - point.lat) * 111.2) <= radiusKm,
    );
  },
  byId: poiById,
  all: () => POIS,
};

const curatedRouteAnalysis: RouteAnalysisService = {
  async corridor(candidate, radiusMeters) {
    return analyzeRouteCorridor(candidate, mockPois.all(), radiusMeters);
  },
  async corridors(candidates, radiusMeters) {
    return candidates.map((candidate) =>
      analyzeRouteCorridor(candidate, mockPois.all(), radiusMeters),
    );
  },
  async scoreCorridors(analyses, options) {
    return scoreCandidateCorridors(analyses, options);
  },
};

function stableFastestId(from: LatLng, to: LatLng) {
  const value = `${from.lat.toFixed(6)},${from.lng.toFixed(6)}:${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ors-fastest-${(hash >>> 0).toString(36)}`;
}

function stableCandidateId(from: LatLng, to: LatLng, providerRank: number, path: LatLng[]) {
  const geometry = routeGeometrySignature(path);
  const value = `${routeCoordinateKey(from, to)}:${providerRank}:${geometry}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ors-candidate-${(hash >>> 0).toString(36)}`;
}

const routeResponseCache = new Map<string, PedestrianRouteResponse>();
const routeResponseInFlight = new Map<string, Promise<PedestrianRouteResponse>>();
const SESSION_ROUTE_CACHE_LIMIT = 32;

function routeCoordinateKey(from: LatLng, to: LatLng) {
  return `${from.lat.toFixed(6)},${from.lng.toFixed(6)}:${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;
}

async function cachedOpenRouteServiceRoute(from: LatLng, to: LatLng) {
  const key = routeCoordinateKey(from, to);
  const cached = routeResponseCache.get(key);
  if (cached) return cached;
  const existing = routeResponseInFlight.get(key);
  if (existing) return existing;

  const request = scenicProviderTransport.route({ from, to });
  routeResponseInFlight.set(key, request);
  try {
    const response = await request;
    if (response.status === "success") {
      if (routeResponseCache.size >= SESSION_ROUTE_CACHE_LIMIT) {
        routeResponseCache.delete(routeResponseCache.keys().next().value as string);
      }
      routeResponseCache.set(key, response);
    }
    return response;
  } finally {
    routeResponseInFlight.delete(key);
  }
}

async function realWalkingCandidates(from: LatLng, to: LatLng): Promise<WalkingRouteCandidate[]> {
  let response: PedestrianRouteResponse;
  try {
    response = await cachedOpenRouteServiceRoute(from, to);
  } catch {
    return [];
  }
  if (response.status !== "success") return [];
  return response.candidates.map((candidate) => ({
    id: stableCandidateId(from, to, candidate.providerRank, candidate.path),
    provider: "openrouteservice",
    providerRank: candidate.providerRank,
    path: candidate.path,
    distanceMeters: candidate.distanceMeters,
    durationSeconds: candidate.durationSeconds,
    ...(candidate.instructions?.length ? { instructions: candidate.instructions } : {}),
    ...(candidate.startOffsetMeters !== undefined
      ? { startOffsetMeters: candidate.startOffsetMeters }
      : {}),
    ...(candidate.endOffsetMeters !== undefined
      ? { endOffsetMeters: candidate.endOffsetMeters }
      : {}),
    ...(candidate.attribution ? { attribution: candidate.attribution } : {}),
  }));
}

function materializeDiscoveryRoute(
  scored: ScoredRouteCandidate,
  profile: "scenic" | "explorer",
  opts: BuildOptions,
): ScenicRoute {
  const candidate = scored.analysis.candidate;
  const contributingIds = new Set(scored.contributingPoiIds);
  const discoveries = scored.analysis.pois
    .filter(({ poi }) => contributingIds.has(poi.id))
    .sort((a, b) =>
      a.distanceAlongRouteMeters !== b.distanceAlongRouteMeters
        ? a.distanceAlongRouteMeters - b.distanceAlongRouteMeters
        : a.poi.id.localeCompare(b.poi.id),
    )
    .map(({ poi }) => poi);
  const pacedMinutes = applyPaceMultiplier(candidate.durationSeconds / 60, opts.pace ?? "steady");
  const minutes = candidate.durationSeconds > 0 ? Math.max(1, Math.round(pacedMinutes)) : 0;
  const discoveryLabel = discoveries.length === 1 ? "discovery" : "discoveries";

  return {
    id: `ors-${profile}-${candidate.id}`,
    profile,
    title: profile === "scenic" ? "Scenic" : "Explorer",
    blurb:
      profile === "scenic"
        ? `A real walking route with ${discoveries.length} curated ${discoveryLabel} nearby.`
        : `A discovery-focused walking alternative with ${discoveries.length} curated ${discoveryLabel} nearby.`,
    minutes,
    km: Math.round((candidate.distanceMeters / 1_000) * 10) / 10,
    extraMinutes: Math.max(0, Math.round(scored.extraMinutes)),
    discoveries,
    path: candidate.path,
    ...(candidate.instructions?.length ? { instructions: candidate.instructions } : {}),
    matchedInterests: matchedInterestsForPois(discoveries, opts.interests),
    reasons: routeReasonsForPois(discoveries),
    routingSource: "openrouteservice",
    ...(candidate.attribution ? { attribution: candidate.attribution } : {}),
  };
}

const hybridRouting: RoutingService = {
  candidates: realWalkingCandidates,
  async resolveShared(payload) {
    const from = payload.from;
    const to = payload.to;
    const response = await cachedOpenRouteServiceRoute(from, to).catch(() => null);
    if (!response || response.status !== "success") return { status: "unavailable" };
    const directCandidates = await realWalkingCandidates(from, to);
    const direct = directCandidates[0];
    if (!direct) return { status: "unavailable" };
    const opts: BuildOptions = {
      interests: payload.interests,
      detourCap: payload.detourCap,
      pace: payload.pace,
    };

    if (payload.mode === "route") {
      if (payload.profile === "fastest") {
        if (stableFastestId(from, to) !== payload.routeId) return { status: "changed" };
        const paced = applyPaceMultiplier(direct.durationSeconds / 60, payload.pace);
        return {
          status: "exact",
          route: {
            id: payload.routeId,
            profile: "fastest",
            title: "Fastest",
            blurb: "The direct walking route used as the comparison baseline.",
            minutes: direct.durationSeconds > 0 ? Math.max(1, Math.round(paced)) : 0,
            km: Math.round((direct.distanceMeters / 1_000) * 10) / 10,
            extraMinutes: 0,
            discoveries: [],
            path: direct.path,
            ...(direct.instructions?.length ? { instructions: direct.instructions } : {}),
            matchedInterests: [],
            reasons: [],
            routingSource: "openrouteservice",
            ...(direct.attribution ? { attribution: direct.attribution } : {}),
          },
        };
      }
      const candidate = directCandidates.find(
        ({ id }) => `ors-${payload.profile}-${id}` === payload.routeId,
      );
      if (!candidate) return { status: "changed" };
      const analysis = await curatedRouteAnalysis.corridor(candidate);
      const requested = new Set(payload.discoveryPoiIds);
      const discoveries = analysis.pois
        .filter(({ poi }) => requested.has(poi.id))
        .sort(
          (a, b) =>
            a.distanceAlongRouteMeters - b.distanceAlongRouteMeters ||
            a.poi.id.localeCompare(b.poi.id),
        )
        .map(({ poi }) => poi);
      const paced = applyPaceMultiplier(candidate.durationSeconds / 60, payload.pace);
      const directPaced = applyPaceMultiplier(direct.durationSeconds / 60, payload.pace);
      return {
        status: "exact",
        route: {
          id: payload.routeId,
          profile: payload.profile,
          title: payload.profile === "scenic" ? "Scenic" : "Explorer",
          blurb: `A real walking route with ${discoveries.length} curated discoveries nearby.`,
          minutes: candidate.durationSeconds > 0 ? Math.max(1, Math.round(paced)) : 0,
          km: Math.round((candidate.distanceMeters / 1_000) * 10) / 10,
          extraMinutes: Math.max(0, Math.round(paced - directPaced)),
          discoveries,
          path: candidate.path,
          ...(candidate.instructions?.length ? { instructions: candidate.instructions } : {}),
          matchedInterests: matchedInterestsForPois(discoveries, payload.interests),
          reasons: routeReasonsForPois(discoveries),
          routingSource: "openrouteservice",
          ...(candidate.attribution ? { attribution: candidate.attribution } : {}),
        },
      };
    }

    const wander = payload.wander!;
    let candidate = direct;
    if (wander.fit === "targeted") {
      const waypoints = wander.waypointPoiIds.map((id) => mockPois.byId(id));
      if (waypoints.some((poi) => !poi)) return { status: "changed" };
      const via = await scenicProviderTransport
        .routeVia({ points: [from, ...(waypoints as Poi[]), to] })
        .catch(() => null);
      if (!via || via.status !== "success" || !via.candidates[0]) return { status: "unavailable" };
      const result = via.candidates[0];
      candidate = {
        id: stableCandidateId(from, to, 0, result.path),
        provider: "openrouteservice",
        providerRank: 0,
        path: result.path,
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
        ...(result.instructions?.length ? { instructions: result.instructions } : {}),
        ...(result.attribution ? { attribution: result.attribution } : {}),
      };
    }
    if (
      stableWanderId(from, to, wander.requestedMinutes, wander.waypointPoiIds, candidate.path) !==
      payload.routeId
    )
      return { status: "changed" };
    const analysis = await curatedRouteAnalysis.corridor(candidate);
    const materialized = materializeWanderRoute({
      from,
      to,
      analysis,
      direct,
      requestedMinutes: wander.requestedMinutes,
      fit: wander.fit,
      waypointPoiIds: wander.waypointPoiIds,
      opts,
    });
    const requested = new Set(payload.discoveryPoiIds);
    const discoveries = analysis.pois
      .filter(({ poi }) => requested.has(poi.id))
      .sort((a, b) => a.distanceAlongRouteMeters - b.distanceAlongRouteMeters)
      .map(({ poi }) => poi);
    return {
      status: "exact",
      route: {
        ...materialized,
        discoveries,
        matchedInterests: matchedInterestsForPois(discoveries, payload.interests),
        reasons: routeReasonsForPois(discoveries),
      },
    };
  },
  async routes(from, to, opts) {
    const mockRoutes = buildRoutes(from, to, opts);
    const candidates = await realWalkingCandidates(from, to);
    if (candidates.length === 0) return mockRoutes;

    const provider = candidates[0]!;
    const providerMinutes = provider.durationSeconds / 60;
    const pacedMinutes = applyPaceMultiplier(providerMinutes, opts.pace ?? "steady");
    const minutes = provider.durationSeconds > 0 ? Math.max(1, Math.round(pacedMinutes)) : 0;
    const fastest: ScenicRoute = {
      id: stableFastestId(from, to),
      profile: "fastest",
      title: "Fastest",
      blurb: "The direct walking route used as the comparison baseline.",
      minutes,
      km: Math.round((provider.distanceMeters / 1_000) * 10) / 10,
      extraMinutes: 0,
      discoveries: [],
      path: provider.path,
      ...(provider.instructions?.length ? { instructions: provider.instructions } : {}),
      matchedInterests: [],
      reasons: [],
      routingSource: "openrouteservice",
      ...(provider.attribution ? { attribution: provider.attribution } : {}),
    };
    const fallbackRoutes = mockRoutes.slice(1).map((route) => ({
      ...route,
      extraMinutes: Math.max(0, route.minutes - fastest.minutes),
    }));

    try {
      const analyses = await curatedRouteAnalysis.corridors(candidates);
      const scored = await curatedRouteAnalysis.scoreCorridors(analyses, {
        interests: opts.interests,
        detourCap: opts.detourCap,
        pace: opts.pace ?? "steady",
        ...(opts.learnedPreferences ? { learnedPreferences: opts.learnedPreferences } : {}),
      });
      const selectedScenic = selectScenicCandidate(scored, provider.id);
      if (!selectedScenic) return [fastest, ...fallbackRoutes];
      const selectedExplorer = selectExplorerCandidate(
        scored,
        provider.id,
        selectedScenic.analysis.candidate.id,
      );
      return [
        fastest,
        materializeDiscoveryRoute(selectedScenic, "scenic", opts),
        selectedExplorer
          ? materializeDiscoveryRoute(selectedExplorer, "explorer", opts)
          : fallbackRoutes[1]!,
      ];
    } catch {
      return [fastest, ...fallbackRoutes];
    }
  },
  async wander(from, to, minutes, opts) {
    // Wander's explicit minutes are the total budget; ordinary detourCap is intentionally ignored.
    const directCandidates = await realWalkingCandidates(from, to);
    const direct = directCandidates[0];
    if (!direct) {
      return {
        ...buildWander(from, to, minutes, opts),
        wander: { requestedMinutes: minutes, fit: "preview", waypointPoiIds: [] },
      };
    }

    const directAnalysis = await curatedRouteAnalysis.corridor(direct);
    const directMinutes = applyPaceMultiplier(direct.durationSeconds / 60, opts.pace ?? "steady");
    if (directMinutes > minutes + WANDER_V1.budgetToleranceMinutes) {
      return materializeWanderRoute({
        from,
        to,
        analysis: directAnalysis,
        direct,
        requestedMinutes: minutes,
        fit: "insufficient-time",
        waypointPoiIds: [],
        opts,
      });
    }
    const directOnly = () =>
      materializeWanderRoute({
        from,
        to,
        analysis: directAnalysis,
        direct,
        requestedMinutes: minutes,
        fit: "direct-only",
        waypointPoiIds: [],
        opts,
      });
    if (minutes - directMinutes < WANDER_V1.minimumExtraRoomMinutes) return directOnly();

    const anchors = shortlistWanderAnchors(
      from,
      to,
      mockPois.all(),
      minutes,
      opts.interests,
      opts.learnedPreferences,
    );
    if (anchors.length === 0) return directOnly();
    let matrix;
    try {
      matrix = await scenicProviderTransport.matrix({
        locations: wanderProviderPoints(from, anchors, to),
      });
    } catch {
      return directOnly();
    }
    if (matrix.status !== "success") return directOnly();
    const sequences = feasibleWanderSequences(
      matrix.durationsSeconds,
      anchors,
      minutes,
      opts.pace ?? "steady",
      opts.interests,
      opts.learnedPreferences,
    ).slice(0, WANDER_V1.maxViaDirectionsAttempts);

    const successful: Array<{ analysis: RouteCorridorAnalysis; waypointPoiIds: string[] }> = [];
    for (const sequence of sequences) {
      const waypoints = sequence.poiIndexes.map((index) => anchors[index - 1]!);
      let response: PedestrianRouteResponse;
      try {
        response = await scenicProviderTransport.routeVia({
          points: wanderProviderPoints(from, waypoints, to),
        });
      } catch {
        continue;
      }
      if (response.status !== "success" || !response.candidates[0]) continue;
      const result = response.candidates[0];
      const pacedMinutes = applyPaceMultiplier(result.durationSeconds / 60, opts.pace ?? "steady");
      if (pacedMinutes > minutes + WANDER_V1.budgetToleranceMinutes) continue;
      const candidate: WalkingRouteCandidate = {
        id: stableCandidateId(from, to, 0, result.path),
        provider: "openrouteservice",
        providerRank: 0,
        path: result.path,
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
        ...(result.instructions?.length ? { instructions: result.instructions } : {}),
        ...(result.startOffsetMeters !== undefined
          ? { startOffsetMeters: result.startOffsetMeters }
          : {}),
        ...(result.endOffsetMeters !== undefined
          ? { endOffsetMeters: result.endOffsetMeters }
          : {}),
        ...(result.attribution ? { attribution: result.attribution } : {}),
      };
      successful.push({
        analysis: await curatedRouteAnalysis.corridor(candidate),
        waypointPoiIds: sequence.poiIds,
      });
    }
    const selected = successful.sort(
      (a, b) =>
        wanderCandidateScore(
          b.analysis,
          minutes,
          opts.pace,
          opts.interests,
          opts.learnedPreferences,
        ) -
          wanderCandidateScore(
            a.analysis,
            minutes,
            opts.pace,
            opts.interests,
            opts.learnedPreferences,
          ) || a.waypointPoiIds.join(":").localeCompare(b.waypointPoiIds.join(":")),
    )[0];
    if (!selected) return directOnly();
    return materializeWanderRoute({
      from,
      to,
      analysis: selected.analysis,
      direct,
      requestedMinutes: minutes,
      fit: "targeted",
      waypointPoiIds: selected.waypointPoiIds,
      opts,
    });
  },
};

const mapTilerReverseGeocoding: ReverseGeocodingService = {
  reverse: (point) => scenicProviderTransport.reverseGeocode(point),
};

interface ScenicServices {
  geocoding: GeocodingService;
  pois: PoiService;
  routing: RoutingService;
  routeAnalysis: RouteAnalysisService;
  reverseGeocoding: ReverseGeocodingService;
  provider: {
    configuredMode: ScenicProviderMode;
    activeMode: ScenicProviderMode;
  };
}

const hybridProviderSet = {
  geocoding: hybridGeocoding,
  pois: mockPois,
  routing: hybridRouting,
  routeAnalysis: curatedRouteAnalysis,
};

export function createScenicServices(config = scenicConfig): ScenicServices {
  if (config.providerMode === "live") {
    // Live is a recognized future mode, but must never be reported as active
    // until a complete live provider set is implemented.
    console.warn(
      "[Scenic Route] Full live mode is not implemented; using the hybrid provider set.",
    );
  }

  return {
    ...hybridProviderSet,
    reverseGeocoding: mapTilerReverseGeocoding,
    provider: {
      configuredMode: config.providerMode,
      activeMode: "mock",
    },
  };
}

/** The single application-wide Scenic service initialization point. */
export const services = createScenicServices();
