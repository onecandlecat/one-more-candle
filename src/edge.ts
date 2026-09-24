/** Edge proof for the momentum (MOM) rule on a fee-bearing pool.
 *
 *  The rule enters after a >= +15% 24h move and exits on -12% stop,
 *  +40% take-profit, or a 6h time stop. Two independent problems make
 *  realized SOL profit structurally unlikely:
 *
 *  1. FEE FLOOR. Every completed round trip pays feeRate twice. With the
 *     Bags default curve (2% total fee per swap), a round trip costs
 *     1-(1-0.02)^2 = 3.96% of notional. Any exit whose net return is
 *     below -3.96% loses money. The time-stop branch has no floor: a
 *     6h hold can close anywhere, so the rule's edge must come from the
 *     distribution of 6h forward returns after a +15% day.
 *
 *  2. THE MOMENTUM PARADOX. We only ever enter after price has already
 *     risen 15% in 24h. The entry price is therefore, by selection, in
 *     the upper tail of the recent range. For the mean 6h forward return
 *     to clear the fee floor, tokens that just ran +15% must, on
 *     average, continue upward. That is a strong directional claim, not
 *     a mechanical edge, and it is exactly what must be measured
 *     empirically before any capital is at risk.
 *
 *  This module computes the fee floor and runs the empirical test over
 *  recorded hourly snapshots. It does not place orders.
 */

export interface FeeFloor {
  feeRate: number;
  roundTripCostFraction: number;
  breakEvenMultiple: number;
}

export function feeFloor(feeRate: number): FeeFloor {
  if (!(feeRate >= 0 && feeRate < 1)) throw new Error("feeRate must be in [0,1)");
  const cost = 1 - (1 - feeRate) * (1 - feeRate);
  return { feeRate, roundTripCostFraction: cost, breakEvenMultiple: 1 / (1 - feeRate) ** 2 };
}

export interface Snapshot {
  mint: string;
  time: number;
  priceSol: number;
}

export interface TradeOutcome {
  mint: string;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  grossMultiple: number;
  netMultiple: number;
  exitReason: "stop" | "profit" | "time";
}

/** Evaluate one entry forward through hourly snapshots. */
export function evaluateTrade(
  snapshots: Snapshot[],
  entryTime: number,
  params: { stopLossPct: number; takeProfitPct: number; maxHoldHours: number; feeRate: number },
): TradeOutcome | null {
  const entry = snapshots.find((s) => s.time === entryTime);
  if (!entry) return null;
  const after = snapshots
    .filter((s) => s.mint === entry.mint && s.time > entryTime)
    .sort((a, b) => a.time - b.time);
  if (after.length === 0) return null;
  const floor = feeFloor(params.feeRate).roundTripCostFraction;
  for (const point of after) {
    const change = point.priceSol / entry.priceSol - 1;
    const hours = (point.time - entryTime) / 3600;
    let reason: TradeOutcome["exitReason"] | null = null;
    if (change <= params.stopLossPct) reason = "stop";
    else if (change >= params.takeProfitPct) reason = "profit";
    else if (hours >= params.maxHoldHours) reason = "time";
    if (reason) {
      const gross = point.priceSol / entry.priceSol;
      return {
        mint: entry.mint,
        entryTime,
        exitTime: point.time,
        entryPrice: entry.priceSol,
        exitPrice: point.priceSol,
        grossMultiple: gross,
        netMultiple: gross * (1 - floor),
        exitReason: reason,
      };
    }
  }
  return null;
}

export interface BacktestSummary {
  trades: number;
  wins: number;
  losses: number;
  byReason: Record<string, number>;
  meanNetMultiple: number | null;
  medianNetMultiple: number | null;
  totalNetReturnOnEqualWeight: number | null;
  edgeVerdict: "no-sample" | "negative-edge" | "inconclusive" | "positive-edge";
  note: string;
}

export function summarizeTrades(trades: TradeOutcome[]): BacktestSummary {
  if (trades.length === 0) {
    return {
      trades: 0, wins: 0, losses: 0, byReason: {},
      meanNetMultiple: null, medianNetMultiple: null, totalNetReturnOnEqualWeight: null,
      edgeVerdict: "no-sample",
      note: "no completed trades yet; keep collecting hourly snapshots",
    };
  }
  const nets = trades.map((t) => t.netMultiple).sort((a, b) => a - b);
  const wins = nets.filter((n) => n > 1).length;
  const byReason: Record<string, number> = {};
  for (const trade of trades) byReason[trade.exitReason] = (byReason[trade.exitReason] ?? 0) + 1;
  const mean = nets.reduce((a, b) => a + b, 0) / nets.length;
  const median = nets[Math.floor(nets.length / 2)]!;
  const equalWeight = nets.reduce((acc, n) => acc * n, 1);
  return {
    trades: trades.length,
    wins,
    losses: trades.length - wins,
    byReason,
    meanNetMultiple: mean,
    medianNetMultiple: median,
    totalNetReturnOnEqualWeight: equalWeight,
    edgeVerdict: mean <= 1 ? "negative-edge" : trades.length < 30 ? "inconclusive" : "positive-edge",
    note: "A positive verdict under 30 trades is not statistically meaningful; the equal-weight product assumes sequential non-overlapping trades.",
  };
}
