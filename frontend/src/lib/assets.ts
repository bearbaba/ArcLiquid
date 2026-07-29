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
    pool: "0x1CA2e7B022f13A546Deb665901A8EfE8d407d864",
  },
  EURC: {
    symbol: "EURC",
    name: "Euro Coin",
    address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    decimals: 6,
    pool: "0x4455eb4351936996B71fa87425037d7f744F40A2",
  },
  CIRBTC: {
    symbol: "cirBTC",
    name: "Circle BTC",
    address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
    decimals: 8,
    pool: "0x75EA2cFAb03B92822Be363853643E0a538Ab275C",
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
    pool: "0x4762112F6Ca8Be4eC38aD29838395B18b7AD0eac",
  },
  "USDC-CIRBTC": {
    token0: "USDC",
    token1: "CIRBTC",
    pool: "0x2C92870dF31EDE2d4B868CbF640b3Bda54b77e93",
  },
  "EURC-CIRBTC": {
    token0: "EURC",
    token1: "CIRBTC",
    pool: "0x268BF477bceF2d468D3AeBb5580c61ae70a116e0",
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