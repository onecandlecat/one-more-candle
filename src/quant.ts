/** Quant v1 rules: pure functions, fixed params recorded here.
 *  Rule MOM-1h-24h: enter when 24h price change >= +15% (fresh momentum),
 *  exit on time-stop (6h) or stop-loss (-12%) or take-profit (+40%).
 *  Params frozen at creation; changing them starts v2 with a new rationale. */
export const QUANT_VERSION = "v1";
export const MOM_ENTRY_PCT = 0.15;
export const TIME_STOP_HOURS = 6;
export const STOP_LOSS_PCT = -0.12;
export const TAKE_PROFIT_PCT = 0.4;

export type QuantSignal = "enter" | "exit-stop" | "exit-profit" | "exit-time" | "hold";

export function momSignal(entryPrice: number, entryTime: number, nowPrice: number, nowTime: number): QuantSignal {
  if (!(entryPrice > 0) || !(nowPrice > 0)) return "hold";
  const change = nowPrice / entryPrice - 1;
  const hoursHeld = (nowTime - entryTime) / 3600;
  if (change <= STOP_LOSS_PCT) return "exit-stop";
  if (change >= TAKE_PROFIT_PCT) return "exit-profit";
  if (hoursHeld >= TIME_STOP_HOURS) return "exit-time";
  return "hold";
}

export function momEntry(pastPrice: number, nowPrice: number): boolean {
  if (!(pastPrice > 0) || !(nowPrice > 0)) return false;
  return nowPrice / pastPrice - 1 >= MOM_ENTRY_PCT - 1e-9;
}
