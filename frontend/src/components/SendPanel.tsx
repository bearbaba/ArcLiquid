import { useState } from "react"
import { useAccount, useChainId, useReadContract } from "wagmi"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { getAppKit } from "../lib/circleAppKit"
import TxStatus from "./TxStatus"
import { addPoints, REWARDS } from "../lib/points"
import { ASSETS, formatAmt } from "../lib/assets"

const ARC_CHAIN_ID = 5042002
type Token = "USDC" | "EURC" | "CIRBTC"

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const

export default function SendPanel() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [token, setToken] = useState<Token>("USDC")
  const [to, setTo] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  const isWrongNetwork = isConnected && chainId !== ARC_CHAIN_ID
  const asset = ASSETS[token]

  const { data: bal, refetch: refetchBal } = useReadContract({
    address: asset.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  })

  const setPercent = (pct: number) => {
    if (bal === undefined) return
    setAmount(((Number(bal) * pct) / 100 / 10 ** asset.decimals).toString())
  }

  const handleSend = async () => {
    if (!isConnected || !address) return toast.error("Connect wallet first")
    if (isWrongNetwork) return toast.error("Switch to Arc Testnet")
    if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) return toast.error("Invalid recipient address")
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount")

    setLoading(true)
    setTxHash(undefined)
    try {
      const { kit, adapter } = await getAppKit()
      const result = await kit.send({
        from: { adapter, chain: "Arc_Testnet" },
        to,
        amount,
        token,
      })

      const hash =
        (result as any)?.hash ||
        (result as any)?.transactionHash ||
        (result as any)?.txHash

      if (hash && typeof hash === "string" && hash.startsWith("0x")) {
        setTxHash(hash as `0x${string}`)
      }

      toast.success("Transfer submitted")
      addPoints(REWARDS.send)
      setAmount("")
      setTo("")
      setTimeout(() => refetchBal(), 2500)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Transfer failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["USDC", "EURC", "CIRBTC"] as Token[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setToken(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              token === t ? "pct-btn" : "border border-[var(--border)] text-[var(--text-muted)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 space-y-2">
        <div className="text-xs text-[var(--text-muted)]">Recipient address</div>
        <input
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value.trim())}
          placeholder="0x..."
          className="field-input w-full px-3 py-2 text-lg outline-none font-mono"
        />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 space-y-2">
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>Amount</span>
          {isConnected && (
            <span>
              Bal: {formatAmt(bal, asset.decimals)} {token}
            </span>
          )}
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="field-input w-full px-3 py-2 text-3xl outline-none"
        />
        <div className="flex justify-end">
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
      </div>

      <button
        onClick={handleSend}
        disabled={loading || !isConnected || isWrongNetwork || !to || !amount}
        className="btn-action w-full py-4 disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Sending...
          </>
        ) : (
          `Send ${token}`
        )}
      </button>

      <TxStatus hash={txHash} />
    </div>
  )
}