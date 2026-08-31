import { describe, expect, it } from "vitest";
import {
  deriveLearnedPreferenceSnapshot,
  learnedPreferenceSignature,
  validateLearnedPreferenceSnapshot,
} from "./preference-learning";
import { makeFeedback } from "./test-fixtures";

describe("preference learning", () => {
  it("produces empty affinities without feedback", () => {
    expect(deriveLearnedPreferenceSnapshot([])).toEqual({
      version: 1,
      interestAffinities: {},
      sourceFeedbackCount: 0,
    });
  });

  it("learns positive historic affinity and saturates repeated signals at one", () => {
    const one = deriveLearnedPreferenceSnapshot([makeFeedback({ aspects: ["history"] })]);
    expect(one.interestAffinities.historic).toBeGreaterThan(0);
    const repeated = deriveLearnedPreferenceSnapshot(
      Array.from({ length: 10 }, (_, index) =>
        makeFeedback({ id: String(index), updatedAt: index + 1, aspects: ["history"] }),
      ),
    );
    expect(repeated.interestAffinities.historic).toBe(1);
  });

  it("does not create negative learning for not-for-me feedback", () => {
    expect(
      deriveLearnedPreferenceSnapshot([makeFeedback({ rating: "not-for-me" })]).interestAffinities,
    ).toEqual({});
    expect(
      deriveLearnedPreferenceSnapshot([
        makeFeedback({ rating: "not-for-me", aspects: ["architecture"] }),
      ]).interestAffinities.architecture,
    ).toBeGreaterThan(0);
  });

  it("does not learn selected interests alone or force-map beautiful streets", () => {
    expect(
      deriveLearnedPreferenceSnapshot([makeFeedback({ selectedInterests: ["parks"] })])
        .interestAffinities,
    ).toEqual({});
    expect(
      deriveLearnedPreferenceSnapshot([makeFeedback({ aspects: ["beautiful-streets"] })])
        .interestAffinities,
    ).toEqual({});
  });

  it("does not treat navigation rating or comment as preference signals", () => {
    expect(
      deriveLearnedPreferenceSnapshot([
        makeFeedback({ navigationRating: "difficult", comment: "The crossing was confusing." }),
      ]).interestAffinities,
    ).toEqual({});
  });

  it("maps food/cafes and courtyards/passages to their intentional signals", () => {
    const food = deriveLearnedPreferenceSnapshot([makeFeedback({ aspects: ["food-cafes"] })]);
    expect(food.interestAffinities.food).toBeGreaterThan(0);
    expect(food.interestAffinities.cafes).toBeGreaterThan(0);
    const courtyard = deriveLearnedPreferenceSnapshot([
      makeFeedback({ aspects: ["courtyards-passages"] }),
    ]);
    expect(courtyard.interestAffinities.quiet).toBeGreaterThan(
      courtyard.interestAffinities.hidden!,
    );
  });

  it("uses only the newest twenty records and is input-order deterministic", () => {
    const records = Array.from({ length: 21 }, (_, index) =>
      makeFeedback({
        id: String(index),
        updatedAt: index + 1,
        aspects: index === 0 ? ["history"] : [],
      }),
    );
    expect(deriveLearnedPreferenceSnapshot(records).interestAffinities.historic).toBeUndefined();
    expect(deriveLearnedPreferenceSnapshot(records)).toEqual(
      deriveLearnedPreferenceSnapshot([...records].reverse()),
    );
  });

  it("validates bounded known affinities and canonicalizes signatures", () => {
    expect(
      validateLearnedPreferenceSnapshot({
        version: 1,
        interestAffinities: { historic: 1.1 },
        sourceFeedbackCount: 1,
      }),
    ).toBeUndefined();
    expect(
      validateLearnedPreferenceSnapshot({
        version: 1,
        interestAffinities: { unknown: 0.5 },
        sourceFeedbackCount: 1,
      }),
    ).toBeUndefined();
    expect(
      learnedPreferenceSignature({
        version: 1,
        interestAffinities: { historic: 0.5, parks: 0.2 },
        sourceFeedbackCount: 2,
      }),
    ).toBe(
      learnedPreferenceSignature({
        version: 1,
        interestAffinities: { parks: 0.2, historic: 0.5 },
        sourceFeedbackCount: 2,
      }),
    );
  });
});
