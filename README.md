# one-more-candle

Tools for Solana memecoin math: break-even volumes per fee mode, blind-launch hit-rate backtests, seed-hold simulations, a paper-trading engine with risk limits, and an edge-evaluation harness.

Built by the Candle Cat project. One more candle, then sleep.

## What's inside

| Module | Purpose |
|---|---|
| `src/estimate.ts` | Required trading volume to cover a spend, across all 7 documented Bags fee modes, with graduation thresholds |
| `src/backtest.ts` | Blind-launch coverage hit-rates over saved cohorts (survivor-biased; labeled) |
| `src/seed-backtest.ts` | Buy-first-close, hold-N-days multiples over OHLCV candles |
| `src/quant.ts` | Frozen momentum rule set (v1), parameters on record |
| `src/paper.ts` | Paper fills with per-bet caps, concurrency caps, daily-loss halt, kill switch, configurable fee rate |
| `src/edge.ts` | Fee-floor math and empirical edge evaluation for a momentum rule |

No network calls, no keys, no trading. Research tools only.

## Run

```bash
npm install
npm test
```

## Example: what does a launch actually cost you?

```bash
npx tsx -e "import('./src/estimate.js').then(m => console.table(m.estimateRequiredVolume(31155820n)))"
```

A `0.031155820 SOL` launch (fee-share + curve-config + manager + launch on the
Bags default curve) needs this much external quote volume just to break even,
**before** claim transaction costs:

| Mode | Pre-migration | Post-migration | Graduation |
|---|---:|---:|---:|
| default | 3.1156 SOL | 4.1541 SOL | 85 SOL |
| low-pre-high-post | 24.9247 SOL | 12.4623 SOL | 85 SOL |
| high-pre-low-post | 6.2312 SOL | 49.8493 SOL | 85 SOL |
| high-flat | 0.6231 SOL | 1.2462 SOL | 85 SOL |
| 2% flat, 85% supply locked | 3.1156 SOL | 4.1541 SOL | ~100 SOL |
| default, 1K supply | 3.1156 SOL | 4.1541 SOL | 85 SOL |
| 2% base, 96% supply locked | 3.1156 SOL | 4.1541 SOL | 55 SOL |

Two things this table is usually misread as:

- **The creator rate is not the total fee rate.** Default is a 2% total swap
  fee split 1% / 1% between platform and creator pre-migration. `high-flat` is a
  10% total fee, so the creator's 5% needs 5x less volume — but 10% per swap is
  a heavy tax that suppresses the volume you are counting on.
- **Fee mode is fixed at launch.** You cannot switch CCAT to `high-flat` after
  the fact.

### Deployer fees (SOL fee-share v2)

The wallet that pays to create a fee-share config is also registered as a
separate **deployer** and receives 25% of the gross claimers pool before the
recipient allocations divide the remaining 75%. If that same wallet is also the
sole 10000-bps recipient, the two shares sum back to 100% of the pool — the
deployer cut does not reduce what a sole creator receives. It only reduces what
*other* recipients receive. `estimate.ts` reflects this: the rates above are
what a sole creator-and-payer wallet actually earns.

## Why this exists

This repo is the arithmetic behind one failed experiment. We launched
`Candle Cat` on Bags for `0.031155820 SOL`, reached **zero swaps and zero
fees**, and needed `3.1156 SOL` of external volume to recover it. The
arithmetic was never the hard part; distribution was. Publishing the tools is
the honest version of the post-mortem.

## License

MIT — see LICENSE. Not financial advice. Meme project, no utility, no profit promise.
