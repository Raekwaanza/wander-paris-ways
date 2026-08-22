import { describe, expect, it, vi } from "vitest";
import {
  createNativeApiPostHandler,
  nativeApiOptions,
  validateNativeForwardGeocodeInput,
  validateNativeRoutingInput,
  validateNativeViaInput,
} from "./native-api.server";

function post(body: unknown, origin = "capacitor://localhost") {
  return new Request("https://backend.example/api/v1/routing/routes", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("native API validation", () => {
  it("rejects invalid routing coordinates", () => {
    expect(() =>
      validateNativeRoutingInput({
        from: { lat: 91, lng: 2.35 },
        to: { lat: 48.86, lng: 2.36 },
      }),
    ).toThrow(/Paris/);
  });

  it("rejects excessive waypoint input", () => {
    expect(() =>
      validateNativeViaInput({
        points: Array.from({ length: 5 }, () => ({ lat: 48.8566, lng: 2.3522 })),
      }),
    ).toThrow(/Waypoint count/);
  });

  it("rejects malformed geocoding input and unexpected fields", () => {
    expect(() => validateNativeForwardGeocodeInput({ query: "x" })).toThrow(/2 to 120/);
    expect(() => validateNativeForwardGeocodeInput({ query: "Louvre", endpoint: "evil" })).toThrow(
      /Invalid geocoding request/,
    );
  });
});

describe("native API CORS", () => {
  it("rejects a disallowed browser origin before calling the provider", async () => {
    const operation = vi.fn(async () => ({ status: "success", candidates: [] }));
    const handler = createNativeApiPostHandler(validateNativeRoutingInput, operation);
    const response = await handler({
      request: post(
        {
          from: { lat: 48.8566, lng: 2.3522 },
          to: { lat: 48.86, lng: 2.36 },
        },
        "https://attacker.example",
      ),
    });
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(operation).not.toHaveBeenCalled();
  });

  it("allows Capacitor preflight only on the endpoint handler", () => {
    const response = nativeApiOptions(
      new Request("https://backend.example/api/v1/routing/routes", {
        method: "OPTIONS",
        headers: {
          origin: "capacitor://localhost",
          "access-control-request-method": "POST",
        },
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("capacitor://localhost");
  });
});
