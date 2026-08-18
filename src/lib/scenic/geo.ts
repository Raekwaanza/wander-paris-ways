import type { LatLng } from "./types";

/** Flat-earth projection tuned for central Paris. Good enough at city scale. */
export const LNG_ORIGIN = 2.28;
export const LAT_ORIGIN = 48.885;
export const X_SCALE = 1000;
export const Y_SCALE = 1514;

export function project(p: LatLng): { x: number; y: number } {
  return {
    x: (p.lng - LNG_ORIGIN) * X_SCALE,
    y: (LAT_ORIGIN - p.lat) * Y_SCALE,
  };
}

/** Distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dx = (b.lng - a.lng) * 73.4;
  const dy = (b.lat - a.lat) * 111.2;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pathLengthKm(path: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += distanceKm(path[i - 1], path[i]);
  return total;
}

export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/** Point at a given fraction along a path. */
export function pointAlong(path: LatLng[], fraction: number): LatLng {
  const total = pathLengthKm(path);
  if (total === 0) return path[0];
  let target = total * Math.min(Math.max(fraction, 0), 1);
  for (let i = 1; i < path.length; i++) {
    const seg = distanceKm(path[i - 1], path[i]);
    if (target <= seg) return lerp(path[i - 1], path[i], seg === 0 ? 0 : target / seg);
    target -= seg;
  }
  return path[path.length - 1];
}

/** Perpendicular-ish detour cost of visiting `via` between a and b, in km. */
export function detourKm(a: LatLng, via: LatLng, b: LatLng): number {
  return distanceKm(a, via) + distanceKm(via, b) - distanceKm(a, b);
}

/** Catmull-Rom smoothed SVG path through projected points. */
export function smoothSvgPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2)
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}
