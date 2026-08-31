import { describe, expect, it } from "vitest";
import { normalizeScenicPrivacyPolicyUrl } from "./config";

describe("Scenic privacy policy URL", () => {
  it("accepts public HTTPS URLs and trims configuration whitespace", () => {
    expect(normalizeScenicPrivacyPolicyUrl(" https://scenic.example/privacy ")).toBe(
      "https://scenic.example/privacy",
    );
  });

  it.each([
    undefined,
    "",
    "not a URL",
    "http://scenic.example/privacy",
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///privacy.html",
    "https://user:password@scenic.example/privacy",
  ])("safely ignores missing or unsafe config: %s", (value) => {
    expect(normalizeScenicPrivacyPolicyUrl(value)).toBeNull();
  });
});
