import { describe, expect, it } from "vitest";
import { routeFeedbackId, validateRouteFeedback } from "./route-feedback";
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
});
