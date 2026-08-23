import { createFileRoute } from "@tanstack/react-router";
import {
  createNativeApiPostHandler,
  nativeApiOptions,
  validateNativeForwardGeocodeInput,
} from "@/lib/scenic/native-api.server";
import { searchParisWithMapTilerImplementation } from "@/lib/scenic/maptiler-geocoding-implementation.server";

const post = createNativeApiPostHandler(
  "geocoding",
  validateNativeForwardGeocodeInput,
  searchParisWithMapTilerImplementation,
);

export const Route = createFileRoute("/api/v1/geocoding/search")({
  server: { handlers: { POST: post, OPTIONS: ({ request }) => nativeApiOptions(request) } },
});
