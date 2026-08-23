import { describe, expect, it, vi } from "vitest";
import type { URLOpenListenerEvent } from "@capacitor/app";
import { MAX_SHARED_ROUTE_TOKEN_LENGTH, encodeSharedRoutePayload } from "./shared-route";
import { parseScenicRouteLink, startNativeDeepLinkHandling } from "./native-deep-links";

const origin = "https://scenic-route.derrickhunt0.workers.dev";
const token = encodeSharedRoutePayload({
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
});

describe("native shared-route link parser", () => {
  it.each([`scenicroute://shared#r=${token}`, `${origin}/shared#r=${token}`])(
    "accepts an exact supported link: %s",
    (url) => {
      expect(parseScenicRouteLink(url, origin)).toEqual({ path: "/shared", token });
    },
  );

  it.each([
    `http://scenic-route.derrickhunt0.workers.dev/shared#r=${token}`,
    `https://evil.example/shared#r=${token}`,
    `${origin}/complete#r=${token}`,
    `${origin}/shared?r=${token}`,
    `${origin}/shared#r=${token}&x=1`,
    `${origin}/shared#r=${token}&r=${token}`,
    `scenicroute://other#r=${token}`,
    `other://shared#r=${token}`,
    `scenicroute://shared/path#r=${token}`,
    `scenicroute://user@shared#r=${token}`,
    `scenicroute://shared#r=invalid!`,
    `scenicroute://shared#r=${"a".repeat(MAX_SHARED_ROUTE_TOKEN_LENGTH + 1)}`,
  ])("rejects malformed or out-of-scope input: %s", (url) => {
    expect(parseScenicRouteLink(url, origin)).toBeNull();
  });
});

describe("native deep-link lifecycle", () => {
  it("handles cold and warm links once and removes its sole listener", async () => {
    let listener: ((event: URLOpenListenerEvent) => void) | undefined;
    const remove = vi.fn(async () => undefined);
    const addListener = vi.fn(async (_name, callback) => {
      listener = callback;
      return { remove };
    });
    const plugin = {
      getLaunchUrl: vi.fn(async () => ({ url: `scenicroute://shared#r=${token}` })),
      addListener,
    };
    const onLink = vi.fn();
    const subscription = startNativeDeepLinkHandling({ publicWebOrigin: origin, onLink, plugin });
    await subscription.ready;
    expect(addListener).toHaveBeenCalledTimes(1);
    expect(onLink).toHaveBeenCalledTimes(1);
    listener?.({ url: `scenicroute://shared#r=${token}` });
    listener?.({ url: `${origin}/shared#r=${token}` });
    expect(onLink).toHaveBeenCalledTimes(2);
    await subscription.dispose();
    listener?.({ url: `${origin}/shared#r=${token}` });
    expect(onLink).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
