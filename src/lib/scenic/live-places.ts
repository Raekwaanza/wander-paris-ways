import type { Place } from "./types";

export const MAPTILER_PLACE_ID_PREFIX = "maptiler:";
export const LIVE_PLACE_REGISTRY_LIMIT = 75;

const livePlaces = new Map<string, Place>();

export function isMapTilerPlaceId(id: string | null | undefined) {
  return typeof id === "string" && id.startsWith(MAPTILER_PLACE_ID_PREFIX);
}

export function registerLivePlaces(places: Place[]) {
  for (const place of places) {
    if (!isMapTilerPlaceId(place.id)) continue;
    livePlaces.delete(place.id);
    livePlaces.set(place.id, place);
  }

  while (livePlaces.size > LIVE_PLACE_REGISTRY_LIMIT) {
    const oldestId = livePlaces.keys().next().value;
    if (typeof oldestId !== "string") break;
    livePlaces.delete(oldestId);
  }
}

export function livePlaceById(id: string) {
  return livePlaces.get(id);
}
