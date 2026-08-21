import type { ScoredRouteCandidate } from "./types";

/** Keeps the Step 8.1 Scenic policy in one deterministic selection point. */
export function selectScenicCandidate(
  scored: ScoredRouteCandidate[],
  fastestCandidateId: string,
): ScoredRouteCandidate | undefined {
  return (
    scored.find((candidate) => candidate.withinDetourCap) ??
    scored.find((candidate) => candidate.analysis.candidate.id === fastestCandidateId)
  );
}

function compareExplorerCandidates(a: ScoredRouteCandidate, b: ScoredRouteCandidate): number {
  return (
    b.contributingPoiIds.length - a.contributingPoiIds.length ||
    b.breakdown.discoverySpread - a.breakdown.discoverySpread ||
    b.score - a.score ||
    b.extraMinutes - a.extraMinutes ||
    a.analysis.candidate.providerRank - b.analysis.candidate.providerRank ||
    a.analysis.candidate.id.localeCompare(b.analysis.candidate.id)
  );
}

/** Selects a discovery-backed, within-cap route that never duplicates Scenic. */
export function selectExplorerCandidate(
  scored: ScoredRouteCandidate[],
  fastestCandidateId: string,
  scenicCandidateId: string,
): ScoredRouteCandidate | undefined {
  const eligible = scored.filter(
    (candidate) => candidate.withinDetourCap && candidate.contributingPoiIds.length > 0,
  );
  const distinctFromBoth = eligible.filter(
    (candidate) =>
      candidate.analysis.candidate.id !== fastestCandidateId &&
      candidate.analysis.candidate.id !== scenicCandidateId,
  );
  const distinctFromScenic = eligible.filter(
    (candidate) => candidate.analysis.candidate.id !== scenicCandidateId,
  );
  const pool = distinctFromBoth.length > 0 ? distinctFromBoth : distinctFromScenic;

  return [...pool].sort(compareExplorerCandidates)[0];
}
