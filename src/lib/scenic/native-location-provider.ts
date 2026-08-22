import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import type { GeolocationPlugin, PermissionStatus, Position } from "@capacitor/geolocation";
import type {
  LocationMeasurement,
  ScenicLocationOptions,
  ScenicLocationProvider,
} from "./location-contracts";
import { ScenicLocationError } from "./location-contracts";

type NativeGeolocationPlugin = Pick<
  GeolocationPlugin,
  "checkPermissions" | "requestPermissions" | "getCurrentPosition" | "watchPosition" | "clearWatch"
>;

function permissionGranted(status: PermissionStatus) {
  return status.location === "granted" || status.coarseLocation === "granted";
}

function permissionRequestable(status: PermissionStatus) {
  return (
    status.location === "prompt" ||
    status.location === "prompt-with-rationale" ||
    status.coarseLocation === "prompt" ||
    status.coarseLocation === "prompt-with-rationale"
  );
}

export function normalizeNativeLocation(position: Position): LocationMeasurement {
  const accuracy = position.coords.accuracy;
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: Number.isFinite(accuracy) ? accuracy : null,
    timestamp: position.timestamp,
  };
}

export function normalizeNativeLocationError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  if (code === "OS-PLUG-GLOC-0003" || code === "OS-PLUG-GLOC-0008") {
    return new ScenicLocationError("permission-denied");
  }
  if (code === "OS-PLUG-GLOC-0010") return new ScenicLocationError("timeout");
  if (
    code === "OS-PLUG-GLOC-0002" ||
    code === "OS-PLUG-GLOC-0007" ||
    code === "OS-PLUG-GLOC-0009" ||
    code === "OS-PLUG-GLOC-0014" ||
    code === "OS-PLUG-GLOC-0015" ||
    code === "OS-PLUG-GLOC-0016" ||
    code === "OS-PLUG-GLOC-0017"
  ) {
    return new ScenicLocationError("position-unavailable");
  }
  return new ScenicLocationError("unexpected");
}

async function ensureNativePermission(plugin: NativeGeolocationPlugin) {
  let current: PermissionStatus;
  try {
    current = await plugin.checkPermissions();
  } catch (error) {
    throw normalizeNativeLocationError(error);
  }
  if (permissionGranted(current)) return;
  // A denied permission is not requestable again from the app. Avoid repeated prompts;
  // the recovery message directs the user to browser/system settings.
  if (!permissionRequestable(current)) throw new ScenicLocationError("permission-denied");
  try {
    const requested = await plugin.requestPermissions({ permissions: ["location"] });
    if (!permissionGranted(requested)) throw new ScenicLocationError("permission-denied");
  } catch (error) {
    if (error instanceof ScenicLocationError) throw error;
    throw normalizeNativeLocationError(error);
  }
}

export function createNativeLocationProvider(
  plugin: NativeGeolocationPlugin = Geolocation,
  isAvailable: () => boolean = () => Capacitor.isPluginAvailable("Geolocation"),
): ScenicLocationProvider {
  const requirePlugin = () => {
    if (!isAvailable()) throw new ScenicLocationError("unsupported");
  };
  const nativeOptions = (options: ScenicLocationOptions) => ({
    ...options,
    minimumUpdateInterval: options.maximumAge,
    interval: options.maximumAge,
  });

  return {
    async getCurrentPosition(options) {
      requirePlugin();
      await ensureNativePermission(plugin);
      try {
        return normalizeNativeLocation(await plugin.getCurrentPosition(nativeOptions(options)));
      } catch (error) {
        throw normalizeNativeLocationError(error);
      }
    },
    async watchPosition(options, onMeasurement, onError) {
      requirePlugin();
      await ensureNativePermission(plugin);
      try {
        const id = await plugin.watchPosition(nativeOptions(options), (position, error) => {
          if (error) {
            onError(normalizeNativeLocationError(error));
          } else if (position) {
            onMeasurement(normalizeNativeLocation(position));
          }
        });
        return { id };
      } catch (error) {
        throw normalizeNativeLocationError(error);
      }
    },
    async clearWatch(handle) {
      if (typeof handle.id !== "string") return;
      try {
        await plugin.clearWatch({ id: handle.id });
      } catch {
        // Watch cleanup is best-effort and must never crash navigation teardown.
      }
    },
  };
}

export const nativeLocationProvider = createNativeLocationProvider();
