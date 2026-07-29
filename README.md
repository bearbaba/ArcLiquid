# Flowlend

Permissionless isolated money markets + constant-product swap on Arc Testnet.

**Live demo:** https://flowlendarcliquid.vercel.app/

Built for the Arc / Circle ecosystem hackathon.

---

## Why Flowlend?

- Built natively for Arc Testnet (Circle Economic OS)
- Isolated lending pools per asset
- Fair LP shares
- Circle App Kit for send and bridge

---

## Features

**Lending** — Supply, Withdraw, Borrow, Repay, Health Factor, LTV 75%

**Swap** — USDC / EURC / cirBTC, constant-product, fee 0.04%

**Liquidity** — Add and remove with share percentage

**Payments and Bridge** — Send on Arc, bridge USDC across testnets

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
| Chain ID | 5042002 |
| RPC | https://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://faucet.circle.com |

---

## Deployed contracts (testnet)

| Contract | Address |
|----------|---------|
| USDC Lending Pool | 0x1CA2e7B022f13A546Deb665901A8EfE8d407d864 |
| EURC Lending Pool | 0x4455eb4351936996B71fa87425037d7f744F40A2 |
| cirBTC Lending Pool | 0x75EA2cFAb03B92822Be363853643E0a538Ab275C |
| Swap pools | See frontend/src/lib/assets.ts |

---

## Tech stack

- Contracts: Solidity 0.8.20 + Foundry
- Frontend: React + TypeScript + Vite + Tailwind
- Web3: Wagmi v2 + Viem + RainbowKit
- App Kit: Circle App Kit
- Deploy: Vercel

---

## Run locally

cd frontend
npm install
npm run dev

Open http://localhost:5173

---

## Contract tests

cd contracts
forge test -vv

---

## Hackathon notes

- Scope: isolated lend + AMM swap + App Kit on Arc Testnet
- Oracle scaffold in contracts/src/oracle for a future version
- Clear approve then action flows and transaction feedback

---

## License

MIT