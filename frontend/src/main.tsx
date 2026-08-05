import { Buffer } from "buffer"
import process from "process"

;(window as any).Buffer = Buffer
;(window as any).process = process
;(window as any).global = window

import React from "react"
import ReactDOM from "react-dom/client"
import { WagmiProvider, http, fallback } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit"
import "@rainbow-me/rainbowkit/styles.css"
import { sepolia, baseSepolia } from "viem/chains"
import { ThemeProvider } from "./lib/theme"
import App from "./App"
import "./index.css"

const ARC_RPCS = [
  "https://5042002.rpc.thirdweb.com",
  "https://rpc.blockdaemon.testnet.arc.network",
  "https://rpc.drpc.testnet.arc.network",
] as const

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [...ARC_RPCS] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
} as const

const config = getDefaultConfig({
  appName: "Flowlend",
  projectId: "13d1dd812b4dd10a1d67aba4c9431081",
  chains: [arcTestnet, sepolia, baseSepolia],
  transports: {
    [arcTestnet.id]: fallback(
      ARC_RPCS.map((url) =>
        http(url, {
          timeout: 12_000,
          retryCount: 2,
          retryDelay: 1000,
        })
      )
    ),
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com", {
      timeout: 12_000,
      retryCount: 2,
    }),
    [baseSepolia.id]: http("https://sepolia.base.org", {
      timeout: 12_000,
      retryCount: 2,
    }),
  },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 15_000,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider locale="en-US">
            <App />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  </React.StrictMode>
)