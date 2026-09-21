import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateRequiredVolume } from "../src/estimate.js";

describe("estimateRequiredVolume", () => {
  it("computes ceiling volumes per fee mode", () => {
    const rows = estimateRequiredVolume(31_155_820n);
    const byMode = Object.fromEntries(rows.map((row) => [row.mode, row]));
    assert.equal(byMode["default"]!.preVolumeLamports, "3115582000");
    assert.equal(byMode["default"]!.postVolumeLamports, "4154109334");
    assert.equal(byMode["high-flat"]!.preVolumeLamports, "623116400");
  });
});
