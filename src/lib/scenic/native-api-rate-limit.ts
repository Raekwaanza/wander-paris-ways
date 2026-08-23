export type NativeApiRateLimitClass = "geocoding" | "routing" | "matrix";

export interface NativeApiRateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface NativeApiRateLimitBindings {
  burst: NativeApiRateLimiter;
  sustained: NativeApiRateLimiter;
  geocoding: NativeApiRateLimiter;
  routing: NativeApiRateLimiter;
  matrix: NativeApiRateLimiter;
}

export type NativeApiRateLimitOutcome =
  | { status: "allowed" }
  | { status: "limited"; retryAfterSeconds: number }
  | { status: "unavailable" };

const UNKNOWN_CLIENT_KEY = "unknown-client";

function rateLimitKey(request: Request): string {
  return request.headers.get("CF-Connecting-IP")?.trim() || UNKNOWN_CLIENT_KEY;
}

export async function applyNativeApiRateLimits(
  request: Request,
  endpointClass: NativeApiRateLimitClass,
  bindings: NativeApiRateLimitBindings,
): Promise<NativeApiRateLimitOutcome> {
  const key = rateLimitKey(request);
  const checks = [
    { limiter: bindings.burst, retryAfterSeconds: 10 },
    { limiter: bindings.sustained, retryAfterSeconds: 60 },
    { limiter: bindings[endpointClass], retryAfterSeconds: 60 },
  ] as const;

  try {
    for (const check of checks) {
      const result = await check.limiter.limit({ key });
      if (!result.success) {
        return { status: "limited", retryAfterSeconds: check.retryAfterSeconds };
      }
    }
    return { status: "allowed" };
  } catch {
    return { status: "unavailable" };
  }
}
