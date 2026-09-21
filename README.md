# one-more-candle

Tools for Solana memecoin math: break-even volumes per fee mode, blind-launch hit-rate backtests, seed-hold simulations, and a paper-trading engine with risk limits.

Built by the Candle Cat project. One more candle, then sleep.

## What's inside

- `src/estimate.ts` — required trading volume to cover a spend, per fee mode
- `src/backtest.ts` — blind-launch coverage hit-rates over saved cohorts
- `src/seed-backtest.ts` — buy-first-close, hold-N-days multiples over OHLCV
- `src/quant.ts` — frozen momentum rule set (v1), params on record
- `src/paper.ts` — paper fills with per-bet caps, concurrency caps, daily-loss halt, kill switch

No network calls, no keys, no trading. Research tools only.

## Run

```bash
npm install
npm test
```

## Example

```bash
npx tsx -e "import('./src/estimate.js').then(m => console.log(JSON.stringify(m.estimateRequiredVolume(31155820n), null, 2)))"
```

0.031 SOL spend needs ~3.12 SOL pre-migration volume on Default (1% creator),
~0.62 SOL on High Flat (5%). Units are lamports (1 SOL = 10^9).

## License

MIT — see LICENSE. Not financial advice. Meme project, no utility, no profit promise.
