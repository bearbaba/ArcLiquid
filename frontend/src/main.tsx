import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './wagmi'
import { Toaster } from 'sonner'
import { SpeedInsights } from '@vercel/speed-insights/react'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-center" richColors />
        <SpeedInsights />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
