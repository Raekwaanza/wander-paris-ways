import { env } from "cloudflare:workers";
import {
  applyNativeApiRateLimits,
  type NativeApiRateLimitBindings,
  type NativeApiRateLimitClass,
  type NativeApiRateLimitOutcome,
} from "./native-api-rate-limit";

export function enforceNativeApiRateLimits(
  request: Request,
  endpointClass: NativeApiRateLimitClass,
): Promise<NativeApiRateLimitOutcome> {
  const bindings: NativeApiRateLimitBindings = {
    burst: env.SCENIC_API_BURST_RATE_LIMITER,
    sustained: env.SCENIC_API_SUSTAINED_RATE_LIMITER,
    geocoding: env.SCENIC_GEOCODING_RATE_LIMITER,
    routing: env.SCENIC_ROUTING_RATE_LIMITER,
    matrix: env.SCENIC_MATRIX_RATE_LIMITER,
  };
  return applyNativeApiRateLimits(request, endpointClass, bindings);
}
