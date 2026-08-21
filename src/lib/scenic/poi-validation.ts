import { INTEREST_IDS } from "./interests";
import { isInParisMvpBounds } from "./paris-bounds";
import { isPoiCategory } from "./poi-categories";
import type { Poi, PoiEditorialScores } from "./types";

export interface PoiValidationIssue {
  poiId?: string;
  field?: string;
  message: string;
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_TEXT_FIELDS = [
  "id",
  "name",
  "category",
  "kicker",
  "description",
  "detail",
  "neighborhood",
] as const;
const SCORE_FIELDS: readonly (keyof PoiEditorialScores)[] = [
  "scenic",
  "hidden",
  "historic",
  "architecture",
  "nature",
  "food",
  "popularity",
];

/** Pure structural validation for the bundled, editorially curated POI dataset. */
export function validatePoiDataset(pois: readonly Poi[]): PoiValidationIssue[] {
  const issues: PoiValidationIssue[] = [];
  const ids = new Set<string>();
  const coveredInterests = new Set<string>();
  const add = (poiId: string | undefined, field: string, message: string) =>
    issues.push(poiId === undefined ? { field, message } : { poiId, field, message });

  for (const poi of pois) {
    const poiId = typeof poi.id === "string" && poi.id ? poi.id : undefined;
    for (const field of REQUIRED_TEXT_FIELDS) {
      if (typeof poi[field] !== "string" || poi[field].trim() === "") {
        add(poiId, field, "must be a non-empty string");
      }
    }
    if (typeof poi.id === "string") {
      if (!ID_PATTERN.test(poi.id)) add(poiId, "id", `must match ${ID_PATTERN}`);
      if (ids.has(poi.id)) add(poiId, "id", `duplicate POI ID "${poi.id}"`);
      ids.add(poi.id);
    }
    if (!isPoiCategory(poi.category)) add(poiId, "category", "is not a canonical category");

    if (!Number.isFinite(poi.lat) || poi.lat < -90 || poi.lat > 90) {
      add(poiId, "lat", "must be a finite latitude between -90 and 90");
    }
    if (!Number.isFinite(poi.lng) || poi.lng < -180 || poi.lng > 180) {
      add(poiId, "lng", "must be a finite longitude between -180 and 180");
    }
    if (
      Number.isFinite(poi.lat) &&
      Number.isFinite(poi.lng) &&
      !isInParisMvpBounds(poi.lat, poi.lng)
    ) {
      add(poiId, "coordinates", "must fall inside the Paris MVP bounds");
    }
    if (
      !Number.isInteger(poi.arrondissement) ||
      poi.arrondissement < 1 ||
      poi.arrondissement > 20
    ) {
      add(poiId, "arrondissement", "must be an integer from 1 through 20");
    }

    for (const field of SCORE_FIELDS) {
      const score = poi.scores?.[field];
      if (!Number.isInteger(score) || score < 0 || score > 10) {
        add(poiId, `scores.${field}`, "must be an integer from 0 through 10");
      }
    }

    if (!Array.isArray(poi.interests) || poi.interests.length === 0) {
      add(poiId, "interests", "must contain at least one interest");
    } else {
      const seen = new Set<string>();
      for (const interest of poi.interests as readonly string[]) {
        if (!INTEREST_IDS.includes(interest as never)) {
          add(poiId, "interests", `contains unknown interest "${interest}"`);
        }
        if (seen.has(interest))
          add(poiId, "interests", `contains duplicate interest "${interest}"`);
        seen.add(interest);
        coveredInterests.add(interest);
      }
    }

    if (!Number.isFinite(poi.visitMinutes) || poi.visitMinutes <= 0 || poi.visitMinutes > 180) {
      add(poiId, "visitMinutes", "must be a finite number greater than 0 and at most 180");
    }
  }

  for (const interest of INTEREST_IDS) {
    if (!coveredInterests.has(interest)) {
      add(undefined, "interests", `selectable interest "${interest}" has no POI coverage`);
    }
  }
  return issues;
}

/** Fail fast once when invalid bundled content is imported. */
export function assertValidPoiDataset(pois: readonly Poi[]): void {
  const issues = validatePoiDataset(pois);
  if (issues.length === 0) return;
  const details = issues
    .map(
      ({ poiId, field, message }) => `${poiId ?? "dataset"}${field ? `.${field}` : ""}: ${message}`,
    )
    .join("\n");
  throw new Error(`Invalid Scenic Route POI dataset:\n${details}`);
}
