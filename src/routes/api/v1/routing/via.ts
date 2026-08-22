import { createFileRoute } from "@tanstack/react-router";
import {
  createNativeApiPostHandler,
  nativeApiOptions,
  validateNativeViaInput,
} from "@/lib/scenic/native-api.server";
import { routeViaOpenRouteServiceImplementation } from "@/lib/scenic/openrouteservice-routing-implementation.server";

const post = createNativeApiPostHandler(
  validateNativeViaInput,
  routeViaOpenRouteServiceImplementation,
);

export const Route = createFileRoute("/api/v1/routing/via")({
  server: { handlers: { POST: post, OPTIONS: ({ request }) => nativeApiOptions(request) } },
});
