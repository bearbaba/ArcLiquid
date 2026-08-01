import { useEffect, useState } from "react"
import { createPublicClient, http, parseAbiItem, formatUnits } from "viem"
import { PAIR_CONFIG, ASSETS, type SwapPair } from "../lib/assets"

const SWAP_EVENT = parseAbiItem(
  "event Swap(address indexed user, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut)"
)

const client = createPublicClient({
  transport: http("https://rpc.testnet.arc.network"),
})

const FEE = 0.0004
const LP_SHARE = 0.75
const cache: Record<string, { at: number; label: string }> = {}

export function usePoolFeeApr(
  pair: SwapPair,
  r0: bigint | undefined,
  r1: bigint | undefined
) {
  const [label, setLabel] = useState("Fee 0.04%")

  useEffect(() => {
    if (r0 === undefined || r1 === undefined) return
    const cfg = PAIR_CONFIG[pair]
    const key = cfg.pool
    const now = Date.now()
    if (cache[key] && now - cache[key].at < 180_000) {
      setLabel(cache[key].label)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const latest = await client.getBlockNumber()
        const fromBlock = latest > 5000n ? latest - 5000n : 0n
        const logs = await client.getLogs({
          address: cfg.pool,
          event: SWAP_EVENT,
          fromBlock,
          toBlock: latest,
        })
        const t0 = ASSETS[cfg.token0]
        const t1 = ASSETS[cfg.token1]
        let vol = 0
        for (const log of logs) {
          const tokenIn = String(log.args.tokenIn || "").toLowerCase()
          const amountIn = log.args.amountIn as bigint
          if (!amountIn) continue
          if (tokenIn === t0.address.toLowerCase()) {
            vol += Number(formatUnits(amountIn, t0.decimals))
          } else if (tokenIn === t1.address.toLowerCase()) {
            vol += Number(formatUnits(amountIn, t1.decimals))
          }
        }
        const tvl =
          Number(formatUnits(r0, t0.decimals)) + Number(formatUnits(r1, t1.decimals))
        let next = "Fee 0.04%"
        if (tvl > 0 && vol > 0) {
          const apr = ((vol * FEE * LP_SHARE) / tvl) * 365 * 100
          next = apr >= 100 ? `Fee APR ${apr.toFixed(0)}%` : `Fee APR ${apr.toFixed(2)}%`
        }
        cache[key] = { at: Date.now(), label: next }
        if (!cancelled) setLabel(next)
      } catch {
        if (!cancelled) setLabel("Fee 0.04%")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pair, r0, r1])

  return label
}
