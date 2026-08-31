import type { RouteInstruction } from "./types";

export const NAVIGATION_INSTRUCTION_PASS_BUFFER_METERS = 12;
export const NAVIGATION_DEPART_ADVANCE_METERS = 15;

export interface DisplayedNavigationInstruction {
  instruction: RouteInstruction;
  index: number;
  distanceToManeuverMeters: number | null;
}

/**
 * Selects the next provider-authored maneuver. `previousIndex` makes advancement
 * monotonic for a navigation session; stabilized route matching handles the
 * underlying GPS jitter while this final guard prevents card oscillation.
 */
export function selectNavigationInstruction(
  instructions: readonly RouteInstruction[],
  distanceAlongRouteMeters: number | null,
  previousIndex = 0,
): DisplayedNavigationInstruction | null {
  if (instructions.length === 0) return null;
  const ordered = [...instructions].sort(
    (a, b) =>
      a.distanceAlongRouteMeters - b.distanceAlongRouteMeters || a.fromPathIndex - b.fromPathIndex,
  );
  if (distanceAlongRouteMeters === null) {
    const index = Math.min(Math.max(0, previousIndex), ordered.length - 1);
    return { instruction: ordered[index]!, index, distanceToManeuverMeters: null };
  }

  let candidateIndex = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    const instruction = ordered[index]!;
    const passed =
      instruction.maneuver === "depart"
        ? distanceAlongRouteMeters >
          instruction.distanceAlongRouteMeters + NAVIGATION_DEPART_ADVANCE_METERS
        : distanceAlongRouteMeters >
          instruction.distanceAlongRouteMeters + NAVIGATION_INSTRUCTION_PASS_BUFFER_METERS;
    if (!passed || instruction.maneuver === "arrive") {
      candidateIndex = index;
      break;
    }
    candidateIndex = Math.min(index + 1, ordered.length - 1);
  }
  const index = Math.min(Math.max(previousIndex, candidateIndex), ordered.length - 1);
  const instruction = ordered[index]!;
  return {
    instruction,
    index,
    distanceToManeuverMeters: Math.max(
      0,
      instruction.distanceAlongRouteMeters - distanceAlongRouteMeters,
    ),
  };
}

export function formatManeuverDistance(distanceMeters: number): string {
  if (distanceMeters < 10) return "Now";
  if (distanceMeters < 100) return `${Math.round(distanceMeters / 10) * 10} m`;
  if (distanceMeters < 300) return `${Math.round(distanceMeters / 25) * 25} m`;
  if (distanceMeters < 1_000) return `${Math.round(distanceMeters / 50) * 50} m`;
  const kilometers = Math.round((distanceMeters / 1_000) * 10) / 10;
  return `${kilometers} km`;
}
