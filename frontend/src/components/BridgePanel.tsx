import { useState } from "react"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import { ArrowLeftRight, Loader2, Settings2 } from "lucide-react"
import { getAppKit, FEE_RECIPIENT } from "../lib/circleAppKit"

type ChainId = "Arc_Testnet" | "Ethereum_Sepolia" | "Base_Sepolia"

const CHAINS: { id: ChainId; label: string }[] = [
  { id: "Arc_Testnet", label: "Arc Testnet" },
  { id: "Ethereum_Sepolia", label: "Ethereum Sepolia" },
  { id: "Base_Sepolia", label: "Base Sepolia" },
]

const selectCls = "select-neutral w-full rounded-xl border px-3 py-2.5 text-sm font-medium"
  "chain-chip w-full rounded-xl border border-white/10 bg-black/40 text-[var(--text)] px-3 py-2.5 text-sm font-medium"

export default function BridgePanel() {
  const { address, isConnected } = useAccount()
  const [fromChain, setFromChain] = useState<ChainId>("Arc_Testnet")
  const [toChain, setToChain] = useState<ChainId>("Ethereum_Sepolia")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const handleBridge = async () => {
    if (!isConnected || !address) return toast.error("Connect wallet first")
    if (fromChain === toChain) return toast.error("Choose different chains")
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount")

    setLoading(true)
    try {
      const { kit, adapter } = await getAppKit()

      // 0.1% protocol fee as absolute USDC (App Kit uses `value`, not percentageBps)
      const feeValue = (Number(amount) * 0.001).toFixed(6)

      const result = await kit.bridge({
        from: { adapter, chain: fromChain },
        to: { adapter, chain: toChain },
        amount,
        token: "USDC",
        config: {
          customFee: {
            value: feeValue,
            recipientAddress: FEE_RECIPIENT,
          },
        },
      })

      toast.success("Bridge submitted")
      console.log("Bridge result:", result)
      setAmount("")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Bridge failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <ArrowLeftRight size={16} />
          Bridge USDC via CCTP
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg text-zinc-400 border border-white/10"
        >
          <Settings2 size={16} />
        </button>
      </div>

      {showSettings && (
        <div className="rounded-xl border border-white/10 p-3 text-xs text-zinc-500">
          Protocol fee 0.1% → treasury. CCTP may ask for multiple MetaMask confirms.
        </div>
      )}

      <div>
        <div className="text-xs text-zinc-500 mb-1.5">From</div>
        <select
          value={fromChain}
          onChange={(e) => setFromChain(e.target.value as ChainId)}
          className={selectCls}
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
          className="w-10 h-10 rounded-xl border border-white/10 text-zinc-400"
        >
          ⇅
        </button>
      </div>

      <div>
        <div className="text-xs text-zinc-500 mb-1.5">To</div>
        <select
          value={toChain}
          onChange={(e) => setToChain(e.target.value as ChainId)}
          className={selectCls}
        >
          {CHAINS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-xs text-zinc-500 mb-1.5">Amount (USDC)</div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xl font-semibold outline-none text-[var(--text)]"
        />
      </div>

      <button
        type="button"
        onClick={handleBridge}
        disabled={loading || !isConnected || !amount}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
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
    </div>
  )
}