import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hitRates } from "../src/backtest.js";

describe("hitRates", () => {
  it("counts coverage hits per cost threshold", () => {
    const result = hitRates(
      [
        { tokenMint: "A", name: "a", lifetimeFeesLamports: 100n },
        { tokenMint: "B", name: "b", lifetimeFeesLamports: 30n },
        { tokenMint: "C", name: "c", lifetimeFeesLamports: 0n },
      ],
      [31n, 100n],
    );
    assert.equal(result.tokens, 3);
    assert.equal(result.totalFeesLamports, "130");
    assert.deepEqual(result.hitRateByCost[0], { costLamports: "31", hits: 1, hitRateBps: 3333 });
    assert.deepEqual(result.hitRateByCost[1], { costLamports: "100", hits: 1, hitRateBps: 3333 });
  });
});
