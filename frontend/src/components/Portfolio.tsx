import { useState, useEffect } from "react"
import { useAccount, useReadContract } from "wagmi"
import {
  ASSETS,
  PAIR_CONFIG,
  formatAmt,
  formatHealth,
  formatSharePct,
  formatApy,
  type AssetId,
  type SwapPair,
  type NavPage,
} from "../lib/assets"
import { usePoolData } from "../hooks/usePoolData"
import { useBalances } from "../hooks/useBalances"
import { swapAbi } from "../lib/circleKit"
import { getTxHistory } from "../lib/txHistory"
import { usePoolFeeApr } from "../hooks/usePoolFeeApr"

interface PortfolioProps {
  assetId: AssetId
  setPage: (page: NavPage) => void
}

function LpRow({ pair, setPage }: { pair: SwapPair; setPage: (p: NavPage) => void }) {
  const { address } = useAccount()
  const cfg = PAIR_CONFIG[pair]
  const t0 = ASSETS[cfg.token0]
  const t1 = ASSETS[cfg.token1]

  const { data: sharePct } = useReadContract({
    address: cfg.pool,
    abi: swapAbi,
    functionName: "getSharePercentage",
    args: address ? [address] : undefined,
  })
  const { data: reserve0 } = useReadContract({
    address: cfg.pool,
    abi: swapAbi,
    functionName: "reserve0",
  })
  const { data: reserve1 } = useReadContract({
    address: cfg.pool,
    abi: swapAbi,
    functionName: "reserve1",
  })
  const { data: userShares } = useReadContract({
    address: cfg.pool,
    abi: swapAbi,
    functionName: "getUserShares",
    args: address ? [address] : undefined,
  })
  const { data: totalShares } = useReadContract({
    address: cfg.pool,
    abi: swapAbi,
    functionName: "totalShares",
  })

  const feeLabel = usePoolFeeApr(pair, reserve0, reserve1)
  const hasPos = !!(userShares && userShares > 0n)
  const amt0 =
    totalShares && totalShares > 0n && userShares
      ? (userShares * (reserve0 ?? 0n)) / totalShares
      : 0n
  const amt1 =
    totalShares && totalShares > 0n && userShares
      ? (userShares * (reserve1 ?? 0n)) / totalShares
      : 0n

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 space-y-3">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-base text-[var(--text)]">{pair}</span>
        <span className="text-sm text-emerald-400">{feeLabel}</span>
      </div>
      <div className="text-sm text-[var(--text-muted)]">
        Share:{" "}
        <span className="text-[var(--text)] font-medium">{formatSharePct(sharePct)}</span>
      </div>
      {hasPos ? (
        <>
          <div className="text-sm text-[var(--text)]">
            Value ~ {formatAmt(amt0, t0.decimals)} {t0.symbol} +{" "}
            {formatAmt(amt1, t1.decimals)} {t1.symbol}
          </div>
          <button
            type="button"
            onClick={() => setPage("liquidity")}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium"
          >
            Manage
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setPage("liquidity")}
          className="px-4 py-2 rounded-xl bg-white/10 text-sm font-medium"
        >
          Add liquidity
        </button>
      )}
    </div>
  )
}

function LendRow({ id, setPage }: { id: AssetId; setPage: (p: NavPage) => void }) {
  const asset = ASSETS[id]
  const { userSupply, userDebt, health, poolLive, baseRate, slope1, util, reserveFactor } =
    usePoolData(id)
  if (!poolLive) return null

  let supplyApy = 0n
  if (baseRate !== undefined && slope1 !== undefined && util !== undefined) {
    const borrowApy = baseRate + (slope1 * util) / 10n ** 18n
    const rf = reserveFactor ?? 0n
    supplyApy = (borrowApy * util * (10n ** 18n - rf)) / (10n ** 18n * 10n ** 18n)
  }
  const debt =
    userDebt !== undefined && userDebt > 1000n ? formatAmt(userDebt, asset.decimals) : "0"

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3 h-full">
      <div className="flex justify-between items-center">
        <div className="text-base font-medium">Lending · {asset.symbol}</div>
        <span className="text-sm text-emerald-400">Supply APR {formatApy(supplyApy)}</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-5 text-sm">
        <div>
          <div className="text-sm text-[var(--text-muted)]">Supplied</div>
          <div className="text-xl font-semibold text-emerald-400 mt-0.5">
            {formatAmt(userSupply, asset.decimals)}
          </div>
        </div>
        <div>
          <div className="text-sm text-[var(--text-muted)]">Borrowed</div>
          <div className="text-xl font-semibold text-orange-400 mt-0.5">{debt}</div>
        </div>
        <div>
          <div className="text-sm text-[var(--text-muted)]">Health</div>
          <div className="text-xl font-semibold text-[var(--text)] mt-0.5">
            {formatHealth(health)}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPage("lend")}
        className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium"
      >
        Manage Lend
      </button>
    </div>
  )
}

export default function Portfolio({ setPage }: PortfolioProps) {
  const { usdcBal, eurcBal, cirbtcBal } = useBalances()
  const [history, setHistory] = useState(() =>
    typeof window !== "undefined" ? getTxHistory() : []
  )
  useEffect(() => {
    const load = () => setHistory(getTxHistory())
    load()
    window.addEventListener("flowlend-tx", load)
    window.addEventListener("storage", load)
    return () => {
      window.removeEventListener("flowlend-tx", load)
      window.removeEventListener("storage", load)
    }
  }, [])

  return (
    <div className="space-y-7">
      <h1 className="text-3xl font-semibold tracking-tight">Portfolio</h1>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-7 space-y-4">
        <div className="text-base font-medium">Wallet balances</div>
        {(
          [
            { id: "USDC" as AssetId, bal: usdcBal },
            { id: "EURC" as AssetId, bal: eurcBal },
            { id: "CIRBTC" as AssetId, bal: cirbtcBal },
          ] as const
        ).map(({ id, bal }) => (
          <div
            key={id}
            className="flex justify-between text-sm py-3 border-b border-[var(--border)] last:border-0"
          >
            <span className="text-[var(--text-muted)]">{ASSETS[id].symbol}</span>
            <span className="font-semibold text-base text-[var(--text)]">
              {formatAmt(bal, ASSETS[id].decimals)}
            </span>
          </div>
        ))}
      </div>

      {/* PORTFOLIO_GRID */}
      <div className="grid md:grid-cols-3 gap-4">
        {(["USDC", "EURC", "CIRBTC"] as AssetId[]).map((id) => (
          <LendRow key={id} id={id} setPage={setPage} />
        ))}
      </div>

      <div className="space-y-4">
        <div className="text-base font-medium">Liquidity pools</div>
        <div className="grid lg:grid-cols-2 gap-4">
          {(Object.keys(PAIR_CONFIG) as SwapPair[]).map((p) => (
            <LpRow key={p} pair={p} setPage={setPage} />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-7">
        <div className="text-base font-medium mb-4">Transaction history</div>
        {history.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No transactions yet on this device.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {history.map((tx) => (
              <div
                key={tx.hash + tx.time}
                className="flex justify-between gap-4 text-sm py-3 border-b border-[var(--border)] last:border-0"
              >
                <div className="min-w-0">
                  <div className="font-medium text-[var(--text)]">{tx.type}</div>
                  <div className="text-sm text-[var(--text-muted)] truncate">{tx.detail}</div>
                </div>
                <a
                  href={`https://testnet.arcscan.app/tx/${tx.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-400 shrink-0"
                >
                  {tx.hash.slice(0, 8)}...
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
