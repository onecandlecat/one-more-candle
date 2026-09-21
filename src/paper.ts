/** Paper trading engine: signals in, simulated fills out. No network,
 *  no keys, no real funds. A future live adapter must be a separate,
 *  explicitly approved task; nothing here can sign or send. */

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
  entryTime: number;
}

export interface RiskLimits {
  maxPerBetSol: number;
  maxConcurrent: number;
  dailyLossHaltSol: number;
  killSwitch: boolean;
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
  const size = Math.min(limits.maxPerBetSol, state.cashSol);
  if (!(size > 0) || !(priceSol > 0)) return null;
  const fee = size * 0.005;
  state.cashSol -= size;
  state.positions.push({ tokenMint, entryPriceSol: priceSol, sizeSol: size - fee, entryTime: time });
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
  const position = state.positions[index]!;
  const gross = position.sizeSol * (priceSol / position.entryPriceSol);
  const fee = gross * 0.005;
  const proceeds = gross - fee;
  const pnl = proceeds - (position.sizeSol + state.fills.find(
    (fill) => fill.tokenMint === tokenMint && fill.side === "buy",
  )!.feeSol);
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
