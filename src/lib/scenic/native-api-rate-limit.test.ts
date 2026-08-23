import { describe, expect, it, vi } from "vitest";
import {
  applyNativeApiRateLimits,
  type NativeApiRateLimitBindings,
  type NativeApiRateLimiter,
} from "./native-api-rate-limit";

function limiter(success = true): NativeApiRateLimiter {
  return { limit: vi.fn(async () => ({ success })) };
}

function bindings(): NativeApiRateLimitBindings {
  return {
    burst: limiter(),
    sustained: limiter(),
    geocoding: limiter(),
    routing: limiter(),
    matrix: limiter(),
  };
}

function request(clientIp?: string) {
  return new Request("https://backend.example/api/v1/routing/routes", {
    headers: clientIp ? { "CF-Connecting-IP": clientIp } : undefined,
  });
}

describe("native API rate-limit policy", () => {
  it.each(["geocoding", "routing", "matrix"] as const)(
    "checks burst, sustained, and only the %s endpoint class in order",
    async (endpointClass) => {
      const configured = bindings();
      const calls: string[] = [];
      for (const [name, binding] of Object.entries(configured)) {
        vi.mocked(binding.limit).mockImplementation(async () => {
          calls.push(name);
          return { success: true };
        });
      }

      await expect(
        applyNativeApiRateLimits(request("203.0.113.8"), endpointClass, configured),
      ).resolves.toEqual({ status: "allowed" });
      expect(calls).toEqual(["burst", "sustained", endpointClass]);
      expect(configured.burst.limit).toHaveBeenCalledWith({ key: "203.0.113.8" });
    },
  );

  it("uses one deterministic local-development key when Cloudflare has no client IP header", async () => {
    const configured = bindings();
    await applyNativeApiRateLimits(request(), "routing", configured);
    expect(configured.burst.limit).toHaveBeenCalledWith({ key: "unknown-client" });
    expect(configured.sustained.limit).toHaveBeenCalledWith({ key: "unknown-client" });
    expect(configured.routing.limit).toHaveBeenCalledWith({ key: "unknown-client" });
  });

  it("stops on the first rejected limiter and reports its window", async () => {
    const burstRejected = bindings();
    burstRejected.burst = limiter(false);
    await expect(applyNativeApiRateLimits(request(), "matrix", burstRejected)).resolves.toEqual({
      status: "limited",
      retryAfterSeconds: 10,
    });
    expect(burstRejected.sustained.limit).not.toHaveBeenCalled();
    expect(burstRejected.matrix.limit).not.toHaveBeenCalled();

    const sustainedRejected = bindings();
    sustainedRejected.sustained = limiter(false);
    await expect(applyNativeApiRateLimits(request(), "matrix", sustainedRejected)).resolves.toEqual(
      { status: "limited", retryAfterSeconds: 60 },
    );
    expect(sustainedRejected.matrix.limit).not.toHaveBeenCalled();

    const classRejected = bindings();
    classRejected.matrix = limiter(false);
    await expect(applyNativeApiRateLimits(request(), "matrix", classRejected)).resolves.toEqual({
      status: "limited",
      retryAfterSeconds: 60,
    });
    expect(classRejected.burst.limit).toHaveBeenCalledOnce();
    expect(classRejected.sustained.limit).toHaveBeenCalledOnce();
    expect(classRejected.matrix.limit).toHaveBeenCalledOnce();
    expect(classRejected.geocoding.limit).not.toHaveBeenCalled();
    expect(classRejected.routing.limit).not.toHaveBeenCalled();
  });

  it("fails closed when a binding call fails", async () => {
    const configured = bindings();
    vi.mocked(configured.sustained.limit).mockRejectedValue(new Error("binding unavailable"));
    await expect(applyNativeApiRateLimits(request(), "routing", configured)).resolves.toEqual({
      status: "unavailable",
    });
    expect(configured.routing.limit).not.toHaveBeenCalled();
  });
});
