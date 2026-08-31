import type { LatLng, Place, RouteInstruction } from "./types";

export interface PedestrianRoutingInput {
  from: LatLng;
  to: LatLng;
}

export interface ViaRoutingInput {
  points: LatLng[];
}

export interface PedestrianRouteResult {
  providerRank: number;
  path: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  instructions?: RouteInstruction[];
  /** Geometric distance from the requested point, not ORS Snap API distance. */
  startOffsetMeters?: number;
  /** Geometric distance from the requested point, not ORS Snap API distance. */
  endOffsetMeters?: number;
  attribution?: string;
}

export type PedestrianRouteResponse =
  { status: "success"; candidates: PedestrianRouteResult[] } | { status: "unavailable" };

export interface WalkingMatrixInput {
  locations: LatLng[];
}

export interface WalkingDurationMatrix {
  durationsSeconds: Array<Array<number | null>>;
}

export type WalkingMatrixResponse =
  ({ status: "success" } & WalkingDurationMatrix) | { status: "unavailable" };

export interface ForwardGeocodeInput {
  query: string;
  proximity?: LatLng;
}

export interface ForwardGeocodeResult {
  status: "success" | "unavailable";
  places: Place[];
  attribution?: string;
}

export type ReverseGeocodeInput = LatLng;

export interface ReverseGeocodeResult {
  label: string;
  fullLabel?: string;
  featureId?: string;
  attribution?: string;
}

export interface ScenicProviderTransport {
  route(input: PedestrianRoutingInput): Promise<PedestrianRouteResponse>;
  routeVia(input: ViaRoutingInput): Promise<PedestrianRouteResponse>;
  matrix(input: WalkingMatrixInput): Promise<WalkingMatrixResponse>;
  forwardGeocode(input: ForwardGeocodeInput): Promise<ForwardGeocodeResult>;
  reverseGeocode(input: ReverseGeocodeInput): Promise<ReverseGeocodeResult | null>;
}
