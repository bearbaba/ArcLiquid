import { useState } from "react"
import { Toaster } from "sonner"
import Header from "./components/Header"
import Navbar from "./components/Navbar"
import Dashboard from "./components/Dashboard"
import LendPanel from "./components/LendPanel"
import SwapPanel from "./components/SwapPanel"
import LiquidityPanel from "./components/LiquidityPanel"
import Portfolio from "./components/Portfolio"
import SendPanel from "./components/SendPanel"
import BridgePanel from "./components/BridgePanel"
import Profile from "./components/Profile"
import Guide from "./components/Guide"
import Treasury from "./components/Treasury"
import UnifiedBalancePanel from "./components/UnifiedBalancePanel"
import type { AssetId, LendTab, NavPage } from "./lib/assets"

export default function App() {
  const [page, setPage] = useState<NavPage>("dashboard")
  const [assetId, setAssetId] = useState<AssetId>("USDC")
  const [lendTab, setLendTab] = useState<LendTab>("supply")

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Toaster position="top-right" theme="system" />
      <Header onOpenProfile={() => setPage("profile")} />
      <Navbar page={page} setPage={setPage} />

      <main className="max-w-[1400px] mx-auto px-6 py-6 w-full">
        {page === "dashboard" && (
          <Dashboard
            assetId={assetId}
            setAssetId={setAssetId}
            setPage={setPage}
            setLendTab={setLendTab}
          />
        )}
        {page === "lend" && (
          <LendPanel
            assetId={assetId}
            setAssetId={setAssetId}
            lendTab={lendTab}
            setLendTab={setLendTab}
          />
        )}
        {page === "swap" && <SwapPanel setPage={setPage} />}
        {page === "liquidity" && <LiquidityPanel />}
        {page === "portfolio" && (
          <Portfolio assetId={assetId} setPage={setPage} />
        )}
        {page === "payments" && <SendPanel />}
        {page === "bridge" && <BridgePanel />}
        {page === "unified" && (
          <UnifiedBalancePanel setPage={setPage} setLendTab={setLendTab} setAssetId={setAssetId} />
        )}
        {page === "profile" && <Profile setPage={setPage} />}
        {page === "guide" && <Guide />}
        {page === "treasury" && <Treasury />}
      </main>

      <footer className="mt-12 py-6 border-t border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
        Flowlend · Arc · App Kit · Circle Wallet
      </footer>
    </div>
  )
}