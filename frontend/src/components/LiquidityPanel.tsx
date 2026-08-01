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
import { Plus, Minus } from "lucide-react"
import {
  ASSETS,
  PAIR_CONFIG,
  type SwapPair,
  formatAmt,
  formatSharePct,
} from "../lib/assets"
import { addPoints, REWARDS } from "../lib/points"
import { swapAbi } from "../lib/circleKit"
import TxStatus from "./TxStatus"
import { pushTx } from "../lib/txHistory"

const ARC_CHAIN_ID = 5042002

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

export default function LiquidityPanel() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [swapPair, setSwapPair] = useState<SwapPair>("USDC-EURC")
  const [liqMode, setLiqMode] = useState<"add" | "remove">("add")
  const [liqAmount0, setLiqAmount0] = useState("")
  const [liqAmount1, setLiqAmount1] = useState("")
  const [removeAmount0, setRemoveAmount0] = useState("")

  const currentPair = PAIR_CONFIG[swapPair]
  const currentSwapPool = currentPair.pool
  const token0 = ASSETS[currentPair.token0]
  const token1 = ASSETS[currentPair.token1]

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const isWrongNetwork = isConnected && chainId !== ARC_CHAIN_ID

  const { data: reserve0Data } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: "reserve0",
  })
  const { data: reserve1Data } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: "reserve1",
  })
  const { data: userShares } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: "getUserShares",
    args: address ? [address] : undefined,
  })
  const { data: sharePct } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: "getSharePercentage",
    args: address ? [address] : undefined,
  })
  const { data: totalShares } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: "totalShares",
  })
  const { data: token0Bal } = useReadContract({
    address: token0.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  })
  const { data: token1Bal } = useReadContract({
    address: token1.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  })
  const { data: token0Allowance, refetch: refetchToken0Allowance } = useReadContract({
    address: token0.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, currentSwapPool] : undefined,
  })
  const { data: token1Allowance, refetch: refetchToken1Allowance } = useReadContract({
    address: token1.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, currentSwapPool] : undefined,
  })

  const reserve0 = reserve0Data ?? 0n
  const reserve1 = reserve1Data ?? 0n
  const liqParsed0 = liqAmount0 ? parseUnits(liqAmount0, token0.decimals) : 0n
  const liqParsed1 = liqAmount1 ? parseUnits(liqAmount1, token1.decimals) : 0n

  const isToken0Approved = !!(token0Allowance && liqParsed0 > 0n && token0Allowance >= liqParsed0)
  const isToken1Approved = !!(token1Allowance && liqParsed1 > 0n && token1Allowance >= liqParsed1)

  useEffect(() => {
    if (isSuccess) {
      refetchToken0Allowance()
      refetchToken1Allowance()
    }
  }, [isSuccess])

  const removeSharesBn = useMemo(() => {
    if (!removeAmount0 || reserve0 === 0n || !totalShares || totalShares === 0n) return 0n
    try {
      const amt0 = parseUnits(removeAmount0, token0.decimals)
      if (amt0 === 0n) return 0n
      const shares = (amt0 * totalShares) / reserve0
      return userShares && shares > userShares ? userShares : shares
    } catch {
      return 0n
    }
  }, [removeAmount0, reserve0, totalShares, token0.decimals, userShares])

  const yourAmt0 =
    totalShares && totalShares > 0n && userShares
      ? (userShares * reserve0) / totalShares
      : 0n
  const yourAmt1 =
    totalShares && totalShares > 0n && userShares
      ? (userShares * reserve1) / totalShares
      : 0n

  const estimatedReceive0 =
    totalShares && totalShares > 0n && removeSharesBn > 0n
      ? (removeSharesBn * reserve0) / totalShares
      : 0n
  const estimatedReceive1 =
    totalShares && totalShares > 0n && removeSharesBn > 0n
      ? (removeSharesBn * reserve1) / totalShares
      : 0n

  // AUTO_RATIO_V1
  const onAmount0Change = (raw: string) => {
    setLiqAmount0(raw)
    if (!raw || reserve0 === 0n || reserve1 === 0n) {
      setLiqAmount1("")
      return
    }
    try {
      const a0 = parseUnits(raw.replace(",", "."), token0.decimals)
      const a1 = (a0 * reserve1) / reserve0
      setLiqAmount1((Number(a1) / 10 ** token1.decimals).toFixed(Math.min(6, token1.decimals)))
    } catch {
      setLiqAmount1("")
    }
  }

  const setPct0 = (pct: number) => {
    if (!token0Bal) return
    const v = (Number(token0Bal) * pct) / 100 / 10 ** token0.decimals
    onAmount0Change(v.toString())
  }

  const setPctRemove = (pct: number) => {
    if (!userShares || reserve0 === 0n || !totalShares || totalShares === 0n) return
    const maxAmt = (userShares * reserve0) / totalShares
    const v = (Number(maxAmt) * pct) / 100 / 10 ** token0.decimals
    setRemoveAmount0(v.toString())
  }

  const approveToken = (which: 0 | 1) => {
    const token = which === 0 ? token0 : token1
    writeContract(
      {
        address: token.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [currentSwapPool, maxUint256],
      },
      {
        onSuccess: () => {
          toast.success(`${token.symbol} approved`)
          setTimeout(() => {
            refetchToken0Allowance()
            refetchToken1Allowance()
          }, 1500)
        },
        onError: (e: any) => toast.error(e?.shortMessage || "Approve failed"),
      }
    )
  }

  const addLiquidity = () => {
    if (!isToken0Approved || !isToken1Approved) return toast.error("Approve both tokens")
    writeContract(
      {
        address: currentSwapPool,
        abi: swapAbi,
        functionName: "addLiquidity",
        args: [liqParsed0, liqParsed1],
      },
      {
        onSuccess: () => {
          toast.success("Add liquidity submitted")
          addPoints(REWARDS.addLiquidity)
          if (hash) pushTx("addLiquidity", "Add " + swapPair, hash)
          setLiqAmount0("")
          setLiqAmount1("")
        },
        onError: (e: any) => toast.error(e?.shortMessage || "Failed"),
      }
    )
  }

  const removeLiquidity = () => {
    if (removeSharesBn === 0n) return toast.error("Enter amount")
    writeContract(
      {
        address: currentSwapPool,
        abi: swapAbi,
        functionName: "removeLiquidity",
        args: [removeSharesBn],
      },
      {
        onSuccess: () => {
          toast.success("Remove liquidity submitted")
          addPoints(REWARDS.removeLiquidity)
          if (hash) pushTx("removeLiquidity", "Remove " + swapPair, hash)
          setRemoveAmount0("")
        },
        onError: (e: any) => toast.error(e?.shortMessage || "Failed"),
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(PAIR_CONFIG) as SwapPair[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setSwapPair(p)
              reset()
              setLiqAmount0("")
              setLiqAmount1("")
              setRemoveAmount0("")
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              swapPair === p
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black"
                : "border border-[var(--border)] text-[var(--text-muted)]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm space-y-2">
        <div className="font-medium text-[var(--text)]">Active pool · {swapPair}</div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Reserves</span>
          <span className="text-[var(--text)]">
            {formatAmt(reserve0, token0.decimals)} {token0.symbol} ·{" "}
            {formatAmt(reserve1, token1.decimals)} {token1.symbol}
          </span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Your share</span>
          <span className="text-emerald-400 font-semibold">{formatSharePct(sharePct)}</span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Swap fee</span>
          <span className="text-[var(--text)]">0.04% · 75% LP / 25% Protocol</span>
        </div>
      </div>

      {/* POOLS_TWO_COL_V1 */}
      <div className="grid lg:grid-cols-2 gap-5">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
        <div className="flex p-0.5 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setLiqMode("add")}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium ${
              liqMode === "add" ? "bg-white text-black" : "text-[var(--text-muted)]"
            }`}
          >
            <Plus size={13} className="inline mr-1" /> Add
          </button>
          <button
            type="button"
            onClick={() => setLiqMode("remove")}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium ${
              liqMode === "remove" ? "bg-white text-black" : "text-[var(--text-muted)]"
            }`}
          >
            <Minus size={13} className="inline mr-1" /> Remove
          </button>
        </div>

        {liqMode === "add" && (
          <>
            <div className="text-xs text-[var(--text-muted)] flex justify-between">
              <span>{token0.symbol}</span>
              <span>Bal: {formatAmt(token0Bal, token0.decimals)}</span>
            </div>
            <input
              type="number"
              value={liqAmount0}
              onChange={(e) => onAmount0Change(e.target.value)}
              placeholder={`0.00 ${token0.symbol}`}
              className="field-input w-full px-3 py-2 text-xl outline-none font-semibold"
            />
            <div className="flex justify-end -mt-2">
              <div className="flex gap-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPct0(pct)}
                    className="pct-btn px-2.5 py-1 text-xs"
                  >
                    {pct === 100 ? "MAX" : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-[var(--text-muted)] flex justify-between">
              <span>{token1.symbol}</span>
              <span>Bal: {formatAmt(token1Bal, token1.decimals)}</span>
            </div>
            <input
              type="number"
              value={liqAmount1}
              onChange={(e) => setLiqAmount1(e.target.value)}
              placeholder={`0.00 ${token1.symbol}`}
              className="field-input w-full px-3 py-2 text-xl outline-none font-semibold"
            />
            

            {!!liqAmount0 && !isToken0Approved && (
              <button
                type="button"
                onClick={() => approveToken(0)}
                disabled={isPending || isConfirming}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40"
              >
                {isPending || isConfirming ? "Confirming..." : `Approve ${token0.symbol}`}
              </button>
            )}

            {!!liqAmount1 && isToken0Approved && !isToken1Approved && (
              <button
                type="button"
                onClick={() => approveToken(1)}
                disabled={isPending || isConfirming}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40"
              >
                {isPending || isConfirming ? "Confirming..." : `Approve ${token1.symbol}`}
              </button>
            )}

            {isToken0Approved && isToken1Approved && !!liqAmount0 && !!liqAmount1 && (
              <button
                type="button"
                onClick={addLiquidity}
                disabled={isPending || isConfirming || isWrongNetwork}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black text-sm font-semibold disabled:opacity-40"
              >
                {isPending || isConfirming ? "Confirming..." : `Add Liquidity · ${swapPair}`}
              </button>
            )}
          </>
        )}

        {liqMode === "remove" && (
          <>
            <div className="text-xs text-[var(--text-muted)]">Amount ({token0.symbol} side)</div>
            <input
              type="number"
              value={removeAmount0}
              onChange={(e) => setRemoveAmount0(e.target.value)}
              placeholder={`0.00 ${token0.symbol}`}
              className="field-input w-full px-3 py-2 text-xl outline-none font-semibold"
            />
            <div className="flex justify-end -mt-2">
              <div className="flex gap-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPctRemove(pct)}
                    className="pct-btn px-2.5 py-1 text-xs"
                  >
                    {pct === 100 ? "MAX" : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              Receive ~ {formatAmt(estimatedReceive0, token0.decimals)} {token0.symbol} +{" "}
              {formatAmt(estimatedReceive1, token1.decimals)} {token1.symbol}
            </div>
            <button
              type="button"
              onClick={removeLiquidity}
              disabled={removeSharesBn === 0n || isPending || isConfirming}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold disabled:opacity-40"
            >
              {isPending || isConfirming ? "Confirming..." : "Remove Liquidity"}
            </button>
          </>
        )}

        <TxStatus hash={hash} />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3 text-sm">
        <div className="font-medium text-[var(--text)]">Your position · {swapPair}</div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Share</span>
          <span className="text-emerald-400 font-semibold">{formatSharePct(sharePct)}</span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>{token0.symbol}</span>
          <span className="text-[var(--text)] font-semibold">{formatAmt(yourAmt0, token0.decimals)}</span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>{token1.symbol}</span>
          <span className="text-[var(--text)] font-semibold">{formatAmt(yourAmt1, token1.decimals)}</span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Reserves</span>
          <span className="text-[var(--text)] text-right text-xs">
            {formatAmt(reserve0, token0.decimals)} {token0.symbol} · {formatAmt(reserve1, token1.decimals)} {token1.symbol}
          </span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Fee</span>
          <span className="text-[var(--text)]">0.04% · 75% LP / 25% Protocol</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
          LP fees accrue in reserves. Your token amounts rise as the pool earns swap fees.
        </p>
      </div>
      </div>
    </div>
  )
}