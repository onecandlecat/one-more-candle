import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPaperState, tryBuy, trySell, type RiskLimits } from "../src/paper.js";

const LIMITS: RiskLimits = {
  maxPerBetSol: 1,
  maxConcurrent: 2,
  dailyLossHaltSol: 5,
  killSwitch: false,
  feeRate: 0.02,
};

describe("paper engine", () => {
  it("buys within size and concurrency limits", () => {
    const state = createPaperState(10);
    assert.ok(tryBuy(state, LIMITS, "A", 1, 1));
    assert.ok(tryBuy(state, LIMITS, "B", 1, 1));
    assert.equal(tryBuy(state, LIMITS, "C", 1, 1), null);
    assert.equal(tryBuy(state, LIMITS, "A", 1, 1), null);
  });

  it("charges the configured fee rate, not a fixed 0.5%", () => {
    const state = createPaperState(10);
    const fill = tryBuy(state, LIMITS, "A", 1, 1);
    assert.ok(fill);
    assert.equal(fill!.feeSol, 0.02);
    assert.equal(state.cashSol, 9);
    // position size is tokens, not SOL
    assert.equal(state.positions[0]!.sizeSol, 0.98);
  });

  it("round-trips a flat price at a loss equal to both fees", () => {
    const state = createPaperState(10);
    tryBuy(state, LIMITS, "A", 1, 1);
    const sell = trySell(state, LIMITS, "A", 1, "flat");
    assert.ok(sell);
    // bought 1 SOL worth, paid 0.02; sold 0.98, paid 0.0196
    assert.ok(Math.abs(state.realizedPnlSol - -0.0396) < 1e-9);
    assert.ok(Math.abs(state.cashSol - 9.9604) < 1e-9);
    assert.equal(state.positions.length, 0);
  });

  it("computes PnL from SOL prices, not USD prices", () => {
    const state = createPaperState(10);
    tryBuy(state, LIMITS, "A", 0.000001, 1);
    trySell(state, LIMITS, "A", 0.000002, "double");
    // 980,000 tokens * 0.000002 = 1.96 gross, minus 2% sell fee, minus 1 SOL + 0.02 fee
    assert.ok(Math.abs(state.realizedPnlSol - 0.9208) < 1e-6);
  });

  it("halts after the daily loss limit", () => {
    const state = createPaperState(10);
    const limits: RiskLimits = { ...LIMITS, dailyLossHaltSol: 0.5 };
    tryBuy(state, limits, "A", 1, 1);
    trySell(state, limits, "A", 0.1, "stop");
    assert.equal(state.halted, true);
    assert.equal(tryBuy(state, limits, "B", 1, 2), null);
  });

  it("kill switch blocks everything", () => {
    const state = createPaperState(10);
    assert.equal(tryBuy(state, { ...LIMITS, killSwitch: true }, "A", 1, 1), null);
  });
});
