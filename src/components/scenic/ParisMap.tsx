import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { scenicConfig } from "@/lib/scenic/config";
import type { LatLng, Poi } from "@/lib/scenic/types";
import { LegacyParisMap, type ParisMapProps } from "./LegacyParisMap";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";

const ROUTE_SOURCE = "scenic-routes";
const ROUTE_INACTIVE_LAYER = "scenic-routes-inactive";
const ROUTE_ACTIVE_HALO_LAYER = "scenic-route-active-halo";
const ROUTE_ACTIVE_LAYER = "scenic-route-active";
const PARIS_CENTER: [number, number] = [2.3522, 48.8566];

function coordinates(point: LatLng): [number, number] {
  return [point.lng, point.lat];
}

function makeMarkerElement(kind: "start" | "end" | "user", label: string) {
  const element = document.createElement("div");
  element.className = `scenic-map-marker scenic-map-marker--${kind}`;
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", label);
  return element;
}

export function ParisMap(props: ParisMapProps) {
  const {
    routes = [],
    start,
    end,
    user,
    discoveries = [],
    activeDiscoveryId,
    onSelectDiscovery,
    className,
    padding = 6,
    interactive = true,
  } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  const routeData = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString>>(
    () => ({
      type: "FeatureCollection",
      features: routes.map(({ route, active }) => ({
        type: "Feature",
        properties: { id: route.id, active },
        geometry: { type: "LineString", coordinates: route.path.map(coordinates) },
      })),
    }),
    [routes],
  );
  const initialInteractiveRef = useRef(interactive);
  const initialRouteDataRef = useRef(routeData);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;

    void import("maplibre-gl")
      .then(({ default: maplibregl }) => {
        if (disposed) return;
        const map = new maplibregl.Map({
          container,
          style: scenicConfig.mapStyleUrl,
          center: PARIS_CENTER,
          zoom: 12.4,
          attributionControl: true,
          interactive: initialInteractiveRef.current,
        });
        mapRef.current = map;
        if (initialInteractiveRef.current) {
          map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        }
        const onLoad = () => {
          if (disposed) return;
          const styles = getComputedStyle(container);
          const primary = styles.getPropertyValue("--map-route-primary").trim();
          const muted = styles.getPropertyValue("--map-route-muted").trim();
          map.addSource(ROUTE_SOURCE, { type: "geojson", data: initialRouteDataRef.current });
          map.addLayer({
            id: ROUTE_INACTIVE_LAYER,
            type: "line",
            source: ROUTE_SOURCE,
            filter: ["==", ["get", "active"], false],
            paint: {
              "line-color": muted,
              "line-width": 3,
              "line-opacity": 0.65,
              "line-dasharray": [2, 2],
            },
            layout: { "line-cap": "round", "line-join": "round" },
          });
          map.addLayer({
            id: ROUTE_ACTIVE_HALO_LAYER,
            type: "line",
            source: ROUTE_SOURCE,
            filter: ["==", ["get", "active"], true],
            paint: { "line-color": primary, "line-width": 9, "line-opacity": 0.18 },
            layout: { "line-cap": "round", "line-join": "round" },
          });
          map.addLayer({
            id: ROUTE_ACTIVE_LAYER,
            type: "line",
            source: ROUTE_SOURCE,
            filter: ["==", ["get", "active"], true],
            paint: { "line-color": primary, "line-width": 5 },
            layout: { "line-cap": "round", "line-join": "round" },
          });
          setMapReady(true);
        };
        const onError = (event: { error?: Error }) => {
          if (!map.loaded()) {
            console.error("[Scenic Route] MapLibre failed to initialize.", event.error);
            map.remove();
            mapRef.current = null;
            setMapFailed(true);
          }
        };
        map.once("load", onLoad);
        map.on("error", onError);
        resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(container);
      })
      .catch((error: unknown) => {
        console.error("[Scenic Route] MapLibre failed to initialize.", error);
        if (!disposed) setMapFailed(true);
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    (map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined)?.setData(routeData);
  }, [mapReady, routeData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    let cancelled = false;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    void import("maplibre-gl").then(({ default: maplibregl }) => {
      if (cancelled) return;
      const markers: Marker[] = [];
      const addMarker = (
        point: LatLng,
        element: HTMLElement,
        anchor: "center" | "bottom" = "center",
      ) => {
        markers.push(
          new maplibregl.Marker({ element, anchor }).setLngLat(coordinates(point)).addTo(map),
        );
      };
      if (start) addMarker(start, makeMarkerElement("start", start.label ?? "Route start"));
      if (end) addMarker(end, makeMarkerElement("end", end.label ?? "Route destination"), "bottom");
      if (user) addMarker(user, makeMarkerElement("user", "Current simulated location"));
      discoveries.forEach((poi, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = cn(
          "scenic-map-discovery",
          activeDiscoveryId === poi.id && "scenic-map-discovery--active",
        );
        button.textContent = String(index + 1);
        button.setAttribute("aria-label", `Discovery ${index + 1}: ${poi.name}`);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectDiscovery?.(poi);
        });
        addMarker(poi, button);
      });
      markersRef.current = markers;
    });
    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [activeDiscoveryId, discoveries, end, mapReady, onSelectDiscovery, start, user]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const points: LatLng[] = routes.flatMap(({ route }) => route.path);
    if (start) points.push(start);
    if (end) points.push(end);
    points.push(...discoveries);
    if (points.length === 0) {
      map.easeTo({ center: PARIS_CENTER, zoom: 12.4 });
      return;
    }
    const bounds = points.reduce(
      (value, point) => value.extend(coordinates(point)),
      new maplibreBounds(coordinates(points[0]!)),
    );
    // Legacy padding was in projected SVG units; this bounded conversion preserves its visual intent.
    const cameraPadding = Math.min(96, Math.max(28, padding * 6));
    map.fitBounds(bounds.toArray(), { padding: cameraPadding, maxZoom: 16, duration: 500 });
  }, [discoveries, end, mapReady, padding, routes, start]);

  if (mapFailed) return <LegacyParisMap {...props} />;

  return (
    <div
      ref={containerRef}
      className={cn("scenic-map h-full w-full bg-map-land", className)}
      role="region"
      aria-label="Interactive map of central Paris with the selected walking route"
    />
  );
}

// Avoid importing a browser-oriented constructor at module evaluation time.
class maplibreBounds {
  private west: number;
  private south: number;
  private east: number;
  private north: number;

  constructor([lng, lat]: [number, number]) {
    this.west = this.east = lng;
    this.south = this.north = lat;
  }

  extend([lng, lat]: [number, number]) {
    this.west = Math.min(this.west, lng);
    this.east = Math.max(this.east, lng);
    this.south = Math.min(this.south, lat);
    this.north = Math.max(this.north, lat);
    return this;
  }

  toArray(): [[number, number], [number, number]] {
    return [
      [this.west, this.south],
      [this.east, this.north],
    ];
  }
}
