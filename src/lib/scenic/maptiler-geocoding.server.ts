import { createServerFn } from "@tanstack/react-start";
import type { ForwardGeocodeResult } from "./provider-contracts";
import {
  reverseGeocodeWithMapTilerImplementation,
  searchParisWithMapTilerImplementation,
  validateForwardGeocodeInput,
  validateReverseGeocodeInput,
} from "./maptiler-geocoding-implementation.server";

export {
  MAPTILER_GEOCODING_TIMEOUT_MS,
  MAPTILER_SEARCH_LIMIT,
  MAPTILER_SEARCH_TYPES,
  MAX_LIVE_SEARCH_LENGTH,
  MIN_LIVE_SEARCH_LENGTH,
  PARIS_SEARCH_BOUNDS,
  PARIS_SEARCH_CENTER,
  normalizeMapTilerForwardResult,
  normalizeMapTilerReverseResult,
} from "./maptiler-geocoding-implementation.server";
export type {
  ForwardGeocodeInput,
  ForwardGeocodeResult,
  ReverseGeocodeInput,
  ReverseGeocodeResult,
} from "./provider-contracts";

export const reverseGeocodeWithMapTiler = createServerFn({ method: "POST" })
  .validator(validateReverseGeocodeInput)
  .handler(async ({ data }) => reverseGeocodeWithMapTilerImplementation(data));

export const searchParisWithMapTiler = createServerFn({ method: "POST" })
  .validator(validateForwardGeocodeInput)
  .handler(async ({ data }): Promise<ForwardGeocodeResult> =>
    searchParisWithMapTilerImplementation(data),
  );
