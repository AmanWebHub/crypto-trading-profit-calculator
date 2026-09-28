# Crypto Trading Profit Calculator

A clean React + Vite calculator for spot-style crypto trades.

## Included calculations

- Asset selector (SOL, BTC, USDT, USDC)
- Initial amount
- Entry price
- Stop-loss price
- Take-profit price
- Trading fee per side
- Position quantity
- Entry fee
- Exit fee
- Gross P&L
- Net P&L after fees
- ROI after fees
- Break-even exit price
- Net risk/reward

## Formula

Position size:

`quantity = initial amount / entry price`

Entry fee:

`entry fee = initial amount × fee rate`

Exit fee:

`exit fee = exit value × fee rate`

Net P&L:

`net P&L = exit value − initial amount − entry fee − exit fee`

The calculator assumes a simple spot-style trade. It does not include leverage, funding, spread, slippage, taxes, or withdrawal fees.

## Run locally

Install Node.js, then:

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```
