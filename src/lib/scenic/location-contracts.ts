export interface LocationMeasurement {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  timestamp: number;
}

export interface ScenicLocationOptions {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}

export interface LocationWatchHandle {
  readonly id: string | number;
}

export type ScenicLocationErrorCode =
  | "unsupported"
  | "insecure-context"
  | "permission-denied"
  | "position-unavailable"
  | "timeout"
  | "unexpected";

export class ScenicLocationError extends Error {
  constructor(public readonly code: ScenicLocationErrorCode) {
    super(code);
    this.name = "ScenicLocationError";
  }
}

export interface ScenicLocationProvider {
  getCurrentPosition(options: ScenicLocationOptions): Promise<LocationMeasurement>;
  watchPosition(
    options: ScenicLocationOptions,
    onMeasurement: (measurement: LocationMeasurement) => void,
    onError: (error: ScenicLocationError) => void,
  ): Promise<LocationWatchHandle>;
  clearWatch(handle: LocationWatchHandle): Promise<void>;
}
