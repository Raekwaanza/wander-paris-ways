import { createFileRoute } from "@tanstack/react-router";
import {
  createNativeApiPostHandler,
  nativeApiOptions,
  validateNativeReverseGeocodeInput,
} from "@/lib/scenic/native-api.server";
import { reverseGeocodeWithMapTilerImplementation } from "@/lib/scenic/maptiler-geocoding-implementation.server";

const post = createNativeApiPostHandler(
  validateNativeReverseGeocodeInput,
  reverseGeocodeWithMapTilerImplementation,
);

export const Route = createFileRoute("/api/v1/geocoding/reverse")({
  server: { handlers: { POST: post, OPTIONS: ({ request }) => nativeApiOptions(request) } },
});
