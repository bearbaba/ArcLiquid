import { toast } from "sonner"
import { ASSETS, type AssetId } from "../lib/assets"

async function addArc() {
  try {
    // @ts-ignore
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x4CEFD2",
          chainName: "Arc Testnet",
          nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
          rpcUrls: ["https://rpc.testnet.arc.network"],
          blockExplorerUrls: ["https://testnet.arcscan.app"],
        },
      ],
    })
    toast.success("Arc Testnet added")
  } catch (e: any) {
    toast.error(e?.message || "Failed to add network")
  }
}

async function importToken(id: AssetId) {
  const a = ASSETS[id]
  try {
    // @ts-ignore
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: a.address,
          symbol: a.symbol,
          decimals: a.decimals,
        },
      },
    })
    toast.success(a.symbol + " imported")
  } catch {
    toast.error("Import failed")
  }
}

export default function Guide() {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">Guide</h1>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3">
          <div className="font-medium text-[var(--text)]">Setup</div>
          <button
            type="button"
            onClick={() => void addArc()}
            className="w-full py-3 rounded-xl bg-cyan-500/10 text-cyan-400 text-sm font-semibold"
          >
            Add Arc Testnet
          </button>
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noreferrer"
            className="block text-center py-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-semibold"
          >
            Circle Faucet
          </a>
          {(["USDC", "EURC", "CIRBTC"] as AssetId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => void importToken(id)}
              className="w-full py-3 rounded-xl bg-white/5 text-sm font-medium border border-[var(--border)]"
            >
              Import {ASSETS[id].symbol}
            </button>
          ))}
          <div className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)] space-y-1">
            <p>1. Add Arc Testnet and import tokens.</p>
            <p>2. Get test USDC from Circle Faucet.</p>
            <p>3. Supply on Lend, then borrow within LTV 80%.</p>
            <p>4. Swap or add LP on Pools.</p>
            <p>5. Unified: Deposit then Spend across chains.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3 text-sm text-[var(--text-muted)]">
          <div className="font-medium text-[var(--text)]">Parameters</div>
          <p>Isolated lending pools per asset.</p>
          <p>LTV 80% · Liquidation threshold 85% · Reserve factor 10%.</p>
          <p>Interest: base 2% · slope1 5% · slope2 80% · optimal util 80%.</p>
          <p>Health factor uses LT 85%. Keep HF above 1.0.</p>
          <p>Swap: constant-product AMM · fee 0.04% · 75% LP / 25% protocol.</p>
          <div className="font-medium text-[var(--text)] pt-2 border-t border-[var(--border)]">
            Pages
          </div>
          <p>
            <span className="text-emerald-400">Dashboard</span> — markets and shortcuts
          </p>
          <p>
            <span className="text-emerald-400">Lend</span> — supply, withdraw, borrow, repay
          </p>
          <p>
            <span className="text-emerald-400">Swap</span> — trade · Open Pools from side panel
          </p>
          <p>
            <span className="text-emerald-400">Pools</span> — add / remove LP · auto ratio
          </p>
          <p>
            <span className="text-emerald-400">Portfolio</span> — balances, lend, LP, history
          </p>
          <p>
            <span className="text-emerald-400">Payments</span> — send on Arc (App Kit / ERC-20)
          </p>
          <p>
            <span className="text-emerald-400">Bridge</span> — USDC CCTP via App Kit
          </p>
          <p>
            <span className="text-emerald-400">Unified</span> — Deposit / Spend · optional Supply
          </p>
          <p>
            <span className="text-emerald-400">Treasury</span> — protocol reserves
          </p>
          <p>
            <span className="text-emerald-400">Profile</span> — points, missions, leaderboard
          </p>
          <a
            href="https://testnet.arcscan.app"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-cyan-400 text-xs pt-2 border-t border-[var(--border)] w-full"
          >
            testnet.arcscan.app
          </a>
        </div>
      </div>
    </div>
  )
}
