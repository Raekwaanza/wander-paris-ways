import { applyPaceMultiplier } from "./routing";
import type {
  CandidateScoreBreakdown,
  CandidateScoringOptions,
  InterestId,
  RouteCorridorAnalysis,
  RouteCorridorPoi,
  ScoredRouteCandidate,
} from "./types";

/**
 * Tunable MVP heuristics for internal candidate ranking. These values are not
 * percentages or objective measures of route quality.
 *
 * Street appeal is intentionally absent from v1 until real route/street data
 * exists. Likewise, corridor proximity is only a geometric weighting: it does
 * not establish that a POI is directly walkable or accessible from the route.
 */
export const SCENIC_CANDIDATE_SCORING_V1 = {
  proximityFalloff: 0.5,
  minimumProximityWeight: 0.5,
  landmarkWeights: {
    architecture: 0.35,
    historic: 0.3,
    hidden: 0.2,
    nature: 0.1,
    food: 0.05,
  },
  componentWeights: {
    scenic: 4,
    landmark: 2.5,
    interest: 3,
  },
  diminishingWeights: [1, 0.8, 0.65, 0.5, 0.4, 0.3] as const,
  spreadQuarterBonus: 0.5,
  detourPenaltyPerMinute: 0.35,
  detourCapToleranceMinutes: 0.01,
} as const;

interface PoiContributions {
  corridorPoi: RouteCorridorPoi;
  scenic: number;
  landmark: number;
  interest: number;
  value: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function contributionsForPoi(
  corridorPoi: RouteCorridorPoi,
  corridorRadiusMeters: number,
  interests: InterestId[],
): PoiContributions {
  const constants = SCENIC_CANDIDATE_SCORING_V1;
  const normalizedDistance = clamp(
    corridorPoi.distanceFromRouteMeters / corridorRadiusMeters,
    0,
    1,
  );
  const proximity = clamp(
    1 - normalizedDistance * constants.proximityFalloff,
    constants.minimumProximityWeight,
    1,
  );
  const scores = corridorPoi.poi.scores;
  const scenic = (scores.scenic / 10) * proximity;
  const landmark =
    ((scores.architecture * constants.landmarkWeights.architecture +
      scores.historic * constants.landmarkWeights.historic +
      scores.hidden * constants.landmarkWeights.hidden +
      scores.nature * constants.landmarkWeights.nature +
      scores.food * constants.landmarkWeights.food) /
      10) *
    proximity;
  const matchingInterestCount = corridorPoi.poi.interests.filter((interest) =>
    interests.includes(interest),
  ).length;
  const interest =
    interests.length === 0
      ? 0
      : Math.min(1, matchingInterestCount / Math.max(1, Math.min(2, interests.length))) * proximity;
  const value =
    scenic * constants.componentWeights.scenic +
    landmark * constants.componentWeights.landmark +
    interest * constants.componentWeights.interest;

  return { corridorPoi, scenic, landmark, interest, value };
}

function progressQuarter(progress: number): number {
  const normalizedProgress = clamp(progress, 0, 1);
  if (normalizedProgress <= 0.25) return 0;
  if (normalizedProgress <= 0.5) return 1;
  if (normalizedProgress <= 0.75) return 2;
  return 3;
}

function scoreAnalysis(
  analysis: RouteCorridorAnalysis,
  baseline: RouteCorridorAnalysis,
  options: CandidateScoringOptions,
): ScoredRouteCandidate {
  const constants = SCENIC_CANDIDATE_SCORING_V1;
  const rankedPois = analysis.pois
    .map((corridorPoi) =>
      contributionsForPoi(corridorPoi, analysis.corridorRadiusMeters, options.interests),
    )
    .sort(
      (a, b) =>
        b.value - a.value ||
        a.corridorPoi.distanceAlongRouteMeters - b.corridorPoi.distanceAlongRouteMeters ||
        a.corridorPoi.poi.id.localeCompare(b.corridorPoi.poi.id),
    )
    .slice(0, constants.diminishingWeights.length);

  const breakdown: CandidateScoreBreakdown = {
    scenicValue: 0,
    landmarkQuality: 0,
    interestMatch: 0,
    discoverySpread:
      new Set(rankedPois.map(({ corridorPoi }) => progressQuarter(corridorPoi.progress))).size *
      constants.spreadQuarterBonus,
    detourPenalty: 0,
  };
  rankedPois.forEach((poi, index) => {
    const diminishingWeight = constants.diminishingWeights[index];
    breakdown.scenicValue += poi.scenic * constants.componentWeights.scenic * diminishingWeight;
    breakdown.landmarkQuality +=
      poi.landmark * constants.componentWeights.landmark * diminishingWeight;
    breakdown.interestMatch +=
      poi.interest * constants.componentWeights.interest * diminishingWeight;
  });

  const extraDurationSeconds = Math.max(
    0,
    analysis.candidate.durationSeconds - baseline.candidate.durationSeconds,
  );
  const extraDistanceMeters = Math.max(
    0,
    analysis.candidate.distanceMeters - baseline.candidate.distanceMeters,
  );
  const extraMinutes = applyPaceMultiplier(extraDurationSeconds / 60, options.pace ?? "steady");
  breakdown.detourPenalty = extraMinutes * constants.detourPenaltyPerMinute;
  const score =
    breakdown.scenicValue +
    breakdown.landmarkQuality +
    breakdown.interestMatch +
    breakdown.discoverySpread -
    breakdown.detourPenalty;
  const representedInterests = new Set(analysis.pois.flatMap(({ poi }) => poi.interests));

  return {
    analysis,
    score,
    breakdown,
    contributingPoiIds: rankedPois.map(({ corridorPoi }) => corridorPoi.poi.id),
    matchedInterests: options.interests.filter((interest) => representedInterests.has(interest)),
    extraDurationSeconds,
    extraDistanceMeters,
    extraMinutes,
    withinDetourCap: extraMinutes <= options.detourCap + constants.detourCapToleranceMinutes,
  };
}

/**
 * Purely scores existing corridor facts and returns internal evaluation order.
 * It performs no routing, geometry calculation, POI insertion, or path mutation.
 */
export function scoreCandidateCorridors(
  analyses: RouteCorridorAnalysis[],
  options: CandidateScoringOptions,
): ScoredRouteCandidate[] {
  if (analyses.length === 0) return [];
  const baseline = [...analyses].sort(
    (a, b) =>
      a.candidate.providerRank - b.candidate.providerRank ||
      a.candidate.id.localeCompare(b.candidate.id),
  )[0];

  return analyses
    .map((analysis) => scoreAnalysis(analysis, baseline, options))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.extraDurationSeconds - b.extraDurationSeconds ||
        a.analysis.candidate.providerRank - b.analysis.candidate.providerRank ||
        a.analysis.candidate.id.localeCompare(b.analysis.candidate.id),
    );
}
