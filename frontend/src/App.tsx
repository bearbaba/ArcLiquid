import { useState, useEffect } from "react"
import { useAccount, useChainId, useSwitchChain } from "wagmi"

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

import { ASSETS, type NavPage, type AssetId, type LendTab } from "./lib/assets"
import { getPoints } from "./lib/points"

const ARC_CHAIN_ID = 5042002

export default function App() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [page, setPage] = useState<NavPage>("dashboard")
  const [lendTab, setLendTab] = useState<LendTab>("supply")
  const [assetId, setAssetId] = useState<AssetId>("USDC")
  const [points, setPoints] = useState(() =>
    typeof window !== "undefined" ? getPoints() : 0
  )

  useEffect(() => {
    if (isConnected && chainId !== ARC_CHAIN_ID) {
      switchChain?.({ chainId: ARC_CHAIN_ID })
    }
  }, [isConnected, chainId, switchChain])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Header points={points} onProfileClick={() => setPage("profile")} />
      <Navbar page={page} setPage={setPage} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {(page === "dashboard" || page === "lend") && (
          <div className="mb-6 flex flex-wrap gap-2">
            {(Object.keys(ASSETS) as AssetId[]).map((id) => (
              <button
                key={id}
                onClick={() => setAssetId(id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                  assetId === id
                    ? "bg-white text-black border-white"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                {ASSETS[id].symbol}
              </button>
            ))}
          </div>
        )}

        {page === "dashboard" && (
          <Dashboard
            assetId={assetId}
            setPage={setPage}
            setLendTab={setLendTab}
          />
        )}

        {page === "lend" && (
          <LendPanel
            assetId={assetId}
            lendTab={lendTab}
            setLendTab={setLendTab}
          />
        )}

        {page === "swap" && <SwapPanel />}

        {page === "liquidity" && <LiquidityPanel />}

        {page === "portfolio" && (
          <Portfolio assetId={assetId} setPage={setPage} />
        )}

        {page === "payments" && (
          <div className="max-w-xl mx-auto rounded-2xl border border-white/5 bg-white/[0.03] p-6">
            <SendPanel />
          </div>
        )}

        {page === "bridge" && (
          <div className="max-w-xl mx-auto space-y-4">
            <div>
              <h1 className="text-2xl font-semibold">Bridge</h1>
              <p className="text-sm text-zinc-500 mt-1">
                CCTP USDC · Circle App Kit
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <BridgePanel />
            </div>
          </div>
        )}

        {page === "profile" && <Profile setPage={setPage} />}

        {page === "guide" && <Guide />}

        {page === "treasury" && <Treasury />}

        <div className="mt-12 pt-6 border-t border-white/5 text-center text-xs text-zinc-600">
          Flowlend · Arc · App Kit · Circle
        </div>
      </main>
    </div>
  )
}