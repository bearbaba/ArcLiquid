// lib/circleAppKit.ts
import { AppKit } from "@circle-fin/app-kit"
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2"

/** Treasury nhận protocol fee (0.1% bridge) */
export const FEE_RECIPIENT = "0xe89c45ecae19ff852ec1724c85f193ae12ed0c0a" as const

let cachedKit: AppKit | null = null
let cachedAdapter: any = null

/**
 * Lấy AppKit + adapter từ browser wallet (window.ethereum)
 * Dùng chung cho Send + Bridge
 */
export async function getAppKit() {
  // Reuse nếu đã init
  if (cachedKit && cachedAdapter) {
    return { kit: cachedKit, adapter: cachedAdapter }
  }

  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No browser wallet found. Please install MetaMask or connect a wallet.")
  }

  const provider = (window as any).ethereum

  // Tạo adapter từ provider hiện tại (MetaMask / RainbowKit)
  const adapter = createViemAdapterFromProvider({
    provider,
  })

  const kit = new AppKit()

  cachedKit = kit
  cachedAdapter = adapter

  return { kit, adapter }
}

/**
 * Reset cache (dùng khi user disconnect / switch wallet)
 */
export function resetAppKit() {
  cachedKit = null
  cachedAdapter = null
}