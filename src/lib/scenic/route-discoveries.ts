import type { InterestId, Poi, RouteReasonLine } from "./types";

/** Builds qualitative route reasons solely from the discoveries shown to the user. */
export function routeReasonsForPois(pois: Poi[]): RouteReasonLine[] {
  const buckets: { label: string; singular: string; test: (poi: Poi) => boolean }[] = [
    {
      label: "historic covered passages",
      singular: "historic covered passage",
      test: (poi) => poi.category === "Historic Passage",
    },
    {
      label: "gardens",
      singular: "garden",
      test: (poi) => poi.category === "Garden" || poi.category === "Riverside Garden",
    },
    {
      label: "historic streets, squares & courtyards",
      singular: "historic street, square or courtyard",
      test: (poi) =>
        poi.category === "Historic Street" ||
        poi.category === "Square" ||
        poi.category === "Courtyards",
    },
    {
      label: "churches",
      singular: "church",
      test: (poi) => poi.category === "Church",
    },
    {
      label: "riverside stretches",
      singular: "riverside stretch",
      test: (poi) =>
        poi.category === "Riverside" ||
        poi.category === "Island" ||
        poi.category === "Bridge" ||
        poi.category === "Canal",
    },
    {
      label: "food streets & markets",
      singular: "food street",
      test: (poi) => poi.category === "Market Street" || poi.category === "Covered Market",
    },
    {
      label: "hidden courtyards & finds",
      singular: "hidden find",
      test: (poi) => poi.scores.hidden >= 9,
    },
  ];
  const seen = new Set<string>();
  const lines: RouteReasonLine[] = [];
  for (const bucket of buckets) {
    const matched = pois.filter((poi) => bucket.test(poi) && !seen.has(poi.id));
    if (matched.length === 0) continue;
    matched.forEach((poi) => seen.add(poi.id));
    lines.push({
      count: matched.length,
      label: matched.length === 1 ? bucket.singular : bucket.label,
    });
  }
  return lines;
}

/** Preserves preference order and only reports direct tags on displayed POIs. */
export function matchedInterestsForPois(pois: Poi[], interests: InterestId[]): InterestId[] {
  return interests.filter((interest) => pois.some((poi) => poi.interests.includes(interest)));
}
