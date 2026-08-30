import type { FeatureCollection, LineString } from "geojson";
import type { LatLng, ScenicRoute } from "./types";

export interface RenderableRoute {
  route: ScenicRoute;
  active: boolean;
}

function isValidPoint(point: LatLng | undefined): point is LatLng {
  return Boolean(
    point &&
    Number.isFinite(point.lat) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    Number.isFinite(point.lng) &&
    point.lng >= -180 &&
    point.lng <= 180,
  );
}

/**
 * The one route-rendering gate used by both map implementations and navigation.
 * It deliberately has no endpoint fallback: a provider label without valid
 * provider geometry is an impossible state, not permission to invent a line.
 */
export function getRenderableRouteGeometry(route: ScenicRoute): readonly LatLng[] | null {
  return route.path.length >= 2 && route.path.every(isValidPoint) ? route.path : null;
}

export function routeGeometryToMapLibreCoordinates(
  geometry: readonly LatLng[],
): [number, number][] {
  return geometry.map(({ lat, lng }) => [lng, lat]);
}

export function buildRouteFeatureCollection(
  routes: readonly RenderableRoute[],
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: routes.flatMap(({ route, active }) => {
      const geometry = getRenderableRouteGeometry(route);
      if (!geometry) return [];
      return [
        {
          type: "Feature" as const,
          properties: { id: route.id, active, routingSource: route.routingSource },
          geometry: {
            type: "LineString" as const,
            coordinates: routeGeometryToMapLibreCoordinates(geometry),
          },
        },
      ];
    }),
  };
}
