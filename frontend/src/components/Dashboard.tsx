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

interface DashboardProps {
  assetId: AssetId
  setPage: (page: NavPage) => void
  setLendTab: (tab: LendTab) => void
}

export default function Dashboard({ assetId, setPage, setLendTab }: DashboardProps) {
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

  return (
    <div className="space-y-6">
      {showHfWarning && (
        <div
          className={`mb-2 p-4 rounded-xl border text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            healthNum < 1.1
              ? "bg-red-500/10 border-red-500/30 text-red-200"
              : "bg-amber-500/10 border-amber-500/30 text-amber-200"
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">
                {healthNum < 1.1 ? "High liquidation risk" : "Health factor needs attention"}
              </div>
              <div className="text-xs opacity-80 mt-0.5">HF {healthValue}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPage("lend")
                setLendTab("repay")
              }}
              className="px-3 py-2 rounded-lg bg-white/10 text-xs font-semibold"
            >
              Repay
            </button>
            <button
              type="button"
              onClick={() => {
                setPage("lend")
                setLendTab("supply")
              }}
              className="px-3 py-2 rounded-lg bg-white/10 text-xs font-semibold"
            >
              Add collateral
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Supplied",
            value: poolLive ? formatAmt(totalSupply, asset.decimals) : "—",
            icon: <TrendingUp size={16} className="text-emerald-400" />,
          },
          {
            label: "Total Borrowed",
            value: poolLive ? formatAmt(totalDebt, asset.decimals) : "—",
            icon: <TrendingDown size={16} className="text-orange-400" />,
          },
          {
            label: "Utilization",
            value: poolLive ? formatUtil(util ?? 0n) : "—",
            icon: <Activity size={16} className={getUtilColor()} />,
          },
          {
            label: "APY S/B",
            value: poolLive ? `${formatApy(supplyApy)} / ${formatApy(borrowApy)}` : "—",
            icon: <Percent size={16} className="text-cyan-400" />,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5"
          >
            <div className="flex justify-between text-xs text-[var(--text-muted)]">
              {s.label}
              {s.icon}
            </div>
            <div className="text-2xl font-semibold mt-1 text-[var(--text)]">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="text-xs text-[var(--text-muted)]">Health</div>
          <div className={`text-3xl font-semibold ${getHealthColor()}`}>
            {poolLive ? healthValue : "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="text-xs text-[var(--text-muted)]">Supplied</div>
          <div className="text-3xl font-semibold text-emerald-400">
            {poolLive ? formatAmt(userSupply, asset.decimals) : "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="text-xs text-[var(--text-muted)]">Borrowed</div>
          <div className="text-3xl font-semibold text-orange-400">
            {poolLive ? formatAmt(userDebt, asset.decimals) : "—"}
          </div>
        </div>
      </div>

      {/* Liquidity pools */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3">
        <div className="text-sm font-medium text-[var(--text)]">Liquidity pools</div>
        {(Object.keys(PAIR_CONFIG) as SwapPair[]).map((p) => (
          <div
            key={p}
            className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
          >
            <div>
              <div className="font-semibold text-[var(--text)]">{p}</div>
              <div className="text-xs text-emerald-400">Fee APR ~2–8% (volume dependent)</div>
            </div>
            <button
              type="button"
              onClick={() => setPage("liquidity")}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-black text-xs font-semibold"
            >
              Add
            </button>
          </div>
        ))}
      </div>

      {/* Quick modules */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { id: "lend" as const, label: "Lend", desc: "Supply · Borrow · Repay" },
          { id: "portfolio" as const, label: "Portfolio", desc: "Positions & history" },
          { id: "swap" as const, label: "Swap", desc: "Trade stables" },
          { id: "liquidity" as const, label: "Liquidity", desc: "Earn pool fees" },
          { id: "bridge" as const, label: "Bridge", desc: "CCTP USDC" },
          { id: "payments" as const, label: "Payments", desc: "Send tokens" },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setPage(m.id)}
            className="text-left rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:border-blue-500/50 transition"
          >
            <div className="font-semibold text-[var(--text)]">{m.label}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{m.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}