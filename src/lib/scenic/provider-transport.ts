import { getAppRuntime, getScenicApiBaseUrl, type AppRuntime } from "../platform-runtime";
import { createNativeScenicProviderTransport } from "./native-provider-transport";
import type { ScenicProviderTransport } from "./provider-contracts";
import { webScenicProviderTransport } from "./web-provider-transport";

export function selectScenicProviderTransport(
  runtime: AppRuntime,
  webTransport: ScenicProviderTransport,
  nativeTransport: ScenicProviderTransport,
): ScenicProviderTransport {
  return runtime === "web" ? webTransport : nativeTransport;
}

function configuredNativeBaseUrl(): string | null {
  try {
    return getScenicApiBaseUrl();
  } catch {
    return null;
  }
}

export const scenicProviderTransport = selectScenicProviderTransport(
  getAppRuntime(),
  webScenicProviderTransport,
  createNativeScenicProviderTransport(configuredNativeBaseUrl()),
);
