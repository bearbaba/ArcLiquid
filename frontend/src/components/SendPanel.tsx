import { useState } from "react"
import { useAccount, useChainId } from "wagmi"
import { toast } from "sonner"
import { Send, Loader2 } from "lucide-react"
import { getAppKit } from "../lib/circleAppKit"

const ARC_CHAIN_ID = 5042002
type Token = "USDC" | "EURC" | "CIRBTC"

export default function SendPanel() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [token, setToken] = useState<Token>("USDC")
  const [to, setTo] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)

  const isWrongNetwork = isConnected && chainId !== ARC_CHAIN_ID

  const handleSend = async () => {
    if (!isConnected || !address) return toast.error("Connect wallet first")
    if (isWrongNetwork) return toast.error("Switch to Arc Testnet")
    if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) return toast.error("Invalid recipient address")
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount")

    setLoading(true)
    try {
      const { kit, adapter } = await getAppKit()
      const result = await kit.send({
        from: { adapter, chain: "Arc_Testnet" },
        to,
        amount,
        token,
      })
      toast.success("Transfer submitted")
      console.log("Send result:", result)
      setAmount("")
      setTo("")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Transfer failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-zinc-400 flex items-center gap-2">
        <Send size={16} />
        Send tokens to any address on Arc Testnet
      </div>

      <div className="flex gap-2">
        {(["USDC", "EURC", "CIRBTC"] as Token[]).map((t) => (
          <button
            key={t}
            onClick={() => setToken(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
              token === t
                ? "bg-white text-black border-white"
                : "bg-white/5 border-white/10 text-zinc-300 hover:border-white/20"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
        <div className="text-xs text-zinc-500">Recipient address</div>
        <input
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value.trim())}
          placeholder="0x..."
          className="w-full bg-transparent text-lg outline-none font-mono"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
        <div className="text-xs text-zinc-500">Amount</div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-3xl font-semibold outline-none"
          />
          <span className="text-sm font-bold text-zinc-300">{token}</span>
        </div>
      </div>

      <button
        onClick={handleSend}
        disabled={loading || !isConnected || isWrongNetwork || !to || !amount}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
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

      <p className="text-xs text-zinc-500 text-center">
        Send USDC, EURC or cirBTC to any wallet on Arc Testnet.
      </p>
    </div>
  )
}