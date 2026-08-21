#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

const ORS_ROOT = "https://api.heigit.org/openrouteservice/v2";
const DIRECTIONS_URL = `${ORS_ROOT}/directions/foot-walking/geojson`;
const SNAP_URL = `${ORS_ROOT}/snap/foot-walking/json`;
const SNAP_RADIUS_METERS = 400;
const ALTERNATIVE_ROUTES = { target_count: 3, share_factor: 0.6, weight_factor: 1.4 };
const EXTRA_INFO = ["waytype", "waycategory", "surface", "suitability"];

function usage(exitCode = 0) {
  console.log(`Usage: node scripts/audit-walking-route.mjs FROM_LNG FROM_LAT TO_LNG TO_LAT [options]

Options:
  --geojson [file]  Write points and candidate lines (default: route-audit.geojson)
  --raw             Include raw provider responses in the report
  --help            Show this help`);
  process.exit(exitCode);
}

const args = process.argv.slice(2);
if (args.includes("--help")) usage();
const raw = args.includes("--raw");
const geojsonIndex = args.indexOf("--geojson");
const positional = args.filter((value, index) => {
  if (value === "--raw" || value === "--geojson") return false;
  if (geojsonIndex >= 0 && index === geojsonIndex + 1 && !value.startsWith("--")) return false;
  return true;
});
if (positional.length !== 4 || positional.some((value) => !Number.isFinite(Number(value))))
  usage(1);

const [fromLng, fromLat, toLng, toLat] = positional.map(Number);
const from = [fromLng, fromLat];
const to = [toLng, toLat];
if ([from, to].some(([lng, lat]) => lng < -180 || lng > 180 || lat < -90 || lat > 90)) {
  throw new Error("Coordinates are outside valid longitude/latitude ranges.");
}

const apiKey = process.env.OPENROUTESERVICE_API_KEY?.trim();
if (!apiKey) {
  console.error("OPENROUTESERVICE_API_KEY is required (the value is never printed).");
  process.exit(1);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const providerMessage = payload?.error?.message ?? payload?.error ?? response.statusText;
    throw new Error(
      `${url === SNAP_URL ? "Snap" : "Directions"} failed (${response.status}): ${providerMessage}`,
    );
  }
  return payload;
}

function distanceMeters([lngA, latA], [lngB, latB]) {
  const latKm = (latB - latA) * 111.2;
  const lngKm = (lngB - lngA) * 73.4;
  return Math.hypot(latKm, lngKm) * 1_000;
}

function signature(coordinates) {
  return coordinates.map(([lng, lat]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join(";");
}

function summarizeExtra(extra) {
  if (!extra || typeof extra !== "object") return [];
  if (Array.isArray(extra.summary)) return extra.summary;
  if (!Array.isArray(extra.values)) return [];
  const totals = new Map();
  for (const value of extra.values) {
    const label = String(value?.[2] ?? "unknown");
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }
  return [...totals].map(([value, sectionCount]) => ({ value, sectionCount }));
}

function snapResult(original, result) {
  const snapped = Array.isArray(result?.location) ? result.location : null;
  return {
    original,
    snapped,
    snapped_distance: typeof result?.snapped_distance === "number" ? result.snapped_distance : null,
    wayName: typeof result?.name === "string" ? result.name : null,
  };
}

const directionsBody = {
  coordinates: [from, to],
  preference: "shortest",
  instructions: true,
  alternative_routes: ALTERNATIVE_ROUTES,
  extra_info: EXTRA_INFO,
  geometry_simplify: false,
};

const [directions, snap] = await Promise.all([
  postJson(DIRECTIONS_URL, directionsBody),
  postJson(SNAP_URL, { locations: [from, to], radius: SNAP_RADIUS_METERS }),
]);

const snapLocations = Array.isArray(snap?.locations) ? snap.locations : [];
const endpointSnap = {
  origin: snapResult(from, snapLocations[0]),
  destination: snapResult(to, snapLocations[1]),
};
const features = Array.isArray(directions?.features) ? directions.features : [];
const candidates = features.map((feature, providerRank) => {
  const coordinates = feature?.geometry?.coordinates ?? [];
  const summary = feature?.properties?.summary ?? {};
  const extras = feature?.properties?.extras ?? {};
  const steps = (feature?.properties?.segments ?? []).flatMap((segment) => segment.steps ?? []);
  const lngs = coordinates.map(([lng]) => lng);
  const lats = coordinates.map(([, lat]) => lat);
  return {
    providerRank,
    distanceMeters: summary.distance ?? null,
    durationSeconds: summary.duration ?? null,
    vertexCount: coordinates.length,
    firstCoordinate: coordinates[0] ?? null,
    lastCoordinate: coordinates.at(-1) ?? null,
    startOffsetMeters: coordinates.length ? distanceMeters(from, coordinates[0]) : null,
    endOffsetMeters: coordinates.length ? distanceMeters(coordinates.at(-1), to) : null,
    endpointSnap,
    waytype: summarizeExtra(extras.waytypes ?? extras.waytype),
    waycategory: summarizeExtra(extras.waycategory),
    surface: summarizeExtra(extras.surface),
    suitability: summarizeExtra(extras.suitability),
    boundingBox: coordinates.length
      ? {
          west: Math.min(...lngs),
          south: Math.min(...lats),
          east: Math.max(...lngs),
          north: Math.max(...lats),
        }
      : null,
    geometrySignature: signature(coordinates),
    steps: steps.slice(0, 12).map(({ instruction, name, type }) => ({ instruction, name, type })),
  };
});

const report = {
  request: {
    from,
    to,
    profile: "foot-walking",
    preference: "shortest",
    alternative_routes: ALTERNATIVE_ROUTES,
    geometry_simplify: false,
    extra_info: EXTRA_INFO,
  },
  snap: { endpoint: SNAP_URL, diagnosticRadiusMeters: SNAP_RADIUS_METERS, ...endpointSnap },
  candidateCount: candidates.length,
  candidates,
  ...(raw ? { rawResponses: { directions, snap } } : {}),
};
console.log(JSON.stringify(report, null, 2));

if (geojsonIndex >= 0) {
  const requestedName = args[geojsonIndex + 1];
  const filename =
    requestedName && !requestedName.startsWith("--") ? requestedName : "route-audit.geojson";
  const pointFeature = (coordinates, properties) => ({
    type: "Feature",
    properties,
    geometry: { type: "Point", coordinates },
  });
  const collection = {
    type: "FeatureCollection",
    features: [
      pointFeature(from, { kind: "requested-origin" }),
      pointFeature(to, { kind: "requested-destination" }),
      ...(endpointSnap.origin.snapped
        ? [
            pointFeature(endpointSnap.origin.snapped, {
              kind: "snapped-origin",
              snapped_distance: endpointSnap.origin.snapped_distance,
            }),
          ]
        : []),
      ...(endpointSnap.destination.snapped
        ? [
            pointFeature(endpointSnap.destination.snapped, {
              kind: "snapped-destination",
              snapped_distance: endpointSnap.destination.snapped_distance,
            }),
          ]
        : []),
      ...features.map((feature, providerRank) => ({
        type: "Feature",
        properties: { kind: "route-candidate", providerRank },
        geometry: feature.geometry,
      })),
    ],
  };
  await writeFile(filename, `${JSON.stringify(collection, null, 2)}\n`);
  console.error(`Wrote ${filename}`);
}
