import { useState, useEffect } from "react"
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useReadContract,
} from "wagmi"
import { parseUnits, maxUint256 } from "viem"
import { toast } from "sonner"
import { RefreshCw, Shield } from "lucide-react"
import { ASSETS, formatAmt, formatHealth, formatApy, formatUtil, pctOfBalance, type AssetId, type LendTab } from "../lib/assets"
import { usePoolData } from "../hooks/usePoolData"
import { useBalances } from "../hooks/useBalances"
import { addPoints, REWARDS } from "../lib/points"
import TxStatus from "./TxStatus"
import { pushTx } from "../lib/txHistory"

const ARC_CHAIN_ID = 5042002

const poolAbi = [
  { name: "supply", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "borrow", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "repay", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
] as const

const erc20Abi = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const

interface LendPanelProps {
  assetId: AssetId
  setAssetId: (id: AssetId) => void
  lendTab: LendTab
  setLendTab: (tab: LendTab) => void
}

export default function LendPanel({ assetId, setAssetId, lendTab, setLendTab }: LendPanelProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [amount, setAmount] = useState("")
  const [screening, setScreening] = useState(false)

  const asset = ASSETS[assetId]
  const {
    poolLive,
    poolAddr,
    userSupply,
    userDebt,
    health,
    maxBorrow,
    totalSupply,
    totalDebt,
    util,
    baseRate,
    slope1,
    slope2,
    optimalUtil,
    reserveFactor,
    refetchAll,
  } = usePoolData(assetId)

  let borrowApy = 0n
  let supplyApy = 0n
  if (baseRate !== undefined && slope1 !== undefined && slope2 !== undefined && optimalUtil !== undefined) {
    const u = util ?? 0n
    if (u <= optimalUtil) {
      borrowApy = baseRate + (slope1 * u) / 10n ** 18n
    } else {
      borrowApy = baseRate + slope1 + (slope2 * (u - optimalUtil)) / 10n ** 18n
    }
    const rf = reserveFactor ?? 0n
    supplyApy = (borrowApy * u * (10n ** 18n - rf)) / (10n ** 18n * 10n ** 18n)
  }
  const { usdcBal, eurcBal, cirbtcBal, refetchAll: refetchBalances } = useBalances()

  const tokenBal =
    assetId === "USDC"
      ? usdcBal
      : assetId === "EURC"
        ? eurcBal
        : assetId === "CIRBTC"
          ? cirbtcBal
          : undefined

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const needApprove = lendTab === "supply" || lendTab === "repay"
  const parsedAmount = amount ? parseUnits(amount, asset.decimals) : 0n
  const isWrongNetwork = isConnected && chainId !== ARC_CHAIN_ID

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: asset.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && poolLive ? [address, poolAddr] : undefined,
  })

  const exceedsLimit = (() => {
    if (!amount || parsedAmount <= 0n) return false
    if (lendTab === "supply" && tokenBal !== undefined) return parsedAmount > tokenBal
    if (lendTab === "withdraw" && userSupply !== undefined) return parsedAmount > userSupply
    if (lendTab === "borrow" && maxBorrow !== undefined) return parsedAmount > maxBorrow
    if (lendTab === "repay" && userDebt !== undefined) return parsedAmount > userDebt
    return false
  })()

  const isApproved =
    !needApprove || (!!allowance && parsedAmount > 0n && allowance >= parsedAmount)

  useEffect(() => {
    if (isSuccess) {
      refetchAllowance()
      refetchAll()
      refetchBalances()
    }
  }, [isSuccess])

  const setPercent = (pct: number) => {
    let base: bigint | undefined
    if (lendTab === "supply") base = tokenBal
    if (lendTab === "withdraw") base = userSupply
    if (lendTab === "borrow") base = maxBorrow
    if (lendTab === "repay") base = userDebt
    if (base === undefined || base === null) return
    setAmount(pctOfBalance(base, pct, asset.decimals))
  }

  const approve = () => {
    if (!poolLive || !amount) return toast.error("Enter amount")
    writeContract(
      {
        address: asset.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [poolAddr, maxUint256],
      },
      {
        onSuccess: () => toast.success("Approve submitted"),
        onError: (e: any) => toast.error(e?.shortMessage || "Approve failed"),
      }
    )
  }

  const execute = () => {
    if (!poolLive || !amount || !address) return toast.error("Connect and enter amount")
    if (isWrongNetwork) return toast.error("Switch to Arc Testnet")

    const calls = {
      supply: { functionName: "supply" as const, args: [parsedAmount] as const },
      withdraw: { functionName: "withdraw" as const, args: [parsedAmount] as const },
      borrow: { functionName: "borrow" as const, args: [parsedAmount] as const },
      repay: { functionName: "repay" as const, args: [parsedAmount] as const },
    }

    writeContract(
      { address: poolAddr, abi: poolAbi, ...calls[lendTab] },
      {
        onSuccess: (txHash) => {
          toast.success(`${lendTab} submitted`)
          addPoints(REWARDS[lendTab] || 10)
          if (txHash) pushTx(lendTab, lendTab + " " + amount + " " + asset.symbol, txHash)
          setAmount("")
          setTimeout(() => {
            refetchAll()
            refetchBalances()
          }, 2500)
        },
        onError: (e: any) => toast.error(e?.shortMessage || "Failed"),
      }
    )
  }

  const healthValue = formatHealth(health)
  const healthNum = healthValue === "∞" ? 999 : Number(healthValue)
  const getHealthColor = () =>
    healthNum >= 1.5 ? "text-emerald-400" : healthNum >= 1.1 ? "text-yellow-400" : "text-red-400"

  return (
    <div className="grid lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
        <div className="flex justify-between text-sm text-[var(--text-muted)]">
          <span>Position · {asset.symbol}</span>
          <button
            type="button"
            onClick={() => {
              refetchAll()
              refetchBalances()
              refetchAllowance()
              toast.success("Refreshed")
            }}
            className="p-1 rounded-lg hover:bg-white/5"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-[var(--text-muted)]">Supplied</div>
            <div className="text-lg font-semibold text-emerald-400 mt-0.5">
              {formatAmt(userSupply, asset.decimals)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--text-muted)]">Borrowed</div>
            <div className="text-lg font-semibold text-orange-400 mt-0.5">
              {formatAmt(userDebt, asset.decimals)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Health</div>
            <div className={`text-lg font-semibold mt-0.5 ${getHealthColor()}`}>
              {healthValue}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--text-muted)]">Max borrow</div>
            <div className="text-lg font-semibold text-[var(--text)] mt-0.5">
              {formatAmt(maxBorrow, asset.decimals)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2 text-xs">
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Supply APY</span>
            <span className="text-emerald-400 font-semibold">
              {poolLive ? formatApy(supplyApy) : "—"}
            </span>
          </div>
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Borrow APY</span>
            <span className="text-orange-400 font-semibold">
              {poolLive ? formatApy(borrowApy) : "—"}
            </span>
          </div>
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Utilization</span>
            <span className="text-[var(--text)] font-semibold">
              {poolLive ? formatUtil(util ?? 0n) : "—"}
            </span>
          </div>
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Total supplied</span>
            <span className="text-[var(--text)]">
              {poolLive ? formatAmt(totalSupply, asset.decimals) : "—"}
            </span>
          </div>
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Total borrowed</span>
            <span className="text-[var(--text)]">
              {poolLive ? formatAmt(totalDebt, asset.decimals) : "—"}
            </span>
          </div>
          <div className="flex justify-between text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
            <span>LTV / LT</span>
            <span className="text-[var(--text)] font-semibold">80% / 85%</span>
          </div>
        </div>
        <button
          onClick={async () => {
            setScreening(true)
            try {
              toast.success("Screened")
            } finally {
              setScreening(false)
            }
          }}
          disabled={!isConnected || screening}
          className="w-full py-2.5 rounded-xl border border-[var(--border)] text-cyan-400 text-xs font-medium"
        >
          <Shield size={13} className="inline mr-1.5" />
          {screening ? "..." : "Screen Wallet"}
        </button>
      </div>

      <div className="lg:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <div className="flex gap-1.5 mb-3">
          {(["USDC", "EURC", "CIRBTC"] as AssetId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setAssetId(id)
                setAmount("")
                reset()
              }}
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

        <div className="flex p-0.5 bg-[var(--bg-elevated)] rounded-lg mb-3 border border-[var(--border)]">
          {(["supply", "withdraw", "borrow", "repay"] as LendTab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setLendTab(t)
                setAmount("")
                reset()
              }}
              className={`flex-1 py-1.5 text-xs capitalize rounded-md font-medium ${
                lendTab === t ? "bg-white text-black" : "text-[var(--text-muted)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mb-1.5 text-[11px] text-[var(--text-muted)]">
          {lendTab === "supply" &&
            `Wallet balance: ${formatAmt(tokenBal, asset.decimals)} ${asset.symbol}`}
          {lendTab === "withdraw" &&
            `Withdrawable: ${formatAmt(userSupply, asset.decimals)} ${asset.symbol}`}
          {lendTab === "borrow" &&
            `Max borrow: ${formatAmt(maxBorrow, asset.decimals)} ${asset.symbol}`}
          {lendTab === "repay" &&
            `Debt to repay: ${formatAmt(userDebt, asset.decimals)} ${asset.symbol}`}
        </div>

        <div className="flex justify-end mb-1.5">
          <div className="flex gap-1">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setPercent(pct)}
                className="pct-btn px-2.5 py-1 text-xs"
              >
                {pct === 100 ? "MAX" : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(",", "."))}
          placeholder="0.00"
          className="field-input w-full px-3 py-2 text-xl outline-none mb-3 font-semibold"
        />

        {exceedsLimit && (
          <div className="text-xs text-red-400 mb-2 font-medium">Amount exceeds available balance</div>
        )}
        {needApprove && !!amount && !isApproved && !exceedsLimit && (
          <button
            onClick={approve}
            disabled={isPending || isConfirming}
            className="btn-action w-full py-3 text-sm font-semibold rounded-xl disabled:opacity-40"
          >
            {isPending || isConfirming ? "Confirming..." : `Approve ${asset.symbol}`}
          </button>
        )}

        {!!amount && isApproved && !exceedsLimit && (
          <button
            onClick={execute}
            disabled={isPending || isConfirming || !isConnected || isWrongNetwork || !poolLive || exceedsLimit}
            className="btn-action w-full py-3 text-sm font-semibold rounded-xl disabled:opacity-40"
          >
            {isPending || isConfirming ? "Confirming..." : `${lendTab} ${asset.symbol}`}
          </button>
        )}

        <TxStatus hash={hash} />
      </div>
    </div>
  )
}