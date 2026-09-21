import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { simulateSeed, summarizeSeeds } from "../src/seed-backtest.js";

describe("simulateSeed", () => {
  it("computes net multiple over the hold window", () => {
    const result = simulateSeed({
      tokenMint: "M",
      candles: [
        [1, "1", "1", "1", "2", 10],
        [2, "2", "4", "2", "4", 10],
      ],
      holdDays: 30,
      roundTripCostBps: 100,
    });
    assert.ok(result);
    assert.equal(result!.grossMultiple, 2);
    assert.ok(Math.abs(result!.netMultiple - 1.98) < 1e-9);
  });

  it("returns null without two closes", () => {
    assert.equal(
      simulateSeed({ tokenMint: "M", candles: [[1, "0", "0", "0", "0", 0]], holdDays: 30, roundTripCostBps: 100 }),
      null,
    );
  });

  it("summarizes a seed batch", () => {
    const summary = summarizeSeeds([
      { tokenMint: "A", candlesUsed: 2, buyClose: "1", sellClose: "2", grossMultiple: 2, netMultiple: 1.9 },
      null,
    ]);
    assert.equal(summary.seeds, 1);
    assert.equal(summary.skipped, 1);
    assert.equal(summary.winnersGt1x, 1);
  });
});
