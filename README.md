# Flowlend

Permissionless isolated money markets + constant-product swap on Arc Testnet.

Live: https://flowlend-silk.vercel.app/

## What it is

- Lending: one pool per asset (USDC / EURC / cirBTC). Supply and borrow the same asset. LTV 75%, health factor, liquidation.
- Swap: constant-product (x*y=k), fee 0.04%, slippage guard.
- Liquidity: add/remove LP shares.
- Payments / Bridge: Circle App Kit (browser wallet).

## What it is NOT

- Not multi-collateral cross-asset (cannot supply USDC and borrow EURC in one position).
- Swap is not Curve-style stable invariant.
- No external oracle required today (each lend pool is single-asset).
- Not audited. Testnet only.

## Network

- Network: Arc Testnet
- Chain ID: 5042002
- RPC: https://rpc.testnet.arc.network
- Explorer: https://testnet.arcscan.app
- Faucet: https://faucet.circle.com

## Run frontend

cd frontend
npm install
npm run dev

## Run contract tests

cd contracts
forge test -vv

## License

MIT
