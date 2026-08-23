import { describe, expect, it, vi } from "vitest";
import {
  buildCanonicalSharedRouteUrl,
  createNativeShareProvider,
  createWebShareProvider,
  selectShareProvider,
} from "./share-provider";
import { decodeSharedRoutePayload, type SharedRoutePayloadV1 } from "./shared-route";

const payload: SharedRoutePayloadV1 = {
  v: 1,
  from: { name: "Route start", lat: 48.86, lng: 2.3266 },
  to: { name: "Route end", lat: 48.8511, lng: 2.3348 },
  mode: "route",
  profile: "scenic",
  routeId: "ors-scenic-fixture",
  interests: ["historic"],
  detourCap: 20,
  pace: "steady",
  discoveryPoiIds: ["poi-a"],
  expected: { minutes: 30, km: 2.5, extraMinutes: 5 },
};

describe("share provider selection and fallbacks", () => {
  it("selects web only for the web runtime", () => {
    const web = createWebShareProvider({});
    const native = createNativeShareProvider(
      { canShare: async () => ({ value: true }), share: async () => ({ activityType: "x" }) },
      () => true,
    );
    expect(selectShareProvider("web", web, native)).toBe(web);
    expect(selectShareProvider("ios", web, native)).toBe(native);
    expect(selectShareProvider("android", web, native)).toBe(native);
  });

  it("uses Web Share, then clipboard, then manual copy", async () => {
    const clipboard = { writeText: vi.fn(async () => undefined) };
    const failingShare = vi.fn(async () => {
      throw new Error("share unavailable");
    });
    const options = { title: "Route", text: "Walk", url: "https://example.com/shared#r=x" };
    await expect(
      createWebShareProvider({ share: failingShare, clipboard }).share(options),
    ).resolves.toEqual({ status: "copied" });
    expect(clipboard.writeText).toHaveBeenCalledWith(options.url);
    await expect(createWebShareProvider({}).share(options)).resolves.toEqual({
      status: "manual",
      url: options.url,
    });
  });

  it("treats user cancellation as a non-error without copying", async () => {
    const clipboard = { writeText: vi.fn(async () => undefined) };
    const share = vi.fn(async () => {
      throw new DOMException("cancelled", "AbortError");
    });
    await expect(
      createWebShareProvider({ share, clipboard }).share({
        title: "Route",
        text: "Walk",
        url: "https://example.com/shared#r=x",
      }),
    ).resolves.toEqual({ status: "cancelled" });
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });
});

describe("canonical shared route URLs", () => {
  it.each(["web", "ios", "android"] as const)(
    "uses the configured HTTPS public origin for %s",
    (runtime) => {
      const result = buildCanonicalSharedRouteUrl({
        payload,
        runtime,
        configuredPublicOrigin: "https://scenic-route.derrickhunt0.workers.dev",
        currentLocation: { origin: "https://localhost", pathname: "/complete" },
      });
      expect(result).toMatch(/^https:\/\/scenic-route\.derrickhunt0\.workers\.dev\/shared#r=/);
      expect(result).not.toContain("localhost");
      expect(decodeSharedRoutePayload(result.split("#r=")[1]!)).toEqual(payload);
    },
  );

  it("preserves the current web subpath when no canonical origin is configured", () => {
    const result = buildCanonicalSharedRouteUrl({
      payload,
      runtime: "web",
      configuredPublicOrigin: undefined,
      currentLocation: { origin: "https://preview.example", pathname: "/beta/complete" },
    });
    expect(result).toContain("https://preview.example/beta/shared#r=");
  });
});
