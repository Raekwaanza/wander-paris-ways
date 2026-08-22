import type {
  LocationMeasurement,
  ScenicLocationOptions,
  ScenicLocationProvider,
} from "./location-contracts";
import { ScenicLocationError } from "./location-contracts";

interface WebGeolocationEnvironment {
  geolocation: Geolocation | null;
  secureContext: boolean;
}

type EnvironmentReader = () => WebGeolocationEnvironment;

function defaultEnvironment(): WebGeolocationEnvironment {
  return {
    geolocation:
      typeof navigator !== "undefined" && "geolocation" in navigator ? navigator.geolocation : null,
    secureContext: typeof window !== "undefined" && window.isSecureContext,
  };
}

export function normalizeWebLocation(position: GeolocationPosition): LocationMeasurement {
  const accuracy = position.coords.accuracy;
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: Number.isFinite(accuracy) ? accuracy : null,
    timestamp: position.timestamp,
  };
}

export function normalizeWebLocationError(error: GeolocationPositionError | unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === 1) return new ScenicLocationError("permission-denied");
    if (code === 2) return new ScenicLocationError("position-unavailable");
    if (code === 3) return new ScenicLocationError("timeout");
  }
  return new ScenicLocationError("unexpected");
}

function requireWebGeolocation(readEnvironment: EnvironmentReader) {
  const environment = readEnvironment();
  if (!environment.geolocation) throw new ScenicLocationError("unsupported");
  if (!environment.secureContext) throw new ScenicLocationError("insecure-context");
  return environment.geolocation;
}

export function createWebLocationProvider(
  readEnvironment: EnvironmentReader = defaultEnvironment,
): ScenicLocationProvider {
  return {
    getCurrentPosition(options) {
      return new Promise((resolve, reject) => {
        let geolocation: Geolocation;
        try {
          geolocation = requireWebGeolocation(readEnvironment);
        } catch (error) {
          reject(error);
          return;
        }
        geolocation.getCurrentPosition(
          (position) => resolve(normalizeWebLocation(position)),
          (error) => reject(normalizeWebLocationError(error)),
          options,
        );
      });
    },
    async watchPosition(options, onMeasurement, onError) {
      const geolocation = requireWebGeolocation(readEnvironment);
      const id = geolocation.watchPosition(
        (position) => onMeasurement(normalizeWebLocation(position)),
        (error) => onError(normalizeWebLocationError(error)),
        options,
      );
      return { id };
    },
    async clearWatch(handle) {
      const environment = readEnvironment();
      if (environment.geolocation && typeof handle.id === "number") {
        environment.geolocation.clearWatch(handle.id);
      }
    },
  };
}

export const webLocationProvider = createWebLocationProvider();
