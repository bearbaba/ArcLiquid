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
import { ASSETS, formatAmt, formatHealth, type AssetId, type LendTab } from "../lib/assets"
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
  lendTab: LendTab
  setLendTab: (tab: LendTab) => void
}

export default function LendPanel({ assetId, lendTab, setLendTab }: LendPanelProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [amount, setAmount] = useState("")
  const [screening, setScreening] = useState(false)

  const asset = ASSETS[assetId]
  const { poolLive, poolAddr, userSupply, userDebt, health, maxBorrow, refetchAll } =
    usePoolData(assetId)
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
    if (!base) return
    setAmount(((Number(base) * pct) / 100 / 10 ** asset.decimals).toString())
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
          if (txHash) pushTx(lendTab, lendTab + " " + asset.symbol, txHash)
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
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-4">
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
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="flex justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)]">Supplied</div>
            <div className="text-xl font-semibold text-emerald-400">
              {formatAmt(userSupply, asset.decimals)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--text-muted)]">Borrowed</div>
            <div className="text-xl font-semibold text-orange-400">
              {formatAmt(userDebt, asset.decimals)}
            </div>
          </div>
        </div>
        <div className={`text-lg font-semibold ${getHealthColor()}`}>HF {healthValue}</div>
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
          className="w-full py-3 rounded-xl border border-[var(--border)] text-cyan-400 text-sm"
        >
          <Shield size={14} className="inline mr-1" />
          {screening ? "..." : "Screen Wallet"}
        </button>
      </div>

      <div className="lg:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex p-1 bg-[var(--bg-elevated)] rounded-xl mb-4 border border-[var(--border)]">
          {(["supply", "withdraw", "borrow", "repay"] as LendTab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setLendTab(t)
                setAmount("")
                reset()
              }}
              className={`flex-1 py-2 text-sm capitalize rounded-lg ${
                lendTab === t ? "bg-white text-black" : "text-[var(--text-muted)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mb-2 text-xs text-[var(--text-muted)]">
          {lendTab === "supply" &&
            `Wallet balance: ${formatAmt(tokenBal, asset.decimals)} ${asset.symbol}`}
          {lendTab === "withdraw" &&
            `Withdrawable: ${formatAmt(userSupply, asset.decimals)} ${asset.symbol}`}
          {lendTab === "borrow" &&
            `Max borrow: ${formatAmt(maxBorrow, asset.decimals)} ${asset.symbol}`}
          {lendTab === "repay" &&
            `Debt to repay: ${formatAmt(userDebt, asset.decimals)} ${asset.symbol}`}
        </div>

        <div className="flex justify-end mb-2">
          <div className="flex gap-1 w-1/4 min-w-[140px]">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setPercent(pct)}
                className="pct-btn flex-1 py-1 text-[10px]"
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
          className="field-input w-full px-5 py-4 text-3xl outline-none mb-4"
        />

        {needApprove && !!amount && !isApproved && (
          <button
            onClick={approve}
            disabled={isPending || isConfirming}
            className="btn-action w-full py-4 disabled:opacity-40"
          >
            {isPending || isConfirming ? "Confirming..." : `Approve ${asset.symbol}`}
          </button>
        )}

        {!!amount && isApproved && (
          <button
            onClick={execute}
            disabled={isPending || isConfirming || !isConnected || isWrongNetwork || !poolLive}
            className="btn-action w-full py-4 disabled:opacity-40"
          >
            {isPending || isConfirming ? "Confirming..." : `${lendTab} ${asset.symbol}`}
          </button>
        )}

        <TxStatus hash={hash} />
      </div>
    </div>
  )
}