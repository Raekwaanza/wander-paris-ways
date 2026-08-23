import { describe, expect, it, vi } from "vitest";
import { normalizeScenicApiBaseUrl } from "../platform-runtime";
import {
  createNativeScenicProviderTransport,
  buildScenicApiUrl,
} from "./native-provider-transport";
import type { ScenicProviderTransport } from "./provider-contracts";
import { selectScenicProviderTransport } from "./provider-transport";

const unavailableTransport = {} as ScenicProviderTransport;
const nativeTransport = {} as ScenicProviderTransport;

describe("Scenic provider transport selection", () => {
  it("selects the TanStack transport for web", () => {
    expect(selectScenicProviderTransport("web", unavailableTransport, nativeTransport)).toBe(
      unavailableTransport,
    );
  });

  it.each(["ios", "android"] as const)("selects native HTTPS transport for %s", (runtime) => {
    expect(selectScenicProviderTransport(runtime, unavailableTransport, nativeTransport)).toBe(
      nativeTransport,
    );
  });
});

describe("native Scenic API transport", () => {
  it("normalizes and safely constructs versioned URLs", () => {
    expect(normalizeScenicApiBaseUrl(" https://api.scenic.example/ ")).toBe(
      "https://api.scenic.example",
    );
    expect(buildScenicApiUrl("https://api.scenic.example", "/api/v1/routing/routes")).toBe(
      "https://api.scenic.example/api/v1/routing/routes",
    );
    expect(() => normalizeScenicApiBaseUrl("http://localhost:3000")).toThrow(/HTTPS origin/);
    expect(() => buildScenicApiUrl("https://api.example/base", "/api/v1/routing/routes")).toThrow();
  });

  it("fails safely without an explicit API base URL", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const transport = createNativeScenicProviderTransport(null, fetchImpl);
    await expect(
      transport.route({
        from: { lat: 48.8566, lng: 2.3522 },
        to: { lat: 48.86, lng: 2.36 },
      }),
    ).resolves.toEqual({ status: "unavailable" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps malformed JSON responses to provider unavailability", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("not json", { status: 200, headers: { "content-type": "application/json" } }),
      );
    const transport = createNativeScenicProviderTransport("https://api.scenic.example", fetchImpl);
    await expect(
      transport.route({
        from: { lat: 48.8566, lng: 2.3522 },
        to: { lat: 48.86, lng: 2.36 },
      }),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("maps network and unavailable responses to existing fallback semantics", async () => {
    const networkFailure = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));
    const offline = createNativeScenicProviderTransport(
      "https://api.scenic.example",
      networkFailure,
    );
    await expect(offline.forwardGeocode({ query: "Louvre" })).resolves.toEqual({
      status: "unavailable",
      places: [],
    });

    const unavailable = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ status: "unavailable" }, { status: 503 }));
    const providerDown = createNativeScenicProviderTransport(
      "https://api.scenic.example",
      unavailable,
    );
    await expect(
      providerDown.matrix({
        locations: [
          { lat: 48.8566, lng: 2.3522 },
          { lat: 48.86, lng: 2.36 },
        ],
      }),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("maps rate-limited responses to existing native fallback semantics", async () => {
    const rateLimited = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { error: "rate_limited", retryAfterSeconds: 60 },
          { status: 429, headers: { "Retry-After": "60" } },
        ),
      );
    const transport = createNativeScenicProviderTransport(
      "https://api.scenic.example",
      rateLimited,
    );

    await expect(
      transport.route({
        from: { lat: 48.8566, lng: 2.3522 },
        to: { lat: 48.86, lng: 2.36 },
      }),
    ).resolves.toEqual({ status: "unavailable" });
  });
});
