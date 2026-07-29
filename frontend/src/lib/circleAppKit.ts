import { AppKit } from "@circle-fin/app-kit"
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2"

export const FEE_RECIPIENT = "0xe89c45ecae19ff852ec1724c85f193ae12ed0c0a" as const

let cachedKit: AppKit | null = null
let cachedAdapter: any = null

export async function getAppKit() {
  if (cachedKit && cachedAdapter) {
    return { kit: cachedKit, adapter: cachedAdapter }
  }

  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No browser wallet found")
  }

  const adapter = await createViemAdapterFromProvider({
    provider: (window as any).ethereum,
  })

  const kit = new AppKit()
  cachedKit = kit
  cachedAdapter = adapter

  return { kit, adapter }
}

export function resetAppKit() {
  cachedKit = null
  cachedAdapter = null
}