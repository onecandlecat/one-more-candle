import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { momEntry, momSignal } from "../src/quant.js";

describe("quant v1", () => {
  it("enters on +15% 24h momentum", () => {
    assert.equal(momEntry(100, 115), true);
    assert.equal(momEntry(100, 114), false);
  });

  it("exits on stop, profit, or time", () => {
    assert.equal(momSignal(100, 0, 80, 3600), "exit-stop");
    assert.equal(momSignal(100, 0, 150, 3600), "exit-profit");
    assert.equal(momSignal(100, 0, 105, 7 * 3600), "exit-time");
    assert.equal(momSignal(100, 0, 105, 3600), "hold");
  });
});
