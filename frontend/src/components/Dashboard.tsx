import { TrendingUp, TrendingDown, Activity, Percent, AlertTriangle } from "lucide-react"
import {
  ASSETS,
  PAIR_CONFIG,
  formatAmt,
  formatHealth,
  formatApy,
  formatUtil,
  type AssetId,
  type SwapPair,
  type NavPage,
  type LendTab,
} from "../lib/assets"
import { usePoolData } from "../hooks/usePoolData"
import { formatFeeAprLabel } from "../hooks/usePoolFeeApr"

interface DashboardProps {
  assetId: AssetId
  setAssetId: (id: AssetId) => void
  setPage: (page: NavPage) => void
  setLendTab: (tab: LendTab) => void
}

export default function Dashboard({ assetId, setAssetId, setPage, setLendTab }: DashboardProps) {
  const {
    poolLive,
    totalSupply,
    totalDebt,
    util,
    baseRate,
    slope1,
    slope2,
    optimalUtil,
    reserveFactor,
    userSupply,
    userDebt,
    health,
  } = usePoolData(assetId)

  const asset = ASSETS[assetId]
  const healthValue = formatHealth(health)
  const healthNum = healthValue === "∞" ? 999 : Number(healthValue)
  const utilNumber = util ? Number(util) / 1e18 : 0

  const getHealthColor = () =>
    healthNum >= 1.5 ? "text-emerald-400" : healthNum >= 1.1 ? "text-yellow-400" : "text-red-400"
  const getUtilColor = () =>
    utilNumber > 0.8 ? "text-red-400" : utilNumber > 0.5 ? "text-yellow-400" : "text-emerald-400"

  let borrowApy = 0n
  let supplyApy = 0n
  if (baseRate && slope1 && slope2 && optimalUtil) {
    const utilization = util ?? 0n
    if (utilization <= optimalUtil) {
      borrowApy = baseRate + (slope1 * utilization) / 10n ** 18n
    } else {
      borrowApy = baseRate + slope1 + (slope2 * (utilization - optimalUtil)) / 10n ** 18n
    }
    const rf = reserveFactor ?? 0n
    supplyApy =
      (borrowApy * utilization * (10n ** 18n - rf)) / (10n ** 18n * 10n ** 18n)
  }

  const showHfWarning = healthNum < 1.5 && healthValue !== "∞"
  const showUtilWarning = utilNumber > 0.8

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(["USDC", "EURC", "CIRBTC"] as AssetId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setAssetId(id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                assetId === id
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black"
                  : "border border-[var(--border)] text-[var(--text-muted)]"
              }`}
            >
              {ASSETS[id].symbol}
            </button>
          ))}
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          Viewing · <span className="text-[var(--text)] font-medium">{asset.symbol}</span>
        </div>
      </div>

      {showHfWarning && (
        <div
          className={`p-4 rounded-2xl border text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            healthNum < 1.1
              ? "bg-red-500/10 border-red-500/30 text-red-200"
              : "bg-amber-500/10 border-amber-500/30 text-amber-200"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">
                {healthNum < 1.1 ? "High liquidation risk" : "Health factor needs attention"}
              </div>
              <div className="text-xs opacity-80 mt-0.5">
                HF {healthValue} · {asset.symbol}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPage("lend")
                setLendTab("repay")
              }}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold"
            >
              Repay
            </button>
            <button
              type="button"
              onClick={() => {
                setPage("lend")
                setLendTab("supply")
              }}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold"
            >
              Add collateral
            </button>
          </div>
        </div>
      )}

      {showUtilWarning && (
        <div className="p-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-200 text-sm flex items-start gap-2.5">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">High utilization</div>
            <div className="text-xs opacity-80 mt-0.5">
              {formatUtil(util ?? 0n)} of {asset.symbol} pool is borrowed — borrow APY is elevated
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Supplied",
            value: poolLive ? formatAmt(totalSupply, asset.decimals) : "—",
            icon: <TrendingUp size={15} className="text-emerald-400" />,
          },
          {
            label: "Total Borrowed",
            value: poolLive ? formatAmt(totalDebt, asset.decimals) : "—",
            icon: <TrendingDown size={15} className="text-orange-400" />,
          },
          {
            label: "Utilization",
            value: poolLive ? formatUtil(util ?? 0n) : "—",
            icon: <Activity size={15} className={getUtilColor()} />,
          },
          {
            label: "APY S/B",
            value: poolLive ? `${formatApy(supplyApy)} / ${formatApy(borrowApy)}` : "—",
            icon: <Percent size={15} className="text-cyan-400" />,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 min-h-[96px] flex flex-col justify-between"
          >
            <div className="flex justify-between items-center text-xs text-[var(--text-muted)]">
              <span>{s.label}</span>
              {s.icon}
            </div>
            <div className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 min-h-[96px] flex flex-col justify-between">
          <div className="text-xs text-[var(--text-muted)]">Health</div>
          <div className={`text-3xl font-semibold ${getHealthColor()}`}>
            {poolLive ? healthValue : "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 min-h-[96px] flex flex-col justify-between">
          <div className="text-xs text-[var(--text-muted)]">Supplied</div>
          <div className="text-3xl font-semibold text-emerald-400">
            {poolLive ? formatAmt(userSupply, asset.decimals) : "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 min-h-[96px] flex flex-col justify-between">
          <div className="text-xs text-[var(--text-muted)]">Borrowed</div>
          <div className="text-3xl font-semibold text-orange-400">
            {poolLive ? formatAmt(userDebt, asset.decimals) : "—"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <div className="text-sm font-medium text-[var(--text)] mb-4">Liquidity pools</div>
        <div className="space-y-3">
          {(Object.keys(PAIR_CONFIG) as SwapPair[]).map((p) => (
            <div
              key={p}
              className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0"
            >
              <div>
                <div className="font-medium text-[var(--text)]">{p}</div>
                <div className="text-xs text-emerald-400 mt-0.5">
                  Fee 0.04%
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPage("liquidity")}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black text-sm font-semibold"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { id: "lend" as NavPage, label: "Lend", desc: "Supply · Borrow" },
          { id: "swap" as NavPage, label: "Swap", desc: "Trade stables" },
          { id: "portfolio" as NavPage, label: "Portfolio", desc: "Positions" },
          { id: "payments" as NavPage, label: "Payments", desc: "Send tokens" },
          { id: "unified" as NavPage, label: "Unified", desc: "Balance · Lend" },
          { id: "profile" as NavPage, label: "Profile", desc: "Points & missions" },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setPage(m.id)}
            className="text-left rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:border-emerald-500/40 transition"
          >
            <div className="font-semibold text-sm text-[var(--text)]">{m.label}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{m.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}