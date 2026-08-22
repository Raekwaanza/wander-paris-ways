import { createServerFn } from "@tanstack/react-start";
import type { PedestrianRouteResponse } from "./provider-contracts";
import {
  routeViaOpenRouteServiceImplementation,
  routeWithOpenRouteServiceImplementation,
  validateRoutingInput,
  validateViaRoutingInput,
} from "./openrouteservice-routing-implementation.server";

export {
  OPENROUTESERVICE_ALTERNATIVE_ROUTES,
  OPENROUTESERVICE_CACHE_LIMIT,
  OPENROUTESERVICE_ENDPOINT,
  OPENROUTESERVICE_TIMEOUT_MS,
  normalizeOpenRouteServiceResponse,
} from "./openrouteservice-routing-implementation.server";
export type { PedestrianRouteResponse, PedestrianRouteResult } from "./provider-contracts";

/** Fixed 2–4 point routing for Wander. It deliberately requests no alternatives. */
export const routeViaOpenRouteService = createServerFn({ method: "POST" })
  .validator(validateViaRoutingInput)
  .handler(async ({ data }): Promise<PedestrianRouteResponse> =>
    routeViaOpenRouteServiceImplementation(data),
  );

export const routeWithOpenRouteService = createServerFn({ method: "POST" })
  .validator(validateRoutingInput)
  .handler(async ({ data }): Promise<PedestrianRouteResponse> =>
    routeWithOpenRouteServiceImplementation(data),
  );
