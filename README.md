# Flowlend

Permissionless isolated money markets + constant-product swap on Arc Testnet.

**Live demo:** https://flowlendarcliquid.vercel.app/

Built for the Arc / Circle ecosystem hackathon.

---

## Why Flowlend?

- Built natively for Arc Testnet (Circle Economic OS)
- Isolated lending pools per asset (USDC, EURC, cirBTC)
- Fair LP shares on the AMM
- Circle App Kit for Payments, Bridge, and Unified Balance

---

## Features

**Lending** — Supply, Withdraw, Borrow, Repay, Health Factor  
- LTV 80% · Liquidation threshold 85% · Reserve factor 10%  
- Interest: base 2% · slope1 5% · slope2 80% · optimal utilization 80%

**Swap** — USDC / EURC / cirBTC  
- Constant-product AMM · fee 0.04% · 75% LP / 25% protocol

**Pools** — Add / remove liquidity · auto ratio · share percentage · fee APR from volume when available

**Portfolio** — Wallet balances · all lend positions · LP positions · local tx history

**Payments** — Send on Arc (USDC via App Kit · EURC/cirBTC ERC-20) · gas only

**Bridge** — USDC CCTP via Circle App Kit

**Unified** — Deposit / Spend USDC across chains · optional Supply / Repay into Arc lending

**Treasury** — Protocol address · holdings · revenue sources

**Profile** — Points, missions, leaderboard

**Guide** — Add Arc Testnet · faucet · import tokens · parameters

---

## What this is NOT

- Not multi-collateral cross-asset lending
- Not a Curve-style stable swap
- Not audited — testnet only

---

## Network

| Parameter | Value |
|-----------|--------|
| Network | Arc Testnet |
| Chain ID | 5042002 (0x4CEF52) |
| RPC | https://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://faucet.circle.com |
| Gas token | USDC |

---

## Deployed contracts (testnet, verified)

| Contract | Address |
|----------|---------|
| USDC LendingPool | 0x50A452cD83E526400C763388c0642e6a14335319 |
| EURC LendingPool | 0x73a569D240289DAAc4f947bC3c6bd532bb7A748C |
| cirBTC LendingPool | 0xE8cb6B0F90B45776FBfA0E34a3db429449cFEdcF |
| Swap USDC-EURC | 0x34c8CAC3B240960D262C1B1D25Fff6020d659721 |
| Swap USDC-cirBTC | 0xE3581342A940894Cd02e5c7D6c5C4aa619d2BA24 |
| Swap EURC-cirBTC | 0x771C49a002C4E7A4872bd7aE90F1cE6B9f3A3FF6 |

Tokens (Arc Testnet):

| Token | Address |
|-------|---------|
| USDC | 0x3600000000000000000000000000000000000000 |
| EURC | 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a |
| cirBTC | 0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF |

Treasury (swap protocol fee 25%): `0xE89C45eCaE19ff852eC1724C85F193AE12ED0C0A`

---

## Tech stack

- Contracts: Solidity 0.8.20 + Foundry + OpenZeppelin
- Frontend: React + TypeScript + Vite + Tailwind
- Web3: Wagmi v2 + Viem + RainbowKit
- App Kit: Circle App Kit
- Deploy: Vercel

---

## Run locally

```bash
cd frontend
npm install
npm run dev
---

## License

MIT License

Copyright (c) 2026 Flowlend

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
