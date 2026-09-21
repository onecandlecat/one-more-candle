/** Fee-proxy backtest over saved observations.
 *  Answers: "had you launched blind into that cohort, how often did
 *  lifetime fees cover a given cost?" Uses creator-share lamports only.
 *  This tests the creator thesis, NOT buyer seed returns (no price
 *  series in archives; buyer backtest needs one, stubbed as missing). */
import { readFileSync } from "node:fs";

export interface BacktestRow {
  tokenMint: string;
  name: string | null;
  lifetimeFeesLamports: bigint;
}

export interface BacktestResult {
  tokens: number;
  totalFeesLamports: string;
  hitRateByCost: Array<{ costLamports: string; hits: number; hitRateBps: number }>;
  note: string;
}

export function hitRates(rows: BacktestRow[], costs: bigint[]): BacktestResult {
  const total = rows.reduce((sum, row) => sum + row.lifetimeFeesLamports, 0n);
  return {
    tokens: rows.length,
    totalFeesLamports: total.toString(),
    hitRateByCost: costs.map((cost) => {
      const hits = rows.filter((row) => row.lifetimeFeesLamports >= cost).length;
      return {
        costLamports: cost.toString(),
        hits,
        hitRateBps: rows.length > 0 ? Math.round((hits / rows.length) * 10000) : 0,
      };
    }),
    note: "Survivor-biased (feed/pool-listed only), unequal ages; buyer seed returns need price series, absent here.",
  };
}

function parseLamports(value: unknown): bigint | null {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function rowsFromFile(path: string): BacktestRow[] {
  const data = JSON.parse(readFileSync(path, "utf8")) as { tokens?: unknown };
  if (!Array.isArray(data.tokens)) throw new Error(`no tokens array in ${path}`);
  const rows: BacktestRow[] = [];
  for (const token of data.tokens) {
    const record = token as Record<string, unknown>;
    const fees = parseLamports(record.lifetimeFeesLamports);
    if (typeof record.tokenMint !== "string" || fees === null) continue;
    rows.push({
      tokenMint: record.tokenMint,
      name: typeof record.name === "string" ? record.name : null,
      lifetimeFeesLamports: fees,
    });
  }
  return rows;
}
