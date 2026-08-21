/** Generous MVP coverage for Paris and its near suburbs, not an arrondissement boundary. */
export const PARIS_MVP_BOUNDS = {
  minLat: 48.75,
  maxLat: 49.0,
  minLng: 2.15,
  maxLng: 2.55,
} as const;

export function isInParisMvpBounds(lat: number, lng: number) {
  return (
    lat >= PARIS_MVP_BOUNDS.minLat &&
    lat <= PARIS_MVP_BOUNDS.maxLat &&
    lng >= PARIS_MVP_BOUNDS.minLng &&
    lng <= PARIS_MVP_BOUNDS.maxLng
  );
}
