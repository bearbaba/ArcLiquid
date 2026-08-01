import { useState, useEffect } from "react"
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi"
import { parseUnits, isAddress } from "viem"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import TxStatus from "./TxStatus"
import { addPoints, REWARDS } from "../lib/points"
import { ASSETS, formatAmt } from "../lib/assets"
import { getAppKit } from "../lib/circleAppKit"

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
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const

export default function SendPanel() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [token, setToken] = useState<Token>("USDC")
  const [to, setTo] = useState("")
  const [amount, setAmount] = useState("")
  const [kitLoading, setKitLoading] = useState(false)

  const isWrongNetwork = isConnected && chainId !== ARC_CHAIN_ID
  const asset = ASSETS[token]
  const useKit = token === "USDC"

  const { data: bal, refetch: refetchBal } = useReadContract({
    address: asset.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !useKit },
  })

  const {
    writeContract,
    data: erc20Hash,
    isPending: erc20Pending,
    error: erc20Error,
  } = useWriteContract()

  const hash = erc20Hash
  const isPending = erc20Pending || kitLoading
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isSuccess) {
      toast.success("Transfer successful")
      addPoints(REWARDS.send)
      setAmount("")
      setTo("")
      setTimeout(() => refetchBal(), 2000)
    }
  }, [isSuccess])

  useEffect(() => {
    if (erc20Error) toast.error((erc20Error as any)?.shortMessage || "Transfer failed")
  }, [erc20Error])

  const setPercent = (pct: number) => {
    if (bal === undefined || useKit) return
    const v = (Number(bal) * pct) / 100 / 10 ** asset.decimals
    setAmount(v.toFixed(Math.min(asset.decimals, 6)))
  }

  const handleSend = async () => {
    if (!isConnected || !address) return toast.error("Connect wallet first")
    if (isWrongNetwork) return toast.error("Switch to Arc Testnet")
    if (!to || !isAddress(to)) return toast.error("Invalid recipient address")
    const clean = amount.replace(",", ".").trim()
    if (!clean || Number(clean) <= 0) return toast.error("Enter a valid amount")

    if (useKit) {
      setKitLoading(true)
      try {
        const { kit, adapter } = await getAppKit()
        await kit.send({
          from: { adapter, chain: "Arc_Testnet" },
          to,
          amount: clean,
          token: "USDC",
        })
        toast.success("Send submitted")
        addPoints(REWARDS.send)
        setAmount("")
        setTo("")
      } catch (e: any) {
        console.error(e)
        toast.error(e?.message || "Send failed")
      } finally {
        setKitLoading(false)
      }
      return
    }

    let value: bigint
    try {
      value = parseUnits(clean, asset.decimals)
    } catch {
      return toast.error("Invalid amount")
    }

    writeContract({
      address: asset.address,
      abi: erc20Abi,
      functionName: "transfer",
      args: [to as `0x${string}`, value],
    })
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
        <div className="flex gap-1.5">
          {(["USDC", "EURC", "CIRBTC"] as Token[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setToken(t)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                token === t
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black"
                  : "border border-[var(--border)] text-[var(--text-muted)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
          <div className="text-xs text-[var(--text-muted)]">Recipient address</div>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value.trim())}
            placeholder="0x..."
            className="field-input w-full px-3 py-2 text-sm outline-none font-mono"
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 space-y-1.5">
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>Amount</span>
            {isConnected && !useKit && (
              <span>
                Bal: {formatAmt(bal, asset.decimals)} {token}
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
          {!useKit && (
            <div className="flex justify-end">
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
          )}
        </div>

        <button
          onClick={() => void handleSend()}
          disabled={isPending || isConfirming || !isConnected || isWrongNetwork || !to || !amount}
          className="btn-action w-full py-3 text-sm font-semibold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending...
            </>
          ) : (
            `Send ${token}`
          )}
        </button>

        <TxStatus hash={hash} />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3 text-sm">
        <div className="font-medium text-[var(--text)]">Payments</div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Network</span>
          <span className="text-[var(--text)]">Arc Testnet</span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>USDC</span>
          <span className="text-[var(--text)]">Circle App Kit · kit.send</span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>EURC / cirBTC</span>
          <span className="text-[var(--text)]">ERC-20 transfer</span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Protocol fee</span>
          <span className="text-[var(--text)]">None · gas only</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
          Same-chain transfers on Arc. No protocol fee on Payments.
        </p>
      </div>
    </div>
  )
}
