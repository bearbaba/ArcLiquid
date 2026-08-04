import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http, fallback } from 'wagmi'
import { defineChain } from 'viem'

const OFFICIAL_RPC = 'https://rpc.testnet.arc.network'
const PRIVATE_RPC = import.meta.env.VITE_ARC_RPC as string | undefined

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        OFFICIAL_RPC,
        ...(PRIVATE_RPC ? [PRIVATE_RPC] : []),
        'https://rpc.drpc.testnet.arc.network',
        'https://rpc.blockdaemon.testnet.arc.network',
        'https://5042002.rpc.thirdweb.com',
      ],
    },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
})

const rpcList = [
  http(OFFICIAL_RPC, { timeout: 10_000, retryCount: 2 }),
  ...(PRIVATE_RPC ? [http(PRIVATE_RPC, { timeout: 10_000, retryCount: 2 })] : []),
  http('https://rpc.drpc.testnet.arc.network', { timeout: 10_000, retryCount: 2 }),
  http('https://rpc.blockdaemon.testnet.arc.network', { timeout: 10_000, retryCount: 2 }),
  http('https://5042002.rpc.thirdweb.com', { timeout: 10_000, retryCount: 2 }),
]

export const config = getDefaultConfig({
  appName: 'Flowlend',
  projectId: '13d1dd812b4dd10a1d67aba4c9431081',
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: fallback(rpcList),
  },
  ssr: false,
})
