/** Buyer seed simulation over daily OHLCV candles (close prices).
 *  Buy фазер: first close, sell фазер: last close. Costs: configurable
 *  round-trip bps deducted from the multiple. Pure function, no network. */

export interface SeedSimInput {
  tokenMint: string;
  /** [timestamp, open, high, low, close, volume] close as decimal string */
  candles: Array<[number, string, string, string, string, number]>;
  holdDays: number;
  roundTripCostBps: number;
}

export interface SeedSimResult {
  tokenMint: string;
  candlesUsed: number;
  buyClose: string;
  sellClose: string;
  grossMultiple: number;
  netMultiple: number;
}

export function simulateSeed(input: SeedSimInput): SeedSimResult | null {
  const closes = input.candles.map((candle) => Number(candle[4])).filter((price) => Number.isFinite(price) && price > 0);
  if (closes.length < 2) return null;
  const window = closes.slice(0, Math.min(input.holdDays + 1, closes.length));
  const buy = window[0]!;
  const sell = window[window.length - 1]!;
  const gross = sell / buy;
  const net = gross * (1 - input.roundTripCostBps / 10000);
  return {
    tokenMint: input.tokenMint,
    candlesUsed: window.length,
    buyClose: String(buy),
    sellClose: String(sell),
    grossMultiple: gross,
    netMultiple: net,
  };
}

export function summarizeSeeds(results: Array<SeedSimResult | null>): {
  seeds: number;
  skipped: number;
  winnersGt1x: number;
  meanNet: number | null;
  medianNet: number | null;
} {
  const done = results.filter((row): row is SeedSimResult => row !== null);
  const nets = done.map((row) => row.netMultiple).sort((a, b) => a - b);
  const mean = nets.length > 0 ? nets.reduce((sum, value) => sum + value, 0) / nets.length : null;
  const median = nets.length > 0 ? nets[Math.floor(nets.length / 2)]! : null;
  return {
    seeds: done.length,
    skipped: results.length - done.length,
    winnersGt1x: nets.filter((value) => value > 1).length,
    meanNet: mean,
    medianNet: median,
  };
}
