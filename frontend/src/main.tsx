import { Buffer } from "buffer"
import process from "process"

;(window as any).Buffer = Buffer
;(window as any).process = process
;(window as any).global = window

import React from "react"
import ReactDOM from "react-dom/client"
import { WagmiProvider, http } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit"
import "@rainbow-me/rainbowkit/styles.css"
import { ThemeProvider } from "./lib/theme"
import App from "./App"
import "./index.css"

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://5042002.rpc.thirdweb.com"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
} as const

const config = getDefaultConfig({
  appName: "Flowlend",
  projectId: "flowlend-testnet",
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http("https://5042002.rpc.thirdweb.com"),
  },
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <App />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  </React.StrictMode>
)