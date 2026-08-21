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
 * Public backend origin for future native HTTPS API routes. Provider keys must
 * never be placed in this or any other VITE_* variable.
 */
export function getScenicApiBaseUrl(): string | null {
  const configured = import.meta.env.VITE_SCENIC_API_BASE_URL?.trim();
  if (!configured) return null;
  const url = new URL(configured);
  if (url.protocol !== "https:") throw new Error("VITE_SCENIC_API_BASE_URL must use HTTPS");
  return url.origin;
}
