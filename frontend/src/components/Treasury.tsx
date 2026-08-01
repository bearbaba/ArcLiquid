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
  const { data: usdc } = useReadContract({
    address: ASSETS.USDC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [TREASURY],
  })
  const { data: eurc } = useReadContract({
    address: ASSETS.EURC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [TREASURY],
  })
  const { data: cirbtc } = useReadContract({
    address: ASSETS.CIRBTC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [TREASURY],
  })

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">Treasury</h1>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="text-sm text-[var(--text-muted)]">Protocol address</div>
          <div className="text-xs font-mono break-all text-[var(--text)]">{TREASURY}</div>
          <div className="pt-2 border-t border-[var(--border)] space-y-3 text-sm">
            <div className="font-medium text-[var(--text)]">Holdings</div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">USDC</span>
              <span className="font-semibold">{formatAmt(usdc, ASSETS.USDC.decimals)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">EURC</span>
              <span className="font-semibold">{formatAmt(eurc, ASSETS.EURC.decimals)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">cirBTC</span>
              <span className="font-semibold">{formatAmt(cirbtc, ASSETS.CIRBTC.decimals)}</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3 text-sm text-[var(--text-muted)]">
          <div className="font-medium text-[var(--text)]">Revenue sources</div>
          <div className="flex justify-between">
            <span>Lending reserve factor</span>
            <span className="text-[var(--text)]">10% of interest</span>
          </div>
          <div className="flex justify-between">
            <span>Swap protocol share</span>
            <span className="text-[var(--text)]">25% of 0.04% fee</span>
          </div>
          <div className="font-medium text-[var(--text)] pt-2 border-t border-[var(--border)]">
            Purpose
          </div>
          <p>
            Collects protocol income from money markets and AMM fees. Owner can
            withdraw reserves after accrual via contract functions.
          </p>
          <p className="text-xs pt-1">
            LP share (75%) stays in swap pools and compounds for liquidity
            providers.
          </p>
        </div>
      </div>
    </div>
  )
}
