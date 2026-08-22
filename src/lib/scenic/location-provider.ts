import { getAppRuntime, type AppRuntime } from "../platform-runtime";
import type { ScenicLocationProvider } from "./location-contracts";
import { nativeLocationProvider } from "./native-location-provider";
import { webLocationProvider } from "./web-location-provider";

export function selectLocationProvider(
  runtime: AppRuntime,
  webProvider: ScenicLocationProvider,
  nativeProvider: ScenicLocationProvider,
) {
  return runtime === "web" ? webProvider : nativeProvider;
}

export const scenicLocationProvider = selectLocationProvider(
  getAppRuntime(),
  webLocationProvider,
  nativeLocationProvider,
);
