/** Paper trading engine: signals in, simulated fills out. No network,
 *  no keys, no real funds. A future live adapter must be a separate,
 *  explicitly approved task; nothing here can sign or send.
 *
 *  All prices are SOL-denominated (native currency) per token. Fees are
 *  passed in explicitly because pool fee modes differ (Bags default curve
 *  is 2% total; the old hardcoded 0.5% was wrong). */

export interface PaperFill {
  tokenMint: string;
  side: "buy" | "sell";
  priceSol: number;
  sizeSol: number;
  feeSol: number;
  reason: string;
}

export interface PaperPosition {
  tokenMint: string;
  entryPriceSol: number;
  sizeSol: number;
  entryFeeSol: number;
  entryTime: number;
}

export interface RiskLimits {
  maxPerBetSol: number;
  maxConcurrent: number;
  dailyLossHaltSol: number;
  killSwitch: boolean;
  /** total swap fee, e.g. 0.02 for a 2% pool */
  feeRate: number;
}

export interface PaperState {
  cashSol: number;
  positions: PaperPosition[];
  fills: PaperFill[];
  realizedPnlSol: number;
  dayLossSol: number;
  halted: boolean;
}

export function createPaperState(cashSol: number): PaperState {
  if (!(cashSol > 0)) throw new Error("cash must be positive");
  return { cashSol, positions: [], fills: [], realizedPnlSol: 0, dayLossSol: 0, halted: false };
}

export function tryBuy(
  state: PaperState,
  limits: RiskLimits,
  tokenMint: string,
  priceSol: number,
  time: number,
): PaperFill | null {
  if (limits.killSwitch || state.halted) return null;
  if (state.positions.length >= limits.maxConcurrent) return null;
  if (state.positions.some((position) => position.tokenMint === tokenMint)) return null;
  if (!(priceSol > 0)) return null;
  if (!(limits.feeRate >= 0 && limits.feeRate < 1)) throw new Error("feeRate must be in [0,1)");
  const size = Math.min(limits.maxPerBetSol, state.cashSol);
  if (!(size > 0)) return null;
  const fee = size * limits.feeRate;
  state.cashSol -= size;
  state.positions.push({ tokenMint, entryPriceSol: priceSol, sizeSol: (size - fee) / priceSol, entryFeeSol: fee, entryTime: time });
  const fill: PaperFill = { tokenMint, side: "buy", priceSol, sizeSol: size, feeSol: fee, reason: "signal" };
  state.fills.push(fill);
  return fill;
}

export function trySell(
  state: PaperState,
  limits: RiskLimits,
  tokenMint: string,
  priceSol: number,
  reason: string,
): PaperFill | null {
  if (limits.killSwitch || state.halted) return null;
  const index = state.positions.findIndex((position) => position.tokenMint === tokenMint);
  if (index < 0 || !(priceSol > 0)) return null;
  if (!(limits.feeRate >= 0 && limits.feeRate < 1)) throw new Error("feeRate must be in [0,1)");
  const position = state.positions[index]!;
  const gross = position.sizeSol * priceSol;
  const fee = gross * limits.feeRate;
  const proceeds = gross - fee;
  const pnl = proceeds - (position.sizeSol * position.entryPriceSol + position.entryFeeSol);
  state.positions.splice(index, 1);
  state.cashSol += proceeds;
  state.realizedPnlSol += pnl;
  if (pnl < 0) {
    state.dayLossSol += -pnl;
    if (state.dayLossSol >= limits.dailyLossHaltSol) state.halted = true;
  }
  const fill: PaperFill = { tokenMint, side: "sell", priceSol, sizeSol: proceeds, feeSol: fee, reason };
  state.fills.push(fill);
  return fill;
}
