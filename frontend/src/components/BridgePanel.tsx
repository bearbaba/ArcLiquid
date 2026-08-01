import { useCallback, useEffect, useState } from "react"
import { useAccount, useReadContract } from "wagmi"
import { createPublicClient, http, formatUnits } from "viem"
import { toast } from "sonner"
import { Loader2, RefreshCw } from "lucide-react"
import { getAppKit } from "../lib/circleAppKit"
import TxStatus from "./TxStatus"
import { addPoints, REWARDS } from "../lib/points"
import { ASSETS } from "../lib/assets"

type ChainId = "Arc_Testnet" | "Ethereum_Sepolia" | "Base_Sepolia"

const CHAINS: { id: ChainId; label: string }[] = [
  { id: "Arc_Testnet", label: "Arc Testnet" },
  { id: "Ethereum_Sepolia", label: "Ethereum Sepolia" },
  { id: "Base_Sepolia", label: "Base Sepolia" },
]

const USDC_BY_CHAIN: Record<ChainId, `0x${string}`> = {
  Arc_Testnet: ASSETS.USDC.address,
  Ethereum_Sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  Base_Sepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
}

const RPC_BY_CHAIN: Record<ChainId, string> = {
  Arc_Testnet: "https://rpc.quicknode.testnet.arc.network",
  Ethereum_Sepolia: "https://rpc.sepolia.org",
  Base_Sepolia: "https://sepolia.base.org",
}

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const

async function fetchUsdcBalance(chain: ChainId, address: `0x${string}`) {
  try {
    const client = createPublicClient({
      transport: http(RPC_BY_CHAIN[chain], { timeout: 10_000 }),
    })
    const bal = await client.readContract({
      address: USDC_BY_CHAIN[chain],
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    })
    return formatUnits(bal as bigint, 6)
  } catch {
    return null
  }
}

export default function BridgePanel() {
  const { address, isConnected } = useAccount()
  const [fromChain, setFromChain] = useState<ChainId>("Arc_Testnet")
  const [toChain, setToChain] = useState<ChainId>("Ethereum_Sepolia")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [balances, setBalances] = useState<Record<ChainId, string | null>>({
    Arc_Testnet: null,
    Ethereum_Sepolia: null,
    Base_Sepolia: null,
  })
  const [refreshing, setRefreshing] = useState(false)

  const { data: arcBal, refetch: refetchArcBal } = useReadContract({
    address: ASSETS.USDC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const refreshAllBalances = useCallback(async () => {
    if (!address) return
    setRefreshing(true)
    try {
      const [arc, eth, base] = await Promise.all([
        fetchUsdcBalance("Arc_Testnet", address),
        fetchUsdcBalance("Ethereum_Sepolia", address),
        fetchUsdcBalance("Base_Sepolia", address),
      ])
      setBalances({
        Arc_Testnet: arc,
        Ethereum_Sepolia: eth,
        Base_Sepolia: base,
      })
      void refetchArcBal()
    } finally {
      setRefreshing(false)
    }
  }, [address, refetchArcBal])

  useEffect(() => {
    if (isConnected && address) void refreshAllBalances()
  }, [isConnected, address, refreshAllBalances])

  const fromBalance =
    balances[fromChain] ??
    (fromChain === "Arc_Testnet" && arcBal !== undefined
      ? formatUnits(arcBal as bigint, ASSETS.USDC.decimals)
      : null)

  const setPercent = (pct: number) => {
    if (!fromBalance) return
    const v = (Number(fromBalance) * pct) / 100
    setAmount(v.toFixed(6))
  }

  const handleBridge = async () => {
    if (!isConnected || !address) return toast.error("Connect wallet first")
    if (fromChain === toChain) return toast.error("Choose different chains")
    const clean = amount.replace(",", ".").trim()
    if (!clean || Number(clean) <= 0) return toast.error("Enter a valid amount")

    setLoading(true)
    setTxHash(undefined)
    try {
      const { kit, adapter } = await getAppKit()
      const result = await kit.bridge({
        from: { adapter, chain: fromChain },
        to: { adapter, chain: toChain },
        amount: clean,
      })

      const hash =
        (result as any)?.hash ||
        (result as any)?.transactionHash ||
        (result as any)?.txHash ||
        (result as any)?.steps?.find((s: any) => s?.txHash)?.txHash

      if (hash && typeof hash === "string" && hash.startsWith("0x")) {
        setTxHash(hash as `0x${string}`)
        toast.success("Bridge submitted")
        addPoints(REWARDS.bridge)
        setAmount("")
        void refreshAllBalances()
        setTimeout(() => void refreshAllBalances(), 3000)
      } else {
        console.warn("Bridge result without tx hash:", result)
        toast.error("Bridge not confirmed — check wallet popup or try again")
      }
    } catch (err: any) {
      console.error(err)
      const msg = err?.shortMessage || err?.message || err?.details || "Bridge failed"
      if (/user rejected|denied|reject/i.test(String(msg))) {
        toast.error("You rejected the transaction")
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-[var(--text)]">USDC Balances</div>
          <button
            type="button"
            onClick={() => void refreshAllBalances()}
            disabled={refreshing || !isConnected}
            className="p-1.5 rounded-lg text-[var(--text-muted)] disabled:opacity-40"
            aria-label="Refresh balances"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
        {CHAINS.map((c) => (
          <div key={c.id} className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">{c.label}</span>
            <span className="text-[var(--text)] font-medium">
              {balances[c.id] !== null && balances[c.id] !== undefined
                ? `${Number(balances[c.id]).toFixed(4)} USDC`
                : isConnected
                  ? "—"
                  : "Connect wallet"}
            </span>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs text-[var(--text-muted)] mb-1.5">From</div>
        <select
          value={fromChain}
          onChange={(e) => setFromChain(e.target.value as ChainId)}
          className="field-select w-full px-3 py-2 text-sm"
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
          className="w-9 h-9 rounded-xl border border-[var(--border)] text-[var(--text-muted)]"
        >
          ⇅
        </button>
      </div>

      <div>
        <div className="text-xs text-[var(--text-muted)] mb-1.5">To</div>
        <select
          value={toChain}
          onChange={(e) => setToChain(e.target.value as ChainId)}
          className="field-select w-full px-3 py-2 text-sm"
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
          {isConnected && (
            <span className="text-[var(--text)]">
              Bal: {fromBalance !== null ? Number(fromBalance).toFixed(4) : "—"} USDC
            </span>
          )}
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(",", "."))}
          placeholder="0.00"
          className="field-input w-full px-3 py-2 text-xl outline-none font-semibold"
        />
        <div className="flex justify-end mt-1.5">
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

      <button
        type="button"
        onClick={handleBridge}
        disabled={loading || !isConnected || !amount}
        className="btn-action w-full py-3 text-sm font-semibold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
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
