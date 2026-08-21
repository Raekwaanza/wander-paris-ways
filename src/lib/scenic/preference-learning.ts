import { INTEREST_IDS } from "./interests";
import type {
  InterestId,
  LearnedPreferenceSnapshot,
  Poi,
  RouteFeedback,
  RouteFeedbackAspectId,
} from "./types";

export const PREFERENCE_LEARNING_V1 = {
  maxFeedbackEntries: 20,
  signalsToSaturate: 3,
  maxSourceFeedbackCount: 100,
  aspectSignalByRating: { loved: 1, okay: 0.75, "not-for-me": 0.5 },
  matchedInterestSignalByRating: { loved: 0.25, okay: 0.1, "not-for-me": 0 },
  aspectInterestSignals: {
    "beautiful-streets": {}, // No honest InterestId equivalent exists in v1.
    "hidden-places": { hidden: 1 },
    history: { historic: 1 },
    architecture: { architecture: 1 },
    "courtyards-passages": { quiet: 1, hidden: 0.25 },
    "food-cafes": { food: 0.75, cafes: 0.75 },
  } satisfies Record<RouteFeedbackAspectId, Partial<Record<InterestId, number>>>,
} as const;

export function deriveLearnedPreferenceSnapshot(
  feedback: readonly RouteFeedback[],
): LearnedPreferenceSnapshot {
  const recent = [...feedback]
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id))
    .slice(0, PREFERENCE_LEARNING_V1.maxFeedbackEntries);
  const raw: Partial<Record<InterestId, number>> = {};
  const add = (interest: InterestId, signal: number) => {
    raw[interest] = (raw[interest] ?? 0) + signal;
  };
  for (const record of recent) {
    const aspectStrength = PREFERENCE_LEARNING_V1.aspectSignalByRating[record.rating];
    for (const aspect of record.aspects) {
      const mapping = PREFERENCE_LEARNING_V1.aspectInterestSignals[aspect];
      for (const interest of INTEREST_IDS) {
        const signal = mapping[interest as keyof typeof mapping];
        if (signal) add(interest, signal * aspectStrength);
      }
    }
    const matchedStrength = PREFERENCE_LEARNING_V1.matchedInterestSignalByRating[record.rating];
    if (matchedStrength) {
      record.matchedInterests.forEach((interest) => add(interest, matchedStrength));
    }
  }
  const interestAffinities: Partial<Record<InterestId, number>> = {};
  for (const interest of INTEREST_IDS) {
    const signal = raw[interest] ?? 0;
    if (signal > 0) {
      interestAffinities[interest] = Math.min(1, signal / PREFERENCE_LEARNING_V1.signalsToSaturate);
    }
  }
  return { version: 1, interestAffinities, sourceFeedbackCount: recent.length };
}

export function learnedAffinityForInterest(
  interest: InterestId,
  snapshot?: LearnedPreferenceSnapshot,
) {
  return snapshot?.interestAffinities[interest] ?? 0;
}

export function learnedAffinityForPoi(poi: Poi, snapshot?: LearnedPreferenceSnapshot) {
  return poi.interests.reduce(
    (maximum, interest) => Math.max(maximum, learnedAffinityForInterest(interest, snapshot)),
    0,
  );
}

export function learnedPreferenceSignature(snapshot?: LearnedPreferenceSnapshot) {
  if (!snapshot) return "";
  return INTEREST_IDS.map((interest) => {
    const affinity = snapshot.interestAffinities[interest];
    return affinity === undefined ? "" : `${interest}:${affinity}`;
  })
    .filter(Boolean)
    .join("|");
}

export function validateLearnedPreferenceSnapshot(
  value: unknown,
): LearnedPreferenceSnapshot | undefined {
  if (!isRecord(value) || value["version"] !== 1 || !isPlainRecord(value["interestAffinities"]))
    return;
  if (
    typeof value["sourceFeedbackCount"] !== "number" ||
    !Number.isInteger(value["sourceFeedbackCount"]) ||
    value["sourceFeedbackCount"] < 0 ||
    value["sourceFeedbackCount"] > PREFERENCE_LEARNING_V1.maxSourceFeedbackCount
  ) {
    return;
  }
  const validInterests = new Set<string>(INTEREST_IDS);
  const affinities: Partial<Record<InterestId, number>> = {};
  for (const [key, affinity] of Object.entries(value["interestAffinities"])) {
    if (
      !validInterests.has(key) ||
      typeof affinity !== "number" ||
      !Number.isFinite(affinity) ||
      affinity < 0 ||
      affinity > 1
    ) {
      return;
    }
    if (affinity > 0) affinities[key as InterestId] = affinity;
  }
  return {
    version: 1,
    interestAffinities: affinities,
    sourceFeedbackCount: value["sourceFeedbackCount"],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
