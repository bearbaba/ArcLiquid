import { useState } from "react"
import { useAccount, useReadContract, useChainId } from "wagmi"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { getAppKit } from "../lib/circleAppKit"
import TxStatus from "./TxStatus"
import { addPoints, REWARDS } from "../lib/points"
import { ASSETS, formatAmt } from "../lib/assets"

type ChainId = "Arc_Testnet" | "Ethereum_Sepolia" | "Base_Sepolia"

const CHAINS: { id: ChainId; label: string }[] = [
  { id: "Arc_Testnet", label: "Arc Testnet" },
  { id: "Ethereum_Sepolia", label: "Ethereum Sepolia" },
  { id: "Base_Sepolia", label: "Base Sepolia" },
]

const ARC_CHAIN_ID = 5042002

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const

export default function BridgePanel() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [fromChain, setFromChain] = useState<ChainId>("Arc_Testnet")
  const [toChain, setToChain] = useState<ChainId>("Ethereum_Sepolia")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  const { data: usdcBal, refetch: refetchBal } = useReadContract({
    address: ASSETS.USDC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && (fromChain === "Arc_Testnet" || chainId === ARC_CHAIN_ID),
    },
  })

  const setPercent = (pct: number) => {
    if (usdcBal === undefined) return
    const v = (Number(usdcBal) * pct) / 100 / 10 ** ASSETS.USDC.decimals
    setAmount(v.toString())
  }

  const handleBridge = async () => {
    if (!isConnected || !address) return toast.error("Connect wallet first")
    if (fromChain === toChain) return toast.error("Choose different chains")
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount")

    setLoading(true)
    setTxHash(undefined)
    try {
      const { kit, adapter } = await getAppKit()
      const result = await kit.bridge({
        from: { adapter, chain: fromChain },
        to: { chain: toChain },
        amount,
        token: "USDC",
      } as any)

      const hash =
        (result as any)?.hash ||
        (result as any)?.transactionHash ||
        (result as any)?.txHash

      if (hash && typeof hash === "string" && hash.startsWith("0x")) {
        setTxHash(hash as `0x${string}`)
      }

      toast.success("Bridge submitted")
      addPoints(REWARDS.bridge)
      setAmount("")
      setTimeout(() => refetchBal(), 2500)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Bridge failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-[var(--text-muted)] mb-1.5">From</div>
        <select
          value={fromChain}
          onChange={(e) => setFromChain(e.target.value as ChainId)}
          className="field-select w-full px-3 py-2.5 text-sm"
        >
          {CHAINS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => {
            setFromChain(toChain)
            setToChain(fromChain)
          }}
          className="w-10 h-10 rounded-xl border border-[var(--border)] text-[var(--text-muted)]"
        >
          ⇅
        </button>
      </div>

      <div>
        <div className="text-xs text-[var(--text-muted)] mb-1.5">To</div>
        <select
          value={toChain}
          onChange={(e) => setToChain(e.target.value as ChainId)}
          className="field-select w-full px-3 py-2.5 text-sm"
        >
          {CHAINS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
          <span>Amount (USDC)</span>
          {fromChain === "Arc_Testnet" && isConnected && (
            <span className="text-[var(--text)]">
              Bal: {formatAmt(usdcBal, ASSETS.USDC.decimals)} USDC
            </span>
          )}
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="field-input w-full px-4 py-3 text-xl outline-none"
        />
        {fromChain === "Arc_Testnet" && (
          <div className="flex justify-end mt-2">
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
        )}
      </div>

      <button
        type="button"
        onClick={handleBridge}
        disabled={loading || !isConnected || !amount}
        className="btn-action w-full py-4 disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Bridging...
          </>
        ) : (
          "Bridge USDC"
        )}
      </button>

      <TxStatus hash={txHash} />
    </div>
  )
}