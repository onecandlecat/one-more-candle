/** Break-even estimator: required trading volume for a given spend
 *  under each Bags fee mode. Read-only, no chain calls.
 *
 *  DEPLOYER INTERACTION (SOL fee-share v2): the config payer is registered
 *  as a separate deployer and takes 25% of the GROSS claimers pool BEFORE
 *  the basisPointsArray divides the remaining 75%. When the same wallet is
 *  both payer and sole 10000-bps recipient, the two shares sum back to the
 *  full 100% of the claimers pool. So the wallet rate below is unaffected
 *  by the deployer cut; the cut only reduces what OTHER recipients receive.
 *  A wallet that is deployer-only would instead receive 25% of the pool.
 *
 *  Rates are the wallet's own share of quote flow, as a fraction.
 *  Default graduation is ~85 SOL of quote reserve; supply-locked modes
 *  differ. Mode is fixed at launch and cannot be changed afterward.
 *
 *  Verified against docs.bags.fm/how-to-guides/customize-token-fees on
 *  2026-09-24: low-pre/high-post is 0.25% total fee -> 0.125% creator
 *  pre-migration (125/100000), and high-pre/low-post is 1% total ->
 *  0.5% creator (5/1000). High-flat 10% total -> 5% creator.
 */

export interface FeeMode {
  id: string;
  /** wallet share pre-migration, exact fraction (1% = 1/100) */
  preNum: bigint;
  preDen: bigint;
  /** wallet share post-migration, exact fraction (0.75% = 75/10000) */
  postNum: bigint;
  postDen: bigint;
  /** approximate quote reserve required to graduate, in SOL */
  graduationSol: number;
  /** short human note about what this mode is for */
  note: string;
}

export const FEE_MODES: FeeMode[] = [
  {
    id: "default",
    preNum: 1n, preDen: 100n, postNum: 75n, postDen: 10000n,
    graduationSol: 85,
    note: "2% total fee, 25% compounding post-migration. Simple default.",
  },
  {
    id: "low-pre-high-post",
    preNum: 125n, preDen: 100000n, postNum: 25n, postDen: 10000n,
    graduationSol: 85,
    note: "0.25% pre / 1% post. Encourages early volume, earns more after graduation.",
  },
  {
    id: "high-pre-low-post",
    preNum: 5n, preDen: 1000n, postNum: 625n, postDen: 1000000n,
    graduationSol: 85,
    note: "1% pre / 0.25% post. Maximizes early fee revenue, thinner post volume.",
  },
  {
    id: "high-flat",
    preNum: 5n, preDen: 100n, postNum: 25n, postDen: 1000n,
    graduationSol: 85,
    note: "10% flat. Highest fee per trade, highest tax, suppresses volume.",
  },
  {
    id: "flat-85pct-locked",
    preNum: 1n, preDen: 100n, postNum: 75n, postDen: 10000n,
    graduationSol: 100,
    note: "Default economics with 85% of supply locked. Same wallet rate as default.",
  },
  {
    id: "default-1k-supply",
    preNum: 1n, preDen: 100n, postNum: 75n, postDen: 10000n,
    graduationSol: 85,
    note: "Default economics, 1000-token supply. Same wallet rate as default.",
  },
  {
    id: "flat-96pct-locked",
    preNum: 1n, preDen: 100n, postNum: 75n, postDen: 10000n,
    graduationSol: 55,
    note: "2% base, 96% supply locked, fee decays post-migration. Earliest graduation of the locked modes.",
  },
];

export interface EstimateRow {
  mode: string;
  preVolumeLamports: string;
  postVolumeLamports: string;
  graduationSol: number;
  note: string;
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
    graduationSol: mode.graduationSol,
    note: mode.note,
  }));
}
