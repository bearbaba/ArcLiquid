import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http, fallback } from 'wagmi'
import { defineChain } from 'viem'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        'https://rpc.testnet.arc.network',
        'https://rpc.blockdaemon.testnet.arc.network',
        'https://5042002.rpc.thirdweb.com',
        'https://rpc.drpc.testnet.arc.network',
      ],
    },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
})

export const config = getDefaultConfig({
  appName: 'Flowlend',
  projectId: '13d1dd812b4dd10a1d67aba4c9431081',
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: fallback([
      http('https://rpc.testnet.arc.network', { timeout: 8000, retryCount: 1 }),
      http('https://rpc.blockdaemon.testnet.arc.network', { timeout: 8000, retryCount: 1 }),
      http('https://5042002.rpc.thirdweb.com', { timeout: 8000, retryCount: 1 }),
      http('https://rpc.drpc.testnet.arc.network', { timeout: 8000, retryCount: 1 }),
    ]),
  },
  ssr: false,
})
