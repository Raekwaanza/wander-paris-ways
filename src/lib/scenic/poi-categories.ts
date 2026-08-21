/** User-facing category labels supported by the curated Paris dataset. */
export const POI_CATEGORIES = [
  "Palace & Courtyard",
  "Garden",
  "Historic Passage",
  "Market Street",
  "Church",
  "Square",
  "Mansion",
  "Covered Market",
  "Museum",
  "Historic Street",
  "Courtyards",
  "Island",
  "Riverside Garden",
  "Bookshop",
  "Roman Ruin",
  "Canal",
  "Bridge",
  "Fountain",
  "Riverside",
] as const;

export type PoiCategory = (typeof POI_CATEGORIES)[number];

export function isPoiCategory(value: unknown): value is PoiCategory {
  return typeof value === "string" && (POI_CATEGORIES as readonly string[]).includes(value);
}
