export const DEFAULT_SCENIC_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export type ScenicProviderMode = "mock" | "live";

export function normalizeScenicProviderMode(value: unknown): ScenicProviderMode {
  return value === "live" || value === "mock" ? value : "mock";
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
} as const;
