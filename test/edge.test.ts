import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateTrade, feeFloor, summarizeTrades, type Snapshot } from "../src/edge.js";

const P = { stopLossPct: -0.12, takeProfitPct: 0.4, maxHoldHours: 6, feeRate: 0.02 };

describe("feeFloor", () => {
  it("computes the round-trip cost at the Bags default 2% per swap", () => {
    const floor = feeFloor(0.02);
    assert.ok(Math.abs(floor.roundTripCostFraction - 0.0396) < 1e-12);
    assert.ok(Math.abs(floor.breakEvenMultiple - 1 / (0.98 * 0.98)) < 1e-12);
  });
});

describe("evaluateTrade", () => {
  const snaps: Snapshot[] = [
    { mint: "A", time: 0, priceSol: 1 },
    { mint: "A", time: 3600, priceSol: 1.1 },
    { mint: "A", time: 7 * 3600, priceSol: 1.05 },
  ];

  it("exits on take-profit and applies the fee floor", () => {
    const trade = evaluateTrade(snaps, 0, { ...P, takeProfitPct: 0.05 });
    assert.ok(trade);
    assert.equal(trade!.exitReason, "profit");
    assert.ok(trade!.netMultiple < trade!.grossMultiple);
  });

  it("exits on stop", () => {
    const trade = evaluateTrade([{ mint: "A", time: 0, priceSol: 1 }, { mint: "A", time: 60, priceSol: 0.8 }], 0, P);
    assert.ok(trade);
    assert.equal(trade!.exitReason, "stop");
    assert.ok(trade!.netMultiple < 1);
  });

  it("exits on time stop after max hold", () => {
    const trade = evaluateTrade(snaps, 0, { ...P, maxHoldHours: 6, stopLossPct: -10, takeProfitPct: 10 });
    assert.ok(trade);
    assert.equal(trade!.exitReason, "time");
  });

  it("returns null without a forward point", () => {
    assert.equal(evaluateTrade([{ mint: "A", time: 0, priceSol: 1 }], 0, P), null);
  });
});

describe("summarizeTrades", () => {
  it("labels no sample", () => {
    assert.equal(summarizeTrades([]).edgeVerdict, "no-sample");
  });

  it("labels negative edge when mean net multiple <= 1", () => {
    const summary = summarizeTrades([
      { mint: "A", entryTime: 0, exitTime: 1, entryPrice: 1, exitPrice: 0.9, grossMultiple: 0.9, netMultiple: 0.86, exitReason: "time" },
    ]);
    assert.equal(summary.edgeVerdict, "negative-edge");
    assert.equal(summary.losses, 1);
  });
});
