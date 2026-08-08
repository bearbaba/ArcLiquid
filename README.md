# Flowlend

**Permissionless Isolated Money Markets + Constant-Product AMM on Arc Testnet**

Built for the **Arc × Encode Club – Programmable Money Hackathon** (DeFi Track)

**Live Demo:** [https://flowlendarcliquid.vercel.app](https://flowlendarcliquid.vercel.app)

---

## Overview

Flowlend is a permissionless money market protocol built natively on Arc (Circle’s stablecoin-native L1).  

It features isolated lending pools for USDC, EURC, and cirBTC, combined with a constant-product AMM and deep integration with Circle App Kit (Payments, Bridge via CCTP, and Unified Balance).

---

## Features

- **Lending** — Supply, Withdraw, Borrow, Repay, Health Factor  
  - LTV 80% · Liquidation Threshold 85% · Reserve Factor 10%  
  - Interest model: base 2% · slope1 5% · slope2 80% · optimal utilization 80%

- **Swap** — USDC / EURC / cirBTC  
  - Constant-product AMM · fee 0.04% · 75% to LPs / 25% protocol

- **Liquidity Pools** — Add / remove liquidity · auto ratio · share percentage · fee APR

- **Portfolio** — Wallet balances · lending positions · LP positions · transaction history

- **Payments** — Send tokens on Arc (USDC via App Kit, EURC/cirBTC via ERC-20)

- **Bridge** — USDC CCTP via Circle App Kit

- **Unified Balance** — Deposit / Spend USDC across chains + optional Supply / Repay into Arc lending

- **Treasury** — Protocol fee tracking

- **Profile** — Points, missions & leaderboard

- **Guide** — Add Arc Testnet, faucet, import tokens, protocol parameters

---

## What this is NOT

- Not multi-collateral cross-asset lending  
- Not a Curve-style stable swap  
- Not audited — testnet only

---

## Network

| Parameter     | Value                                      |
|---------------|--------------------------------------------|
| Network       | Arc Testnet                                |
| Chain ID      | 5042002 (0x4CEF52)                         |
| RPC           | https://rpc.testnet.arc.network            |
| Explorer      | https://testnet.arcscan.app                |
| Faucet        | https://faucet.circle.com                  |
| Gas Token     | USDC                                       |

---

## Deployed Contracts (Arc Testnet – Verified)

| Contract              | Address                                      |
|-----------------------|----------------------------------------------|
| USDC LendingPool      | 0x50A452cD83E526400C763388c0642e6a14335319   |
| EURC LendingPool      | 0x73a569D240289DAAc4f947bC3c6bd532bb7A748C   |
| cirBTC LendingPool    | 0xE8cb6B0F90B45776FBfA0E34a3db429449cFEdcF   |
| Swap USDC-EURC        | 0x34c8CAC3B240960D262C1B1D25Fff6020d659721   |
| Swap USDC-cirBTC      | 0xE3581342A940894Cd02e5c7D6c5C4aa619d2BA24   |
| Swap EURC-cirBTC      | 0x771C49a002C4E7A4872bd7aE90F1cE6B9f3A3FF6   |

**Tokens**

| Token   | Address                                      |
|---------|----------------------------------------------|
| USDC    | 0x3600000000000000000000000000000000000000   |
| EURC    | 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a   |
| cirBTC  | 0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF   |

Treasury (protocol fee 25%): `0xE89C45eCaE19ff852eC1724C85F193AE12ED0C0A`

---

## Tech Stack

- **Smart Contracts**: Solidity 0.8.20 + Foundry + OpenZeppelin  
- **Frontend**: React + TypeScript + Vite + Tailwind  
- **Web3**: Wagmi v2 + Viem + RainbowKit  
- **Circle**: Circle App Kit  
- **Deploy**: Vercel

---

## Run Locally

```bash
cd frontend
npm install
npm run dev

```
## License

Copyright (c) 2026 Flowlend.

This project is provided for hackathon and educational purposes only (testnet).
Commercial use requires prior written permission.




