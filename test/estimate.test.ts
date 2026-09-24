import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateRequiredVolume, FEE_MODES } from "../src/estimate.js";

describe("estimateRequiredVolume", () => {
  it("computes ceiling volumes per fee mode", () => {
    const rows = estimateRequiredVolume(31_155_820n);
    const byMode = Object.fromEntries(rows.map((row) => [row.mode, row]));
    assert.equal(byMode["default"]!.preVolumeLamports, "3115582000");
    assert.equal(byMode["default"]!.postVolumeLamports, "4154109334");
    assert.equal(byMode["high-flat"]!.preVolumeLamports, "623116400");
  });

  it("covers all seven documented Bags fee modes", () => {
    assert.equal(FEE_MODES.length, 7);
    assert.deepEqual(FEE_MODES.map((mode) => mode.id), [
      "default",
      "low-pre-high-post",
      "high-pre-low-post",
      "high-flat",
      "flat-85pct-locked",
      "default-1k-supply",
      "flat-96pct-locked",
    ]);
  });

  it("matches the documented creator shares", () => {
    const byMode = Object.fromEntries(FEE_MODES.map((mode) => [mode.id, mode]));
    // docs: 0.25% total -> 0.125% creator; 1% total -> 0.5%; 10% total -> 5%
    assert.equal(Number(byMode["low-pre-high-post"]!.preNum) / Number(byMode["low-pre-high-post"]!.preDen), 0.00125);
    assert.equal(Number(byMode["high-pre-low-post"]!.preNum) / Number(byMode["high-pre-low-post"]!.preDen), 0.005);
    assert.equal(Number(byMode["high-flat"]!.preNum) / Number(byMode["high-flat"]!.preDen), 0.05);
    // post-migration creator shares after compounding
    assert.equal(Number(byMode["low-pre-high-post"]!.postNum) / Number(byMode["low-pre-high-post"]!.postDen), 0.0025);
    assert.equal(Number(byMode["high-pre-low-post"]!.postNum) / Number(byMode["high-pre-low-post"]!.postDen), 0.000625);
    assert.equal(Number(byMode["high-flat"]!.postNum) / Number(byMode["high-flat"]!.postDen), 0.025);
  });

  it("keeps the wallet rate identical across default and supply-locked modes", () => {
    const rows = estimateRequiredVolume(31_155_820n);
    const byMode = Object.fromEntries(rows.map((row) => [row.mode, row]));
    for (const id of ["flat-85pct-locked", "default-1k-supply", "flat-96pct-locked"]) {
      assert.equal(byMode[id]!.preVolumeLamports, byMode["default"]!.preVolumeLamports);
      assert.equal(byMode[id]!.postVolumeLamports, byMode["default"]!.postVolumeLamports);
    }
  });

  it("reports a graduation threshold for every mode", () => {
    for (const mode of FEE_MODES) {
      assert.ok(mode.graduationSol > 0, `${mode.id} needs a graduation threshold`);
    }
  });

  it("rejects a non-positive spend", () => {
    assert.throws(() => estimateRequiredVolume(0n));
  });
});
