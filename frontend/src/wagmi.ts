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
        'https://5042002.rpc.thirdweb.com',
        'https://rpc.quicknode.testnet.arc.network',
        'https://rpc.testnet.arc.network',
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
      http('https://5042002.rpc.thirdweb.com'),
      http('https://rpc.quicknode.testnet.arc.network'),
      http('https://rpc.testnet.arc.network'),
    ]),
  },
  ssr: false,
})