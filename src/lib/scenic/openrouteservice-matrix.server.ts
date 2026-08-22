import { createServerFn } from "@tanstack/react-start";
import type { WalkingMatrixResponse } from "./provider-contracts";
import {
  validateWalkingMatrixInput,
  walkingDurationMatrixImplementation,
} from "./openrouteservice-matrix-implementation.server";

export {
  OPENROUTESERVICE_MATRIX_ENDPOINT,
  WALKING_MATRIX_LOCATION_LIMIT,
  normalizeWalkingMatrix,
} from "./openrouteservice-matrix-implementation.server";
export type {
  WalkingDurationMatrix,
  WalkingMatrixInput,
  WalkingMatrixResponse,
} from "./provider-contracts";

export const walkingDurationMatrix = createServerFn({ method: "POST" })
  .validator(validateWalkingMatrixInput)
  .handler(async ({ data }): Promise<WalkingMatrixResponse> =>
    walkingDurationMatrixImplementation(data),
  );
