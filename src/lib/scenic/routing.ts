import { distanceKm, detourKm, lerp, pathLengthKm } from "./geo";
import { POIS } from "./pois";
import type { InterestId, LatLng, Place, Poi, RouteProfile, ScenicRoute } from "./types";

/**
 * Mock scenic routing engine.
 *
 * Route Score = Scenic Value + Interest Match + Landmark Quality + Street Appeal
 *               - Detour Penalty - Inconvenience Penalty
 *
 * Everything here is deterministic and derived from the seeded POI set so the
 * prototype works with zero API credentials. Replace `buildRoutes` internals with
 * a real routing provider (Mapbox / OSRM + Overpass POIs) later — the returned
 * `ScenicRoute` shape is the contract the UI depends on.
 */

const PACE_KMH = 5.4;
/** Street network detour vs straight line. */
const NETWORK_FACTOR = 1.02;

export type Pace = "strolling" | "steady" | "brisk";
const PACE_MULTIPLIER: Record<Pace, number> = {
  strolling: 1.16,
  steady: 1,
  brisk: 0.88,
};

export function applyPaceMultiplier(minutes: number, pace: Pace = "steady"): number {
  return minutes * PACE_MULTIPLIER[pace];
}

export function minutesFor(km: number, pace: Pace = "steady"): number {
  return applyPaceMultiplier((km / PACE_KMH) * 60, pace);
}

function interestMatchScore(poi: Poi, interests: InterestId[]): number {
  if (interests.length === 0) return 1.4;
  const hits = poi.interests.filter((i) => interests.includes(i)).length;
  return (hits / Math.max(1, Math.min(interests.length, 3))) * 4;
}

function baseAppeal(poi: Poi): number {
  const s = poi.scores;
  return (
    s.scenic * 0.34 +
    s.architecture * 0.18 +
    s.historic * 0.16 +
    s.nature * 0.1 +
    s.hidden * 0.16 +
    s.food * 0.06 -
    (s.popularity > 8 ? 0.4 : 0)
  );
}

interface Scored {
  poi: Poi;
  score: number;
  detour: number;
  t: number;
}

function candidatesFor(a: LatLng, b: LatLng, interests: InterestId[], maxDetourKm: number) {
  const direct = distanceKm(a, b);
  const out: Scored[] = [];
  for (const poi of POIS) {
    const d = detourKm(a, poi, b);
    if (d > maxDetourKm) continue;
    const detourPenalty = (d / Math.max(direct, 0.4)) * 5.2;
    const score = baseAppeal(poi) + interestMatchScore(poi, interests) * 1.9 - detourPenalty;
    if (score <= 0) continue;
    const t = distanceKm(a, poi) / Math.max(distanceKm(a, poi) + distanceKm(poi, b), 0.001);
    out.push({ poi, score, detour: d, t });
  }
  return out.sort((x, y) => y.score - x.score);
}

function selectStops(
  a: LatLng,
  b: LatLng,
  interests: InterestId[],
  extraKmBudget: number,
  maxStops: number,
): Poi[] {
  const chosen: Scored[] = [];
  let used = 0;
  const pool = candidatesFor(a, b, interests, extraKmBudget * 1.05);
  for (const c of pool) {
    if (chosen.length >= maxStops) break;
    // marginal detour relative to the already-chosen ordered path
    const ordered = [...chosen, c].sort((x, y) => x.t - y.t).map((s) => s.poi);
    const cost = pathLengthKm([a, ...ordered, b]) - distanceKm(a, b);
    if (cost > extraKmBudget) continue;
    // avoid stacking near-identical neighbours
    if (chosen.some((x) => distanceKm(x.poi, c.poi) < 0.16)) continue;
    chosen.push(c);
    used = cost;
  }
  void used;
  return chosen.sort((x, y) => x.t - y.t).map((s) => s.poi);
}

/** Adds gentle bends so the drawn line reads as streets rather than a ruler. */
function weavePath(points: LatLng[], amplitude: number): LatLng[] {
  const out: LatLng[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i]!;
    const q = points[i + 1]!;
    out.push(p);
    const dx = q.lng - p.lng;
    const dy = q.lat - p.lat;
    const len = Math.hypot(dx, dy);
    if (len < 0.0009) continue;
    const nx = -dy / len;
    const ny = dx / len;
    const sign = i % 2 === 0 ? 1 : -1;
    const m1 = lerp(p, q, 0.33);
    const m2 = lerp(p, q, 0.67);
    out.push({ lat: m1.lat + ny * amplitude * sign, lng: m1.lng + nx * amplitude * sign });
    out.push({
      lat: m2.lat - ny * amplitude * sign * 0.6,
      lng: m2.lng - nx * amplitude * sign * 0.6,
    });
  }
  out.push(points[points.length - 1]!);
  return out;
}

function reasonLines(stops: Poi[]): { count: number; label: string }[] {
  const buckets: { label: string; singular: string; test: (p: Poi) => boolean }[] = [
    {
      label: "historic covered passages",
      singular: "historic covered passage",
      test: (p) => p.category === "Historic Passage",
    },
    {
      label: "gardens",
      singular: "garden",
      test: (p) => p.category === "Garden" || p.category === "Riverside Garden",
    },
    {
      label: "architecturally notable streets & squares",
      singular: "architecturally notable street",
      test: (p) =>
        (p.category === "Historic Street" ||
          p.category === "Square" ||
          p.category === "Courtyards") &&
        p.scores.architecture >= 6,
    },
    {
      label: "lesser-known churches",
      singular: "lesser-known church",
      test: (p) => p.category === "Church",
    },
    {
      label: "riverside stretches",
      singular: "riverside stretch",
      test: (p) =>
        p.category === "Riverside" ||
        p.category === "Island" ||
        p.category === "Bridge" ||
        p.category === "Canal",
    },
    {
      label: "food streets & markets",
      singular: "food street",
      test: (p) => p.category === "Market Street" || p.category === "Covered Market",
    },
    {
      label: "hidden courtyards & finds",
      singular: "hidden find",
      test: (p) => p.scores.hidden >= 9,
    },
  ];
  const seen = new Set<string>();
  const lines: { count: number; label: string }[] = [];
  for (const b of buckets) {
    const matched = stops.filter((p) => b.test(p) && !seen.has(p.id));
    if (matched.length === 0) continue;
    matched.forEach((p) => seen.add(p.id));
    lines.push({ count: matched.length, label: matched.length === 1 ? b.singular : b.label });
  }
  return lines;
}

function matchFor(stops: Poi[], interests: InterestId[]) {
  if (stops.length === 0) return { percent: 0, matched: [] as InterestId[] };
  if (interests.length === 0) {
    const avg = stops.reduce((s, p) => s + p.scores.scenic, 0) / stops.length;
    return { percent: Math.round(Math.min(97, 60 + avg * 3.5)), matched: [] as InterestId[] };
  }
  const matched = interests.filter((i) => stops.some((p) => p.interests.includes(i)));
  const hitRatio =
    stops.reduce(
      (s, p) => s + Math.min(1, p.interests.filter((i) => interests.includes(i)).length / 2),
      0,
    ) / stops.length;
  const coverage = matched.length / interests.length;
  return {
    percent: Math.round(Math.min(98, 52 + hitRatio * 26 + coverage * 24)),
    matched,
  };
}

const COPY: Record<RouteProfile, { title: string }> = {
  fastest: { title: "Fastest" },
  scenic: { title: "Scenic" },
  explorer: { title: "Explorer" },
};

export interface BuildOptions {
  interests: InterestId[];
  detourCap: number;
  pace?: Pace;
}

function makeRoute(
  profile: RouteProfile,
  from: LatLng,
  to: LatLng,
  stops: Poi[],
  opts: BuildOptions,
  fastestMinutes: number,
): ScenicRoute {
  const pace = opts.pace ?? "steady";
  const raw: LatLng[] = [from, ...stops, to];
  const path = profile === "fastest" ? weavePath(raw, 0.00035) : weavePath(raw, 0.0006);
  const km = pathLengthKm(path) * (profile === "fastest" ? NETWORK_FACTOR : NETWORK_FACTOR * 1.02);
  const minutes = Math.round(minutesFor(km, pace) + stops.length * 0.7);
  const { percent, matched } = matchFor(stops, opts.interests);
  const majorRoadReduction = Math.min(64, 12 + stops.length * 11);
  const blurb =
    profile === "fastest"
      ? "Get there efficiently."
      : profile === "scenic"
        ? `More beautiful streets and ${stops.length} discoveries along the way.`
        : "The most interesting route within your available time.";

  return {
    id: `${profile}-${Math.round(km * 100)}`,
    profile,
    title: COPY[profile].title,
    blurb,
    minutes,
    km: Math.round(km * 10) / 10,
    extraMinutes: Math.max(0, minutes - fastestMinutes),
    discoveries: stops,
    path,
    matchPercent: percent,
    matchedInterests: matched,
    score: Math.round(stops.reduce((s, p) => s + baseAppeal(p), 0) * 10) / 10,
    reasons: reasonLines(stops),
    majorRoadReduction,
    routingSource: "mock",
  };
}

export function buildRoutes(
  from: Place | LatLng,
  to: Place | LatLng,
  opts: BuildOptions,
): ScenicRoute[] {
  const a: LatLng = { lat: from.lat, lng: from.lng };
  const b: LatLng = { lat: to.lat, lng: to.lng };
  const direct = distanceKm(a, b);

  const fastest = makeRoute("fastest", a, b, [], opts, 0);
  const fastestMinutes = fastest.minutes;

  const cap = opts.detourCap;
  const scenicExtraMin = Math.min(cap, Math.max(7, Math.round(cap * 0.5)));
  const scenicKmBudget = ((scenicExtraMin / 60) * PACE_KMH) / 1.16;
  const explorerKmBudget = ((cap / 60) * PACE_KMH * 1.05) / 1.16;

  const scenicStops = selectStops(a, b, opts.interests, Math.max(0.3, scenicKmBudget), 4);
  const explorerStops = selectStops(
    a,
    b,
    opts.interests,
    Math.max(0.6, explorerKmBudget),
    Math.min(7, Math.max(4, Math.round(direct * 2) + 3)),
  );

  const scenic = makeRoute("scenic", a, b, scenicStops, opts, fastestMinutes);
  const explorer = makeRoute("explorer", a, b, explorerStops, opts, fastestMinutes);

  return [fastest, scenic, explorer].map((r) => ({
    ...r,
    extraMinutes: Math.max(0, r.minutes - fastestMinutes),
  }));
}

/** "I have time" mode: a loop-ish wander that ends at the destination on schedule. */
export function buildWander(
  from: Place | LatLng,
  to: Place | LatLng,
  minutesAvailable: number,
  opts: BuildOptions,
): ScenicRoute {
  const a: LatLng = { lat: from.lat, lng: from.lng };
  const b: LatLng = { lat: to.lat, lng: to.lng };
  const targetKm = ((minutesAvailable / 60) * PACE_KMH * 0.97) / 1.1;
  const extraBudget = Math.max(0.2, targetKm - distanceKm(a, b));
  const stops = selectStops(a, b, opts.interests, extraBudget, 8);
  const fastestMinutes = makeRoute("fastest", a, b, [], opts, 0).minutes;
  const route = makeRoute("explorer", a, b, stops, opts, fastestMinutes);
  return {
    ...route,
    title: `${minutesAvailable}-Minute Wander`,
    blurb: "A wander that still gets you there on time.",
  };
}
