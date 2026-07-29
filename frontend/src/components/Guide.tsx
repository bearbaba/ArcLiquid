import { Link2 } from "lucide-react"
import { toast } from "sonner"
import { ensureArcRpc } from "../lib/circleKit"
import { ASSETS, type AssetId } from "../lib/assets"

export default function Guide() {
  const importToken = async (id: AssetId) => {
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
      toast.success(`${a.symbol} imported`)
    } catch {
      toast.error("Import failed")
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Guide</h1>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-7 space-y-4">
        <button
          onClick={async () => {
            try {
              await ensureArcRpc()
              toast.success("Arc ready")
            } catch (e: any) {
              toast.error(e?.message || "Failed")
            }
          }}
          className="w-full py-3.5 rounded-2xl bg-cyan-500/10 text-cyan-400 text-sm font-semibold"
        >
          Add Arc Testnet
        </button>

        <a
          href="https://faucet.circle.com"
          target="_blank"
          rel="noreferrer"
          className="block text-center py-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 text-sm font-semibold"
        >
          Circle Faucet
        </a>

        {(["USDC", "EURC", "CIRBTC"] as AssetId[]).map((id) => (
          <button
            key={id}
            onClick={() => importToken(id)}
            className="w-full py-3.5 rounded-2xl bg-white/5 text-sm font-medium border border-[var(--border)]"
          >
            Import {ASSETS[id].symbol}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-7 text-sm text-[var(--text-muted)] space-y-4">
        <div className="font-medium text-base text-[var(--text)]">How to use</div>
        <p>
          <span className="text-emerald-400 font-medium">Dashboard</span> — pool stats and your health.
        </p>
        <p>
          <span className="text-emerald-400 font-medium">Lend</span> — Supply / Withdraw / Borrow / Repay.
        </p>
        <p>
          <span className="text-emerald-400 font-medium">Swap</span> — Trade tokens with slippage control.
        </p>
        <p>
          <span className="text-emerald-400 font-medium">Liquidity</span> — Add or remove liquidity.
        </p>
        <p>
          <span className="text-emerald-400 font-medium">Portfolio</span> — Overview of positions.
        </p>
        <p>
          <span className="text-emerald-400 font-medium">Payments / Bridge</span> — Powered by Circle App Kit.
        </p>
        <p>
          <span className="text-emerald-400 font-medium">Profile</span> — Points, missions and leaderboard.
        </p>
      </div>

      <div className="text-sm text-[var(--text-muted)] flex items-center gap-2">
        <Link2 size={16} /> testnet.arcscan.app
      </div>
    </div>
  )
}