import { Capacitor } from "@capacitor/core";

export type AppRuntime = "web" | "ios" | "android";

/** The single runtime boundary for code that must choose a native adapter. */
export function getAppRuntime(): AppRuntime {
  if (!Capacitor.isNativePlatform()) return "web";
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android" ? platform : "web";
}

export function isNativeRuntime(): boolean {
  return getAppRuntime() !== "web";
}

/**
 * Public backend origin for native HTTPS API routes. Provider keys must
 * never be placed in this or any other VITE_* variable.
 */
export function getScenicApiBaseUrl(): string | null {
  return normalizeScenicApiBaseUrl(import.meta.env["VITE_SCENIC_API_BASE_URL"]);
}

export function normalizeScenicApiBaseUrl(value: unknown): string | null {
  const configured = typeof value === "string" ? value.trim() : "";
  if (!configured) return null;
  const url = new URL(configured);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("VITE_SCENIC_API_BASE_URL must be an HTTPS origin");
  }
  return url.origin;
}

/** Public browser origin used for links shared outside the local Capacitor WebView. */
export function getScenicPublicWebOrigin(): string | null {
  return normalizeScenicPublicWebOrigin(import.meta.env["VITE_SCENIC_PUBLIC_WEB_ORIGIN"]);
}

export function normalizeScenicPublicWebOrigin(value: unknown): string | null {
  const configured = typeof value === "string" ? value.trim() : "";
  if (!configured) return null;
  const url = new URL(configured);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("VITE_SCENIC_PUBLIC_WEB_ORIGIN must be an HTTPS origin");
  }
  return url.origin;
}

export function resolveScenicPublicWebOrigin(
  runtime: AppRuntime,
  configured: unknown,
  currentWebOrigin: string,
): string {
  const publicOrigin = normalizeScenicPublicWebOrigin(configured);
  if (publicOrigin) return publicOrigin;
  if (runtime === "web") return new URL(currentWebOrigin).origin;
  throw new Error("Native sharing requires VITE_SCENIC_PUBLIC_WEB_ORIGIN");
}
