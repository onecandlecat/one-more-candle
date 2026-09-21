import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPaperState, tryBuy, trySell, type RiskLimits } from "../src/paper.js";

const LIMITS: RiskLimits = { maxPerBetSol: 1, maxConcurrent: 2, dailyLossHaltSol: 5, killSwitch: false };

describe("paper engine", () => {
  it("buys within size and concurrency limits", () => {
    const state = createPaperState(10);
    assert.ok(tryBuy(state, LIMITS, "A", 1, 1));
    assert.ok(tryBuy(state, LIMITS, "B", 1, 1));
    assert.equal(tryBuy(state, LIMITS, "C", 1, 1), null);
    assert.equal(tryBuy(state, LIMITS, "A", 1, 1), null);
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
