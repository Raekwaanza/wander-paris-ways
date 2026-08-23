import { describe, expect, it } from "vitest";
import { normalizeScenicPublicWebOrigin, resolveScenicPublicWebOrigin } from "./platform-runtime";

describe("Scenic public web origin", () => {
  it("accepts only an HTTPS origin", () => {
    expect(normalizeScenicPublicWebOrigin(" https://scenic.example ")).toBe(
      "https://scenic.example",
    );
    expect(normalizeScenicPublicWebOrigin("")).toBeNull();
    for (const value of [
      "http://scenic.example",
      "https://scenic.example/shared",
      "https://scenic.example?x=1",
      "https://scenic.example/#x",
    ]) {
      expect(() => normalizeScenicPublicWebOrigin(value)).toThrow();
    }
  });

  it("allows the current origin only for web and requires config for native", () => {
    expect(resolveScenicPublicWebOrigin("web", undefined, "https://preview.example/path")).toBe(
      "https://preview.example",
    );
    expect(() => resolveScenicPublicWebOrigin("android", undefined, "https://localhost")).toThrow(
      "Native sharing requires",
    );
  });
});
