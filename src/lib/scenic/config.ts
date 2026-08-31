export const DEFAULT_SCENIC_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export type ScenicProviderMode = "mock" | "live";

export function normalizeScenicProviderMode(value: unknown): ScenicProviderMode {
  return value === "live" || value === "mock" ? value : "mock";
}

/** Returns a safe public policy URL, or null when optional config is absent/invalid. */
export function normalizeScenicPrivacyPolicyUrl(value: unknown): string | null {
  const configured = typeof value === "string" ? value.trim() : "";
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Public, non-sensitive runtime configuration used to choose Scenic providers.
 * Future provider credentials must remain server-side rather than being added
 * to this Vite-exposed configuration.
 */
export const scenicConfig = {
  providerMode: normalizeScenicProviderMode(import.meta.env?.["VITE_SCENIC_DATA_MODE"]),
  mapStyleUrl:
    import.meta.env?.["VITE_SCENIC_MAP_STYLE_URL"]?.trim() || DEFAULT_SCENIC_MAP_STYLE_URL,
  privacyPolicyUrl: normalizeScenicPrivacyPolicyUrl(
    import.meta.env?.["VITE_SCENIC_PRIVACY_POLICY_URL"],
  ),
} as const;
