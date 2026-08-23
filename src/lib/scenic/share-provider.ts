import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import type { SharePlugin } from "@capacitor/share";
import { getAppRuntime, resolveScenicPublicWebOrigin, type AppRuntime } from "../platform-runtime";
import { buildSharedRouteUrl, type SharedRoutePayloadV1 } from "./shared-route";

export interface ScenicShareOptions {
  title: string;
  text: string;
  url: string;
}

export type ScenicShareResult =
  { status: "shared" | "copied" | "cancelled" } | { status: "manual"; url: string };

export interface ScenicShareProvider {
  share(options: ScenicShareOptions): Promise<ScenicShareResult>;
}

interface WebShareBoundary {
  share?: (options: ShareData) => Promise<void>;
  clipboard?: { writeText(value: string): Promise<void> };
}

type NativeSharePlugin = Pick<SharePlugin, "canShare" | "share">;

function cancelled(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /cancel(?:led|ed)?/i.test(message);
}

export function createWebShareProvider(boundary: WebShareBoundary): ScenicShareProvider {
  return {
    async share(options) {
      if (boundary.share) {
        try {
          await boundary.share(options);
          return { status: "shared" };
        } catch (error) {
          if (cancelled(error)) return { status: "cancelled" };
        }
      }
      if (boundary.clipboard?.writeText) {
        try {
          await boundary.clipboard.writeText(options.url);
          return { status: "copied" };
        } catch {
          // Manual copy remains the final web fallback.
        }
      }
      return { status: "manual", url: options.url };
    },
  };
}

export function createNativeShareProvider(
  plugin: NativeSharePlugin,
  isAvailable: () => boolean,
): ScenicShareProvider {
  return {
    async share(options) {
      try {
        if (!isAvailable() || !(await plugin.canShare()).value) {
          return { status: "manual", url: options.url };
        }
        await plugin.share({ ...options, dialogTitle: "Share Scenic Route" });
        return { status: "shared" };
      } catch (error) {
        if (cancelled(error)) return { status: "cancelled" };
        return { status: "manual", url: options.url };
      }
    },
  };
}

export function selectShareProvider(
  runtime: AppRuntime,
  webProvider: ScenicShareProvider,
  nativeProvider: ScenicShareProvider,
) {
  return runtime === "web" ? webProvider : nativeProvider;
}

export function buildCanonicalSharedRouteUrl(args: {
  payload: SharedRoutePayloadV1;
  runtime: AppRuntime;
  configuredPublicOrigin: unknown;
  currentLocation: Pick<Location, "origin" | "pathname">;
}) {
  const origin = resolveScenicPublicWebOrigin(
    args.runtime,
    args.configuredPublicOrigin,
    args.currentLocation.origin,
  );
  const hasConfiguredOrigin =
    typeof args.configuredPublicOrigin === "string" && args.configuredPublicOrigin.trim() !== "";
  const pathname = hasConfiguredOrigin ? "/" : args.currentLocation.pathname;
  return buildSharedRouteUrl(args.payload, { origin, pathname });
}

export function buildCurrentCanonicalSharedRouteUrl(
  payload: SharedRoutePayloadV1,
  currentLocation: Pick<Location, "origin" | "pathname"> = window.location,
) {
  return buildCanonicalSharedRouteUrl({
    payload,
    runtime: getAppRuntime(),
    configuredPublicOrigin: import.meta.env["VITE_SCENIC_PUBLIC_WEB_ORIGIN"],
    currentLocation,
  });
}

const webBoundary: WebShareBoundary =
  typeof navigator === "undefined"
    ? {}
    : {
        ...(navigator.share ? { share: navigator.share.bind(navigator) } : {}),
        ...(navigator.clipboard ? { clipboard: navigator.clipboard } : {}),
      };

export const scenicShareProvider = selectShareProvider(
  getAppRuntime(),
  createWebShareProvider(webBoundary),
  createNativeShareProvider(Share, () => Capacitor.isPluginAvailable("Share")),
);
