import { createFileRoute } from "@tanstack/react-router";
import {
  createNativeApiPostHandler,
  nativeApiOptions,
  validateNativeMatrixInput,
} from "@/lib/scenic/native-api.server";
import { walkingDurationMatrixImplementation } from "@/lib/scenic/openrouteservice-matrix-implementation.server";

const post = createNativeApiPostHandler(
  validateNativeMatrixInput,
  walkingDurationMatrixImplementation,
);

export const Route = createFileRoute("/api/v1/routing/matrix")({
  server: { handlers: { POST: post, OPTIONS: ({ request }) => nativeApiOptions(request) } },
});
