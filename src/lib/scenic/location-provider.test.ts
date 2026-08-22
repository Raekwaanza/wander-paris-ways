import { describe, expect, it, vi } from "vitest";
import type { PositionOptions, WatchPositionCallback } from "@capacitor/geolocation";
import type { ScenicLocationProvider } from "./location-contracts";
import { ScenicLocationError } from "./location-contracts";
import { createNativeLocationProvider, normalizeNativeLocation } from "./native-location-provider";
import { selectLocationProvider } from "./location-provider";
import { createWebLocationProvider, normalizeWebLocation } from "./web-location-provider";

const webProvider = {} as ScenicLocationProvider;
const nativeProvider = {} as ScenicLocationProvider;

const position = {
  timestamp: 1234,
  coords: {
    latitude: 48.8566,
    longitude: 2.3522,
    accuracy: 12,
    altitudeAccuracy: null,
    altitude: null,
    speed: null,
    heading: null,
    magneticHeading: null,
    trueHeading: null,
    headingAccuracy: null,
    course: null,
  },
};

describe("location provider selection", () => {
  it("selects browser geolocation for web", () => {
    expect(selectLocationProvider("web", webProvider, nativeProvider)).toBe(webProvider);
  });

  it.each(["ios", "android"] as const)("selects Capacitor geolocation for %s", (runtime) => {
    expect(selectLocationProvider(runtime, webProvider, nativeProvider)).toBe(nativeProvider);
  });
});

describe("location normalization", () => {
  it("normalizes web and native coordinates identically", () => {
    const web = normalizeWebLocation(position as unknown as GeolocationPosition);
    const native = normalizeNativeLocation(position);
    expect(web).toEqual({
      latitude: 48.8566,
      longitude: 2.3522,
      accuracyMeters: 12,
      timestamp: 1234,
    });
    expect(native).toEqual(web);
  });
});

describe("native location permissions and cleanup", () => {
  it("maps a denied permission without requesting it repeatedly", async () => {
    const plugin = {
      checkPermissions: vi.fn(
        async () => ({ location: "denied", coarseLocation: "denied" }) as const,
      ),
      requestPermissions: vi.fn(),
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };
    const provider = createNativeLocationProvider(plugin, () => true);
    await expect(
      provider.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 30_000,
      }),
    ).rejects.toMatchObject({ code: "permission-denied" });
    expect(plugin.requestPermissions).not.toHaveBeenCalled();
    expect(plugin.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("requests a promptable foreground permission and clears the native watch", async () => {
    const plugin = {
      checkPermissions: vi.fn(
        async () => ({ location: "prompt", coarseLocation: "prompt" }) as const,
      ),
      requestPermissions: vi.fn(
        async () => ({ location: "granted", coarseLocation: "granted" }) as const,
      ),
      getCurrentPosition: vi.fn(async () => position),
      watchPosition: vi.fn(async (_options: PositionOptions, callback: WatchPositionCallback) => {
        callback(position);
        return "native-watch-1";
      }),
      clearWatch: vi.fn(async () => undefined),
    };
    const provider = createNativeLocationProvider(plugin, () => true);
    const measurement = vi.fn();
    const handle = await provider.watchPosition(
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
      measurement,
      vi.fn(),
    );
    await provider.clearWatch(handle);
    expect(plugin.requestPermissions).toHaveBeenCalledWith({ permissions: ["location"] });
    expect(measurement).toHaveBeenCalledWith(normalizeNativeLocation(position));
    expect(plugin.clearWatch).toHaveBeenCalledWith({ id: "native-watch-1" });
  });
});

describe("web location cleanup", () => {
  it("clears the browser watch through the adapter", async () => {
    const geolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(() => 42),
      clearWatch: vi.fn(),
    } as unknown as Geolocation;
    const provider = createWebLocationProvider(() => ({ geolocation, secureContext: true }));
    const handle = await provider.watchPosition(
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
      vi.fn(),
      vi.fn(),
    );
    await provider.clearWatch(handle);
    expect(geolocation.clearWatch).toHaveBeenCalledWith(42);
  });

  it("preserves secure-context failure mapping", async () => {
    const provider = createWebLocationProvider(() => ({
      geolocation: {} as Geolocation,
      secureContext: false,
    }));
    await expect(
      provider.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 30_000,
      }),
    ).rejects.toEqual(new ScenicLocationError("insecure-context"));
  });
});
