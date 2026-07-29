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
import type { AssetId, LendTab, NavPage } from "./lib/assets"

export default function App() {
  const [page, setPage] = useState<NavPage>("dashboard")
  const [assetId, setAssetId] = useState<AssetId>("USDC")
  const [lendTab, setLendTab] = useState<LendTab>("supply")

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Toaster position="top-right" theme="system" />
      <Header onOpenProfile={() => setPage("profile")} />
      <Navbar page={page} setPage={setPage} assetId={assetId} setAssetId={setAssetId} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {page === "dashboard" && (
          <div className="panel-wide">
            <Dashboard assetId={assetId} setPage={setPage} setLendTab={setLendTab} />
          </div>
        )}
        {page === "lend" && (
          <div className="panel-wide">
            <LendPanel assetId={assetId} lendTab={lendTab} setLendTab={setLendTab} />
          </div>
        )}
        {page === "swap" && (
          <div className="panel-form">
            <SwapPanel />
          </div>
        )}
        {page === "liquidity" && (
          <div className="panel-wide">
            <LiquidityPanel />
          </div>
        )}
        {page === "portfolio" && (
          <div className="panel-wide">
            <Portfolio assetId={assetId} setPage={setPage} />
          </div>
        )}
        {page === "payments" && (
          <div className="panel-form">
            <SendPanel />
          </div>
        )}
        {page === "bridge" && (
          <div className="panel-form">
            <BridgePanel />
          </div>
        )}
        {page === "profile" && (
          <div className="panel-form">
            <Profile setPage={setPage} />
          </div>
        )}
        {page === "guide" && (
          <div className="panel-wide">
            <Guide />
          </div>
        )}
        {page === "treasury" && (
          <div className="panel-form">
            <Treasury />
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 border-t border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
        Flowlend · Arc · App Kit · Circle Wallet
      </footer>
    </div>
  )
}