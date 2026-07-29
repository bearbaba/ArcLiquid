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
    <div className="max-w-xl mx-auto rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 md:p-8 space-y-4">
      <div className="text-base font-medium text-[var(--text-muted)]">Treasury</div>
      <div className="text-sm font-mono break-all text-[var(--text-muted)]">{TREASURY}</div>
      <div className="text-4xl font-semibold text-[var(--text)] tracking-tight">
        {formatAmt(treasuryUsdc, 6)} USDC
      </div>
    </div>
  )
}