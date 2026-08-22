import { createFileRoute } from "@tanstack/react-router";
import {
  createNativeApiPostHandler,
  nativeApiOptions,
  validateNativeRoutingInput,
} from "@/lib/scenic/native-api.server";
import { routeWithOpenRouteServiceImplementation } from "@/lib/scenic/openrouteservice-routing-implementation.server";

const post = createNativeApiPostHandler(
  validateNativeRoutingInput,
  routeWithOpenRouteServiceImplementation,
);

export const Route = createFileRoute("/api/v1/routing/routes")({
  server: { handlers: { POST: post, OPTIONS: ({ request }) => nativeApiOptions(request) } },
});
