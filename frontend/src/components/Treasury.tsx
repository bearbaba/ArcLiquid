import { useReadContract } from "wagmi"
import { ASSETS, formatAmt, TREASURY } from "../lib/assets"

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const

export default function Treasury() {
  const { data: treasuryUsdc } = useReadContract({
    address: ASSETS.USDC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [TREASURY],
  })

  return (
    <div className="max-w-2xl rounded-2xl border border-white/5 bg-white/[0.03] p-6 space-y-3">
      <div className="text-sm font-medium text-zinc-400">Treasury</div>
      <div className="text-xs font-mono break-all text-zinc-500">{TREASURY}</div>
      <div className="text-2xl font-semibold">
        {formatAmt(treasuryUsdc, 6)} USDC
      </div>
    </div>
  )
}