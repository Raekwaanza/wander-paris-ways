import type { LatLng } from "./types";

/** Flat-earth projection tuned for central Paris. Good enough at city scale. */
export const LNG_ORIGIN = 2.28;
export const LAT_ORIGIN = 48.885;
export const X_SCALE = 1000;
export const Y_SCALE = 1514;

/** Physical distance scales for the local, central-Paris projection. */
export const KM_PER_LAT_DEGREE = 111.2;
export const KM_PER_LNG_DEGREE_PARIS = 73.4;

export interface NearestPointOnPathResult {
  distanceKm: number;
  pathDistanceKm: number;
  progress: number;
  nearestPoint: LatLng;
}

export function project(p: LatLng): { x: number; y: number } {
  return {
    x: (p.lng - LNG_ORIGIN) * X_SCALE,
    y: (LAT_ORIGIN - p.lat) * Y_SCALE,
  };
}

/** Distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dx = (b.lng - a.lng) * KM_PER_LNG_DEGREE_PARIS;
  const dy = (b.lat - a.lat) * KM_PER_LAT_DEGREE;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Stable, value-based identity for a route geometry (roughly 10 cm in Paris). */
export function routeGeometrySignature(path: readonly LatLng[]): string {
  return path.map(({ lat, lng }) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join(";");
}

function hasFiniteCoordinates(point: LatLng): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

/**
 * Finds the closest projection of a point onto a path using physical kilometre
 * scaling. Cumulative distance, rather than segment index, determines progress.
 */
export function nearestPointOnPath(point: LatLng, path: LatLng[]): NearestPointOnPathResult | null {
  if (!hasFiniteCoordinates(point)) return null;
  const validPath = path.filter(hasFiniteCoordinates);
  if (validPath.length === 0) return null;
  if (validPath.length === 1) {
    return {
      distanceKm: distanceKm(point, validPath[0]!),
      pathDistanceKm: 0,
      progress: 0,
      nearestPoint: { ...validPath[0]! },
    };
  }

  const totalPathKm = pathLengthKm(validPath);
  let traversedKm = 0;
  let nearest: Omit<NearestPointOnPathResult, "progress"> | null = null;

  for (let index = 1; index < validPath.length; index += 1) {
    const start = validPath[index - 1]!;
    const end = validPath[index]!;
    const segmentX = (end.lng - start.lng) * KM_PER_LNG_DEGREE_PARIS;
    const segmentY = (end.lat - start.lat) * KM_PER_LAT_DEGREE;
    const pointX = (point.lng - start.lng) * KM_PER_LNG_DEGREE_PARIS;
    const pointY = (point.lat - start.lat) * KM_PER_LAT_DEGREE;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    const projection =
      segmentLengthSquared === 0
        ? 0
        : Math.min(1, Math.max(0, (pointX * segmentX + pointY * segmentY) / segmentLengthSquared));
    const nearestPoint = lerp(start, end, projection);
    const segmentKm = Math.sqrt(segmentLengthSquared);
    const candidate = {
      distanceKm: distanceKm(point, nearestPoint),
      pathDistanceKm: traversedKm + segmentKm * projection,
      nearestPoint,
    };

    if (
      nearest === null ||
      candidate.distanceKm < nearest.distanceKm ||
      (candidate.distanceKm === nearest.distanceKm &&
        candidate.pathDistanceKm < nearest.pathDistanceKm)
    ) {
      nearest = candidate;
    }
    traversedKm += segmentKm;
  }

  if (!nearest) return null;
  return {
    ...nearest,
    progress: totalPathKm === 0 ? 0 : nearest.pathDistanceKm / totalPathKm,
  };
}

export function pathLengthKm(path: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += distanceKm(path[i - 1]!, path[i]!);
  return total;
}

export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/** Point at a given fraction along a path. */
export function pointAlong(path: LatLng[], fraction: number): LatLng {
  const total = pathLengthKm(path);
  if (total === 0) return path[0]!;
  let target = total * Math.min(Math.max(fraction, 0), 1);
  for (let i = 1; i < path.length; i++) {
    const seg = distanceKm(path[i - 1]!, path[i]!);
    if (target <= seg) return lerp(path[i - 1]!, path[i]!, seg === 0 ? 0 : target / seg);
    target -= seg;
  }
  return path[path.length - 1]!;
}

/** Perpendicular-ish detour cost of visiting `via` between a and b, in km. */
export function detourKm(a: LatLng, via: LatLng, b: LatLng): number {
  return distanceKm(a, via) + distanceKm(via, b) - distanceKm(a, b);
}

/** Catmull-Rom smoothed SVG path through projected points. */
export function smoothSvgPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2)
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}
