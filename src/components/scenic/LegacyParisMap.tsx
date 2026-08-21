import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { project, smoothSvgPath } from "@/lib/scenic/geo";
import type { LatLng, Poi, ScenicRoute } from "@/lib/scenic/types";
import { ILE_CITE, ILE_SAINT_LOUIS, PARKS, SEINE, STREETS, blocks } from "./paris-basemap";

export interface ParisMapProps {
  routes?: { route: ScenicRoute; active: boolean }[] | undefined;
  start?: (LatLng & { label?: string }) | undefined;
  end?: (LatLng & { label?: string }) | undefined;
  user?: LatLng | undefined;
  discoveries?: Poi[] | undefined;
  activeDiscoveryId?: string | null | undefined;
  onSelectDiscovery?: ((poi: Poi) => void) | undefined;
  className?: string | undefined;
  padding?: number | undefined;
  interactive?: boolean | undefined;
}

const BLOCKS = blocks();

function ring(points: LatLng[]) {
  return points
    .map(project)
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
}

function polylineSvgPath(points: { x: number; y: number }[]): string {
  return points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}

export function LegacyParisMap({
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
}: ParisMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const base = useMemo(() => {
    const pts: LatLng[] = [];
    routes.forEach((r) => pts.push(...r.route.path));
    if (start) pts.push(start);
    if (end) pts.push(end);
    discoveries.forEach((d) => pts.push(d));
    if (pts.length === 0) {
      pts.push({ lat: 48.874, lng: 2.318 }, { lat: 48.845, lng: 2.375 });
    }
    const projected = pts.map(project);
    let minX = Math.min(...projected.map((p) => p.x));
    const maxX = Math.max(...projected.map((p) => p.x));
    let minY = Math.min(...projected.map((p) => p.y));
    const maxY = Math.max(...projected.map((p) => p.y));
    const w = Math.max(maxX - minX, 14);
    const h = Math.max(maxY - minY, 18);
    minX -= padding;
    minY -= padding;
    return { x: minX, y: minY, w: w + padding * 2, h: h + padding * 2 };
  }, [routes, start, end, discoveries, padding]);

  // reset user pan when the framed content changes
  useEffect(() => {
    setView({ k: 1, tx: 0, ty: 0 });
  }, [base.x, base.y, base.w, base.h]);

  const viewRef = useRef(view);
  viewRef.current = view;
  const baseRef = useRef(base);
  baseRef.current = base;

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const b = baseRef.current;
      const unit = b.w / rect.width;
      const px = (e.clientX - rect.left) * unit;
      const py = (e.clientY - rect.top) * unit;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const v = viewRef.current;
      const next = Math.min(6, Math.max(1, v.k * Math.exp(-dy * 0.0016)));
      const ratio = next / v.k;
      setView({
        k: next,
        tx: px - (px - v.tx) * ratio,
        ty: py - (py - v.ty) * ratio,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [interactive]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const el = svgRef.current;
    if (!d || !el) return;
    const rect = el.getBoundingClientRect();
    const unit = base.w / rect.width;
    setView((v) => ({
      ...v,
      tx: d.tx + (e.clientX - d.x) * unit,
      ty: d.ty + (e.clientY - d.y) * unit,
    }));
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const startP = start ? project(start) : null;
  const endP = end ? project(end) : null;
  const userP = user ? project(user) : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`${base.x} ${base.y} ${base.w} ${base.h}`}
      className={cn(
        "h-full w-full touch-none select-none bg-map-land",
        interactive && "cursor-grab active:cursor-grabbing",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      role="img"
      aria-label="Map of central Paris with the selected walking route"
    >
      <defs>
        <filter id="pin-shadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.5" floodOpacity="0.28" />
        </filter>
      </defs>
      <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
        <rect
          x={base.x - 200}
          y={base.y - 200}
          width={base.w + 400}
          height={base.h + 400}
          className="fill-map-land"
        />
        <g className="fill-map-block" opacity={0.9}>
          {BLOCKS.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={b.r} />
          ))}
        </g>

        {PARKS.map((p) => (
          <polygon key={p.name} points={ring(p.ring)} className="fill-map-park" />
        ))}

        <g className="stroke-map-street" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {STREETS.map((s, i) => (
            <path key={i} d={smoothSvgPath(s.pts.map(project))} strokeWidth={s.w} />
          ))}
        </g>

        <path
          d={smoothSvgPath(SEINE.map(project))}
          className="stroke-map-water"
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
        />
        <polygon points={ring(ILE_CITE)} className="fill-map-land" />
        <polygon points={ring(ILE_SAINT_LOUIS)} className="fill-map-land" />

        {/* routes */}
        {routes.map(({ route, active }) => {
          // Never curve authoritative provider geometry through areas it did not traverse.
          const d =
            route.routingSource === "openrouteservice"
              ? polylineSvgPath(route.path.map(project))
              : smoothSvgPath(route.path.map(project));
          return (
            <g key={route.id + route.profile}>
              {active ? (
                <>
                  <path
                    d={d}
                    fill="none"
                    className="stroke-primary"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.16}
                  />
                  <path
                    d={d}
                    fill="none"
                    className="stroke-primary"
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : (
                <path
                  d={d}
                  fill="none"
                  className="stroke-muted-foreground"
                  strokeWidth={0.85}
                  strokeDasharray="1.6 1.8"
                  strokeLinecap="round"
                  opacity={0.5}
                />
              )}
            </g>
          );
        })}

        {/* discoveries */}
        {discoveries.map((poi, i) => {
          const p = project(poi);
          const isActive = activeDiscoveryId === poi.id;
          return (
            <g
              key={poi.id}
              transform={`translate(${p.x} ${p.y})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDiscovery?.(poi);
              }}
            >
              {isActive && <circle r={3.4} className="fill-terracotta" opacity={0.18} />}
              <circle
                r={isActive ? 2.5 : 2}
                className={isActive ? "fill-terracotta" : "fill-card stroke-primary"}
                strokeWidth={0.5}
                filter="url(#pin-shadow)"
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={2.1}
                fontWeight={600}
                className={isActive ? "fill-terracotta-foreground" : "fill-primary"}
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {startP && (
          <g transform={`translate(${startP.x} ${startP.y})`}>
            <circle r={2.6} className="fill-foreground" opacity={0.1} />
            <circle r={1.35} className="fill-card stroke-foreground" strokeWidth={0.9} />
          </g>
        )}
        {endP && (
          <g transform={`translate(${endP.x} ${endP.y})`} filter="url(#pin-shadow)">
            <path
              d="M 0 0 C -2.6 -3.2 -3.4 -4.3 -3.4 -5.8 A 3.4 3.4 0 0 1 3.4 -5.8 C 3.4 -4.3 2.6 -3.2 0 0 Z"
              className="fill-primary"
            />
            <circle cy={-5.8} r={1.25} className="fill-card" />
          </g>
        )}
        {userP && (
          <g transform={`translate(${userP.x} ${userP.y})`} aria-label="Current location">
            <title>Current location</title>
            <circle r={2.2} className="fill-terracotta" opacity={0.25} />
            <circle r={1.2} className="fill-terracotta stroke-card" strokeWidth={0.6} />
          </g>
        )}
      </g>
    </svg>
  );
}
