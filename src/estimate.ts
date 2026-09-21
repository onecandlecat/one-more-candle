/** Break-even estimator: required trading volume for a given spend
 *  under each Bags fee mode. Read-only, no chain calls. */

export interface FeeMode {
  id: string;
  /** creator share as exact fraction numerator/denominator (e.g. 0.125% = 125/100000) */
  preNum: bigint;
  preDen: bigint;
  postNum: bigint;
  postDen: bigint;
}

export const FEE_MODES: FeeMode[] = [
  { id: "default", preNum: 1n, preDen: 100n, postNum: 75n, postDen: 10000n },
  { id: "low-pre-high-post", preNum: 125n, preDen: 100000n, postNum: 25n, postDen: 10000n },
  { id: "high-pre-low-post", preNum: 5n, preDen: 1000n, postNum: 625n, postDen: 1000000n },
  { id: "high-flat", preNum: 5n, preDen: 100n, postNum: 25n, postDen: 1000n },
];

export interface EstimateRow {
  mode: string;
  preVolumeLamports: string;
  postVolumeLamports: string;
}

function ceilDiv(num: bigint, den: bigint): bigint {
  return (num + den - 1n) / den;
}

export function estimateRequiredVolume(spendLamports: bigint): EstimateRow[] {
  if (spendLamports <= 0n) throw new Error("spend must be positive");
  return FEE_MODES.map((mode) => ({
    mode: mode.id,
    preVolumeLamports: ceilDiv(spendLamports * mode.preDen, mode.preNum).toString(),
    postVolumeLamports: ceilDiv(spendLamports * mode.postDen, mode.postNum).toString(),
  }));
}
