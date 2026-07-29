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
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Guide</h1>

      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
        <button
          onClick={async () => {
            try {
              await ensureArcRpc()
              toast.success("Arc ready")
            } catch (e: any) {
              toast.error(e?.message || "Failed")
            }
          }}
          className="w-full py-3 rounded-xl bg-cyan-500/10 text-cyan-400 text-sm"
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
            onClick={() => importToken(id)}
            className="w-full py-3 rounded-xl bg-white/5 text-sm"
          >
            Import {ASSETS[id].symbol}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 text-sm text-zinc-400 space-y-3">
        <div className="font-medium text-[var(--text)]">How to use</div>
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

      <div className="text-xs text-zinc-500 flex items-center gap-2">
        <Link2 size={14} /> testnet.arcscan.app
      </div>
    </div>
  )
}