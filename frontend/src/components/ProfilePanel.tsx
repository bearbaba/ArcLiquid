import { useAccount, useChainId } from "wagmi"
import { toast } from "sonner"
import { Copy, CheckCircle2, User, ExternalLink } from "lucide-react"
import { useState } from "react"

const ARC_CHAIN_ID = 5042002
const ARCSCAN = "https://testnet.arcscan.app"

type Props = {
  address?: `0x${string}`
}

export default function ProfilePanel({ address }: Props) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [copied, setCopied] = useState(false)

  const isWrongNetwork = isConnected && chainId !== ARC_CHAIN_ID

  const copyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast.success("Address copied")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Copy failed")
    }
  }

  if (!isConnected || !address) {
    return (
      <div className="py-16 text-center text-zinc-500 text-sm">
        Connect wallet to view your profile
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-400 flex items-center gap-2">
        <User size={16} />
        Your Profile on Arc Testnet
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-2xl font-bold text-black">
          {address.slice(2, 4).toUpperCase()}
        </div>

        <div className="text-center">
          <div className="text-xs text-zinc-500 mb-1">Wallet address</div>
          <div className="font-mono text-sm text-white break-all px-2">{address}</div>
        </div>

        <div className="flex gap-2 w-full max-w-sm">
          <button
            onClick={copyAddress}
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium flex items-center justify-center gap-2 hover:border-white/20"
          >
            {copied ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={`${ARCSCAN}/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium flex items-center justify-center gap-2 hover:border-white/20"
          >
            <ExternalLink size={16} />
            Explorer
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-zinc-500">Network</span>
          <span className={isWrongNetwork ? "text-red-400" : "text-emerald-400"}>
            {isWrongNetwork ? "Wrong network" : "Arc Testnet"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Chain ID</span>
          <span className="text-white">{chainId}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center text-xs text-zinc-500">
        Share your address above to receive USDC, EURC or cirBTC on Arc Testnet.
      </div>
    </div>
  )
}