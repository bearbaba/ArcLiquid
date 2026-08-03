import { useState, useMemo, useEffect } from "react"
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useChainId,
} from "wagmi"
import { parseUnits, maxUint256 } from "viem"
import { toast } from "sonner"
import {
  ASSETS,
  PAIR_CONFIG,
  type SwapToken,
  type SwapPair,
  formatAmt,
  pctOfBalance,
} from "../lib/assets"
import { addPoints, REWARDS } from "../lib/points"
import { swapAbi } from "../lib/circleKit"
import TxStatus from "./TxStatus"
import { pushTx } from "../lib/txHistory"

const ARC_CHAIN_ID = 5042002
const FEE_BPS = 4n
const BPS = 10_000n

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
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const

function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n
  const amountInWithFee = amountIn * (BPS - FEE_BPS)
  return (amountInWithFee * reserveOut) / (reserveIn * BPS + amountInWithFee)
}

export default function SwapPanel({ setPage }: { setPage?: (p: any) => void }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [swapFrom, setSwapFrom] = useState<SwapToken>("USDC")
  const [swapTo, setSwapTo] = useState<SwapToken>("EURC")
  const [swapAmount, setSwapAmount] = useState("")
  const [slippageBps, setSlippageBps] = useState(100)
  const [showSettings, setShowSettings] = useState(false)

  const foundKey =
    (Object.keys(PAIR_CONFIG) as SwapPair[]).find((k) => {
      const p = PAIR_CONFIG[k]
      return (
        (p.token0 === swapFrom && p.token1 === swapTo) ||
        (p.token0 === swapTo && p.token1 === swapFrom)
      )
    }) || "USDC-EURC"
  const currentPair = PAIR_CONFIG[foundKey]
  const currentSwapPool = currentPair.pool
  const token0 = ASSETS[currentPair.token0]
  const swapTokenAddr = ASSETS[swapFrom].address

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const isWrongNetwork = isConnected && chainId !== ARC_CHAIN_ID

  const { data: reserve0Data, refetch: refetchR0 } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: "reserve0",
  })
  const { data: reserve1Data, refetch: refetchR1 } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: "reserve1",
  })
  const { data: swapFromBal, refetch: refetchBal } = useReadContract({
    address: swapTokenAddr,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  })
  const { data: swapAllowance, refetch: refetchAllowance } = useReadContract({
    address: swapTokenAddr,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, currentSwapPool] : undefined,
  })

  const reserve0 = reserve0Data ?? 0n
  const reserve1 = reserve1Data ?? 0n
  const swapParsed = swapAmount ? parseUnits(swapAmount, ASSETS[swapFrom].decimals) : 0n

  const swapQuoteBn = useMemo(() => {
    if (swapParsed === 0n || reserve0 === 0n || reserve1 === 0n) return 0n
    const isToken0In =
      ASSETS[swapFrom].address.toLowerCase() === token0.address.toLowerCase()
    return isToken0In
      ? getAmountOut(swapParsed, reserve0, reserve1)
      : getAmountOut(swapParsed, reserve1, reserve0)
  }, [swapParsed, reserve0, reserve1, swapFrom, token0.address])

  const minReceived = (swapQuoteBn * BigInt(10000 - slippageBps)) / 10000n
  const isApproved = !!(swapAllowance && swapParsed > 0n && swapAllowance >= swapParsed)
  const exceedsBalance = !!(swapFromBal !== undefined && swapParsed > swapFromBal)

  useEffect(() => {
    if (isSuccess) {
      refetchAllowance()
      refetchBal()
      refetchR0()
      refetchR1()
    }
  }, [isSuccess])

  const setPercent = (pct: number) => {
    if (swapFromBal === undefined || swapFromBal === null) return
    setSwapAmount(pctOfBalance(swapFromBal as bigint, pct, ASSETS[swapFrom].decimals))
  }
            placeholder="0.00"
            className="field-input flex-1 min-w-0 px-3 py-2 text-xl outline-none font-semibold"
          />
          <select
            value={swapFrom}
            onChange={(e) => {
              const next = e.target.value as SwapToken
              setSwapFrom(next)
              if (next === swapTo) setSwapTo(swapFrom)
              reset()
            }}
            className="field-select w-28 shrink-0 px-2 py-2 text-sm"
          >
            {(["USDC", "EURC", "CIRBTC"] as SwapToken[]).map((t) => (
              <option key={t} value={t}>
                {ASSETS[t].symbol}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end mt-2">
          <div className="flex gap-1">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setPercent(pct)}
                className="pct-btn px-2 py-0.5 text-[10px]"
              >
                {pct === 100 ? "MAX" : `${pct}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => {
            setSwapFrom(swapTo)
            setSwapTo(swapFrom)
            setSwapAmount("")
            reset()
          }}
          className="w-9 h-9 rounded-xl border border-[var(--border)] text-sm"
        >
          ⇅
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <div className="text-xs text-[var(--text-muted)] mb-2">You receive (est.)</div>
        <div className="flex gap-2 items-center">
          <div className="field-input flex-1 min-w-0 px-3 py-2 text-xl font-semibold">
            {formatAmt(swapQuoteBn, ASSETS[swapTo].decimals)}
          </div>
          <select
            value={swapTo}
            onChange={(e) => {
              const next = e.target.value as SwapToken
              setSwapTo(next)
              if (next === swapFrom) setSwapFrom(swapTo)
              reset()
            }}
            className="field-select w-28 shrink-0 px-2 py-2 text-sm"
          >
            {(["USDC", "EURC", "CIRBTC"] as SwapToken[]).map((t) => (
              <option key={t} value={t}>
                {ASSETS[t].symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!!swapAmount && exceedsBalance && (
        <div className="text-xs text-red-400 text-center font-medium">Amount exceeds balance</div>
      )}
      {!!swapAmount && !exceedsBalance && !isApproved && (
        <button
          onClick={approveSwap}
          disabled={isPending || isConfirming || !isConnected}
          className="btn-action w-full py-3 text-sm font-semibold rounded-xl disabled:opacity-40"
        >
          {isPending || isConfirming ? "Confirming..." : `Approve ${ASSETS[swapFrom].symbol}`}
        </button>
      )}

      {!!swapAmount && !exceedsBalance && isApproved && (
        <button
          onClick={runSwap}
          disabled={isPending || isConfirming || swapQuoteBn === 0n || isWrongNetwork}
          className="btn-action w-full py-3 text-sm font-semibold rounded-xl disabled:opacity-40"
        >
          {isPending || isConfirming
            ? "Confirming..."
            : `Swap ${ASSETS[swapFrom].symbol} → ${ASSETS[swapTo].symbol}`}
        </button>
      )}

      <TxStatus hash={hash} />
    </div>

    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4 text-sm">
      <div className="font-medium text-[var(--text)]">Pool · {foundKey}</div>
      <div className="flex justify-between text-[var(--text-muted)]">
        <span>Reserve {token0.symbol}</span>
        <span className="text-[var(--text)] font-semibold">
          {formatAmt(reserve0, token0.decimals)}
        </span>
      </div>
      <div className="flex justify-between text-[var(--text-muted)]">
        <span>Reserve {token1.symbol}</span>
        <span className="text-[var(--text)] font-semibold">
          {formatAmt(reserve1, token1.decimals)}
        </span>
      </div>
      <div className="flex justify-between text-[var(--text-muted)]">
        <span>Swap fee</span>
        <span className="text-[var(--text)] font-semibold">0.04%</span>
      </div>
      <div className="flex justify-between text-[var(--text-muted)]">
        <span>Fee split</span>
        <span className="text-[var(--text)] font-semibold">75% LP / 25% Protocol</span>
      </div>
      <div className="flex justify-between text-[var(--text-muted)]">
        <span>Min received</span>
        <span className="text-[var(--text)]">
          {formatAmt(minReceived, ASSETS[swapTo].decimals)} {ASSETS[swapTo].symbol}
        </span>
      </div>
      <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
        Liquidity providers earn 75% of swap fees.
      </p>
      <button
        type="button"
        onClick={() => setPage?.("liquidity")}
        className="w-full py-2.5 rounded-xl border border-emerald-500/50 text-emerald-400 text-sm font-semibold"
      >
        {/* SIDE_POOLS_CTA */}
        Open Pools
      </button>
      <p className="hidden">
      </p>
    </div>
    </div>
  )
}