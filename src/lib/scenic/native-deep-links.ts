import { App } from "@capacitor/app";
import type { AppLaunchUrl, URLOpenListenerEvent } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { decodeSharedRoutePayload } from "./shared-route";

export const SCENIC_CUSTOM_SCHEME = "scenicroute:";
export const SCENIC_SHARED_HOST = "shared";

export interface ScenicRouteLink {
  path: "/shared";
  token: string;
}

interface NativeAppLinkPlugin {
  getLaunchUrl(): Promise<AppLaunchUrl | undefined>;
  addListener(
    eventName: "appUrlOpen",
    listener: (event: URLOpenListenerEvent) => void,
  ): Promise<PluginListenerHandle>;
}

function routeToken(url: URL) {
  if (url.search) return null;
  const fragment = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  if (fragment.getAll("r").length !== 1 || [...fragment.keys()].some((key) => key !== "r")) {
    return null;
  }
  const token = fragment.get("r") ?? "";
  return decodeSharedRoutePayload(token) ? token : null;
}

export function parseScenicRouteLink(
  rawUrl: string,
  publicWebOrigin: string,
): ScenicRouteLink | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const custom =
    url.protocol === SCENIC_CUSTOM_SCHEME &&
    url.hostname === SCENIC_SHARED_HOST &&
    (url.pathname === "" || url.pathname === "/") &&
    !url.username &&
    !url.password &&
    !url.port;
  const canonicalHttps =
    url.protocol === "https:" &&
    url.origin === publicWebOrigin &&
    url.pathname === "/shared" &&
    !url.username &&
    !url.password;
  if (!custom && !canonicalHttps) return null;
  const token = routeToken(url);
  return token ? { path: "/shared", token } : null;
}

export interface NativeDeepLinkSubscription {
  ready: Promise<void>;
  dispose(): Promise<void>;
}

export function startNativeDeepLinkHandling(args: {
  publicWebOrigin: string;
  onLink(link: ScenicRouteLink): void;
  plugin?: NativeAppLinkPlugin;
}): NativeDeepLinkSubscription {
  const plugin = args.plugin ?? App;
  let disposed = false;
  const handled = new Set<string>();
  const process = (url: string) => {
    if (disposed || handled.has(url)) return;
    const link = parseScenicRouteLink(url, args.publicWebOrigin);
    if (!link) return;
    handled.add(url);
    args.onLink(link);
  };
  const listener = plugin.addListener("appUrlOpen", ({ url }) => process(url));
  const launch = plugin
    .getLaunchUrl()
    .then((result) => result?.url && process(result.url))
    .catch(() => undefined);
  return {
    ready: Promise.all([listener, launch]).then(() => undefined),
    async dispose() {
      disposed = true;
      try {
        await (await listener).remove();
      } catch {
        // Listener teardown is best-effort during WebView destruction.
      }
    },
  };
}
