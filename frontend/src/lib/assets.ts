import { formatUnits } from "viem"

export const ARC_CHAIN_ID = 5042002
export const WAD = 10n ** 18n
export const FEE_BPS = 4n
export const BPS = 10_000n
export const TREASURY = "0xe89c45ecae19ff852ec1724c85f193ae12ed0c0a" as const

export type AssetId = "USDC" | "EURC" | "CIRBTC" | "USYC"
export type SwapToken = "USDC" | "EURC" | "CIRBTC"
export type SwapPair = "USDC-EURC" | "USDC-CIRBTC" | "EURC-CIRBTC"
export type NavPage =
  | "dashboard"
  | "lend"
  | "swap"
  | "liquidity"
  | "portfolio"
  | "payments"
  | "bridge"
  | "unified"
  | "treasury"
  | "profile"
  | "guide"
export type LendTab = "supply" | "withdraw" | "borrow" | "repay"
export type LiquidityMode = "add" | "remove"

export const ASSETS: Record<
  AssetId,
  {
    symbol: string
    name: string
    address: `0x${string}`
    decimals: number
    pool: `0x${string}` | null
  }
> = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x3600000000000000000000000000000000000000",
    decimals: 6,
    pool: "0x50A452cD83E526400C763388c0642e6a14335319",
  },
  EURC: {
    symbol: "EURC",
    name: "Euro Coin",
    address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    decimals: 6,
    pool: "0x73a569D240289DAAc4f947bC3c6bd532bb7A748C",
  },
  CIRBTC: {
    symbol: "cirBTC",
    name: "Circle BTC",
    address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
    decimals: 8,
    pool: "0xE8cb6B0F90B45776FBfA0E34a3db429449cFEdcF",
  },
  USYC: {
    symbol: "USYC",
    name: "USYC",
    address: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C",
    decimals: 6,
    pool: null,
  },
}

export const PAIR_CONFIG: Record<
  SwapPair,
  { token0: SwapToken; token1: SwapToken; pool: `0x${string}` }
> = {
  "USDC-EURC": {
    token0: "USDC",
    token1: "EURC",
    pool: "0x34c8CAC3B240960D262C1B1D25Fff6020d659721",
  },
  "USDC-CIRBTC": {
    token0: "USDC",
    token1: "CIRBTC",
    pool: "0xE3581342A940894Cd02e5c7D6c5C4aa619d2BA24",
  },
  "EURC-CIRBTC": {
    token0: "EURC",
    token1: "CIRBTC",
    pool: "0x771C49a002C4E7A4872bd7aE90F1cE6B9f3A3FF6",
  },
}

export function formatAmt(v?: bigint, decimals = 6) {
  if (v === undefined || v === null) return "0.00"
  const n = Number(formatUnits(v, decimals))
  if (decimals >= 8) {
    if (n === 0) return "0.00"
    if (n < 0.0001) return n.toFixed(8)
    return n.toFixed(6)
  }
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

export function formatHealth(v?: bigint) {
  if (!v || v > 1000n * 10n ** 18n) return "∞"
  return (Number(v) / 1e18).toFixed(2)
}

export function formatApy(rate: bigint) {
  return (Number(rate) / 1e16).toFixed(2) + "%"
}

export function formatUtil(util: bigint) {
  return (Number(util) / 1e16).toFixed(2) + "%"
}

export function formatSharePct(bps?: bigint) {
  if (!bps) return "0.00%"
  return (Number(bps) / 100).toFixed(2) + "%"
}
export function pctOfBalance(balance: bigint, pct: number, decimals: number): string {
  if (pct <= 0) return "0"
  if (pct >= 100) return formatUnits(balance, decimals)
  return formatUnits((balance * BigInt(pct)) / 100n, decimals)
}
