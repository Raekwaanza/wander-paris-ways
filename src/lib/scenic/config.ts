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
  providerMode: normalizeScenicProviderMode(import.meta.env?.VITE_SCENIC_DATA_MODE),
} as const;
