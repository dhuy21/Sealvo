import { PASS_RULES, reachesShare } from '../level-progress';

/** The game only ends once every pair is matched, so a finished game always passes. */
export function isPassed(matchedPairs: number, totalPairs: number): boolean {
  return reachesShare(matchedPairs, totalPairs, PASS_RULES.flash_match.minAccuracy);
}
