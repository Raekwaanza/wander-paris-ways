import type {
  InterestId,
  RouteFeedback,
  RouteFeedbackAspectId,
  RouteFeedbackRating,
  RouteProfile,
} from "./types";

export const MAX_ROUTE_FEEDBACK_ENTRIES = 100;

export const ROUTE_FEEDBACK_RATINGS: ReadonlyArray<{
  id: RouteFeedbackRating;
  label: string;
}> = [
  { id: "loved", label: "Loved it" },
  { id: "okay", label: "It was okay" },
  { id: "not-for-me", label: "Not for me" },
];

export const ROUTE_FEEDBACK_ASPECTS: ReadonlyArray<{
  id: RouteFeedbackAspectId;
  label: string;
}> = [
  { id: "beautiful-streets", label: "Beautiful streets" },
  { id: "hidden-places", label: "Hidden places" },
  { id: "history", label: "History" },
  { id: "architecture", label: "Architecture" },
  { id: "courtyards-passages", label: "Courtyards & passages" },
  { id: "food-cafes", label: "Food & cafés" },
];

const RATINGS = new Set<RouteFeedbackRating>(ROUTE_FEEDBACK_RATINGS.map(({ id }) => id));
const ASPECTS = new Set<RouteFeedbackAspectId>(ROUTE_FEEDBACK_ASPECTS.map(({ id }) => id));
const PROFILES = new Set<RouteProfile>(["fastest", "scenic", "explorer"]);
const INTERESTS = new Set<InterestId>([
  "architecture",
  "historic",
  "hidden",
  "parks",
  "cafes",
  "bookshops",
  "art",
  "food",
  "romantic",
  "quiet",
  "local",
  "iconic",
]);

export function routeFeedbackId(tripCreatedAt: number, routeId: string) {
  return `${tripCreatedAt}:${routeId}`;
}

export function validateRouteFeedback(value: unknown): RouteFeedback | null {
  if (!isRecord(value)) return null;
  const {
    id,
    routeId,
    tripCreatedAt,
    mode,
    profile,
    routingSource,
    rating,
    aspects,
    selectedInterests,
    matchedInterests,
    discoveryPoiIds,
    extraMinutes,
    completionKind,
    createdAt,
    updatedAt,
  } = value;
  if (
    !usableText(id) ||
    !usableText(routeId) ||
    !finite(tripCreatedAt) ||
    (mode !== "route" && mode !== "wander") ||
    !PROFILES.has(profile as RouteProfile) ||
    routingSource !== "openrouteservice" ||
    !RATINGS.has(rating as RouteFeedbackRating) ||
    !validUniqueArray(aspects, (item) => ASPECTS.has(item as RouteFeedbackAspectId)) ||
    !validUniqueArray(selectedInterests, (item) => INTERESTS.has(item as InterestId)) ||
    !validUniqueArray(matchedInterests, (item) => INTERESTS.has(item as InterestId)) ||
    !validUniqueArray(discoveryPoiIds, usableText) ||
    !finite(extraMinutes) ||
    extraMinutes < 0 ||
    (completionKind !== "automatic-arrival" && completionKind !== "manual-end") ||
    !positive(createdAt) ||
    !positive(updatedAt)
  ) {
    return null;
  }
  return {
    id,
    routeId,
    tripCreatedAt,
    mode,
    profile: profile as RouteProfile,
    routingSource,
    rating: rating as RouteFeedbackRating,
    aspects: aspects as RouteFeedbackAspectId[],
    selectedInterests: selectedInterests as InterestId[],
    matchedInterests: matchedInterests as InterestId[],
    discoveryPoiIds: discoveryPoiIds as string[],
    extraMinutes,
    completionKind,
    createdAt,
    updatedAt,
  };
}

function validUniqueArray(value: unknown, valid: (item: unknown) => boolean): value is unknown[] {
  return Array.isArray(value) && value.every(valid) && new Set(value).size === value.length;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function positive(value: unknown): value is number {
  return finite(value) && value > 0;
}

function usableText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
