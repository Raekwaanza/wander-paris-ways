import { describe, expect, it } from "vitest";
import {
  MAX_ROUTE_FEEDBACK_COMMENT_LENGTH,
  normalizeRouteFeedbackComment,
  routeFeedbackId,
  validateRouteFeedback,
} from "./route-feedback";
import { makeFeedback } from "./test-fixtures";

describe("route feedback", () => {
  it("creates stable trip-and-route identities", () => {
    expect(routeFeedbackId(10, "route")).toBe(routeFeedbackId(10, "route"));
    expect(routeFeedbackId(10, "route")).not.toBe(routeFeedbackId(11, "route"));
  });

  it.each(["loved", "okay", "not-for-me"] as const)("accepts canonical rating %s", (rating) => {
    expect(validateRouteFeedback(makeFeedback({ rating }))).not.toBeNull();
  });

  it("accepts canonical aspects and rejects unknown or duplicate aspects", () => {
    expect(
      validateRouteFeedback(makeFeedback({ aspects: ["history", "architecture"] })),
    ).not.toBeNull();
    expect(validateRouteFeedback({ ...makeFeedback(), aspects: ["unknown"] })).toBeNull();
    expect(validateRouteFeedback(makeFeedback({ aspects: ["history", "history"] }))).toBeNull();
  });

  it("rejects invalid ratings and timestamps", () => {
    expect(validateRouteFeedback({ ...makeFeedback(), rating: "great" })).toBeNull();
    expect(validateRouteFeedback(makeFeedback({ createdAt: 0 }))).toBeNull();
    expect(validateRouteFeedback(makeFeedback({ updatedAt: Number.NaN }))).toBeNull();
  });

  it("keeps old records valid when new questionnaire fields are absent", () => {
    expect(validateRouteFeedback(makeFeedback())).not.toBeNull();
  });

  it.each(["easy", "mostly", "difficult"] as const)(
    "accepts navigation feedback %s",
    (navigationRating) => {
      expect(validateRouteFeedback(makeFeedback({ navigationRating }))).toMatchObject({
        navigationRating,
      });
    },
  );

  it("rejects invalid navigation feedback", () => {
    expect(validateRouteFeedback({ ...makeFeedback(), navigationRating: "sometimes" })).toBeNull();
  });

  it("accepts 400 characters and rejects longer comments", () => {
    expect(
      validateRouteFeedback(
        makeFeedback({ comment: "a".repeat(MAX_ROUTE_FEEDBACK_COMMENT_LENGTH) }),
      ),
    ).not.toBeNull();
    expect(
      validateRouteFeedback({
        ...makeFeedback(),
        comment: "a".repeat(MAX_ROUTE_FEEDBACK_COMMENT_LENGTH + 1),
      }),
    ).toBeNull();
  });

  it("trims comments and normalizes whitespace-only input away", () => {
    expect(validateRouteFeedback(makeFeedback({ comment: "  Helpful note  " }))?.comment).toBe(
      "Helpful note",
    );
    expect(validateRouteFeedback(makeFeedback({ comment: "   " }))).not.toHaveProperty("comment");
    expect(normalizeRouteFeedbackComment(" \n ")).toBeUndefined();
  });
});
