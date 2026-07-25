\# Flowlend



Lending protocol on Circle Arc Testnet with multi-asset pools and stablecoin swap.



\## Features



\- Lending pools: Supply / Withdraw / Borrow / Repay

\- Assets: USDC, EURC, cirBTC

\- Swap: USDC ↔ EURC via SimpleStableSwap

\- Compliance: Screen wallet against Arc USDC blocklist

\- Health Factor and utilization metrics



\## Live Demo



https://flowlend-silk.vercel.app



\## Tech Stack



\- React + Vite + TypeScript

\- wagmi + viem + RainbowKit

\- Tailwind CSS

\- Arc Testnet (chain ID 5042002)



\## Contracts (Arc Testnet)



| Contract | Address |

|----------|---------|

| USDC Pool | 0x1CA2e7B022f13A546Deb665901A8EfE8d407d864 |

| EURC Pool | 0x4455eb4351936996B71fa87425037d7f744F40A2 |

| cirBTC Pool | 0x75EA2cFAb03B92822Be363853643E0a538Ab275C |

| SimpleStableSwap | 0x4ff36f84A850A5A9DB826fA4Cd49E21128503CE8 |



\## Getting Started



\### Install



cd frontend

npm install



\### Run locally



npm run dev



\### Connect wallet



1\. Add Arc Testnet to MetaMask

2\. Get test tokens from https://faucet.circle.com

3\. Import USDC / EURC / cirBTC tokens



\## Project Structure



frontend/

&#x20; src/

&#x20;   App.tsx           Main UI

&#x20;   lib/circleKit.ts  Swap helpers + network helper

&#x20;   wagmi.ts          wagmi config



\## Notes



\- Gas on Arc Testnet is paid in USDC

\- Swap uses on-chain SimpleStableSwap contract

\- Bridge tab is placeholder for future CCTP integration



\## License



MIT

