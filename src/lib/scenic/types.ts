export type InterestId =
  | "architecture"
  | "historic"
  | "hidden"
  | "parks"
  | "cafes"
  | "bookshops"
  | "art"
  | "food"
  | "romantic"
  | "quiet"
  | "local"
  | "iconic";

export interface Interest {
  id: InterestId;
  label: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Poi extends LatLng {
  id: string;
  name: string;
  category: string;
  kicker: string;
  description: string;
  detail: string;
  scores: {
    scenic: number;
    hidden: number;
    historic: number;
    architecture: number;
    nature: number;
    food: number;
    popularity: number;
  };
  interests: InterestId[];
  visitMinutes: number;
  arrondissement: number;
  neighborhood: string;
}

export interface Place extends LatLng {
  id: string;
  name: string;
  kind: string;
  area: string;
}

export type RouteProfile = "fastest" | "scenic" | "explorer";

export interface RouteReasonLine {
  count: number;
  label: string;
}

export interface ScenicRoute {
  id: string;
  profile: RouteProfile;
  title: string;
  blurb: string;
  minutes: number;
  km: number;
  extraMinutes: number;
  discoveries: Poi[];
  path: LatLng[];
  matchPercent: number;
  matchedInterests: InterestId[];
  score: number;
  reasons: RouteReasonLine[];
  majorRoadReduction: number;
}

export interface TripPlan {
  fromId: string;
  toId: string;
  interests: InterestId[];
  detourCap: number;
  mode: "route" | "wander";
  wanderMinutes?: number;
  createdAt: number;
}

export interface SavedRoute {
  id: string;
  fromName: string;
  toName: string;
  profile: RouteProfile;
  minutes: number;
  km: number;
  discoveries: number;
  tags: string[];
  savedAt: number;
}

export interface Preferences {
  interests: InterestId[];
  detourCap: number;
  pace: "strolling" | "steady" | "brisk";
  units: "km" | "mi";
  seenIntro: boolean;
}
